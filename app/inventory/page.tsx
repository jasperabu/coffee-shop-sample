import { createClient } from "@/lib/supabase/server"
import { InventoryClientLoader } from "@/components/inventory/inventory-client-loader"

export default async function InventoryPage() {
  const supabase = await createClient()

  const [inventoryResult, purchasesResult, periodsResult, capitalResult] = await Promise.all([
    supabase.from("inventory_items").select("*").order("name"),
    supabase.from("purchases").select(`
      *,
      inventory_item:inventory_items(*)
    `).order("purchase_date", { ascending: false }).limit(50),
    supabase.from("inventory_periods").select("*").order("start_date", { ascending: false }),
    supabase.from("capital").select("*").limit(1).maybeSingle(),
  ])

  return (
    <InventoryClientLoader
      initialInventory={inventoryResult.data || []}
      initialPurchases={purchasesResult.data || []}
      initialPeriods={periodsResult.data || []}
      initialCapital={capitalResult.data ?? null}
    />
  )
}