"use client"

import type { Product, Category } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useState } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface ProductListProps {
  products: Product[]
  categories: Category[]
  onEdit: (product: Product) => void
  onAdd: () => void
  onDelete: (id: string) => void
  onToggleAvailability: (id: string, available: boolean) => void
}

export function ProductList({
  products,
  categories,
  onEdit,
  onAdd,
  onDelete,
  onToggleAvailability,
}: ProductListProps) {
  const supabase = createClient()
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  const filteredProducts = selectedCategory === "all"
    ? products
    : products.filter((p) => p.category_id === selectedCategory)

  const handleToggle = async (product: Product) => {
    const newValue = !product.is_available
    const { error } = await supabase
      .from("products")
      .update({ is_available: newValue })
      .eq("id", product.id)

    if (!error) {
      onToggleAvailability(product.id, newValue)
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id)
    if (!error) {
      onDelete(id)
    }
  }

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Uncategorized"
    const category = categories.find(c => c.id === categoryId)
    return category?.name || "Unknown"
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <CardTitle>Products</CardTitle>
        <div className="flex items-center gap-3 ml-auto">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={onAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Base Price</TableHead>
              <TableHead>Sizes</TableHead>
              <TableHead>Available</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{getCategoryName(product.category_id)}</Badge>
                </TableCell>
                <TableCell>₱{Number(product.base_price).toFixed(2)}</TableCell>
                <TableCell>
                  {product.sizes && product.sizes.length > 0 ? (
                    <div className="flex gap-1">
                      {product.sizes.map(size => (
                        <Badge key={size.id} variant="outline" className="text-xs">
                          {size.size_name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">No sizes</span>
                  )}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={product.is_available}
                    onCheckedChange={() => handleToggle(product)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(product)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Product</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{product.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(product.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {selectedCategory === "all" ? "No products found. Add your first product to get started." : "No products in this category."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}