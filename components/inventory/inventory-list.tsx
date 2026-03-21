"use client"

import { useState } from "react"
import type { InventoryItem } from "@/lib/types"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react"

interface InventoryListProps {
  inventory: InventoryItem[]
  onUpdate: (inventory: InventoryItem[]) => void
}

const ITEM_TYPES = ["ingredient", "packaging", "equipment", "other"]
const UNITS = ["kg", "g", "L", "mL", "pcs", "bottle", "can", "bag", "box"]

export function InventoryList({ inventory, onUpdate }: InventoryListProps) {
  const supabase = createClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [name, setName] = useState("")
  const [type, setType] = useState("ingredient")
  const [unit, setUnit] = useState("pcs")
  const [currentStock, setCurrentStock] = useState("")
  const [lowStockThreshold, setLowStockThreshold] = useState("")
  const [costPerUnit, setCostPerUnit] = useState("")

  const handleOpenDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item)
      setName(item.name)
      setType(item.type)
      setUnit(item.unit)
      setCurrentStock(item.current_stock.toString())
      setLowStockThreshold(item.low_stock_threshold.toString())
      setCostPerUnit(item.cost_per_unit.toString())
    } else {
      setEditingItem(null)
      setName("")
      setType("ingredient")
      setUnit("pcs")
      setCurrentStock("")
      setLowStockThreshold("")
      setCostPerUnit("")
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setIsLoading(true)

    try {
      const itemData = {
        name,
        type,
        unit,
        current_stock: parseFloat(currentStock) || 0,
        low_stock_threshold: parseFloat(lowStockThreshold) || 0,
        cost_per_unit: parseFloat(costPerUnit) || 0,
      }

      if (editingItem) {
        const { data, error } = await supabase
          .from("inventory_items")
          .update(itemData)
          .eq("id", editingItem.id)
          .select()
          .single()

        if (!error && data) {
          onUpdate(inventory.map((i) => (i.id === data.id ? data : i)))
        }
      } else {
        const { data, error } = await supabase
          .from("inventory_items")
          .insert(itemData)
          .select()
          .single()

        if (!error && data) {
          onUpdate([...inventory, data])
        }
      }
      setDialogOpen(false)
    } catch (error) {
      console.error("Error saving item:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("inventory_items").delete().eq("id", id)
    if (!error) {
      onUpdate(inventory.filter((i) => i.id !== id))
    }
  }

  const isLowStock = (item: InventoryItem) => 
    Number(item.current_stock) <= Number(item.low_stock_threshold)

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Inventory Items</CardTitle>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Low Threshold</TableHead>
                <TableHead>Cost/Unit</TableHead>
                <TableHead>Value</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item) => (
                <TableRow key={item.id} className={isLowStock(item) ? "bg-destructive/5" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {item.name}
                      {isLowStock(item) && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.type}</Badge>
                  </TableCell>
                  <TableCell>
                    {Number(item.current_stock).toFixed(2)} {item.unit}
                  </TableCell>
                  <TableCell>
                    {Number(item.low_stock_threshold).toFixed(2)} {item.unit}
                  </TableCell>
                  <TableCell>₱{Number(item.cost_per_unit).toFixed(2)}</TableCell>
                  <TableCell>
                    ₱{(Number(item.current_stock) * Number(item.cost_per_unit)).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {inventory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No inventory items found. Add items to track your stock.
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
            <DialogTitle>
              {editingItem ? "Edit Inventory Item" : "Add Inventory Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Item Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Coffee Beans"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit</label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Stock</label>
                <Input
                  type="number"
                  step="0.01"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Low Stock Threshold</label>
                <Input
                  type="number"
                  step="0.01"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cost per Unit (₱)</label>
              <Input
                type="number"
                step="0.01"
                value={costPerUnit}
                onChange={(e) => setCostPerUnit(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading || !name.trim()}>
              {isLoading ? "Saving..." : editingItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
