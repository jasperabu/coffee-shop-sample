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
                        onClick={() => setSelectedSize(size)}
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
