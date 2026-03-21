"use client"

import { useState } from "react"
import type { CartItem } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Banknote, CreditCard, Check, Clock } from "lucide-react"

interface CheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: CartItem[]
  total: number
  onComplete: (paymentMethod: string, amountReceived: number, customerName: string, paymentStatus: 'paid' | 'partially_paid' | 'unpaid', amountPaid: number) => Promise<void>
}

const quickAmounts = [100, 200, 500, 1000]

export function CheckoutDialog({
  open,
  onOpenChange,
  items,
  total,
  onComplete,
}: CheckoutDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "gcash">("cash")
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "partially_paid" | "unpaid">("paid")
  const [amountReceived, setAmountReceived] = useState<string>("")
  const [amountPaid, setAmountPaid] = useState<string>("")
  const [customerName, setCustomerName] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const amountValue = parseFloat(amountReceived) || 0
  const amountPaidValue = parseFloat(amountPaid) || 0
  const change = amountValue - total
  const balance = total - amountPaidValue

  const handleQuickAmount = (amount: number) => {
    setAmountReceived(amount.toString())
  }

  const handleExactAmount = () => {
    setAmountReceived(total.toFixed(2))
  }

  const handleQuickPaidAmount = (amount: number) => {
    setAmountPaid(amount.toString())
  }

  const handleComplete = async () => {
    // For paid status with cash, check if amount received is sufficient
    if (paymentStatus === "paid" && paymentMethod === "cash" && amountValue < total) return
    
    // For unpaid, customer name is required
    if (paymentStatus === "unpaid" && !customerName.trim()) return
    
    // For partially paid, both customer name and amount paid are required
    if (paymentStatus === "partially_paid" && (!customerName.trim() || amountPaidValue <= 0 || amountPaidValue >= total)) return
    
    setIsProcessing(true)
    try {
      const finalAmountPaid = paymentStatus === "paid" ? total : 
                              paymentStatus === "unpaid" ? 0 : 
                              amountPaidValue
      await onComplete(paymentMethod, amountValue, customerName, paymentStatus, finalAmountPaid)
      // Reset form
      setPaymentMethod("cash")
      setPaymentStatus("paid")
      setAmountReceived("")
      setAmountPaid("")
      setCustomerName("")
    } finally {
      setIsProcessing(false)
    }
  }

  const canComplete = () => {
    if (paymentStatus === "paid") {
      return paymentMethod === "gcash" || amountValue >= total
    }
    if (paymentStatus === "unpaid") {
      return customerName.trim().length > 0
    }
    if (paymentStatus === "partially_paid") {
      return customerName.trim().length > 0 && amountPaidValue > 0 && amountPaidValue < total
    }
    return false
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary */}
          <div className="rounded-lg bg-muted p-3">
            <div className="text-sm text-muted-foreground mb-2">Order Summary</div>
            <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>
                    {item.quantity}x {item.product.name}
                    {item.size && ` (${item.size.size_name})`}
                  </span>
                  <span>₱{item.totalPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary">₱{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Customer Name */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Customer Name {paymentStatus !== "paid" ? "(Required)" : "(Optional)"}
            </label>
            <Input
              placeholder="Enter customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required={paymentStatus !== "paid"}
            />
          </div>

          {/* Payment Status */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Payment Status</label>
            <div className="flex gap-2">
              <Button
                variant={paymentStatus === "paid" ? "default" : "outline"}
                className="flex-1"
                size="sm"
                onClick={() => setPaymentStatus("paid")}
              >
                <Check className="mr-1 h-3 w-3" />
                Paid
              </Button>
              <Button
                variant={paymentStatus === "partially_paid" ? "default" : "outline"}
                className="flex-1"
                size="sm"
                onClick={() => setPaymentStatus("partially_paid")}
              >
                <Clock className="mr-1 h-3 w-3" />
                Partial
              </Button>
              <Button
                variant={paymentStatus === "unpaid" ? "default" : "outline"}
                className="flex-1"
                size="sm"
                onClick={() => setPaymentStatus("unpaid")}
              >
                <Clock className="mr-1 h-3 w-3" />
                Unpaid
              </Button>
            </div>
          </div>

          {/* Payment Method - Only show for paid status */}
          {paymentStatus === "paid" && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Payment Method</label>
              <div className="flex gap-2">
                <Button
                  variant={paymentMethod === "cash" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setPaymentMethod("cash")}
                >
                  <Banknote className="mr-2 h-4 w-4" />
                  Cash
                </Button>
                <Button
                  variant={paymentMethod === "gcash" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setPaymentMethod("gcash")}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  GCash
                </Button>
              </div>
            </div>
          )}

          {/* Cash Amount - Only show for paid status with cash */}
          {paymentStatus === "paid" && paymentMethod === "cash" && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Amount Received</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="text-lg font-semibold"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAmount(amount)}
                  >
                    ₱{amount}
                  </Button>
                ))}
                <Button variant="outline" size="sm" onClick={handleExactAmount}>
                  Exact
                </Button>
              </div>

              {/* Change Display */}
              {amountValue > 0 && (
                <div className={`mt-3 rounded-lg p-3 ${change >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Change</span>
                    <span className="text-xl font-bold">
                      {change >= 0 ? `₱${change.toFixed(2)}` : "Insufficient"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Partial Payment Amount */}
          {paymentStatus === "partially_paid" && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Amount Paid</label>
              <Input
                type="number"
                placeholder="Enter amount paid"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="text-lg font-semibold"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {[50, 100, 200, 500].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickPaidAmount(amount)}
                    disabled={amount >= total}
                  >
                    ₱{amount}
                  </Button>
                ))}
              </div>

              {/* Balance Display */}
              {amountPaidValue > 0 && (
                <div className={`mt-3 rounded-lg p-3 ${amountPaidValue < total ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Remaining Balance</span>
                    <span className="text-xl font-bold">
                      {amountPaidValue < total ? `₱${balance.toFixed(2)}` : "Amount exceeds total"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Unpaid Notice */}
          {paymentStatus === "unpaid" && (
            <div className="rounded-lg bg-amber-50 text-amber-700 p-3">
              <div className="text-sm">
                This order will be marked as <strong>unpaid</strong>. The full amount of ₱{total.toFixed(2)} will be recorded as debt.
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleComplete} disabled={!canComplete() || isProcessing}>
            {isProcessing ? (
              "Processing..."
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Complete Order
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
