import { createClient } from "@/lib/supabase/server"
import { CashClient } from "@/components/cash/cash-client"
import { getPhilippineDate } from "@/lib/utils"

export default async function CashPage() {
  const supabase = await createClient()
  const today = getPhilippineDate()

  const [sessionsResult, capitalResult, remittancesResult] = await Promise.all([
    supabase.from("cash_sessions").select("*").order("date", { ascending: false }).limit(30),
    supabase.from("capital").select("*").limit(1).single(),
    supabase.from("remittances").select("*").order("created_at", { ascending: false }).limit(50),
  ])

  const sessions = sessionsResult.data || []

  // Find the currently open session
  const openSession = sessions.find((s) => s.status === "open" && s.date === today)

  // Only count sales from AFTER the open session started
  // If no open session, show 0 (session is closed, total_sales is already saved on it)
  let todayCashSales = 0
  if (openSession) {
    const { data: todayOrders } = await supabase
      .from("orders")
      .select("total, payment_method, payment_status, amount_paid, created_at")
      .gte("created_at", openSession.created_at)  // only orders AFTER session opened
      .eq("status", "completed")

    todayCashSales = (todayOrders || []).reduce((sum, o) => {
      // Count cash received: full total for paid cash orders, amount_paid for partial
      if (o.payment_method === "cash" && o.payment_status === "paid") {
        return sum + Number(o.total)
      }
      if (o.payment_status === "partially_paid") {
        return sum + Number(o.amount_paid)
      }
      return sum
    }, 0)
  }

  return (
    <CashClient
      initialSessions={sessions}
      initialCapital={capitalResult.data || null}
      initialRemittances={remittancesResult.data || []}
      todayCashSales={todayCashSales}
    />
  )
}
