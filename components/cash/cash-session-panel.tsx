"use client"

import { useState } from "react"
import type { CashSession } from "@/lib/types"
import { PESO_DENOMINATIONS } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { PlayCircle, StopCircle, Calculator } from "lucide-react"
import { getPhilippineDate } from "@/lib/utils"

interface CashSessionPanelProps {
  session: CashSession | null
  todaySales: number
  onSessionUpdate: (session: CashSession) => void
}

export function CashSessionPanel({ session, todaySales, onSessionUpdate }: CashSessionPanelProps) {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [openingCash, setOpeningCash] = useState("")
  const [denominations, setDenominations] = useState<Record<number, number>>({})

  const handleStartSession = async () => {
    if (!openingCash) return
    setIsLoading(true)

    try {
      const today = getPhilippineDate()
      const { data, error } = await supabase
        .from("cash_sessions")
        .insert({
          date: today,
          opening_cash: parseFloat(openingCash) || 0,
          total_sales: 0,       // always reset to 0 on new session
          total_remittance: 0,  // reset this too
          status: "open",
        })
        .select()
        .single()

      if (!error && data) {
        onSessionUpdate(data)
        setOpeningCash("")
      }
    } catch (error) {
      console.error("Error starting session:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseSession = async () => {
    if (!session) return
    setIsLoading(true)

    try {
      const closingCash = Object.entries(denominations).reduce(
        (sum, [denom, count]) => sum + parseFloat(denom) * count,
        0
      )

      const expectedCash = Number(session.opening_cash) + todaySales - Number(session.total_remittance)
      const difference = closingCash - expectedCash

      const { data, error } = await supabase
        .from("cash_sessions")
        .update({
          closing_cash: closingCash,
          total_sales: todaySales,
          expected_cash: expectedCash,
          difference: difference,
          status: "closed",
          closed_at: new Date().toISOString(),
        })
        .eq("id", session.id)
        .select()
        .single()

      if (!error && data) {
        const denomData = Object.entries(denominations)
          .filter(([, count]) => count > 0)
          .map(([denom, count]) => ({
            session_id: session.id,
            count_type: "closing",
            denomination: parseFloat(denom),
            count: count,
            total: parseFloat(denom) * count,
          }))

        if (denomData.length > 0) {
          await supabase.from("cash_denominations").insert(denomData)
        }

        onSessionUpdate(data)
        setDenominations({})
      }
    } catch (error) {
      console.error("Error closing session:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const closingTotal = Object.entries(denominations).reduce(
    (sum, [denom, count]) => sum + parseFloat(denom) * count,
    0
  )

  if (!session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Start Today&apos;s Session</CardTitle>
          <CardDescription>
            Begin a new cash session by entering your opening cash amount
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 max-w-md">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Opening Cash (₱)</label>
              <Input
                type="number"
                step="0.01"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleStartSession} disabled={isLoading || !openingCash}>
                <PlayCircle className="mr-2 h-4 w-4" />
                Start Session
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (session.status === "closed") {
    const sessionDate = session.date
    const today = getPhilippineDate()
    const isToday = sessionDate === today

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Session Closed</CardTitle>
                <CardDescription>Today&apos;s cash session has been completed</CardDescription>
              </div>
              <Badge variant="secondary">Closed</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">Opening Cash</p>
                <p className="text-xl font-bold">₱{Number(session.opening_cash).toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-xl font-bold">₱{Number(session.total_sales).toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">Closing Cash</p>
                <p className="text-xl font-bold">₱{Number(session.closing_cash).toFixed(2)}</p>
              </div>
              <div className={`rounded-lg p-4 ${Number(session.difference) >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                <p className="text-sm text-muted-foreground">Difference</p>
                <p className={`text-xl font-bold ${Number(session.difference) >= 0 ? "text-green-700" : "text-red-700"}`}>
                  ₱{Number(session.difference).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Start a New Session</CardTitle>
            <CardDescription>
              {isToday
                ? "Open another session for today"
                : "Start a new session for a new day"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 max-w-md">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Opening Cash (₱)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleStartSession} disabled={isLoading || !openingCash}>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Start Session
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const expectedCash = Number(session.opening_cash) + todaySales - Number(session.total_remittance)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Active Session</CardTitle>
            <CardDescription>
              Started at {new Date(session.created_at).toLocaleTimeString()}
            </CardDescription>
          </div>
          <Badge className="bg-green-500">Open</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">Opening Cash</p>
            <p className="text-xl font-bold">₱{Number(session.opening_cash).toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">Today&apos;s Sales</p>
            <p className="text-xl font-bold">₱{todaySales.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-4">
            <p className="text-sm text-muted-foreground">Expected Cash</p>
            <p className="text-xl font-bold text-primary">₱{expectedCash.toFixed(2)}</p>
          </div>
        </div>

        <Separator />

        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Cash Count</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {PESO_DENOMINATIONS.map((denom) => (
              <div key={denom.value} className="flex items-center gap-2">
                <span className="w-16 text-sm font-medium">₱{denom.label}</span>
                <Input
                  type="number"
                  min="0"
                  value={denominations[denom.value] || ""}
                  onChange={(e) =>
                    setDenominations({
                      ...denominations,
                      [denom.value]: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-20"
                  placeholder="0"
                />
                <span className="text-sm text-muted-foreground">
                  = ₱{(denom.value * (denominations[denom.value] || 0)).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg bg-muted p-4">
            <div>
              <p className="text-sm text-muted-foreground">Cash Count Total</p>
              <p className="text-2xl font-bold">₱{closingTotal.toFixed(2)}</p>
            </div>
            <div className={`text-right ${closingTotal - expectedCash >= 0 ? "text-green-700" : "text-red-700"}`}>
              <p className="text-sm text-muted-foreground">Difference</p>
              <p className="text-xl font-bold">₱{(closingTotal - expectedCash).toFixed(2)}</p>
            </div>
          </div>
        </div>

        <Button onClick={handleCloseSession} disabled={isLoading} className="w-full" size="lg">
          <StopCircle className="mr-2 h-4 w-4" />
          Close Session
        </Button>
      </CardContent>
    </Card>
  )
}
