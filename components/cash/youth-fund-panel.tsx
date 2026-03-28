    "use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { createClient } from "@/lib/supabase/client"
import { Plus, ArrowDownCircle, Trash2, Heart } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

export interface YouthFundTransaction {
  id: string
  type: "deposit" | "withdrawal"
  amount: number
  description: string | null
  created_at: string
}

interface YouthFundPanelProps {
  balance: number
  transactions: YouthFundTransaction[]
  onBalanceChange: (newBalance: number) => void
  onTransactionsChange: (txns: YouthFundTransaction[]) => void
}

export function YouthFundPanel({
  balance,
  transactions,
  onBalanceChange,
  onTransactionsChange,
}: YouthFundPanelProps) {
  const supabase = createClient()
  const [depositOpen, setDepositOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<YouthFundTransaction | null>(null)
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleDeposit = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("youth_fund_transactions")
        .insert({ type: "deposit", amount: amt, description: description || null })
        .select()
        .single()
      if (error) throw error

      const newBalance = balance + amt
      await supabase
        .from("youth_fund")
        .upsert({ id: 1, balance: newBalance, updated_at: new Date().toISOString() })

      onBalanceChange(newBalance)
      onTransactionsChange([data, ...transactions])
      setDepositOpen(false)
      setAmount("")
      setDescription("")
      toast.success(`₱${amt.toFixed(2)} added to Youth Fund`)
    } catch (err: unknown) {
      const e = err as { message?: string } | null
      toast.error(`Failed to deposit: ${e?.message ?? "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleWithdraw = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    if (amt > balance) {
      toast.error("Insufficient Youth Fund balance")
      return
    }
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("youth_fund_transactions")
        .insert({ type: "withdrawal", amount: amt, description: description || null })
        .select()
        .single()
      if (error) throw error

      const newBalance = balance - amt
      await supabase
        .from("youth_fund")
        .upsert({ id: 1, balance: newBalance, updated_at: new Date().toISOString() })

      onBalanceChange(newBalance)
      onTransactionsChange([data, ...transactions])
      setWithdrawOpen(false)
      setAmount("")
      setDescription("")
      toast.success(`₱${amt.toFixed(2)} withdrawn from Youth Fund`)
    } catch (err: unknown) {
      const e = err as { message?: string } | null
      toast.error(`Failed to withdraw: ${e?.message ?? "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsLoading(true)
    try {
      await supabase.from("youth_fund_transactions").delete().eq("id", deleteTarget.id)

      // Reverse the transaction from balance
      const delta = deleteTarget.type === "deposit"
        ? -Number(deleteTarget.amount)
        : +Number(deleteTarget.amount)
      const newBalance = Math.max(0, balance + delta)

      await supabase
        .from("youth_fund")
        .upsert({ id: 1, balance: newBalance, updated_at: new Date().toISOString() })

      onBalanceChange(newBalance)
      onTransactionsChange(transactions.filter((t) => t.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success("Transaction removed and balance reversed")
    } catch (err: unknown) {
      const e = err as { message?: string } | null
      toast.error(`Failed to delete: ${e?.message ?? "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Balance summary card */}
      <Card className="mb-4 border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/40">
                <Heart className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Youth Fund Balance</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                  ₱{balance.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Remittances are automatically deposited here
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-400"
                onClick={() => { setAmount(""); setDescription(""); setDepositOpen(true) }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Deposit
              </Button>
              <Button
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                onClick={() => { setAmount(""); setDescription(""); setWithdrawOpen(true) }}
                disabled={balance <= 0}
              >
                <ArrowDownCircle className="mr-2 h-4 w-4" />
                Withdraw
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(txn.created_at), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        txn.type === "deposit"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                      }
                    >
                      {txn.type === "deposit" ? "↑ Deposit" : "↓ Withdrawal"}
                    </Badge>
                  </TableCell>
                  <TableCell className={`font-semibold ${txn.type === "deposit" ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                    {txn.type === "deposit" ? "+" : "−"}₱{Number(txn.amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {txn.description || "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(txn)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    No transactions yet. Remittances will appear here automatically.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Deposit Dialog */}
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-green-600" />
              Deposit to Youth Fund
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (₱)</label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (Optional)</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Manual deposit, fundraiser"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositOpen(false)}>Cancel</Button>
            <Button
              onClick={handleDeposit}
              disabled={isLoading || !amount}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? "Saving..." : "Deposit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-red-600" />
              Withdraw from Youth Fund
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted px-4 py-2 text-sm">
              Available balance: <span className="font-semibold text-green-700 dark:text-green-400">₱{balance.toFixed(2)}</span>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (₱)</label>
              <Input
                type="number"
                step="0.01"
                max={balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
              {parseFloat(amount) > balance && (
                <p className="text-xs text-destructive">Amount exceeds available balance</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Purpose / Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Event expenses, supplies"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)}>Cancel</Button>
            <Button
              onClick={handleWithdraw}
              disabled={isLoading || !amount || parseFloat(amount) > balance}
              variant="destructive"
            >
              {isLoading ? "Processing..." : "Withdraw"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the ₱{deleteTarget && Number(deleteTarget.amount).toFixed(2)}{" "}
              {deleteTarget?.type} and reverse its effect on the Youth Fund balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}