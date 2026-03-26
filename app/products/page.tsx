import { createClient } from "@/lib/supabase/server"
import { ProductsClientLoader } from "@/components/products/products-client-loader"

export default async function ProductsPage() {
  const supabase = await createClient()

  const [categoriesResult, productsResult, addonsResult, inventoryResult] = await Promise.all([
    supabase.from("categories").select("*").order("display_order"),
    supabase.from("products").select(`
      *,
      category:categories(*),
      sizes:product_sizes(*)
    `).order("name"),
    supabase.from("addons").select("*").order("name"),
    supabase.from("inventory_items").select("*").order("name"),
  ])

  return (
    <ProductsClientLoader
      initialCategories={categoriesResult.data || []}
      initialProducts={productsResult.data || []}
      initialAddons={addonsResult.data || []}
      initialInventory={inventoryResult.data || []}
    />
  )
}