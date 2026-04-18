"use client"

import { useState, useEffect } from "react"
import type { CashSession, CashDenomination } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { format, parseISO } from "date-fns"
import { Trash2, Info, Loader2 } from "lucide-react"

interface SessionHistoryProps {
  sessions: CashSession[]
  onDelete: (id: string) => void
}

export function SessionHistory({ sessions, onDelete }: SessionHistoryProps) {
  const [deleteTarget, setDeleteTarget] = useState<CashSession | null>(null)
  const [selectedSession, setSelectedSession] = useState<CashSession | null>(null)
  const [denominations, setDenominations] = useState<CashDenomination[]>([])
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  useEffect(() => {
    if (selectedSession) {
      const fetchDenominations = async () => {
        setIsLoadingDetails(true)
        const supabase = createClient()
        const { data } = await supabase
          .from("cash_denominations")
          .select("*")
          .eq("session_id", selectedSession.id)
          .order("denomination", { ascending: false })
        
        if (data) {
          setDenominations(data)
        }
        setIsLoadingDetails(false)
      }
      fetchDenominations()
    } else {
      setDenominations([])
    }
  }, [selectedSession])

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Opening</TableHead>
                <TableHead>Sales</TableHead>
                <TableHead>Closing</TableHead>
                <TableHead>Difference</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">
                    {format(parseISO(session.date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={session.status === "open" ? "default" : "secondary"}>
                      {session.status}
                    </Badge>
                  </TableCell>
                  <TableCell>₱{Number(session.opening_cash).toFixed(2)}</TableCell>
                  <TableCell>₱{Number(session.total_sales).toFixed(2)}</TableCell>
                  <TableCell>
                    {session.closing_cash !== null
                      ? `₱${Number(session.closing_cash).toFixed(2)}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {session.difference !== null ? (
                      <span
                        className={
                          Number(session.difference) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        ₱{Number(session.difference).toFixed(2)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        onClick={() => setSelectedSession(session)}
                        title="View Cash Count Details"
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                      {session.status === "closed" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(session)}
                          title="Delete Session"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No session history available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the session for {deleteTarget && format(parseISO(deleteTarget.date), "MMM d, yyyy")}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  onDelete(deleteTarget.id)
                  setDeleteTarget(null)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cash Count Details</DialogTitle>
            <DialogDescription>
              {selectedSession && `Session from ${format(parseISO(selectedSession.date), "MMM d, yyyy")}`}
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingDetails ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : denominations.length > 0 ? (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Denomination</TableHead>
                    <TableHead className="text-center">Count</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {denominations.filter(d => d.count > 0).map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">₱{Number(d.denomination).toFixed(2)}</TableCell>
                      <TableCell className="text-center">{d.count}</TableCell>
                      <TableCell className="text-right">₱{Number(d.total).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={2}>Grand Total</TableCell>
                    <TableCell className="text-right">
                      ₱{denominations.reduce((sum, d) => sum + Number(d.total), 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
              <Info className="h-8 w-8 mx-auto mb-3 opacity-20" />
              <p>No cash count details found for this session.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
