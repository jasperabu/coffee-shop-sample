import { createClient } from "@/lib/supabase/server"
import { POSClient } from "@/components/pos/pos-client"

export default async function POSPage() {
  const supabase = await createClient()

  const [categoriesResult, productsResult, addonsResult, recipesResult] = await Promise.all([
    supabase.from("categories").select("*").order("display_order"),
    supabase.from("products").select(`
      *,
      category:categories(*),
      sizes:product_sizes(*)
    `).eq("is_available", true).order("name"),
    supabase.from("addons").select("*").eq("is_available", true).order("name"),
    supabase.from("product_recipes").select(`
      *,
      inventory_item:inventory_items(id, name, unit, current_stock)
    `),
  ])

  return (
    <POSClient
      initialCategories={categoriesResult.data || []}
      initialProducts={productsResult.data || []}
      initialAddons={addonsResult.data || []}
      initialRecipes={recipesResult.data || []}
    />
  )
}