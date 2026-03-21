"use client"

import { useState } from "react"
import type { Addon } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
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
import { createClient } from "@/lib/supabase/client"
import { Plus, Pencil, Trash2 } from "lucide-react"

interface AddonListProps {
  addons: Addon[]
  onUpdate: (addons: Addon[]) => void
}

export function AddonList({ addons, onUpdate }: AddonListProps) {
  const supabase = createClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null)
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleOpenDialog = (addon?: Addon) => {
    if (addon) {
      setEditingAddon(addon)
      setName(addon.name)
      setPrice(addon.price.toString())
    } else {
      setEditingAddon(null)
      setName("")
      setPrice("")
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setIsLoading(true)

    try {
      const addonData = {
        name,
        price: parseFloat(price) || 0,
      }

      if (editingAddon) {
        const { data, error } = await supabase
          .from("addons")
          .update(addonData)
          .eq("id", editingAddon.id)
          .select()
          .single()

        if (!error && data) {
          onUpdate(addons.map((a) => (a.id === data.id ? data : a)))
        }
      } else {
        const { data, error } = await supabase
          .from("addons")
          .insert({ ...addonData, is_available: true })
          .select()
          .single()

        if (!error && data) {
          onUpdate([...addons, data])
        }
      }
      setDialogOpen(false)
    } catch (error) {
      console.error("Error saving addon:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = async (addon: Addon) => {
    const newValue = !addon.is_available
    const { error } = await supabase
      .from("addons")
      .update({ is_available: newValue })
      .eq("id", addon.id)

    if (!error) {
      onUpdate(addons.map((a) => (a.id === addon.id ? { ...a, is_available: newValue } : a)))
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("addons").delete().eq("id", id)
    if (!error) {
      onUpdate(addons.filter((a) => a.id !== id))
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Add-ons</CardTitle>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Add-on
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Available</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {addons.map((addon) => (
                <TableRow key={addon.id}>
                  <TableCell className="font-medium">{addon.name}</TableCell>
                  <TableCell>₱{Number(addon.price).toFixed(2)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={addon.is_available}
                      onCheckedChange={() => handleToggle(addon)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(addon)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(addon.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {addons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No add-ons found. Add extras like syrups, milk alternatives, etc.
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
              {editingAddon ? "Edit Add-on" : "Add Add-on"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Add-on Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Extra Shot"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Price (₱)</label>
              <Input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading || !name.trim()}>
              {isLoading ? "Saving..." : editingAddon ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
