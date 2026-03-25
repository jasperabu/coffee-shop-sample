"use client"

import { useState } from "react"
import type { Product, Category, Addon, InventoryItem } from "@/lib/types"
import { SidebarNav, useSidebarWidth } from "@/components/sidebar-nav"
import { ProductList } from "@/components/products/product-list"
import { ProductForm } from "@/components/products/product-form"
import { AddonList } from "@/components/products/addon-list"
import { CategoryList } from "@/components/products/category-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Coffee, Tags, Layers } from "lucide-react"

interface ProductsClientProps {
  initialCategories: Category[]
  initialProducts: Product[]
  initialAddons: Addon[]
  initialInventory: InventoryItem[]
}

export function ProductsClient({
  initialCategories,
  initialProducts,
  initialAddons,
  initialInventory,
}: ProductsClientProps) {
  const sidebarWidth = useSidebarWidth()
  const [products, setProducts] = useState(initialProducts)
  const [categories, setCategories] = useState(initialCategories)
  const [addons, setAddons] = useState(initialAddons)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav />
      
      <main className="flex-1 p-6 transition-all duration-300 ease-in-out" style={{ marginLeft: sidebarWidth }}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Products Management</h1>
          <p className="text-muted-foreground">Manage your menu items, categories, and add-ons</p>
        </div>

        <Tabs defaultValue="products" className="space-y-4">
          <TabsList>
            <TabsTrigger value="products" className="gap-2">
              <Coffee className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <Layers className="h-4 w-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="addons" className="gap-2">
              <Tags className="h-4 w-4" />
              Add-ons
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            {showForm ? (
              <ProductForm
                product={editingProduct}
                categories={categories}
                inventory={initialInventory}
                onSave={(product) => {
                  if (editingProduct) {
                    setProducts(products.map(p => p.id === product.id ? product : p))
                  } else {
                    setProducts([...products, product])
                  }
                  setShowForm(false)
                  setEditingProduct(null)
                }}
                onCancel={() => {
                  setShowForm(false)
                  setEditingProduct(null)
                }}
              />
            ) : (
              <ProductList
                products={products}
                categories={categories}
                onEdit={(product) => {
                  setEditingProduct(product)
                  setShowForm(true)
                }}
                onAdd={() => {
                  setEditingProduct(null)
                  setShowForm(true)
                }}
                onDelete={(id) => {
                  setProducts(products.filter(p => p.id !== id))
                }}
                onToggleAvailability={(id, available) => {
                  setProducts(products.map(p => 
                    p.id === id ? { ...p, is_available: available } : p
                  ))
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="categories">
            <CategoryList
              categories={categories}
              onUpdate={setCategories}
            />
          </TabsContent>

          <TabsContent value="addons">
            <AddonList
              addons={addons}
              onUpdate={setAddons}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}