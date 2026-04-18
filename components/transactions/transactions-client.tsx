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
  SelectSeparator,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  Receipt,
  Search,
  ChevronDown,
  ChevronRight,
  Calendar,
  ShoppingBag,
  Banknote,
  CreditCard,
  Pencil,
  Trash2,
  Plus,
  Minus,
  Save,
  X,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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

type DateFilter = "today" | "yesterday" | "last7days" | "last30days" | "all" | "custom" | string
type PaymentFilter = "all" | "cash" | "gcash" 
type PaymentStatusFilter = "all" | "paid" | "partially_paid" | "unpaid"

// Editable order state
interface EditableItem {
  id: string
  product_name: string
  size_name: string | null
  addons_text: string
  quantity: number
  unit_price: number
  total_price: number
  notes: string
  isNew?: boolean
}

interface EditableOrder {
  id: string
  order_number: number
  customer_name: string
  payment_method: string
  payment_status: 'paid' | 'partially_paid' | 'unpaid'
  amount_paid: string
  amount_received: string
  notes: string
  items: EditableItem[]
}

export function TransactionsClient({ initialOrders }: TransactionsClientProps) {
  const sidebarWidth = useSidebarWidth()
  const [dateFilter, setDateFilter] = useState<DateFilter>("today")
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined)
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [orders, setOrders] = useState(initialOrders)

  // Compute available specific dates that have transactions
  const availableDates = useMemo(() => {
    const dates = new Set<string>()
    orders.forEach(o => {
      const d = toZonedTime(new Date(o.created_at), PH_TIMEZONE)
      dates.add(format(d, "yyyy-MM-dd"))
    })
    return Array.from(dates).sort().reverse()
  }, [orders])

  // Edit dialog state
  const [editingOrder, setEditingOrder] = useState<EditableOrder | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Delete dialog state
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const now = new Date()
  const phNow = toZonedTime(now, PH_TIMEZONE)

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

  const filteredOrders = useMemo(() => {
    let filtered = [...orders]
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
          case "custom":
            if (!customDate) return true
            const customStart = startOfDay(customDate)
            const customEnd = endOfDay(customDate)
            return isWithinInterval(orderDate, { start: customStart, end: customEnd })
          default:
            if (dateFilter.startsWith("date_")) {
              const exactDateStr = dateFilter.replace("date_", "")
              return format(orderDate, "yyyy-MM-dd") === exactDateStr
            }
            return true
        }
      })
    }
    if (paymentFilter !== "all") {
      filtered = filtered.filter((order) => order.payment_method.toLowerCase() === paymentFilter)
    }
    if (paymentStatusFilter !== "all") {
      filtered = filtered.filter((order) => order.payment_status === paymentStatusFilter)
    }
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

  const groupedOrders = useMemo(() => {
    const groups: { [key: string]: Order[] } = {}
    filteredOrders.forEach((order) => {
      const orderDate = toZonedTime(new Date(order.created_at), PH_TIMEZONE)
      const dateKey = format(orderDate, "yyyy-MM-dd")
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(order)
    })
    return Object.entries(groups).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
  }, [filteredOrders])

  const filteredTotal = filteredOrders.reduce((sum, o) => sum + Number(o.total), 0)

  // Open edit dialog — populate editable state from order
  const openEditDialog = (order: Order) => {
    setEditingOrder({
      id: order.id,
      order_number: order.order_number,
      customer_name: order.customer_name ?? "",
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      amount_paid: String(order.amount_paid),
      amount_received: String(order.amount_received ?? ""),
      notes: order.notes ?? "",
      items: (order.items ?? []).map((item) => ({
        id: item.id,
        product_name: item.product?.name ?? "Unknown",
        size_name: item.size?.size_name ?? null,
        addons_text: item.addons?.map((a) => a.addon?.name).filter(Boolean).join(", ") ?? "",
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price),
        notes: item.notes ?? "",
      })),
    })
  }

  const updateItemQty = (index: number, delta: number) => {
    if (!editingOrder) return
    const items = [...editingOrder.items]
    const newQty = Math.max(1, items[index].quantity + delta)
    items[index] = {
      ...items[index],
      quantity: newQty,
      total_price: items[index].unit_price * newQty,
    }
    setEditingOrder({ ...editingOrder, items })
  }

  const updateItemPrice = (index: number, value: string) => {
    if (!editingOrder) return
    const items = [...editingOrder.items]
    const price = parseFloat(value) || 0
    items[index] = {
      ...items[index],
      unit_price: price,
      total_price: price * items[index].quantity,
    }
    setEditingOrder({ ...editingOrder, items })
  }

  const updateItemField = (index: number, field: keyof EditableItem, value: string) => {
    if (!editingOrder) return
    const items = [...editingOrder.items]
    items[index] = { ...items[index], [field]: value }
    setEditingOrder({ ...editingOrder, items })
  }

  const removeItem = (index: number) => {
    if (!editingOrder) return
    const items = editingOrder.items.filter((_, i) => i !== index)
    setEditingOrder({ ...editingOrder, items })
  }

  const addNewItem = () => {
    if (!editingOrder) return
    const newItem: EditableItem = {
      id: `new-${Date.now()}`,
      product_name: "",
      size_name: null,
      addons_text: "",
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      notes: "",
      isNew: true,
    }
    setEditingOrder({ ...editingOrder, items: [...editingOrder.items, newItem] })
  }

  const computedSubtotal = editingOrder
    ? editingOrder.items.reduce((sum, i) => sum + i.total_price, 0)
    : 0

  const handleSaveOrder = async () => {
    if (!editingOrder) return
    setIsSaving(true)
    try {
      const supabase = createClient()

      let finalAmountPaid = parseFloat(editingOrder.amount_paid) || 0
      if (editingOrder.payment_status === "paid") finalAmountPaid = computedSubtotal
      if (editingOrder.payment_status === "unpaid") finalAmountPaid = 0

      const amountReceived = parseFloat(editingOrder.amount_received) || null
      const changeAmount = amountReceived ? amountReceived - computedSubtotal : null

      // Update order
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          customer_name: editingOrder.customer_name || null,
          subtotal: computedSubtotal,
          total: computedSubtotal,
          payment_method: editingOrder.payment_method,
          payment_status: editingOrder.payment_status,
          amount_paid: finalAmountPaid,
          amount_received: amountReceived,
          change_amount: changeAmount,
          notes: editingOrder.notes || null,
        })
        .eq("id", editingOrder.id)

      if (orderError) throw orderError

      // Update existing items and insert new ones
      for (const item of editingOrder.items) {
        if (item.isNew) {
          // Insert new item
          await supabase.from("order_items").insert({
            order_id: editingOrder.id,
            product_id: null, // manual entry
            size_id: null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            notes: item.notes || null,
          })
        } else {
          await supabase
            .from("order_items")
            .update({
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              notes: item.notes || null,
            })
            .eq("id", item.id)
        }
      }

      // Update local state
      setOrders((prev) =>
        prev.map((o) =>
          o.id === editingOrder.id
            ? {
                ...o,
                customer_name: editingOrder.customer_name || null,
                subtotal: computedSubtotal,
                total: computedSubtotal,
                payment_method: editingOrder.payment_method,
                payment_status: editingOrder.payment_status,
                amount_paid: finalAmountPaid,
                amount_received: amountReceived,
                change_amount: changeAmount,
                notes: editingOrder.notes || null,
                items: o.items.map((item) => {
                  const edited = editingOrder.items.find((ei) => ei.id === item.id)
                  if (!edited) return item
                  return {
                    ...item,
                    quantity: edited.quantity,
                    unit_price: edited.unit_price,
                    total_price: edited.total_price,
                    notes: edited.notes || null,
                  }
                }),
              }
            : o
        )
      )

      toast.success(`Order #${editingOrder.order_number.toString().padStart(3, "0")} updated!`)
      setEditingOrder(null)
    } catch (error) {
      console.error("Error saving order:", error)
      toast.error("Failed to save changes")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteOrder = async () => {
    if (!deletingOrderId) return
    setIsDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("orders").delete().eq("id", deletingOrderId)
      if (error) throw error
      setOrders((prev) => prev.filter((o) => o.id !== deletingOrderId))
      toast.success("Order deleted")
      setDeletingOrderId(null)
    } catch (error) {
      console.error("Error deleting order:", error)
      toast.error("Failed to delete order")
    } finally {
      setIsDeleting(false)
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
      <main className="transition-all duration-300 ease-in-out" style={{ marginLeft: sidebarWidth }}>
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
            <p className="text-muted-foreground">Complete record of all orders</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card><CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2"><ShoppingBag className="h-5 w-5 text-primary" /></div>
                <div><p className="text-sm text-muted-foreground">Total Orders</p><p className="text-2xl font-bold">{stats.totalOrders}</p></div>
              </div>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent/10 p-2"><Banknote className="h-5 w-5 text-accent" /></div>
                <div><p className="text-sm text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold">₱{stats.totalRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p></div>
              </div>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2"><Calendar className="h-5 w-5 text-emerald-600" /></div>
                <div><p className="text-sm text-muted-foreground">Today's Orders</p><p className="text-2xl font-bold">{stats.todayOrdersCount}</p></div>
              </div>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2"><CreditCard className="h-5 w-5 text-blue-600" /></div>
                <div><p className="text-sm text-muted-foreground">Today's Revenue</p><p className="text-2xl font-bold">₱{stats.todayRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p></div>
              </div>
            </CardContent></Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <Select value={dateFilter} onValueChange={(v) => {
                  setDateFilter(v as DateFilter)
                  if (v !== "custom") setCustomDate(undefined)
                }}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select date" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="last7days">Last 7 Days</SelectItem>
                      <SelectItem value="last30days">Last 30 Days</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="custom">Custom Date...</SelectItem>
                    </SelectGroup>
                    {availableDates.length > 0 && (
                      <>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>Available Dates</SelectLabel>
                          {availableDates.map(dateStr => (
                            <SelectItem key={dateStr} value={`date_${dateStr}`}>
                              {format(parseISO(dateStr), "MMM d, yyyy")}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </>
                    )}
                  </SelectContent>
                </Select>
                {dateFilter === "custom" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[160px] justify-start text-left font-normal",
                          !customDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {customDate ? format(customDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customDate}
                        onSelect={setCustomDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
                <div className="flex gap-1">
                  {(["all", "cash", "gcash"] as PaymentFilter[]).map((method) => (
                    <Button key={method} variant={paymentFilter === method ? "default" : "outline"} size="sm" onClick={() => setPaymentFilter(method)} className="capitalize">
                      {method === "all" ? "All" : method}
                    </Button>
                  ))}
                </div>
                <Select value={paymentStatusFilter} onValueChange={(v) => setPaymentStatusFilter(v as PaymentStatusFilter)}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partially_paid">Partial</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by order # or customer..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                </div>
              </div>
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
                  <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or date range</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {groupedOrders.map(([dateKey, dayOrders]) => {
                  const groupDate = parseISO(dateKey)
                  const groupTotal = dayOrders.reduce((sum, o) => sum + Number(o.total), 0)
                  return (
                    <div key={dateKey}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="font-semibold">{format(groupDate, "MMMM d, yyyy")}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          · {dayOrders.length} order{dayOrders.length !== 1 ? "s" : ""} · ₱{groupTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {dayOrders.map((order) => {
                          const orderTime = toZonedTime(new Date(order.created_at), PH_TIMEZONE)
                          const isExpanded = expandedOrderId === order.id
                          return (
                            <Collapsible key={order.id} open={isExpanded} onOpenChange={(open) => setExpandedOrderId(open ? order.id : null)}>
                              <Card className="overflow-hidden">
                                <CollapsibleTrigger className="w-full" asChild>
                                  <div className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className="mt-0.5">
                                          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-primary">#{order.order_number.toString().padStart(3, "0")}</span>
                                            <span className="text-sm text-muted-foreground">{format(orderTime, "h:mm a")}</span>
                                          </div>
                                          <div className="text-sm font-medium mt-1 truncate">{order.customer_name || "Walk-in"}</div>
                                          <div className="text-xs text-muted-foreground mt-1 truncate">{getItemsSummary(order.items)}</div>
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end gap-2 shrink-0">
                                        <span className="font-bold text-lg">₱{Number(order.total).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                                        <div className="flex items-center gap-2 flex-wrap justify-end">
                                          {getPaymentStatusBadge(order.payment_status, Number(order.total), Number(order.amount_paid))}
                                          {order.payment_status === "paid" && getPaymentBadge(order.payment_method)}
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => { e.stopPropagation(); openEditDialog(order) }}
                                            className="h-6 px-2 text-xs"
                                          >
                                            <Pencil className="h-3 w-3 mr-1" /> Edit
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => { e.stopPropagation(); setDeletingOrderId(order.id) }}
                                            className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                                          >
                                            <Trash2 className="h-3 w-3 mr-1" /> Delete
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="border-t bg-muted/30 p-4">
                                    <div className="space-y-2 mb-4">
                                      <h4 className="text-sm font-medium text-muted-foreground">Items</h4>
                                      {order.items?.map((item) => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                          <span>
                                            {item.quantity}x {item.product?.name ?? "Unknown"}
                                            {item.size && ` (${item.size.size_name})`}
                                            {item.addons?.length > 0 && (
                                              <span className="text-muted-foreground"> + {item.addons.map((a) => a.addon?.name).filter(Boolean).join(", ")}</span>
                                            )}
                                          </span>
                                          <span>₱{Number(item.total_price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                                        </div>
                                      ))}
                                    </div>
                                    {order.notes && (
                                      <div className="mb-4">
                                        <h4 className="text-sm font-medium text-muted-foreground">Notes</h4>
                                        <p className="text-sm">{order.notes}</p>
                                      </div>
                                    )}
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
                                    </div>
                                    <div className="text-xs text-muted-foreground">{format(orderTime, "MMMM d, yyyy 'at' h:mm:ss a")}</div>
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

      {/* ── FULL EDIT DIALOG ── */}
      <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Order #{editingOrder?.order_number.toString().padStart(3, "0")}</DialogTitle>
            <DialogDescription>Make changes to any field below, then click Save.</DialogDescription>
          </DialogHeader>

          {editingOrder && (
            <div className="space-y-5 py-2">

              {/* Customer & Notes */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Customer Name</Label>
                  <Input
                    value={editingOrder.customer_name}
                    onChange={(e) => setEditingOrder({ ...editingOrder, customer_name: e.target.value })}
                    placeholder="Walk-in"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Payment Method</Label>
                  <Select
                    value={editingOrder.payment_method}
                    onValueChange={(v) => setEditingOrder({ ...editingOrder, payment_method: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="gcash">GCash</SelectItem>
                      
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Order Notes</Label>
                <Textarea
                  value={editingOrder.notes}
                  onChange={(e) => setEditingOrder({ ...editingOrder, notes: e.target.value })}
                  placeholder="Any special notes..."
                  rows={2}
                />
              </div>

              <Separator />

              {/* Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Order Items</Label>
                  <Button variant="outline" size="sm" onClick={addNewItem}>
                    <Plus className="h-3 w-3 mr-1" /> Add Item
                  </Button>
                </div>

                {editingOrder.items.map((item, index) => (
                  <div key={item.id} className="rounded-lg border p-3 space-y-2 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Input
                        value={item.product_name}
                        onChange={(e) => updateItemField(index, "product_name", e.target.value)}
                        placeholder="Product name"
                        className="flex-1 font-medium"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                        onClick={() => removeItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Size</Label>
                        <Input
                          value={item.size_name ?? ""}
                          onChange={(e) => updateItemField(index, "size_name", e.target.value)}
                          placeholder="e.g. Large"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Unit Price (₱)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItemPrice(index, e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Quantity</Label>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => updateItemQty(index, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => updateItemQty(index, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Add-ons</Label>
                        <Input
                          value={item.addons_text}
                          onChange={(e) => updateItemField(index, "addons_text", e.target.value)}
                          placeholder="e.g. Extra shot, Oat milk"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Item Notes</Label>
                        <Input
                          value={item.notes}
                          onChange={(e) => updateItemField(index, "notes", e.target.value)}
                          placeholder="e.g. No sugar"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    <div className="text-right text-sm font-medium text-primary">
                      Subtotal: ₱{item.total_price.toFixed(2)}
                    </div>
                  </div>
                ))}

                {/* Order Total */}
                <div className="flex justify-between items-center px-1 pt-1">
                  <span className="text-sm text-muted-foreground">Order Total</span>
                  <span className="text-xl font-bold text-primary">₱{computedSubtotal.toFixed(2)}</span>
                </div>
              </div>

              <Separator />

              {/* Payment */}
              <div className="space-y-3">
                <Label className="text-base">Payment</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Payment Status</Label>
                    <Select
                      value={editingOrder.payment_status}
                      onValueChange={(v) => setEditingOrder({ ...editingOrder, payment_status: v as 'paid' | 'partially_paid' | 'unpaid' })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Fully Paid</SelectItem>
                        <SelectItem value="partially_paid">Partially Paid</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {editingOrder.payment_status === "partially_paid" && (
                    <div className="space-y-1">
                      <Label>Amount Paid (₱)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editingOrder.amount_paid}
                        onChange={(e) => setEditingOrder({ ...editingOrder, amount_paid: e.target.value })}
                        max={computedSubtotal}
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  {editingOrder.payment_method === "cash" && editingOrder.payment_status === "paid" && (
                    <div className="space-y-1">
                      <Label>Amount Received (₱)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editingOrder.amount_received}
                        onChange={(e) => setEditingOrder({ ...editingOrder, amount_received: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setEditingOrder(null)}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button onClick={handleSaveOrder} disabled={isSaving}>
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM ── */}
      <AlertDialog open={!!deletingOrderId} onOpenChange={(open) => !open && setDeletingOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the order and all its items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrder}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}