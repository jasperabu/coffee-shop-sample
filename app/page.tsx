import { createClient } from "@/lib/supabase/server"
import { POSClient } from "@/components/pos/pos-client"

export default async function POSPage() {
  const supabase = await createClient()

  // Fetch all data needed for POS
  const [categoriesResult, productsResult, addonsResult] = await Promise.all([
    supabase.from("categories").select("*").order("display_order"),
    supabase.from("products").select(`
      *,
      category:categories(*),
      sizes:product_sizes(*)
    `).eq("is_available", true).order("name"),
    supabase.from("addons").select("*").eq("is_available", true).order("name"),
  ])

  const categories = categoriesResult.data || []
  const products = productsResult.data || []
  const addons = addonsResult.data || []

  return (
    <POSClient 
      initialCategories={categories}
      initialProducts={products}
      initialAddons={addons}
    />
  )
}
