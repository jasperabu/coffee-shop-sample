"use client"

import type { CartItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react"

interface OrderCartProps {
  items: CartItem[]
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onRemoveItem: (itemId: string) => void
  onClearCart: () => void
  onCheckout: () => void
}

export function OrderCart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
}: OrderCartProps) {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0)
  const total = subtotal // Can add tax or discounts here

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Current Order</h2>
          {items.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
              {items.length}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearCart} className="text-destructive hover:text-destructive">
            Clear
          </Button>
        )}
      </div>

      {/* Cart Items */}
      <ScrollArea className="flex-1">
        {items.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
            <ShoppingCart className="mb-2 h-12 w-12 opacity-20" />
            <p className="text-sm">No items in order</p>
            <p className="text-xs">Select products to add</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm leading-tight">{item.product.name}</h4>
                    {item.size && (
                      <p className="text-xs text-muted-foreground">{item.size.size_name}</p>
                    )}
                    {item.addons.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        + {item.addons.map((a) => a.name).join(", ")}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="font-semibold text-sm">₱{item.totalPrice.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer with Totals */}
      <div className="border-t border-border p-4">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>₱{subtotal.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">₱{total.toFixed(2)}</span>
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={onCheckout}
          disabled={items.length === 0}
        >
          Checkout
        </Button>
      </div>
    </div>
  )
}
