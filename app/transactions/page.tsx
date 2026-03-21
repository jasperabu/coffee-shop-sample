import { createClient } from "@/lib/supabase/server"
import { TransactionsClient } from "@/components/transactions/transactions-client"

export default async function TransactionsPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      *,
      items:order_items(
        *,
        product:products(name),
        size:product_sizes(size_name),
        addons:order_item_addons(*, addon:addons(name))
      )
    `)
    .order("created_at", { ascending: false })

  return <TransactionsClient initialOrders={orders ?? []} />
}
