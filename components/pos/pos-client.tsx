"use client"

import { useState, useCallback } from "react"
import type { Product, Category, ProductSize, Addon, CartItem, ProductRecipe, CashSession } from "@/lib/types"
import { SidebarNav, useSidebarWidth } from "@/components/sidebar-nav"
import { ProductGrid } from "@/components/pos/product-grid"
import { OrderCart } from "@/components/pos/order-cart"
import { CheckoutDialog } from "@/components/pos/checkout-dialog"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { getPhilippineDate } from "@/lib/utils"
import { toast } from "sonner"

interface POSClientProps {
  initialCategories: Category[]
  initialProducts: Product[]
  initialAddons: Addon[]
  initialRecipes: ProductRecipe[]
  activeSession: CashSession | null
}

export function POSClient({ initialCategories, initialProducts, initialAddons, initialRecipes, activeSession }: POSClientProps) {
  const router = useRouter()
  const sidebarWidth = useSidebarWidth()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const handleAddToCart = useCallback((product: Product, size: ProductSize | null, addons: Addon[]) => {
    const basePrice = Number(product.base_price)
    const sizeAdjustment = size ? Number(size.price_adjustment) : 0
    const addonsTotal = addons.reduce((sum, addon) => sum + Number(addon.price), 0)
    const unitPrice = basePrice + sizeAdjustment + addonsTotal

    const newItem: CartItem = {
      id: `${product.id}-${size?.id || "no-size"}-${Date.now()}`,
      product,
      size,
      addons,
      quantity: 1,
      unitPrice,
      totalPrice: unitPrice,
      notes: "",
    }

    setCartItems((prev) => [...prev, newItem])
  }, [])

  const handleUpdateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity < 1) return
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity, totalPrice: item.unitPrice * quantity }
          : item
      )
    )
  }, [])

  const handleRemoveItem = useCallback((itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId))
  }, [])

  const handleClearCart = useCallback(() => {
    setCartItems([])
  }, [])

  const handleCheckout = useCallback(() => {
    if (!activeSession) {
      toast.error("Cannot start sale: No active cash session. Please open a session first in Cash Management.")
      return
    }
    setCheckoutOpen(true)
  }, [activeSession])

  const handleCompleteOrder = useCallback(async (
    paymentMethod: string,
    amountReceived: number,
    customerName: string,
    paymentStatus: 'paid' | 'partially_paid' | 'unpaid',
    amountPaid: number
  ) => {
    const supabase = createClient()
    const total = cartItems.reduce((sum, item) => sum + item.totalPrice, 0)
    const change = paymentStatus === "paid" && paymentMethod === "cash" ? amountReceived - total : 0

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_name: customerName || null,
        subtotal: total,
        total: total,
        payment_method: paymentStatus === "paid" ? paymentMethod : "cash",
        amount_received: paymentStatus === "paid" && paymentMethod === "cash" ? amountReceived : null,
        change_amount: change > 0 ? change : null,
        status: "completed",
        payment_status: paymentStatus,
        amount_paid: amountPaid,
      })
      .select()
      .single()

    if (orderError) {
      console.error("Error creating order:", orderError)
      return
    }

    // Create order items
    const orderItems = cartItems.map((item) => ({
      order_id: order.id,
      product_id: item.product.id,
      size_id: item.size?.id || null,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      notes: item.notes || null,
    }))

    const { data: insertedItems, error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems)
      .select()

    if (itemsError) {
      console.error("Error creating order items:", itemsError)
      return
    }

    // Create order item addons
    const orderItemAddons: { order_item_id: string; addon_id: string; price: number }[] = []
    cartItems.forEach((cartItem, index) => {
      if (insertedItems && insertedItems[index]) {
        cartItem.addons.forEach((addon) => {
          orderItemAddons.push({
            order_item_id: insertedItems[index].id,
            addon_id: addon.id,
            price: Number(addon.price),
          })
        })
      }
    })

    if (orderItemAddons.length > 0) {
      const { error: addonsError } = await supabase
        .from("order_item_addons")
        .insert(orderItemAddons)

      if (addonsError) {
        console.error("Error creating order addons:", addonsError)
      }
    }

    // Deduct inventory based on product recipes
    try {
      // Get all product IDs and quantities from the cart
      const productIds = cartItems.map((item) => item.product.id)

      // Fetch recipes for all products in this order
      const { data: recipes } = await supabase
        .from("product_recipes")
        .select("*, inventory_item:inventory_items(id, name, current_stock, unit)")
        .in("product_id", productIds)

      if (recipes && recipes.length > 0) {
        // Calculate total deduction per inventory item
        const deductions: Record<string, number> = {}
        cartItems.forEach((cartItem) => {
          const productRecipes = recipes.filter(
            (r) => r.product_id === cartItem.product.id &&
            (r.size_id === null || r.size_id === cartItem.size?.id)
          )
          productRecipes.forEach((recipe) => {
            const key = recipe.inventory_item_id
            deductions[key] = (deductions[key] || 0) + (Number(recipe.quantity_required) * cartItem.quantity)
          })
        })

        // Apply deductions to inventory
        await Promise.all(
          Object.entries(deductions).map(async ([itemId, qty]) => {
            const recipe = recipes.find((r) => r.inventory_item_id === itemId)
            if (!recipe?.inventory_item) return
            const newStock = Math.max(0, Number(recipe.inventory_item.current_stock) - qty)
            await supabase
              .from("inventory_items")
              .update({ current_stock: newStock, updated_at: new Date().toISOString() })
              .eq("id", itemId)

            // Log the usage
            await supabase.from("usage_logs").insert({
              inventory_item_id: itemId,
              quantity: qty,
              source: "sale",
              order_id: order.id,
              notes: `Auto-deducted from sale #${order.order_number}`,
            })
          })
        )
      }
    } catch (err) {
      console.error("Error deducting inventory:", err)
      // Don't block the sale if inventory deduction fails
    }

    // Update today's cash session if exists - only count actual cash received
    const today = getPhilippineDate()
    const { data: session } = await supabase
      .from("cash_sessions")
      .select()
      .eq("date", today)
      .eq("status", "open")
      .single()

    // For cash sessions, only count paid amounts (not unpaid debts)
    if (session && (paymentStatus === "paid" || paymentStatus === "partially_paid")) {
      const cashAmount = paymentStatus === "paid" && paymentMethod === "cash" ? total : 
                         paymentStatus === "partially_paid" ? amountPaid : 0
      if (cashAmount > 0) {
        await supabase
          .from("cash_sessions")
          .update({ total_sales: Number(session.total_sales) + cashAmount })
          .eq("id", session.id)
      }
    }

    // Add revenue to capital balance
    if (amountPaid > 0) {
      const { data: capitalData } = await supabase
        .from("capital")
        .select("*")
        .limit(1)
        .maybeSingle()
      if (capitalData) {
        // Update existing capital record
        await supabase
          .from("capital")
          .update({
            current_balance: Number(capitalData.current_balance) + amountPaid,
            updated_at: new Date().toISOString(),
          })
          .eq("id", capitalData.id)
      } else {
        // No capital record yet — create one with this sale as starting balance
        await supabase
          .from("capital")
          .insert({ initial_amount: amountPaid, current_balance: amountPaid })
      }
    }

    // Clear cart and close dialog
    setCartItems([])
    setCheckoutOpen(false)
    router.refresh()
  }, [cartItems, router])

  const total = cartItems.reduce((sum, item) => sum + item.totalPrice, 0)

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav />
      
      <main className="flex flex-1 transition-all duration-300 ease-in-out" style={{ marginLeft: sidebarWidth }}>
        {/* Product Grid - Takes most of the space */}
        <div className="flex-1">
          <ProductGrid
            products={initialProducts}
            categories={initialCategories}
            addons={initialAddons}
            recipes={initialRecipes}
            onAddToCart={handleAddToCart}
          />
        </div>

        {/* Order Cart - Fixed width sidebar */}
        <div className="w-80 border-l border-border">
          <OrderCart
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onCheckout={handleCheckout}
          />
        </div>
      </main>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        items={cartItems}
        total={total}
        onComplete={handleCompleteOrder}
      />
    </div>
  )
}