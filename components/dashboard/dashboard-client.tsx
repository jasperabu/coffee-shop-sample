"use client"

import { useState } from "react"
import type { InventoryItem, Order } from "@/lib/types"
import { SidebarNav } from "@/components/sidebar-nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts"
import {
  DollarSign, ShoppingCart, TrendingUp, AlertTriangle, Package,
  TrendingDown, Wallet, PiggyBank,
} from "lucide-react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface DashboardClientProps {
  dailySales: { date: string; sales: number; orders: number }[]
  topProducts: { name: string; quantity: number; revenue: number }[]
  lowStockItems: InventoryItem[]
  todaySales: number
  todayOrders: number
  weekSales: number
  weekOrders: number
  monthSales: number
  monthOrders: number
  recentOrders: Order[]
  totalExpenses: number
  totalCOGS: number
  totalProfit: number
  capitalBalance: number
  dailyBreakdown: { date: string; label: string; revenue: number; expenses: number; profit: number; orders: number }[]
}

export function DashboardClient({
  dailySales, topProducts, lowStockItems,
  todaySales, todayOrders, weekSales, weekOrders, monthSales, monthOrders,
  recentOrders, totalExpenses, totalCOGS, totalProfit, capitalBalance: initialCapitalBalance,
  dailyBreakdown,
}: DashboardClientProps) {
  const avgOrderValue = monthOrders > 0 ? monthSales / monthOrders : 0
  const [capitalBalance, setCapitalBalance] = useState(initialCapitalBalance)
  const [chartRange, setChartRange] = useState<7 | 14 | 30>(7)

  // Add revenue to capital when orders are made (called from outside, shown here for display)
  const profit = totalProfit
  const profitPositive = profit >= 0

  const filteredBreakdown = dailyBreakdown.slice(-chartRange)
  const filteredRevenue = filteredBreakdown.reduce((s, d) => s + d.revenue, 0)
  const filteredExpenses = filteredBreakdown.reduce((s, d) => s + d.expenses, 0)
  const filteredProfit = filteredRevenue - filteredExpenses
  const avgDaily = filteredBreakdown.length > 0 ? Math.round(filteredRevenue / filteredBreakdown.length) : 0

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav />
      <main className="ml-64 flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your coffee shop performance</p>
        </div>

        {/* ── Financial Summary Row ── */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Capital Balance</p>
                  <p className="text-2xl font-bold text-primary">₱{(capitalBalance ?? 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">current balance</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-emerald-600">₱{(monthSales ?? 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">this month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
                  <TrendingDown className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-500">₱{((totalExpenses ?? 0) + (totalCOGS ?? 0)).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    ₱{(totalExpenses ?? 0).toFixed(2)} purchases + ₱{(totalCOGS ?? 0).toFixed(2)} COGS
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={profitPositive ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={profitPositive ? "flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/15" : "flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/15"}>
                  <PiggyBank className={profitPositive ? "h-6 w-6 text-emerald-600" : "h-6 w-6 text-red-500"} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                  <p className={profitPositive ? "text-2xl font-bold text-emerald-600" : "text-2xl font-bold text-red-500"}>
                    {profitPositive ? "" : "-"}₱{(Math.abs(profit ?? 0)).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">revenue − expenses</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Sales Stats Row ── */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Today's Sales</p>
                  <p className="text-2xl font-bold">₱{todaySales.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{todayOrders} orders</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                  <TrendingUp className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-2xl font-bold">₱{weekSales.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{weekOrders} orders</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-3/10">
                  <ShoppingCart className="h-6 w-6 text-chart-3" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold">₱{(monthSales ?? 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{monthOrders} orders</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-4/10">
                  <Package className="h-6 w-6 text-chart-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Order Value</p>
                  <p className="text-2xl font-bold">₱{avgOrderValue.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">per order</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Day-to-Day Breakdown Chart */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>Day-to-Day Performance</CardTitle>
                <CardDescription>Revenue, expenses and profit over time</CardDescription>
              </div>
              <div className="flex gap-2">
                {([7, 14, 30] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setChartRange(r)}
                    className={chartRange === r
                      ? "text-xs px-3 py-1 rounded-md bg-primary text-primary-foreground border border-primary font-medium"
                      : "text-xs px-3 py-1 rounded-md bg-transparent text-muted-foreground border border-border hover:bg-muted"
                    }
                  >{r} days</button>
                ))}
              </div>
            </div>
            {/* Summary row */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-1">Revenue</p>
                <p className="text-xl font-medium text-emerald-700 dark:text-emerald-300">₱{filteredRevenue.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3">
                <p className="text-xs text-red-600 dark:text-red-400 mb-1">Expenses</p>
                <p className="text-xl font-medium text-red-600 dark:text-red-400">₱{filteredExpenses.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs mb-1 text-blue-700">Net Profit</p>
                <p className="text-xl font-medium text-blue-700">
                  {filteredProfit < 0 ? "-" : ""}&#8369;{Math.abs(filteredProfit).toLocaleString()}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={filteredBreakdown} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#888" }}
                    interval={chartRange > 14 ? 4 : chartRange > 7 ? 1 : 0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#888" }} tickFormatter={(v) => "₱" + v.toLocaleString()} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = { revenue: "Revenue", expenses: "Expenses", profit: "Profit" }
                      return ["₱" + Number(value).toLocaleString(), labels[name] || name]
                    }}
                    contentStyle={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <ReferenceLine y={0} stroke="rgba(128,128,128,0.3)" />
                  <Bar dataKey="revenue" name="revenue" fill="#1D9E75" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expenses" name="expenses" fill="#E24B4A" radius={[3, 3, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="profit"
                    stroke="#378ADD"
                    strokeWidth={2.5}
                    dot={{ fill: "#378ADD", r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#378ADD" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-4 flex-wrap" style={{ fontSize: "12px" }}>
              <span className="flex items-center gap-1 text-muted-foreground"><span style={{ width: 10, height: 10, borderRadius: 2, background: "#1D9E75", display: "inline-block" }} />Revenue</span>
              <span className="flex items-center gap-1 text-muted-foreground"><span style={{ width: 10, height: 10, borderRadius: 2, background: "#E24B4A", display: "inline-block" }} />Expenses</span>
              <span className="flex items-center gap-1 text-muted-foreground"><span style={{ width: 10, height: 3, background: "#378ADD", display: "inline-block", borderRadius: 2 }} />Profit</span>
              <span className="ml-auto text-muted-foreground">Avg daily: <span className="font-medium text-foreground">₱{avgDaily.toLocaleString()}</span></span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          {/* Sales Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Sales This Week</CardTitle>
              <CardDescription>Daily revenue for the past 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailySales}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(value) => `₱${value}`} />
                    <Tooltip
                      formatter={(value: number) => [`₱${value.toFixed(2)}`, "Sales"]}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }}
                    />
                    <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
              <CardDescription>Best performers this month</CardDescription>
            </CardHeader>
            <CardContent>
              {topProducts.length > 0 ? (
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={product.name} className="flex items-center gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.quantity} sold</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₱{product.revenue.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No sales data yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.order_number}</TableCell>
                      <TableCell>{order.customer_name || "Walk-in"}</TableCell>
                      <TableCell>{format(new Date(order.created_at), "h:mm a")}</TableCell>
                      <TableCell><Badge variant="secondary">{order.payment_method}</Badge></TableCell>
                      <TableCell className="text-right">₱{Number(order.total).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {recentOrders.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No orders yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          <Card className={lowStockItems.length > 0 ? "border-destructive/50" : ""}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {lowStockItems.length > 0 && <AlertTriangle className="h-5 w-5 text-destructive" />}
                <CardTitle>Low Stock Alert</CardTitle>
              </div>
              <CardDescription>Items that need restocking</CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Current</TableHead>
                      <TableHead>Threshold</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-destructive">{Number(item.current_stock).toFixed(1)} {item.unit}</TableCell>
                        <TableCell>{Number(item.low_stock_threshold).toFixed(1)} {item.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mb-2 opacity-20" />
                  <p>All items are well stocked</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}