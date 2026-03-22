"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import type { InventoryItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Plus, ChevronDown, ChevronRight, Calendar, TrendingDown, DollarSign, Lock, Unlock, Trash2, ClipboardList, ShoppingCart, RefreshCw } from "lucide-react"

interface InventoryPeriod {
  id: string; name: string | null; start_date: string; end_date: string | null
  status: string; notes: string | null; created_at: string
}
interface BeginningInventoryRow {
  id: string; period_id: string; inventory_item_id: string; quantity: number
  created_at: string; inventory_item?: InventoryItem
}
interface ClosingRow {
  inventory_item_id: string; item_name: string; unit: string
  beginning_qty: number; purchases_qty: number; closing_qty: number
  used_qty: number; cost_per_unit: number; total_cost: number
}
interface PeriodDetail {
  period: InventoryPeriod; beginningInventory: BeginningInventoryRow[]
  closingRows: ClosingRow[]; totalCostOfGoods: number; totalPurchases: number
}
interface PeriodListProps {
  periods: InventoryPeriod[]; inventory: InventoryItem[]
  onUpdate: (periods: InventoryPeriod[]) => void
  onInventoryUpdate?: (inventory: InventoryItem[]) => void
}

export function PeriodList({ periods, inventory, onUpdate, onInventoryUpdate }: PeriodListProps) {
  const supabase = createClient()
  const [newPeriodOpen, setNewPeriodOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split("T")[0])
  const [newNotes, setNewNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [periodDetails, setPeriodDetails] = useState<Record<string, PeriodDetail>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [beginningDialogOpen, setBeginningDialogOpen] = useState(false)
  const [beginningPeriodId, setBeginningPeriodId] = useState<string | null>(null)
  const [beginningQtys, setBeginningQtys] = useState<Record<string, string>>({})
  const [isSavingBeginning, setIsSavingBeginning] = useState(false)
  const [closingDialogOpen, setClosingDialogOpen] = useState(false)
  const [closingPeriodId, setClosingPeriodId] = useState<string | null>(null)
  const [closingQtys, setClosingQtys] = useState<Record<string, string>>({})
  const [closingEndDate, setClosingEndDate] = useState(new Date().toISOString().split("T")[0])
  const [isSavingClosing, setIsSavingClosing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadPeriodDetail = async (period: InventoryPeriod) => {
    if (expandedId === period.id) { setExpandedId(null); return }
    if (periodDetails[period.id]) { setExpandedId(period.id); return }
    setLoadingId(period.id); setExpandedId(period.id)
    try {
      const { data: beginning } = await supabase.from("beginning_inventory").select("*, inventory_item:inventory_items(*)").eq("period_id", period.id)
      const { data: purchases } = await supabase.from("purchases").select("*, inventory_item:inventory_items(*)").eq("period_id", period.id)
      const totalPurchases = (purchases || []).reduce((sum, p) => sum + Number(p.cost), 0)
      const rows: ClosingRow[] = (beginning || []).map((b) => {
        const item = inventory.find((i) => i.id === b.inventory_item_id)
        const purchasedQty = (purchases || []).filter((p) => p.inventory_item_id === b.inventory_item_id).reduce((s, p) => s + Number(p.quantity), 0)
        const begQty = Number(b.quantity)
        let closing_qty = 0, used_qty = 0, total_cost = 0
        if (period.status === "closed") {
          closing_qty = item ? Number(item.current_stock) : 0
          used_qty = Math.max(0, begQty + purchasedQty - closing_qty)
          total_cost = used_qty * Number(item?.cost_per_unit ?? 0)
        }
        return { inventory_item_id: b.inventory_item_id, item_name: item?.name ?? "Unknown", unit: item?.unit ?? "", beginning_qty: begQty, purchases_qty: purchasedQty, closing_qty, used_qty, cost_per_unit: Number(item?.cost_per_unit ?? 0), total_cost }
      })
      const totalCostOfGoods = rows.reduce((sum, r) => sum + r.total_cost, 0)
      setPeriodDetails((prev) => ({ ...prev, [period.id]: { period, beginningInventory: beginning || [], closingRows: rows, totalCostOfGoods, totalPurchases } }))
    } catch { toast.error("Failed to load period details") }
    finally { setLoadingId(null) }
  }

  const handleCreatePeriod = async () => {
    if (!newStartDate) return; setIsSaving(true)
    try {
      const { data, error } = await supabase.from("inventory_periods").insert({ name: newName || null, start_date: newStartDate, notes: newNotes || null, status: "open" }).select().single()
      if (error) throw error
      onUpdate([data, ...periods]); toast.success("Period created!"); setNewPeriodOpen(false); setNewName(""); setNewNotes("")
    } catch { toast.error("Failed to create period") } finally { setIsSaving(false) }
  }

  // Auto-fill beginning from current inventory stock
  const openBeginningDialog = (periodId: string) => {
    const detail = periodDetails[periodId]
    const initQtys: Record<string, string> = {}
    inventory.forEach((item) => {
      const existing = detail?.beginningInventory.find((b) => b.inventory_item_id === item.id)
      initQtys[item.id] = existing ? String(existing.quantity) : String(Number(item.current_stock))
    })
    setBeginningQtys(initQtys); setBeginningPeriodId(periodId); setBeginningDialogOpen(true)
  }

  const handleSaveBeginning = async () => {
    if (!beginningPeriodId) return; setIsSavingBeginning(true)
    try {
      const rows = inventory.filter((item) => beginningQtys[item.id] !== "" && parseFloat(beginningQtys[item.id] || "0") >= 0).map((item) => ({ period_id: beginningPeriodId, inventory_item_id: item.id, quantity: parseFloat(beginningQtys[item.id] || "0") }))
      const { error } = await supabase.from("beginning_inventory").upsert(rows, { onConflict: "period_id,inventory_item_id" })
      if (error) throw error
      setPeriodDetails((prev) => { const c = { ...prev }; delete c[beginningPeriodId!]; return c })
      const period = periods.find((p) => p.id === beginningPeriodId)
      if (period) { setExpandedId(null); await loadPeriodDetail(period) }
      toast.success("Beginning inventory saved!"); setBeginningDialogOpen(false)
    } catch { toast.error("Failed to save beginning inventory") } finally { setIsSavingBeginning(false) }
  }

  // Prefill closing with current stock
  const openClosingDialog = (periodId: string) => {
    const detail = periodDetails[periodId]
    const initQtys: Record<string, string> = {}
    ;(detail?.closingRows || []).forEach((row) => {
      const item = inventory.find((i) => i.id === row.inventory_item_id)
      initQtys[row.inventory_item_id] = item ? String(Number(item.current_stock)) : "0"
    })
    setClosingQtys(initQtys); setClosingPeriodId(periodId); setClosingEndDate(new Date().toISOString().split("T")[0]); setClosingDialogOpen(true)
  }

  const handleSaveClosing = async () => {
    if (!closingPeriodId) return; setIsSavingClosing(true)
    try {
      const detail = periodDetails[closingPeriodId]
      if (!detail) throw new Error("No detail")
      const updatedRows: ClosingRow[] = detail.closingRows.map((row) => {
        const closingQty = parseFloat(closingQtys[row.inventory_item_id] || "0") || 0
        const usedQty = Math.max(0, row.beginning_qty + row.purchases_qty - closingQty)
        return { ...row, closing_qty: closingQty, used_qty: usedQty, total_cost: usedQty * row.cost_per_unit }
      })
      const totalCostOfGoods = updatedRows.reduce((sum, r) => sum + r.total_cost, 0)
      // 1. Close period
      const { error } = await supabase.from("inventory_periods").update({ status: "closed", end_date: closingEndDate }).eq("id", closingPeriodId)
      if (error) throw error
      // 2. Update inventory current_stock to closing quantities
      await Promise.all(updatedRows.map((row) => supabase.from("inventory_items").update({ current_stock: row.closing_qty, updated_at: new Date().toISOString() }).eq("id", row.inventory_item_id)))
      // 3. Log usage
      await Promise.all(updatedRows.filter((row) => row.used_qty > 0).map((row) => supabase.from("usage_logs").insert({ period_id: closingPeriodId, inventory_item_id: row.inventory_item_id, quantity: row.used_qty, source: "period_close", notes: `Period closed on ${closingEndDate}` })))
      // 4. Update local states
      onUpdate(periods.map((p) => p.id === closingPeriodId ? { ...p, status: "closed", end_date: closingEndDate } : p))
      if (onInventoryUpdate) onInventoryUpdate(inventory.map((item) => { const row = updatedRows.find((r) => r.inventory_item_id === item.id); return row ? { ...item, current_stock: row.closing_qty } : item }))
      setPeriodDetails((prev) => ({ ...prev, [closingPeriodId]: { ...detail, closingRows: updatedRows, totalCostOfGoods } }))
      toast.success(`Period closed! Cost of goods used: ₱${totalCostOfGoods.toFixed(2)}`); setClosingDialogOpen(false)
    } catch (err) { console.error(err); toast.error("Failed to close period") } finally { setIsSavingClosing(false) }
  }

  const handleReopen = async (periodId: string) => {
    try {
      await supabase.from("inventory_periods").update({ status: "open", end_date: null }).eq("id", periodId)
      onUpdate(periods.map((p) => p.id === periodId ? { ...p, status: "open", end_date: null } : p))
      setPeriodDetails((prev) => { const c = { ...prev }; delete c[periodId]; return c }); toast.success("Period reopened")
    } catch { toast.error("Failed to reopen period") }
  }

  const handleDelete = async () => {
    if (!deletingId) return; setIsDeleting(true)
    try {
      await supabase.from("inventory_periods").delete().eq("id", deletingId)
      onUpdate(periods.filter((p) => p.id !== deletingId))
      setPeriodDetails((prev) => { const c = { ...prev }; delete c[deletingId!]; return c }); toast.success("Period deleted"); setDeletingId(null)
    } catch { toast.error("Failed to delete period") } finally { setIsDeleting(false) }
  }

  const liveClosingTotal = closingPeriodId
    ? (periodDetails[closingPeriodId]?.closingRows || []).reduce((sum, row) => { const cq = parseFloat(closingQtys[row.inventory_item_id] || "0") || 0; const used = Math.max(0, row.beginning_qty + row.purchases_qty - cq); return sum + used * row.cost_per_unit }, 0)
    : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Inventory Periods</h2>
          <p className="text-sm text-muted-foreground">Beginning stock auto-fills from current inventory. Closing a period sets stock to actual counts.</p>
        </div>
        <Button onClick={() => setNewPeriodOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Period</Button>
      </div>

      {periods.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium">No periods yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Create your first inventory period to start tracking</p>
          <Button className="mt-4" onClick={() => setNewPeriodOpen(true)}><Plus className="h-4 w-4 mr-2" /> Create Period</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {periods.map((period) => {
            const detail = periodDetails[period.id]; const isExpanded = expandedId === period.id; const isLoadingThis = loadingId === period.id
            return (
              <Collapsible key={period.id} open={isExpanded} onOpenChange={() => loadPeriodDetail(period)}>
                <Card>
                  <CollapsibleTrigger className="w-full" asChild>
                    <div className="p-4 cursor-pointer hover:bg-muted/40 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold">{period.name || `Period — ${format(parseISO(period.start_date), "MMM d, yyyy")}`}</span>
                              <Badge className={period.status === "open" ? "bg-emerald-500/20 text-emerald-700 border-emerald-500/30" : "bg-slate-500/20 text-slate-600 border-slate-400/30"}>{period.status === "open" ? "Open" : "Closed"}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mt-0.5">{format(parseISO(period.start_date), "MMM d, yyyy")}{period.end_date ? ` → ${format(parseISO(period.end_date), "MMM d, yyyy")}` : " → present"}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {detail && detail.totalCostOfGoods > 0 && (<div className="text-right mr-2 hidden sm:block"><div className="text-xs text-muted-foreground">Cost of Goods Used</div><div className="font-bold text-primary">₱{detail.totalCostOfGoods.toFixed(2)}</div></div>)}
                          {period.status === "open" && (<>
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); openBeginningDialog(period.id) }}><ClipboardList className="h-3 w-3 mr-1" /> Set Beginning</Button>
                            <Button variant="default" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); openClosingDialog(period.id) }}><Lock className="h-3 w-3 mr-1" /> Close Period</Button>
                          </>)}
                          {period.status === "closed" && (<Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleReopen(period.id) }}><Unlock className="h-3 w-3 mr-1" /> Reopen</Button>)}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); setDeletingId(period.id) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t bg-muted/20 p-4 space-y-4">
                      {isLoadingThis ? (<div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>) : detail ? (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="rounded-lg bg-background border p-3"><div className="flex items-center gap-2 mb-1"><ClipboardList className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Beginning Items</span></div><p className="font-bold text-lg">{detail.beginningInventory.length}</p></div>
                            <div className="rounded-lg bg-background border p-3"><div className="flex items-center gap-2 mb-1"><ShoppingCart className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Purchases</span></div><p className="font-bold text-lg">₱{detail.totalPurchases.toFixed(2)}</p></div>
                            <div className="rounded-lg bg-background border p-3"><div className="flex items-center gap-2 mb-1"><TrendingDown className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Items Tracked</span></div><p className="font-bold text-lg">{detail.closingRows.length}</p></div>
                            <div className="rounded-lg bg-primary/10 border border-primary/20 p-3"><div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-primary" /><span className="text-xs text-primary font-medium">Cost of Goods Used</span></div><p className="font-bold text-lg text-primary">₱{detail.totalCostOfGoods.toFixed(2)}</p></div>
                          </div>
                          {detail.closingRows.length > 0 ? (
                            <div className="rounded-lg border overflow-hidden">
                              <Table>
                                <TableHeader><TableRow className="bg-muted/50"><TableHead>Item</TableHead><TableHead className="text-right">Beginning</TableHead><TableHead className="text-right">+ Purchases</TableHead><TableHead className="text-right">Closing</TableHead><TableHead className="text-right">Used</TableHead><TableHead className="text-right">₱/Unit</TableHead><TableHead className="text-right font-semibold text-primary">Total Cost</TableHead></TableRow></TableHeader>
                                <TableBody>
                                  {detail.closingRows.map((row) => (
                                    <TableRow key={row.inventory_item_id}>
                                      <TableCell className="font-medium">{row.item_name}<span className="text-xs text-muted-foreground ml-1">({row.unit})</span></TableCell>
                                      <TableCell className="text-right">{row.beginning_qty}</TableCell>
                                      <TableCell className="text-right text-emerald-600">+{row.purchases_qty}</TableCell>
                                      <TableCell className="text-right">{period.status === "closed" ? row.closing_qty : <span className="text-muted-foreground text-xs">pending</span>}</TableCell>
                                      <TableCell className="text-right font-medium text-amber-600">{period.status === "closed" ? row.used_qty.toFixed(2) : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                                      <TableCell className="text-right text-muted-foreground">₱{row.cost_per_unit.toFixed(2)}</TableCell>
                                      <TableCell className="text-right font-bold text-primary">{period.status === "closed" ? `₱${row.total_cost.toFixed(2)}` : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                                    </TableRow>
                                  ))}
                                  {detail.totalCostOfGoods > 0 && (<TableRow className="bg-primary/5"><TableCell colSpan={6} className="text-right font-bold text-primary">Total Cost of Goods Used</TableCell><TableCell className="text-right font-bold text-primary text-lg">₱{detail.totalCostOfGoods.toFixed(2)}</TableCell></TableRow>)}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (<div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No beginning inventory set yet. Click <strong>Set Beginning</strong> to record opening stock.</div>)}
                          {period.notes && <p className="text-sm text-muted-foreground italic">{period.notes}</p>}
                        </>
                      ) : null}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )
          })}
        </div>
      )}

      <Dialog open={newPeriodOpen} onOpenChange={setNewPeriodOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Inventory Period</DialogTitle><DialogDescription>Define the start of a new tracking period.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1"><Label>Period Name (optional)</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Week 1 March 2026" /></div>
            <div className="space-y-1"><Label>Start Date</Label><Input type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} /></div>
            <div className="space-y-1"><Label>Notes (optional)</Label><Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Any notes..." rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setNewPeriodOpen(false)}>Cancel</Button><Button onClick={handleCreatePeriod} disabled={isSaving || !newStartDate}>{isSaving ? "Creating..." : "Create Period"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={beginningDialogOpen} onOpenChange={setBeginningDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Set Beginning Inventory</DialogTitle><DialogDescription>Pre-filled from current stock. Adjust if needed.</DialogDescription></DialogHeader>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <RefreshCw className="h-4 w-4 text-blue-600 shrink-0" />
              <p className="text-xs text-blue-700">Values auto-filled from current inventory stock. Adjust if your actual count differs.</p>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader><TableRow className="bg-muted/50"><TableHead>Item</TableHead><TableHead className="text-right text-xs text-muted-foreground">Current Stock</TableHead><TableHead className="w-28">Beginning Qty</TableHead></TableRow></TableHeader>
                <TableBody>
                  {inventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell><div className="font-medium">{item.name}</div><div className="text-xs text-muted-foreground">{item.unit} · ₱{Number(item.cost_per_unit).toFixed(2)}/unit</div></TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{Number(item.current_stock).toFixed(2)}</TableCell>
                      <TableCell><Input type="number" step="0.01" value={beginningQtys[item.id] ?? ""} onChange={(e) => setBeginningQtys({ ...beginningQtys, [item.id]: e.target.value })} placeholder="0" className="h-8 w-24 text-sm" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setBeginningDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveBeginning} disabled={isSavingBeginning}>{isSavingBeginning ? "Saving..." : "Save Beginning Inventory"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closingDialogOpen} onOpenChange={setClosingDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Close Period — Enter Closing Inventory</DialogTitle><DialogDescription>Count your actual stock. <strong className="text-foreground">Inventory will be updated to these closing quantities.</strong></DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1"><Label>End Date</Label><Input type="date" value={closingEndDate} onChange={(e) => setClosingEndDate(e.target.value)} /></div>
            {closingPeriodId && (periodDetails[closingPeriodId]?.closingRows || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No beginning inventory set. Click <strong>Set Beginning</strong> first.</p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead>Item</TableHead><TableHead className="text-right text-xs">Beg + Purchased</TableHead><TableHead className="w-28">Actual Closing</TableHead><TableHead className="text-right text-xs">Used / Cost</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(closingPeriodId ? periodDetails[closingPeriodId]?.closingRows ?? [] : []).map((row) => {
                      const cq = parseFloat(closingQtys[row.inventory_item_id] || "0") || 0
                      const usedEst = Math.max(0, row.beginning_qty + row.purchases_qty - cq)
                      return (
                        <TableRow key={row.inventory_item_id}>
                          <TableCell><div className="font-medium">{row.item_name}</div><div className="text-xs text-muted-foreground">{row.unit} · ₱{row.cost_per_unit.toFixed(2)}/unit</div></TableCell>
                          <TableCell className="text-right text-sm">{row.beginning_qty} + {row.purchases_qty} = <strong>{row.beginning_qty + row.purchases_qty}</strong></TableCell>
                          <TableCell><Input type="number" step="0.01" value={closingQtys[row.inventory_item_id] ?? ""} onChange={(e) => setClosingQtys({ ...closingQtys, [row.inventory_item_id]: e.target.value })} placeholder="0" className="h-8 w-24 text-sm" /></TableCell>
                          <TableCell className="text-right"><div className="font-medium text-amber-600">{usedEst.toFixed(2)}</div><div className="text-xs text-muted-foreground">₱{(usedEst * row.cost_per_unit).toFixed(2)}</div></TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            {closingPeriodId && (periodDetails[closingPeriodId]?.closingRows || []).length > 0 && (
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 flex items-center justify-between">
                <div><p className="text-sm font-medium text-primary">Total Cost of Goods Used</p><p className="text-xs text-muted-foreground">Stock will update to closing quantities</p></div>
                <p className="text-2xl font-bold text-primary">₱{liveClosingTotal.toFixed(2)}</p>
              </div>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setClosingDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveClosing} disabled={isSavingClosing}><Lock className="h-4 w-4 mr-1" />{isSavingClosing ? "Closing..." : "Close Period & Update Stock"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this period?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the period and its beginning inventory records.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isDeleting ? "Deleting..." : "Delete"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}