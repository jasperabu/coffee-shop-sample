"use client"

import { useState } from "react"
import type { Remittance, CashSession } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Plus, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { getPhilippineDate } from "@/lib/utils"
import { toast } from "sonner"

interface RemittanceListProps {
  remittances: Remittance[]
  sessions: CashSession[]
  onUpdate: (remittances: Remittance[]) => void
}

export function RemittanceList({ remittances, sessions, onUpdate }: RemittanceListProps) {
  const supabase = createClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [amount, setAmount] = useState("")
  const [recipient, setRecipient] = useState("")
  const [notes, setNotes] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<Remittance | null>(null)

  const today = getPhilippineDate()
  const todaySession = sessions.find((s) => s.date === today && s.status === "open")

  const handleSave = async () => {
    if (!amount) return
    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from("remittances")
        .insert({
          session_id: todaySession?.id || null,
          amount: parseFloat(amount) || 0,
          recipient: recipient || null,
          notes: notes || null,
        })
        .select()
        .single()

      if (!error && data) {
        // Update session total remittance if there's an active session
        if (todaySession) {
          const newTotal = Number(todaySession.total_remittance) + (parseFloat(amount) || 0)
          await supabase
            .from("cash_sessions")
            .update({ total_remittance: newTotal })
            .eq("id", todaySession.id)
        }

        onUpdate([data, ...remittances])
        setDialogOpen(false)
        setAmount("")
        setRecipient("")
        setNotes("")
        toast.success("Remittance recorded")
      }
    } catch (error) {
      console.error("Error saving remittance:", error)
      toast.error("Failed to record remittance")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteRemittance = async () => {
    if (!deleteTarget) return
    setIsLoading(true)

    try {
      await supabase.from("remittances").delete().eq("id", deleteTarget.id)

      // Subtract amount from the linked session's total_remittance
      if (deleteTarget.session_id) {
        const session = sessions.find((s) => s.id === deleteTarget.session_id)
        if (session) {
          const newTotal = Math.max(0, Number(session.total_remittance) - Number(deleteTarget.amount))
          await supabase
            .from("cash_sessions")
            .update({ total_remittance: newTotal })
            .eq("id", deleteTarget.session_id)
        }
      }

      onUpdate(remittances.filter((r) => r.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success("Remittance removed")
    } catch (error) {
      console.error("Error deleting remittance:", error)
      toast.error("Failed to remove remittance")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Remittances</CardTitle>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Record Remittance
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {remittances.map((remittance) => (
                <TableRow key={remittance.id}>
                  <TableCell>
                    {format(new Date(remittance.created_at), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell className="font-medium">
                    ₱{Number(remittance.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>{remittance.recipient || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {remittance.notes || "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(remittance)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {remittances.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No remittances recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Remittance</DialogTitle>
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
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient (Optional)</label>
              <Input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g., Owner, Bank Deposit"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading || !amount}>
              {isLoading ? "Saving..." : "Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Remittance?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the ₱{deleteTarget && Number(deleteTarget.amount).toFixed(2)} remittance{deleteTarget?.recipient ? ` to ${deleteTarget.recipient}` : ""}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteRemittance}
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
