import { createClient } from "@/lib/supabase/server"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { subDays, format, startOfDay, endOfDay } from "date-fns"

export default async function DashboardPage() {
  const supabase = await createClient()

  const today = new Date()
  const sevenDaysAgo = subDays(today, 7)
  const thirtyDaysAgo = subDays(today, 30)

  // Fetch data for analytics
  const [ordersResult, orderItemsResult, productsResult, inventoryResult] = await Promise.all([
    // Orders from last 30 days
    supabase
      .from("orders")
      .select("*")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .eq("status", "completed")
      .order("created_at", { ascending: false }),
    // Order items with product info
    supabase
      .from("order_items")
      .select(`
        *,
        product:products(name, category_id),
        order:orders!inner(created_at, status)
      `)
      .gte("order.created_at", thirtyDaysAgo.toISOString())
      .eq("order.status", "completed"),
    // All products
    supabase.from("products").select("*, category:categories(name)"),
    // Low stock items
    supabase.from("inventory_items").select("*"),
  ])

  const orders = ordersResult.data || []
  const orderItems = orderItemsResult.data || []
  const products = productsResult.data || []
  const inventory = inventoryResult.data || []

  // Calculate daily sales for chart
  const dailySales: { date: string; sales: number; orders: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const date = subDays(today, i)
    const dateStr = format(date, "yyyy-MM-dd")
    const dayOrders = orders.filter(
      (o) => format(new Date(o.created_at), "yyyy-MM-dd") === dateStr
    )
    dailySales.push({
      date: format(date, "EEE"),
      sales: dayOrders.reduce((sum, o) => sum + Number(o.total), 0),
      orders: dayOrders.length,
    })
  }

  // Top selling products
  const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {}
  orderItems.forEach((item) => {
    const productId = item.product_id
    const productName = item.product?.name || "Unknown"
    if (!productSales[productId]) {
      productSales[productId] = { name: productName, quantity: 0, revenue: 0 }
    }
    productSales[productId].quantity += item.quantity
    productSales[productId].revenue += Number(item.total_price)
  })

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)

  // Low stock items
  const lowStockItems = inventory.filter(
    (item) => Number(item.current_stock) <= Number(item.low_stock_threshold)
  )

  // Today's stats
  const todayStr = format(today, "yyyy-MM-dd")
  const todayOrders = orders.filter(
    (o) => format(new Date(o.created_at), "yyyy-MM-dd") === todayStr
  )
  const todaySales = todayOrders.reduce((sum, o) => sum + Number(o.total), 0)

  // This week stats
  const weekOrders = orders.filter(
    (o) => new Date(o.created_at) >= sevenDaysAgo
  )
  const weekSales = weekOrders.reduce((sum, o) => sum + Number(o.total), 0)

  // This month stats
  const monthSales = orders.reduce((sum, o) => sum + Number(o.total), 0)

  return (
    <DashboardClient
      dailySales={dailySales}
      topProducts={topProducts}
      lowStockItems={lowStockItems}
      todaySales={todaySales}
      todayOrders={todayOrders.length}
      weekSales={weekSales}
      weekOrders={weekOrders.length}
      monthSales={monthSales}
      monthOrders={orders.length}
      recentOrders={orders.slice(0, 10)}
    />
  )
}
