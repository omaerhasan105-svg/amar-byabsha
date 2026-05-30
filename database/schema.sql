-- =============================================
-- আমার ব্যবসা - Supabase Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- BUSINESSES TABLE (one row per business/user)
-- =============================================
create table if not exists businesses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_name text,
  phone text,
  address text,
  created_at timestamptz default now()
);

-- =============================================
-- CUSTOMERS TABLE
-- =============================================
create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade,
  name text not null,
  phone text,
  area text,
  address text,
  total_purchase numeric default 0,
  total_due numeric default 0,
  created_at timestamptz default now()
);

-- =============================================
-- INVENTORY / PRODUCTS TABLE
-- =============================================
create table if not exists inventory (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade,
  product_code text,
  name text not null,
  category text,
  stock integer default 0,
  low_stock_threshold integer default 10,
  buy_price numeric default 0,
  sell_price numeric default 0,
  created_at timestamptz default now()
);

-- =============================================
-- SALES TABLE
-- =============================================
create table if not exists sales (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  customer_name text,
  product_id uuid references inventory(id) on delete set null,
  product_name text,
  quantity integer default 1,
  unit_price numeric default 0,
  total numeric default 0,
  payment_method text default 'নগদ',
  status text default 'পরিশোধ',
  sale_date timestamptz default now(),
  created_at timestamptz default now()
);

-- =============================================
-- EXPENSES TABLE
-- =============================================
create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade,
  category text not null,
  description text,
  amount numeric default 0,
  payment_method text default 'নগদ',
  expense_date timestamptz default now(),
  created_at timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
alter table businesses enable row level security;
alter table customers enable row level security;
alter table inventory enable row level security;
alter table sales enable row level security;
alter table expenses enable row level security;

-- Allow all for now (you can restrict by auth.uid() later)
create policy "Allow all on businesses" on businesses for all using (true);
create policy "Allow all on customers" on customers for all using (true);
create policy "Allow all on inventory" on inventory for all using (true);
create policy "Allow all on sales" on sales for all using (true);
create policy "Allow all on expenses" on expenses for all using (true);

-- =============================================
-- SAMPLE DATA (optional - for testing)
-- =============================================
-- Insert a sample business first, then run the rest
-- INSERT INTO businesses (name, owner_name, phone, address)
-- VALUES ('আমার দোকান', 'মালিকের নাম', '০১৭XX-XXXXXX', 'ঢাকা, বাংলাদেশ');
