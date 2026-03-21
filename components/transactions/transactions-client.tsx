"use client"

import { useState, useMemo } from "react"
import { format, parseISO, startOfDay, endOfDay, subDays, isWithinInterval } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { SidebarNav, useSidebarWidth } from "@/components/sidebar-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Receipt,
  Search,
  ChevronDown,
  ChevronRight,
  Calendar,
  ShoppingBag,
  Banknote,
  CreditCard,
  Clock,
  AlertCircle,
  Pencil,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { getPhilippineDate } from "@/lib/utils"

const PH_TIMEZONE = "Asia/Manila"

interface OrderItemAddon {
  id: string
  addon: { name: string } | null
  price: number
}

interface OrderItem {
  id: string
  quantity: number
  unit_price: number
  total_price: number
  notes: string | null
  product: { name: string } | null
  size: { size_name: string } | null
  addons: OrderItemAddon[]
}

interface Order {
  id: string
  order_number: number
  customer_name: string | null
  subtotal: number
  total: number
  payment_method: string
  amount_received: number | null
  change_amount: number | null
  status: string
  payment_status: 'paid' | 'partially_paid' | 'unpaid'
  amount_paid: number
  notes: string | null
  created_at: string
  items: OrderItem[]
}

interface TransactionsClientProps {
  initialOrders: Order[]
}

type DateFilter = "today" | "yesterday" | "last7days" | "last30days" | "all"
type PaymentFilter = "all" | "cash" | "gcash" | "card"
type PaymentStatusFilter = "all" | "paid" | "partially_paid" | "unpaid"

export function TransactionsClient({ initialOrders }: TransactionsClientProps) {
  const sidebarWidth = useSidebarWidth()
  const [dateFilter, setDateFilter] = useState<DateFilter>("today")
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [orders, setOrders] = useState(initialOrders)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [editPaymentStatus, setEditPaymentStatus] = useState<'paid' | 'partially_paid' | 'unpaid'>('paid')
  const [editAmountPaid, setEditAmountPaid] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  // Get Philippine date for filtering
  const now = new Date()
  const phNow = toZonedTime(now, PH_TIMEZONE)

  // Stats (all-time)
  const stats = useMemo(() => {
    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0)
    
    const todayStart = startOfDay(phNow)
    const todayEnd = endOfDay(phNow)
    
    const todayOrders = orders.filter((o) => {
      const orderDate = toZonedTime(new Date(o.created_at), PH_TIMEZONE)
      return isWithinInterval(orderDate, { start: todayStart, end: todayEnd })
    })
    
    const todayOrdersCount = todayOrders.length
    const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total), 0)
    
    return { totalOrders, totalRevenue, todayOrdersCount, todayRevenue }
  }, [orders, phNow])

  // Filter orders
  const filteredOrders = useMemo(() => {
    let filtered = [...orders]

    // Date filter
    if (dateFilter !== "all") {
      const todayStart = startOfDay(phNow)
      const todayEnd = endOfDay(phNow)

      filtered = filtered.filter((order) => {
        const orderDate = toZonedTime(new Date(order.created_at), PH_TIMEZONE)

        switch (dateFilter) {
          case "today":
            return isWithinInterval(orderDate, { start: todayStart, end: todayEnd })
          case "yesterday":
            const yesterdayStart = startOfDay(subDays(phNow, 1))
            const yesterdayEnd = endOfDay(subDays(phNow, 1))
            return isWithinInterval(orderDate, { start: yesterdayStart, end: yesterdayEnd })
          case "last7days":
            return orderDate >= subDays(todayStart, 7)
          case "last30days":
            return orderDate >= subDays(todayStart, 30)
          default:
            return true
        }
      })
    }

    // Payment filter
    if (paymentFilter !== "all") {
      filtered = filtered.filter(
        (order) => order.payment_method.toLowerCase() === paymentFilter
      )
    }

    // Payment status filter
    if (paymentStatusFilter !== "all") {
      filtered = filtered.filter(
        (order) => order.payment_status === paymentStatusFilter
      )
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (order) =>
          order.order_number.toString().includes(query) ||
          (order.customer_name?.toLowerCase().includes(query) ?? false)
      )
    }

    return filtered
  }, [orders, dateFilter, paymentFilter, paymentStatusFilter, searchQuery, phNow])

  // Group orders by date
  const groupedOrders = useMemo(() => {
    const groups: { [key: string]: Order[] } = {}

    filteredOrders.forEach((order) => {
      const orderDate = toZonedTime(new Date(order.created_at), PH_TIMEZONE)
      const dateKey = format(orderDate, "yyyy-MM-dd")

      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(order)
    })

    // Sort groups by date (newest first)
    const sortedGroups = Object.entries(groups).sort(
      ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
    )

    return sortedGroups
  }, [filteredOrders])

  const filteredTotal = filteredOrders.reduce((sum, o) => sum + Number(o.total), 0)

  const openEditPaymentDialog = (order: Order) => {
    setEditingOrder(order)
    setEditPaymentStatus(order.payment_status)
    setEditAmountPaid(String(order.amount_paid))
  }

  const handleSavePayment = async () => {
    if (!editingOrder) return
    setIsUpdating(true)

    try {
      const supabase = createClient()
      let newAmountPaid = Number(editingOrder.amount_paid)
      const newPaymentStatus = editPaymentStatus

      if (editPaymentStatus === "paid") {
        newAmountPaid = Number(editingOrder.total)
      } else if (editPaymentStatus === "partially_paid") {
        newAmountPaid = parseFloat(editAmountPaid) || 0
      } else if (editPaymentStatus === "unpaid") {
        newAmountPaid = 0
      }

      await supabase.from("orders").update({
        payment_status: newPaymentStatus,
        amount_paid: newAmountPaid,
      }).eq("id", editingOrder.id)

      // If status changed to paid or partial, update the current open cash session
      const additionalCash = newAmountPaid - Number(editingOrder.amount_paid)
      if (additionalCash > 0) {
        const today = getPhilippineDate()
        const { data: session } = await supabase
          .from("cash_sessions")
          .select()
          .eq("date", today)
          .eq("status", "open")
          .single()

        if (session) {
          await supabase.from("cash_sessions").update({
            total_sales: Number(session.total_sales) + additionalCash
          }).eq("id", session.id)
        }
      }

      // Update local state
      setOrders((prev) =>
        prev.map((o) =>
          o.id === editingOrder.id
            ? { ...o, payment_status: newPaymentStatus, amount_paid: newAmountPaid }
            : o
        )
      )

      toast.success(
        newPaymentStatus === "paid"
          ? `Order #${editingOrder.order_number} marked as fully paid!`
          : `Payment updated for ${editingOrder.customer_name || "Walk-in"}`
      )

      setEditingOrder(null)
    } catch (error) {
      console.error("Error updating payment:", error)
      toast.error("Failed to update payment")
    } finally {
      setIsUpdating(false)
    }
  }

  const getPaymentBadge = (method: string) => {
    const m = method.toLowerCase()
    if (m === "cash") return <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">Cash</Badge>
    if (m === "gcash") return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">GCash</Badge>
    if (m === "card") return <Badge className="bg-purple-500/20 text-purple-700 border-purple-500/30">Card</Badge>
    return <Badge variant="secondary">{method}</Badge>
  }

  const getPaymentStatusBadge = (status: string, total: number, amountPaid: number) => {
    if (status === "paid") return <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">Paid</Badge>
    if (status === "partially_paid") {
      const balance = total - amountPaid
      return <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">Partial (₱{balance.toFixed(0)} due)</Badge>
    }
    if (status === "unpaid") return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Unpaid</Badge>
    return <Badge variant="secondary">{status}</Badge>
  }

  const getItemsSummary = (items: OrderItem[]) => {
    if (!items || items.length === 0) return "No items"
    const itemNames = items.map((item) => {
      const name = item.product?.name ?? "Unknown"
      return item.quantity > 1 ? `${name} x${item.quantity}` : name
    })
    const summary = itemNames.join(", ")
    return summary.length > 40 ? summary.substring(0, 40) + "..." : summary
  }

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <main
        className="transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
            <p className="text-muted-foreground">Complete record of all orders</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{stats.totalOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent/10 p-2">
                    <Banknote className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">₱{stats.totalRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-2">
                    <Calendar className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Orders</p>
                    <p className="text-2xl font-bold">{stats.todayOrdersCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-500/10 p-2">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Revenue</p>
                    <p className="text-2xl font-bold">₱{stats.todayRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                {/* Date Filter */}
                <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Select date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="last7days">Last 7 Days</SelectItem>
                    <SelectItem value="last30days">Last 30 Days</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>

                {/* Payment Filter */}
                <div className="flex gap-1">
                  {(["all", "cash", "gcash", "card"] as PaymentFilter[]).map((method) => (
                    <Button
                      key={method}
                      variant={paymentFilter === method ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPaymentFilter(method)}
                      className="capitalize"
                    >
                      {method === "all" ? "All" : method}
                    </Button>
                  ))}
                </div>

                {/* Payment Status Filter */}
                <Select value={paymentStatusFilter} onValueChange={(v) => setPaymentStatusFilter(v as PaymentStatusFilter)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partially_paid">Partial</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>

                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by order # or customer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""} · ₱{filteredTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })} total
              </div>
            </CardContent>
          </Card>

          {/* Orders List */}
          <ScrollArea className="h-[calc(100vh-420px)]">
            {groupedOrders.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Receipt className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-medium">No transactions found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try adjusting your filters or date range
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {groupedOrders.map(([dateKey, orders]) => {
                  const groupDate = parseISO(dateKey)
                  const groupTotal = orders.reduce((sum, o) => sum + Number(o.total), 0)

                  return (
                    <div key={dateKey}>
                      {/* Date Group Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="font-semibold">
                            {format(groupDate, "MMMM d, yyyy")}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          · {orders.length} order{orders.length !== 1 ? "s" : ""} · ₱{groupTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Orders in Group */}
                      <div className="space-y-2">
                        {orders.map((order) => {
                          const orderTime = toZonedTime(new Date(order.created_at), PH_TIMEZONE)
                          const isExpanded = expandedOrderId === order.id

                          return (
                            <Collapsible
                              key={order.id}
                              open={isExpanded}
                              onOpenChange={(open) => setExpandedOrderId(open ? order.id : null)}
                            >
                              <Card className="overflow-hidden">
                                <CollapsibleTrigger className="w-full" asChild>
                                  <div className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                                    <div className="flex items-start justify-between gap-4">
                                      {/* Left: Order Info */}
                                      <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className="mt-0.5">
                                          {isExpanded ? (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-primary">#{order.order_number.toString().padStart(3, "0")}</span>
                                            <span className="text-sm text-muted-foreground">
                                              {format(orderTime, "h:mm a")}
                                            </span>
                                          </div>
                                          <div className="text-sm font-medium mt-1 truncate">
                                            {order.customer_name || "Walk-in"}
                                          </div>
                                          <div className="text-xs text-muted-foreground mt-1 truncate">
                                            {getItemsSummary(order.items)}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Right: Status & Amount */}
                                      <div className="flex flex-col items-end gap-2 shrink-0">
                                        <span className="font-bold text-lg">
                                          ₱{Number(order.total).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                        </span>
                                        <div className="flex items-center gap-2 flex-wrap justify-end">
                                          {getPaymentStatusBadge(order.payment_status, Number(order.total), Number(order.amount_paid))}
                                          {order.payment_status === "paid" && getPaymentBadge(order.payment_method)}
                                        </div>
                                        {(order.payment_status === "unpaid" || order.payment_status === "partially_paid") && (
                                          <Button
                                            variant="default"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              openEditPaymentDialog(order)
                                            }}
                                            className="mt-1"
                                          >
                                            <Pencil className="h-3 w-3 mr-1" />
                                            Collect Payment
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                  <div className="border-t bg-muted/30 p-4">
                                    {/* Items */}
                                    <div className="space-y-2 mb-4">
                                      <h4 className="text-sm font-medium text-muted-foreground">Items</h4>
                                      {order.items?.map((item) => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                          <span>
                                            {item.quantity}x {item.product?.name ?? "Unknown"}
                                            {item.size && ` (${item.size.size_name})`}
                                            {item.addons?.length > 0 && (
                                              <span className="text-muted-foreground">
                                                {" "}+ {item.addons.map((a) => a.addon?.name).filter(Boolean).join(", ")}
                                              </span>
                                            )}
                                          </span>
                                          <span>₱{Number(item.total_price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Notes */}
                                    {order.notes && (
                                      <div className="mb-4">
                                        <h4 className="text-sm font-medium text-muted-foreground">Notes</h4>
                                        <p className="text-sm">{order.notes}</p>
                                      </div>
                                    )}

                                    {/* Payment Details */}
                                    <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-[600px]">
                                      <div>
                                        <span className="text-sm text-muted-foreground">Payment Status</span>
                                        <div className="mt-1">{getPaymentStatusBadge(order.payment_status, Number(order.total), Number(order.amount_paid))}</div>
                                      </div>
                                      {order.payment_status === "paid" && (
                                        <div>
                                          <span className="text-sm text-muted-foreground">Payment Method</span>
                                          <div className="mt-1">{getPaymentBadge(order.payment_method)}</div>
                                        </div>
                                      )}
                                      {order.payment_status !== "unpaid" && (
                                        <div>
                                          <span className="text-sm text-muted-foreground">Amount Paid</span>
                                          <p className="font-medium">₱{Number(order.amount_paid).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                                        </div>
                                      )}
                                      {order.payment_status !== "paid" && (
                                        <div>
                                          <span className="text-sm text-muted-foreground">Balance Due</span>
                                          <p className="font-medium text-amber-600">₱{(Number(order.total) - Number(order.amount_paid)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                                        </div>
                                      )}
                                      {order.payment_method.toLowerCase() === "cash" && order.amount_received && order.payment_status === "paid" && (
                                        <>
                                          <div>
                                            <span className="text-sm text-muted-foreground">Amount Received</span>
                                            <p className="font-medium">₱{Number(order.amount_received).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                                          </div>
                                          <div>
                                            <span className="text-sm text-muted-foreground">Change</span>
                                            <p className="font-medium">₱{Number(order.change_amount ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                                          </div>
                                        </>
                                      )}
                                    </div>

                                    {/* Timestamp */}
                                    <div className="text-xs text-muted-foreground">
                                      {format(orderTime, "MMMM d, yyyy 'at' h:mm:ss a")}
                                    </div>
                                  </div>
                                </CollapsibleContent>
                              </Card>
                            </Collapsible>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </main>

      {/* Edit Payment Dialog */}
      <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Payment - Order #{editingOrder?.order_number.toString().padStart(3, "0")}
            </DialogTitle>
          </DialogHeader>
          {editingOrder && (
            <div className="space-y-4 py-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Customer: </span>
                <span className="font-medium">{editingOrder.customer_name || "Walk-in"}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted">
                <div>
                  <p className="text-sm text-muted-foreground">Order Total</p>
                  <p className="text-lg font-bold">₱{Number(editingOrder.total).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Already Paid</p>
                  <p className="text-lg font-bold">₱{Number(editingOrder.amount_paid).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Balance Due</p>
                  <p className="text-lg font-bold text-amber-600">
                    ₱{(Number(editingOrder.total) - Number(editingOrder.amount_paid)).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Status</label>
                <Select value={editPaymentStatus} onValueChange={(v) => setEditPaymentStatus(v as 'paid' | 'partially_paid' | 'unpaid')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="partially_paid">Partially Paid</SelectItem>
                    <SelectItem value="paid">Fully Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editPaymentStatus === "partially_paid" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount Paid So Far (₱)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editAmountPaid}
                    onChange={(e) => setEditAmountPaid(e.target.value)}
                    placeholder="0.00"
                    max={Number(editingOrder.total)}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingOrder(null)}>
              Cancel
            </Button>
            <Button onClick={handleSavePayment} disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
