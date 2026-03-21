"use client"

import { useState } from "react"
import type { CashSession, Capital, Remittance } from "@/lib/types"
import { SidebarNav } from "@/components/sidebar-nav"
import { CashSessionPanel } from "@/components/cash/cash-session-panel"
import { SessionHistory } from "@/components/cash/session-history"
import { RemittanceList } from "@/components/cash/remittance-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { DollarSign, History, Send, Wallet } from "lucide-react"
import { getPhilippineDate } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface CashClientProps {
  initialSessions: CashSession[]
  initialCapital: Capital | null
  initialRemittances: Remittance[]
  todayCashSales: number
}

export function CashClient({
  initialSessions,
  initialCapital,
  initialRemittances,
  todayCashSales,
}: CashClientProps) {
  const [sessions, setSessions] = useState(initialSessions)
  const [capital, setCapital] = useState(initialCapital)
  const [remittances, setRemittances] = useState(initialRemittances)

  const today = getPhilippineDate()
  const todaySessions = sessions.filter((s) => s.date === today)
  const todaySession = todaySessions.find((s) => s.status === "open") ?? todaySessions[0] ?? undefined

  const totalRemitted = remittances.reduce((sum, r) => sum + Number(r.amount), 0)

  const handleDeleteSession = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from("cash_sessions").delete().eq("id", id)
    if (!error) {
      setSessions((prev) => prev.filter((s) => s.id !== id))
      toast.success("Session removed")
    } else {
      toast.error("Failed to remove session")
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav />

      <main className="ml-64 flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Cash Management</h1>
          <p className="text-muted-foreground">Track daily cash flow, sessions, and remittances</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Today's Sales</p>
                  <p className="text-2xl font-bold">₱{todayCashSales.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                  <Wallet className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Opening Cash</p>
                  <p className="text-2xl font-bold">
                    ₱{todaySession ? Number(todaySession.opening_cash).toFixed(2) : "0.00"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2/10">
                  <Send className="h-6 w-6 text-chart-2" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Remitted</p>
                  <p className="text-2xl font-bold">₱{totalRemitted.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-3/10">
                  <History className="h-6 w-6 text-chart-3" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Capital Balance</p>
                  <p className="text-2xl font-bold">
                    ₱{capital ? Number(capital.current_balance).toFixed(2) : "0.00"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="session" className="space-y-4">
          <TabsList>
            <TabsTrigger value="session" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Today's Session
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Session History
            </TabsTrigger>
            <TabsTrigger value="remittances" className="gap-2">
              <Send className="h-4 w-4" />
              Remittances
            </TabsTrigger>
          </TabsList>

          <TabsContent value="session">
            <CashSessionPanel
              session={todaySession || null}
              todaySales={todayCashSales}
              onSessionUpdate={(session) => {
                const exists = sessions.find((s) => s.id === session.id)
                if (exists) {
                  setSessions(sessions.map((s) => (s.id === session.id ? session : s)))
                } else {
                  setSessions([session, ...sessions])
                }
              }}
            />
          </TabsContent>

          <TabsContent value="history">
            <SessionHistory sessions={sessions} onDelete={handleDeleteSession} />
          </TabsContent>

          <TabsContent value="remittances">
            <RemittanceList
              remittances={remittances}
              sessions={sessions}
              onUpdate={setRemittances}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
