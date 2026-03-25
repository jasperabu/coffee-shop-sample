export interface Category {
  id: string
  name: string
  display_order: number
  created_at: string
}

export interface Product {
  id: string
  name: string
  category_id: string | null
  base_price: number
  description: string | null
  image_url: string | null
  is_available: boolean
  created_at: string
  updated_at: string
  category?: Category
  sizes?: ProductSize[]
}

export interface ProductSize {
  id: string
  product_id: string
  size_name: string
  price_adjustment: number
  display_order: number
  created_at: string
}

export interface Addon {
  id: string
  name: string
  price: number
  is_available: boolean
  created_at: string
}

export interface Order {
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
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  size_id: string | null
  quantity: number
  unit_price: number
  total_price: number
  notes: string | null
  created_at: string
  product?: Product
  size?: ProductSize
  addons?: OrderItemAddon[]
}

export interface OrderItemAddon {
  id: string
  order_item_id: string
  addon_id: string
  price: number
  created_at: string
  addon?: Addon
}

export interface InventoryItem {
  id: string
  name: string
  type: string
  unit: string
  current_stock: number
  low_stock_threshold: number
  cost_per_unit: number
  created_at: string
  updated_at: string
}

export interface ProductRecipe {
  id: string
  product_id: string
  size_id: string | null
  inventory_item_id: string
  quantity_required: number
  created_at: string
  inventory_item?: InventoryItem
}

export interface Purchase {
  id: string
  period_id: string | null
  inventory_item_id: string
  quantity: number
  cost: number
  supplier: string | null
  purchase_date: string
  notes: string | null
  created_at: string
  inventory_item?: InventoryItem
}

export interface UsageLog {
  id: string
  period_id: string | null
  inventory_item_id: string
  quantity: number
  source: string
  order_id: string | null
  notes: string | null
  created_at: string
  inventory_item?: InventoryItem
}

export interface CashSession {
  id: string
  date: string
  opening_cash: number
  closing_cash: number | null
  total_sales: number
  total_remittance: number
  expected_cash: number | null
  difference: number | null
  status: string
  notes: string | null
  created_at: string
  closed_at: string | null
}

export interface CashDenomination {
  id: string
  session_id: string
  count_type: string
  denomination: number
  count: number
  total: number
  created_at: string
}

export interface Remittance {
  id: string
  session_id: string | null
  amount: number
  recipient: string | null
  notes: string | null
  created_at: string
}

export interface Capital {
  id: string
  initial_amount: number
  current_balance: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CartItem {
  id: string
  product: Product
  size: ProductSize | null
  addons: Addon[]
  quantity: number
  unitPrice: number
  totalPrice: number
  notes: string
}

// Philippine Peso denominations
export const PESO_DENOMINATIONS = [
  { value: 1000, label: '1000' },
  { value: 500, label: '500' },
  { value: 200, label: '200' },
  { value: 100, label: '100' },
  { value: 50, label: '50' },
  { value: 20, label: '20' },
  { value: 10, label: '10' },
  { value: 5, label: '5' },
  { value: 1, label: '1' },
  { value: 0.25, label: '0.25' },
] as const

export interface RecipeRow {
  id?: string
  inventory_item_id: string
  inventory_item_name?: string
  unit?: string
  quantity_required: number
}