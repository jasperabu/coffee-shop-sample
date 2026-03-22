import { createClient } from "@/lib/supabase/server"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { subDays, format } from "date-fns"

export default async function DashboardPage() {
  const supabase = await createClient()

  const today = new Date()
  const thirtyDaysAgo = subDays(today, 30)
  const sevenDaysAgo = subDays(today, 7)

  const [ordersResult, orderItemsResult, inventoryResult, purchasesResult, capitalResult, usageResult] = await Promise.all([
    supabase.from("orders").select("*").gte("created_at", thirtyDaysAgo.toISOString()).eq("status", "completed").order("created_at", { ascending: false }),
    supabase.from("order_items").select("*, product:products(name, category_id), order:orders!inner(created_at, status)").gte("order.created_at", thirtyDaysAgo.toISOString()).eq("order.status", "completed"),
    supabase.from("inventory_items").select("*"),
    supabase.from("purchases").select("*").gte("purchase_date", thirtyDaysAgo.toISOString().split("T")[0]),
    supabase.from("capital").select("*").limit(1).maybeSingle(),
    supabase.from("usage_logs").select("*, inventory_item:inventory_items(cost_per_unit)").gte("created_at", thirtyDaysAgo.toISOString()),
  ])

  const orders = ordersResult.data || []
  const orderItems = orderItemsResult.data || []
  const inventory = inventoryResult.data || []
  const purchases = purchasesResult.data || []
  const capital = capitalResult.data ?? null
  const usageLogs = usageResult.data || []

  // Build 30-day daily breakdown
  const dailyBreakdown: { date: string; label: string; revenue: number; expenses: number; profit: number; orders: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const date = subDays(today, i)
    const dateStr = format(date, "yyyy-MM-dd")

    const dayOrders = orders.filter((o) => format(new Date(o.created_at), "yyyy-MM-dd") === dateStr)
    const dayRevenue = dayOrders.reduce((sum, o) => sum + Number(o.total), 0)

    const dayPurchases = purchases.filter((p) => p.purchase_date === dateStr)
    const dayPurchaseCost = dayPurchases.reduce((sum, p) => sum + Number(p.cost), 0)

    const dayCOGS = usageLogs
      .filter((l) => format(new Date(l.created_at), "yyyy-MM-dd") === dateStr)
      .reduce((sum, l) => sum + Number(l.quantity) * Number(l.inventory_item?.cost_per_unit ?? 0), 0)

    const dayExpenses = dayPurchaseCost + dayCOGS

    dailyBreakdown.push({
      date: dateStr,
      label: format(date, "MMM d"),
      revenue: dayRevenue,
      expenses: Math.round(dayExpenses * 100) / 100,
      profit: Math.round((dayRevenue - dayExpenses) * 100) / 100,
      orders: dayOrders.length,
    })
  }

  // Top selling products
  const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {}
  orderItems.forEach((item) => {
    const id = item.product_id
    const name = item.product?.name || "Unknown"
    if (!productSales[id]) productSales[id] = { name, quantity: 0, revenue: 0 }
    productSales[id].quantity += item.quantity
    productSales[id].revenue += Number(item.total_price)
  })
  const topProducts = Object.values(productSales).sort((a, b) => b.quantity - a.quantity).slice(0, 5)

  const lowStockItems = inventory.filter((item) => Number(item.current_stock) <= Number(item.low_stock_threshold))

  const todayStr = format(today, "yyyy-MM-dd")
  const todayOrders = orders.filter((o) => format(new Date(o.created_at), "yyyy-MM-dd") === todayStr)
  const todaySales = todayOrders.reduce((sum, o) => sum + Number(o.total), 0)

  const weekOrders = orders.filter((o) => new Date(o.created_at) >= sevenDaysAgo)
  const weekSales = weekOrders.reduce((sum, o) => sum + Number(o.total), 0)

  const monthSales = orders.reduce((sum, o) => sum + Number(o.total), 0)

  const totalExpenses = purchases.reduce((sum, p) => sum + Number(p.cost), 0)
  const totalCOGS = usageLogs.reduce((sum, log) => sum + Number(log.quantity) * Number(log.inventory_item?.cost_per_unit ?? 0), 0)
  const totalProfit = monthSales - totalExpenses - totalCOGS
  const capitalBalance = capital ? Number(capital.current_balance ?? 0) : 0

  // Legacy dailySales for chart
  const dailySales = dailyBreakdown.slice(-7).map((d) => ({ date: d.label, sales: d.revenue, orders: d.orders }))

  return (
    <DashboardClient
      dailySales={dailySales}
      dailyBreakdown={dailyBreakdown}
      topProducts={topProducts}
      lowStockItems={lowStockItems}
      todaySales={todaySales ?? 0}
      todayOrders={todayOrders.length}
      weekSales={weekSales ?? 0}
      weekOrders={weekOrders.length}
      monthSales={monthSales ?? 0}
      monthOrders={orders.length}
      recentOrders={orders.slice(0, 10)}
      totalExpenses={totalExpenses ?? 0}
      totalCOGS={totalCOGS ?? 0}
      totalProfit={totalProfit ?? 0}
      capitalBalance={capitalBalance ?? 0}
    />
  )
}