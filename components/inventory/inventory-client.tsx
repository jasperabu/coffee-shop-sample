"use client"

import { useState } from "react"
import type { InventoryItem, Purchase } from "@/lib/types"
import { SidebarNav } from "@/components/sidebar-nav"
import { InventoryList } from "@/components/inventory/inventory-list"
import { PurchaseList } from "@/components/inventory/purchase-list"
import { PeriodList } from "@/components/inventory/period-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, ShoppingBag, AlertTriangle, Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface InventoryPeriod {
  id: string
  name: string | null
  start_date: string
  end_date: string | null
  status: string
  notes: string | null
  created_at: string
}

interface Capital {
  id: string
  initial_amount: number
  current_balance: number
  notes: string | null
  created_at: string
  updated_at: string
}

interface InventoryClientProps {
  initialInventory: InventoryItem[]
  initialPurchases: Purchase[]
  initialPeriods: InventoryPeriod[]
  initialCapital?: Capital | null
}

export function InventoryClient({
  initialInventory,
  initialPurchases,
  initialPeriods,
  initialCapital,
}: InventoryClientProps) {
  const [inventory, setInventory] = useState(initialInventory)
  const [purchases, setPurchases] = useState(initialPurchases)
  const [periods, setPeriods] = useState(initialPeriods)
  const [capital, setCapital] = useState(initialCapital ?? null)

  const lowStockItems = inventory.filter(
    (item) => Number(item.current_stock) <= Number(item.low_stock_threshold)
  )

  const totalValue = inventory.reduce(
    (sum, item) => sum + Number(item.current_stock) * Number(item.cost_per_unit),
    0
  )

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav />

      <main className="ml-64 flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground">Track stock levels, purchases, and usage</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{inventory.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                  <ShoppingBag className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold">₱{totalValue.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={lowStockItems.length > 0 ? "border-destructive/50" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${lowStockItems.length > 0 ? "bg-destructive/10" : "bg-muted"}`}>
                  <AlertTriangle className={`h-6 w-6 ${lowStockItems.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-bold">{lowStockItems.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="items" className="space-y-4" suppressHydrationWarning>
          <TabsList>
            <TabsTrigger value="items" className="gap-2">
              <Package className="h-4 w-4" /> Inventory Items
            </TabsTrigger>
            <TabsTrigger value="purchases" className="gap-2">
              <ShoppingBag className="h-4 w-4" /> Purchases
            </TabsTrigger>
            <TabsTrigger value="periods" className="gap-2">
              <Calendar className="h-4 w-4" /> Periods
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items">
            <InventoryList inventory={inventory} onUpdate={setInventory} />
          </TabsContent>

          <TabsContent value="purchases">
            <PurchaseList purchases={purchases} inventory={inventory} capital={capital} onUpdate={setPurchases} onInventoryUpdate={setInventory} onCapitalUpdate={setCapital} />
          </TabsContent>

          <TabsContent value="periods">
            <PeriodList periods={periods} inventory={inventory} onUpdate={setPeriods} onInventoryUpdate={setInventory} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}