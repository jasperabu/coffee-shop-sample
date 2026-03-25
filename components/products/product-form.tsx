"use client"

import { useState } from "react"
import type { Product, Category, InventoryItem, ProductSize } from "@/lib/types"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { Plus, Trash2, ArrowLeft, Package, FlaskConical } from "lucide-react"

interface ProductFormProps {
  product: Product | null
  categories: Category[]
  inventory: InventoryItem[]
  onSave: (product: Product) => void
  onCancel: () => void
}

interface RecipeRow {
  id?: string
  inventory_item_id: string
  quantity_required: number
  size_id?: string | null
}

interface SizeInput {
  id?: string
  size_name: string
  price_adjustment: number
  display_order: number
}

export function ProductForm({
  product,
  categories,
  inventory,
  onSave,
  onCancel,
}: ProductFormProps) {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState(product?.name || "")
  const [description, setDescription] = useState(product?.description || "")
  const [basePrice, setBasePrice] = useState(product?.base_price?.toString() || "")
  const [categoryId, setCategoryId] = useState(product?.category_id || "")
  const [isAvailable, setIsAvailable] = useState(product?.is_available ?? true)
  const [recipe, setRecipe] = useState<RecipeRow[]>([])
  const [loadingRecipe, setLoadingRecipe] = useState(false)

  // Load existing recipe on mount
  useState(() => {
    if (product?.id) {
      const supabaseClient = createClient()
      supabaseClient
        .from("product_recipes")
        .select("*")
        .eq("product_id", product.id)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setRecipe(data.map((r: any) => ({
              id: r.id,
              inventory_item_id: r.inventory_item_id,
              quantity_required: Number(r.quantity_required),
              size_id: r.size_id || null,
            })))
          }
        })
    }
  })

  const [sizes, setSizes] = useState<SizeInput[]>(
    product?.sizes?.map((s) => ({
      id: s.id,
      size_name: s.size_name,
      price_adjustment: Number(s.price_adjustment),
      display_order: s.display_order,
    })) || []
  )

  const handleAddSize = () => {
    setSizes([
      ...sizes,
      { size_name: "", price_adjustment: 0, display_order: sizes.length },
    ])
  }

  const handleRemoveSize = (index: number) => {
    setSizes(sizes.filter((_, i) => i !== index))
  }

  const handleSizeChange = (index: number, field: keyof SizeInput, value: string | number) => {
    setSizes(
      sizes.map((size, i) =>
        i === index ? { ...size, [field]: value } : size
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const productData = {
        name,
        description: description || null,
        base_price: parseFloat(basePrice) || 0,
        category_id: categoryId || null,
        is_available: isAvailable,
      }

      let savedProduct: Product

      if (product) {
        // Update existing product
        const { data, error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", product.id)
          .select(`*, category:categories(*), sizes:product_sizes(*)`)
          .single()

        if (error) throw error
        savedProduct = data

        // Delete existing sizes
        await supabase.from("product_sizes").delete().eq("product_id", product.id)
      } else {
        // Create new product
        const { data, error } = await supabase
          .from("products")
          .insert(productData)
          .select(`*, category:categories(*), sizes:product_sizes(*)`)
          .single()

        if (error) throw error
        savedProduct = data
      }

      // Insert sizes
      if (sizes.length > 0) {
        const sizesToInsert = sizes
          .filter((s) => s.size_name.trim())
          .map((s, index) => ({
            product_id: savedProduct.id,
            size_name: s.size_name,
            price_adjustment: s.price_adjustment,
            display_order: index,
          }))

        if (sizesToInsert.length > 0) {
          const { data: sizesData } = await supabase
            .from("product_sizes")
            .insert(sizesToInsert)
            .select()

          savedProduct.sizes = sizesData || []
        }
      }

      // Save recipe (ingredients) — resolve new size IDs by matching size_name
      await supabase.from("product_recipes").delete().eq("product_id", savedProduct.id)
      const validRecipe = recipe.filter((r) => r.inventory_item_id && r.quantity_required > 0)
      if (validRecipe.length > 0) {
        const savedSizes = savedProduct.sizes || []
        await supabase.from("product_recipes").insert(
          validRecipe.map((r) => {
            // If size_id starts with "new-", look up the real saved size ID by name
            let resolvedSizeId = r.size_id || null
            if (resolvedSizeId && resolvedSizeId.startsWith("new-")) {
              const sizeName = resolvedSizeId.replace("new-", "")
              const matchedSize = savedSizes.find((s: any) => s.size_name === sizeName)
              resolvedSizeId = matchedSize?.id || null
            }
            return {
              product_id: savedProduct.id,
              inventory_item_id: r.inventory_item_id,
              size_id: resolvedSizeId,
              quantity_required: r.quantity_required,
            }
          })
        )
      }

      toast.success(product ? "Product updated!" : "Product created!")
      onSave(savedProduct)
    } catch (error) {
      console.error("Error saving product:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>{product ? "Edit Product" : "Add New Product"}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Product Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Cafe Latte"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Base Price (₱)</label>
              <Input
                type="number"
                step="0.01"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Available</label>
              <div className="flex items-center gap-2 pt-2">
                <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
                <span className="text-sm text-muted-foreground">
                  {isAvailable ? "Product is available for sale" : "Product is hidden"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional product description"
              rows={2}
            />
          </div>

          {/* Sizes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Sizes</label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddSize}>
                <Plus className="mr-1 h-3 w-3" />
                Add Size
              </Button>
            </div>
            {sizes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sizes defined. Products without sizes will be sold at the base price.
              </p>
            ) : (
              <div className="space-y-2">
                {sizes.map((size, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Size name (e.g., Small)"
                      value={size.size_name}
                      onChange={(e) => handleSizeChange(index, "size_name", e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">+₱</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={size.price_adjustment}
                        onChange={(e) =>
                          handleSizeChange(index, "price_adjustment", parseFloat(e.target.value) || 0)
                        }
                        className="w-24"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSize(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recipe / Ingredients — per size */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              <label className="text-sm font-medium">Recipe / Ingredients</label>
            </div>
            <p className="text-xs text-muted-foreground">
              Set ingredients per size. When sold, quantities are auto-deducted from inventory.
              {sizes.length === 0 && " Add sizes above to set size-specific ingredients."}
            </p>

            {/* Group by: All Sizes (no size) + each individual size */}
            {[
              { label: "All Sizes (no size variant)", sizeId: null as string | null },
              ...sizes.filter(s => s.size_name.trim()).map(s => ({
                label: s.size_name,
                sizeId: s.id ?? `new-${s.size_name}`,
              }))
            ].map((group) => {
              const groupRows = recipe.filter((r) =>
                group.sizeId === null ? r.size_id === null || r.size_id === undefined
                : r.size_id === group.sizeId
              )
              return (
                <div key={group.sizeId ?? "no-size"} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {group.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{groupRows.length} ingredient{groupRows.length !== 1 ? "s" : ""}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setRecipe([...recipe, {
                        inventory_item_id: "",
                        quantity_required: 1,
                        size_id: group.sizeId,
                      }])}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>

                  {groupRows.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      No ingredients for this size. Click Add to link one.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {groupRows.map((row) => {
                        const globalIndex = recipe.indexOf(row)
                        const selectedItem = inventory.find((i) => i.id === row.inventory_item_id)
                        return (
                          <div key={globalIndex} className="flex items-center gap-2 rounded-md bg-background border px-2 py-1.5">
                            <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <Select
                              value={row.inventory_item_id}
                              onValueChange={(v) => setRecipe(recipe.map((r, i) => i === globalIndex ? { ...r, inventory_item_id: v } : r))}
                            >
                              <SelectTrigger className="flex-1 h-7 text-xs border-0 bg-transparent p-0 focus:ring-0">
                                <SelectValue placeholder="Select ingredient..." />
                              </SelectTrigger>
                              <SelectContent>
                                {inventory.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.name} ({item.unit}) — {Number(item.current_stock).toFixed(1)} in stock
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex items-center gap-1 shrink-0">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={row.quantity_required}
                                onChange={(e) => setRecipe(recipe.map((r, i) => i === globalIndex ? { ...r, quantity_required: parseFloat(e.target.value) || 0 } : r))}
                                className="w-16 h-7 text-xs text-center"
                              />
                              <span className="text-xs text-muted-foreground w-8 shrink-0">{selectedItem?.unit || "unit"}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                              onClick={() => setRecipe(recipe.filter((_, i) => i !== globalIndex))}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : product ? "Update Product" : "Create Product"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}