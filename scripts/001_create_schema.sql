-- Da Bes Coffee Shop POS System - Database Schema

-- PRODUCTS & MENU
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  image_url TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size_name TEXT NOT NULL,
  price_adjustment DECIMAL(10,2) DEFAULT 0,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  customer_name TEXT,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  amount_received DECIMAL(10,2),
  change_amount DECIMAL(10,2),
  status TEXT DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  size_id UUID REFERENCES product_sizes(id),
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_item_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES addons(id),
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVENTORY
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'ingredient',
  unit TEXT NOT NULL,
  current_stock DECIMAL(10,2) DEFAULT 0,
  low_stock_threshold DECIMAL(10,2) DEFAULT 0,
  cost_per_unit DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size_id UUID REFERENCES product_sizes(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_required DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS beginning_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES inventory_periods(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(period_id, inventory_item_id)
);

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID REFERENCES inventory_periods(id) ON DELETE SET NULL,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2) DEFAULT 0,
  supplier TEXT,
  purchase_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID REFERENCES inventory_periods(id) ON DELETE SET NULL,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL,
  source TEXT DEFAULT 'sale',
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CASH MANAGEMENT
CREATE TABLE IF NOT EXISTS cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_cash DECIMAL(10,2) DEFAULT 0,
  closing_cash DECIMAL(10,2),
  total_sales DECIMAL(10,2) DEFAULT 0,
  total_remittance DECIMAL(10,2) DEFAULT 0,
  expected_cash DECIMAL(10,2),
  difference DECIMAL(10,2),
  status TEXT DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cash_denominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
  count_type TEXT NOT NULL DEFAULT 'closing',
  denomination DECIMAL(10,2) NOT NULL,
  count INT NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capital (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initial_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
1
CREATE TABLE IF NOT EXISTS remittances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES cash_sessions(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  recipient TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY (permissive - single user, no auth)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE beginning_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_denominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital ENABLE ROW LEVEL SECURITY;
ALTER TABLE remittances ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for single-user)
DROP POLICY IF EXISTS "Allow all" ON categories;
CREATE POLICY "Allow all" ON categories FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON products;
CREATE POLICY "Allow all" ON products FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON product_sizes;
CREATE POLICY "Allow all" ON product_sizes FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON addons;
CREATE POLICY "Allow all" ON addons FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON orders;
CREATE POLICY "Allow all" ON orders FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON order_items;
CREATE POLICY "Allow all" ON order_items FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON order_item_addons;
CREATE POLICY "Allow all" ON order_item_addons FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON inventory_items;
CREATE POLICY "Allow all" ON inventory_items FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON product_recipes;
CREATE POLICY "Allow all" ON product_recipes FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON inventory_periods;
CREATE POLICY "Allow all" ON inventory_periods FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON beginning_inventory;
CREATE POLICY "Allow all" ON beginning_inventory FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON purchases;
CREATE POLICY "Allow all" ON purchases FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON usage_logs;
CREATE POLICY "Allow all" ON usage_logs FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON cash_sessions;
CREATE POLICY "Allow all" ON cash_sessions FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON cash_denominations;
CREATE POLICY "Allow all" ON cash_denominations FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON capital;
CREATE POLICY "Allow all" ON capital FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON remittances;
CREATE POLICY "Allow all" ON remittances FOR ALL USING (true) WITH CHECK (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available);
CREATE INDEX IF NOT EXISTS idx_product_sizes_product ON product_sizes(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_item ON usage_logs(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_purchases_period ON purchases(period_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_date ON cash_sessions(date);
