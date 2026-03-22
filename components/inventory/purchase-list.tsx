"use client"

import { useState } from "react"
import type { Purchase, InventoryItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { format } from "date-fns"
import { getPhilippineDate } from "@/lib/utils"

interface Capital {
  id: string
  initial_amount: number
  current_balance: number
  notes: string | null
  created_at: string
  updated_at: string
}

interface PurchaseListProps {
  purchases: Purchase[]
  inventory: InventoryItem[]
  capital?: Capital | null
  onUpdate: (purchases: Purchase[]) => void
  onInventoryUpdate?: (inventory: InventoryItem[]) => void
  onCapitalUpdate?: (capital: Capital) => void
}

export function PurchaseList({ purchases, inventory, capital, onUpdate, onInventoryUpdate, onCapitalUpdate }: PurchaseListProps) {
  const supabase = createClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [inventoryItemId, setInventoryItemId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [cost, setCost] = useState("")
  const [supplier, setSupplier] = useState("")
  const [purchaseDate, setPurchaseDate] = useState(getPhilippineDate())

  const handleOpenDialog = () => {
    setInventoryItemId("")
    setQuantity("")
    setCost("")
    setSupplier("")
    setPurchaseDate(getPhilippineDate())
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!inventoryItemId || !quantity) return
    setIsLoading(true)

    try {
      const qty = parseFloat(quantity) || 0

      // 1. Create purchase record
      const { data: purchase, error } = await supabase
        .from("purchases")
        .insert({
          inventory_item_id: inventoryItemId,
          quantity: qty,
          cost: parseFloat(cost) || 0,
          supplier: supplier || null,
          purchase_date: purchaseDate,
        })
        .select(`*, inventory_item:inventory_items(*)`)
        .single()

      if (error) throw error

      // 2. Add quantity to inventory current_stock
      const item = inventory.find((i) => i.id === inventoryItemId)
      if (item) {
        const newStock = Number(item.current_stock) + qty
        const { error: stockError } = await supabase
          .from("inventory_items")
          .update({ current_stock: newStock, updated_at: new Date().toISOString() })
          .eq("id", inventoryItemId)

        if (stockError) throw stockError

        // 3. Update parent inventory state so Inventory Items tab reflects new stock immediately
        if (onInventoryUpdate) {
          onInventoryUpdate(
            inventory.map((i) =>
              i.id === inventoryItemId ? { ...i, current_stock: newStock } : i
            )
          )
        }

        toast.success(
          `Added ${qty} ${item.unit} of ${item.name} to inventory. New stock: ${newStock.toFixed(2)} ${item.unit}`
        )
      }

      // 3b. Deduct purchase cost from capital balance
      const purchaseCost = parseFloat(cost) || 0
      if (capital && purchaseCost > 0 && onCapitalUpdate) {
        const newBalance = Number(capital.current_balance) - purchaseCost
        const { data: updatedCapital, error: capitalError } = await supabase
          .from("capital")
          .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
          .eq("id", capital.id)
          .select()
          .single()
        if (!capitalError && updatedCapital) {
          onCapitalUpdate(updatedCapital)
          toast.info(`Capital deducted: ₱${purchaseCost.toFixed(2)} → Balance: ₱${newBalance.toFixed(2)}`)
        }
      }

      // 4. Update purchases list
      onUpdate([purchase, ...purchases])
      setDialogOpen(false)
    } catch (error) {
      console.error("Error saving purchase:", error)
      toast.error("Failed to record purchase")
    } finally {
      setIsLoading(false)
    }
  }

  const selectedItem = inventory.find((i) => i.id === inventoryItemId)

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Purchase History</CardTitle>
          <Button onClick={handleOpenDialog}>
            <Plus className="mr-2 h-4 w-4" /> Record Purchase
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Supplier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((purchase) => {
                const item = inventory.find((i) => i.id === purchase.inventory_item_id)
                return (
                  <TableRow key={purchase.id}>
                    <TableCell>{format(new Date(purchase.purchase_date), "MMM d, yyyy")}</TableCell>
                    <TableCell className="font-medium">
                      {purchase.inventory_item?.name || item?.name || "Unknown"}
                    </TableCell>
                    <TableCell>
                      {Number(purchase.quantity).toFixed(2)} {purchase.inventory_item?.unit || item?.unit || ""}
                    </TableCell>
                    <TableCell>₱{Number(purchase.cost).toFixed(2)}</TableCell>
                    <TableCell>{purchase.supplier || "—"}</TableCell>
                  </TableRow>
                )
              })}
              {purchases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No purchases recorded yet.
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
            <DialogTitle>Record Purchase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Inventory Item</label>
              <Select value={inventoryItemId} onValueChange={setInventoryItemId}>
                <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>
                  {inventory.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.unit}) — stock: {Number(item.current_stock).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Live preview of new stock */}
            {selectedItem && quantity && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm">
                <span className="text-muted-foreground">Current stock: </span>
                <span className="font-medium">{Number(selectedItem.current_stock).toFixed(2)} {selectedItem.unit}</span>
                <span className="text-muted-foreground mx-2">+</span>
                <span className="font-medium text-emerald-700">{parseFloat(quantity) || 0} {selectedItem.unit}</span>
                <span className="text-muted-foreground mx-2">=</span>
                <span className="font-bold text-emerald-700">
                  {(Number(selectedItem.current_stock) + (parseFloat(quantity) || 0)).toFixed(2)} {selectedItem.unit}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity</label>
                <Input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Cost (₱)</label>
                <Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Purchase Date</label>
              <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Supplier (Optional)</label>
              <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g., Local Supplier" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isLoading || !inventoryItemId || !quantity}>
              {isLoading ? "Saving..." : "Record Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}