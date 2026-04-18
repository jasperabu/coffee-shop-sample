import { createClient } from "@/lib/supabase/server"
import { POSClient } from "@/components/pos/pos-client"
import { getPhilippineDate } from "@/lib/utils"

export default async function POSPage() {
  const supabase = await createClient()

  const today = getPhilippineDate()

  // Fetch all data needed for POS
  const [categoriesResult, productsResult, addonsResult, recipesResult, sessionResult] = await Promise.all([
    supabase.from("categories").select("*").order("display_order"),
    supabase.from("products").select(`
      *,
      category:categories(*),
      sizes:product_sizes(*)
    `).eq("is_available", true).order("name"),
    supabase.from("addons").select("*").eq("is_available", true).order("name"),
    supabase.from("product_recipes").select("*, inventory_item:inventory_items(id, name, current_stock, unit)"),
    supabase.from("cash_sessions").select("*").eq("date", today).eq("status", "open").single()
  ])

  const categories = categoriesResult.data || []
  const products = productsResult.data || []
  const addons = addonsResult.data || []
  const recipes = recipesResult.data || []

  return (
    <POSClient 
      initialCategories={categories}
      initialProducts={products}
      initialAddons={addons}
      initialRecipes={recipes}
      activeSession={sessionResult.data || null}
    />
  )
}
