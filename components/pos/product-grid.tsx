"use client"

import { useState } from "react"
import type { Product, Category, ProductSize, Addon } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Coffee, Snowflake, IceCream, Leaf, Cookie } from "lucide-react"

interface ProductGridProps {
  products: Product[]
  categories: Category[]
  addons: Addon[]
  onAddToCart: (product: Product, size: ProductSize | null, selectedAddons: Addon[]) => void
}

const categoryIcons: Record<string, React.ElementType> = {
  "Hot Coffee": Coffee,
  "Iced Coffee": Snowflake,
  "Frappe": IceCream,
  "Non-Coffee": Leaf,
  "Snacks": Cookie,
}

export function ProductGrid({ products, categories, addons, onAddToCart }: ProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([])

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category_id === selectedCategory)
    : products

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
    if (product.sizes && product.sizes.length > 0) {
      setSelectedSize(product.sizes[0])
    } else {
      setSelectedSize(null)
    }
    setSelectedAddons([])
    // Pre-fill recipe overrides with default quantities
    const productRecipes = recipes.filter(
      (r) => r.product_id === product.id && (r.size_id === null || r.size_id === defaultSize?.id)
    )
    const defaults: Record<string, number> = {}
    productRecipes.forEach((r) => { defaults[r.inventory_item_id] = Number(r.quantity_required) })
    setRecipeOverrides(defaults)
  }

  const handleAddonToggle = (addon: Addon) => {
    setSelectedAddons((prev) =>
      prev.find((a) => a.id === addon.id)
        ? prev.filter((a) => a.id !== addon.id)
        : [...prev, addon]
    )
  }

  const handleAddToCart = () => {
    if (selectedProduct) {
      onAddToCart(selectedProduct, selectedSize, selectedAddons)
      setSelectedProduct(null)
      setSelectedSize(null)
      setSelectedAddons([])
    }
  }

  const calculatePrice = () => {
    if (!selectedProduct) return 0
    let price = Number(selectedProduct.base_price)
    if (selectedSize) {
      price += Number(selectedSize.price_adjustment)
    }
    selectedAddons.forEach((addon) => {
      price += Number(addon.price)
    })
    return price
  }

  return (
    <div className="flex h-full flex-col">
      {/* Category Tabs */}
      <div className="border-b border-border bg-card px-4 py-3">
        <ScrollArea className="w-full">
          <div className="flex gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="whitespace-nowrap"
            >
              All
            </Button>
            {categories.map((category) => {
              const Icon = categoryIcons[category.name] || Coffee
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="whitespace-nowrap"
                >
                  <Icon className="mr-1.5 h-4 w-4" />
                  {category.name}
                </Button>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Product Grid */}
        <ScrollArea className="flex-1 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => {
              const Icon = product.category_id
                ? categoryIcons[categories.find((c) => c.id === product.category_id)?.name || ""] || Coffee
                : Coffee
              return (
                <Card
                  key={product.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedProduct?.id === product.id && "ring-2 ring-primary",
                    !product.is_available && "opacity-50"
                  )}
                  onClick={() => product.is_available && handleProductClick(product)}
                >
                  <CardContent className="p-3">
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                      <Icon className="h-6 w-6 text-secondary-foreground" />
                    </div>
                    <h3 className="text-sm font-medium leading-tight">{product.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-primary">
                      ₱{Number(product.base_price).toFixed(2)}
                    </p>
                    {!product.is_available && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        Unavailable
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </ScrollArea>

        {/* Product Customization Panel */}
        {selectedProduct && (
          <div className="w-72 border-l border-border bg-card p-4">
            <h3 className="text-lg font-semibold">{selectedProduct.name}</h3>
            <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>

            {/* Size Selection */}
            {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-medium">Size</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.sizes
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((size) => (
                      <Button
                        key={size.id}
                        variant={selectedSize?.id === size.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedSize(size)
                          const sizeRecipes = recipes.filter(
                            (r) => r.product_id === selectedProduct!.id && (r.size_id === null || r.size_id === size.id)
                          )
                          const defaults: Record<string, number> = {}
                          sizeRecipes.forEach((r) => { defaults[r.inventory_item_id] = Number(r.quantity_required) })
                          setRecipeOverrides(defaults)
                        }}
                      >
                        {size.size_name}
                        {Number(size.price_adjustment) > 0 && (
                          <span className="ml-1 text-xs opacity-70">
                            +₱{Number(size.price_adjustment).toFixed(0)}
                          </span>
                        )}
                      </Button>
                    ))}
                </div>
              </div>
            )}

            {/* Addons Selection */}
            {addons.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-medium">Add-ons</h4>
                <div className="flex flex-wrap gap-2">
                  {addons
                    .filter((a) => a.is_available)
                    .map((addon) => (
                      <Button
                        key={addon.id}
                        variant={selectedAddons.find((a) => a.id === addon.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleAddonToggle(addon)}
                      >
                        {addon.name}
                        <span className="ml-1 text-xs opacity-70">+₱{Number(addon.price).toFixed(0)}</span>
                      </Button>
                    ))}
                </div>
              </div>
            )}

            {/* Recipe / Ingredients — editable per order */}
            {(() => {
              const productRecipes = recipes.filter(
                (r) => r.product_id === selectedProduct.id &&
                (r.size_id === null || r.size_id === selectedSize?.id)
              )
              if (productRecipes.length === 0) return null
              return (
                <div className="mt-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <FlaskConical className="h-3.5 w-3.5 text-primary" />
                    <h4 className="text-sm font-medium">Ingredients</h4>
                    <span className="text-xs text-muted-foreground">(adjust for customization)</span>
                  </div>
                  <div className="space-y-2">
                    {productRecipes.map((recipe) => {
                      const item = recipe.inventory_item
                      if (!item) return null
                      const current = recipeOverrides[recipe.inventory_item_id] ?? Number(recipe.quantity_required)
                      return (
                        <div key={recipe.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                          <span className="flex-1 text-sm font-medium truncate">{item.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setRecipeOverrides(prev => ({
                                ...prev,
                                [recipe.inventory_item_id]: Math.max(0, Number((current - 0.1).toFixed(2)))
                              }))}
                              className="h-6 w-6 rounded-full border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={current}
                              onChange={(e) => setRecipeOverrides(prev => ({
                                ...prev,
                                [recipe.inventory_item_id]: parseFloat(e.target.value) || 0
                              }))}
                              className="w-14 h-6 text-center text-xs border border-border rounded bg-background"
                            />
                            <button
                              type="button"
                              onClick={() => setRecipeOverrides(prev => ({
                                ...prev,
                                [recipe.inventory_item_id]: Number((current + 0.1).toFixed(2))
                              }))}
                              className="h-6 w-6 rounded-full border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            <span className="text-xs text-muted-foreground w-6">{item.unit}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* Price and Add Button */}
            <div className="mt-6 border-t border-border pt-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium">Total</span>
                <span className="text-xl font-bold text-primary">₱{calculatePrice().toFixed(2)}</span>
              </div>
              <Button className="w-full" onClick={handleAddToCart}>
                Add to Order
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
