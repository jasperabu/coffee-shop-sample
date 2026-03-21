"use client"

import { useState } from "react"
import type { CashSession } from "@/lib/types"
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
import { format, parseISO } from "date-fns"
import { Trash2 } from "lucide-react"

interface SessionHistoryProps {
  sessions: CashSession[]
  onDelete: (id: string) => void
}

export function SessionHistory({ sessions, onDelete }: SessionHistoryProps) {
  const [deleteTarget, setDeleteTarget] = useState<CashSession | null>(null)

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
                    {session.status === "closed" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(session)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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
    </>
  )
}
