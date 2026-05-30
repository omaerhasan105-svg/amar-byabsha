// =============================================
// আমার ব্যবসা - Express Backend Server
// =============================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const BIZ_ID = process.env.BUSINESS_ID;

// =============================================
// HEALTH CHECK
// =============================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'আমার ব্যবসা API চলছে' });
});

// =============================================
// DASHBOARD - Summary stats
// =============================================
app.get('/api/dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's sales total
    const { data: todaySales } = await supabase
      .from('sales')
      .select('total')
      .eq('business_id', BIZ_ID)
      .gte('sale_date', today.toISOString());

    const todayTotal = todaySales?.reduce((s, r) => s + Number(r.total), 0) || 0;

    // This month's profit (sales - expenses)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const { data: monthSales } = await supabase
      .from('sales')
      .select('total')
      .eq('business_id', BIZ_ID)
      .gte('sale_date', monthStart.toISOString());

    const { data: monthExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('business_id', BIZ_ID)
      .gte('expense_date', monthStart.toISOString());

    const monthRevenue = monthSales?.reduce((s, r) => s + Number(r.total), 0) || 0;
    const monthExpTotal = monthExpenses?.reduce((s, r) => s + Number(r.amount), 0) || 0;
    const monthProfit = monthRevenue - monthExpTotal;

    // Customer count this month
    const { count: custCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', BIZ_ID)
      .gte('created_at', monthStart.toISOString());

    // Low stock products
    const { data: lowStock } = await supabase
      .from('inventory')
      .select('id, name, stock, low_stock_threshold')
      .eq('business_id', BIZ_ID)
      .filter('stock', 'lt', 'low_stock_threshold');

    // Low stock manual filter (Supabase doesn't support column comparison directly)
    const { data: allInventory } = await supabase
      .from('inventory')
      .select('id, name, stock, low_stock_threshold')
      .eq('business_id', BIZ_ID);

    const lowStockItems = (allInventory || []).filter(i => i.stock <= i.low_stock_threshold);

    // Weekly sales (last 7 days)
    const weeklySales = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const { data: daySales } = await supabase
        .from('sales')
        .select('total')
        .eq('business_id', BIZ_ID)
        .gte('sale_date', day.toISOString())
        .lt('sale_date', nextDay.toISOString());

      weeklySales.push({
        date: day.toLocaleDateString('bn-BD', { weekday: 'short' }),
        total: daySales?.reduce((s, r) => s + Number(r.total), 0) || 0
      });
    }

    // Expense breakdown by category
    const { data: expByCategory } = await supabase
      .from('expenses')
      .select('category, amount')
      .eq('business_id', BIZ_ID)
      .gte('expense_date', monthStart.toISOString());

    const expCategories = {};
    (expByCategory || []).forEach(e => {
      expCategories[e.category] = (expCategories[e.category] || 0) + Number(e.amount);
    });

    // Recent activity (last 10 sales + expenses combined)
    const { data: recentSales } = await supabase
      .from('sales')
      .select('customer_name, product_name, total, status, sale_date')
      .eq('business_id', BIZ_ID)
      .order('sale_date', { ascending: false })
      .limit(5);

    res.json({
      todayTotal,
      monthProfit,
      custCount: custCount || 0,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      weeklySales,
      expCategories,
      recentSales: recentSales || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================
// SALES ROUTES
// =============================================
app.get('/api/sales', async (req, res) => {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('business_id', BIZ_ID)
    .order('sale_date', { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/sales', async (req, res) => {
  const { customer_name, product_id, product_name, quantity, unit_price, payment_method, status, customer_id } = req.body;
  const total = quantity * unit_price;

  const { data, error } = await supabase
    .from('sales')
    .insert([{
      business_id: BIZ_ID,
      customer_id: customer_id || null,
      customer_name,
      product_id: product_id || null,
      product_name,
      quantity,
      unit_price,
      total,
      payment_method,
      status,
      sale_date: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Reduce stock if product exists
  if (product_id) {
    const { data: prod } = await supabase
      .from('inventory')
      .select('stock')
      .eq('id', product_id)
      .single();

    if (prod) {
      await supabase
        .from('inventory')
        .update({ stock: Math.max(0, prod.stock - quantity) })
        .eq('id', product_id);
    }
  }

  // Update customer totals
  if (customer_id) {
    const { data: cust } = await supabase
      .from('customers')
      .select('total_purchase, total_due')
      .eq('id', customer_id)
      .single();

    if (cust) {
      await supabase
        .from('customers')
        .update({
          total_purchase: cust.total_purchase + total,
          total_due: status === 'বাকি' ? cust.total_due + total : cust.total_due
        })
        .eq('id', customer_id);
    }
  }

  res.json(data);
});

// Monthly sales trend
app.get('/api/sales/monthly', async (req, res) => {
  const results = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

    const { data } = await supabase
      .from('sales')
      .select('total')
      .eq('business_id', BIZ_ID)
      .gte('sale_date', start.toISOString())
      .lt('sale_date', end.toISOString());

    results.push({
      month: start.toLocaleDateString('bn-BD', { month: 'short' }),
      total: data?.reduce((s, r) => s + Number(r.total), 0) || 0
    });
  }

  res.json(results);
});

// =============================================
// INVENTORY ROUTES
// =============================================
app.get('/api/inventory', async (req, res) => {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('business_id', BIZ_ID)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/inventory', async (req, res) => {
  const { name, category, stock, buy_price, sell_price, low_stock_threshold } = req.body;
  const product_code = 'P' + Date.now().toString().slice(-4);

  const { data, error } = await supabase
    .from('inventory')
    .insert([{
      business_id: BIZ_ID,
      product_code,
      name,
      category,
      stock: parseInt(stock),
      buy_price: parseFloat(buy_price),
      sell_price: parseFloat(sell_price),
      low_stock_threshold: parseInt(low_stock_threshold) || 10
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/inventory/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, stock, buy_price, sell_price } = req.body;

  const { data, error } = await supabase
    .from('inventory')
    .update({ name, category, stock: parseInt(stock), buy_price, sell_price })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/inventory/:id', async (req, res) => {
  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// =============================================
// CUSTOMERS ROUTES
// =============================================
app.get('/api/customers', async (req, res) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', BIZ_ID)
    .order('total_purchase', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/customers', async (req, res) => {
  const { name, phone, area, address } = req.body;

  const { data, error } = await supabase
    .from('customers')
    .insert([{ business_id: BIZ_ID, name, phone, area, address }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/customers/:id/clear-due', async (req, res) => {
  const { data, error } = await supabase
    .from('customers')
    .update({ total_due: 0 })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// =============================================
// EXPENSES ROUTES
// =============================================
app.get('/api/expenses', async (req, res) => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('business_id', BIZ_ID)
    .order('expense_date', { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/expenses', async (req, res) => {
  const { category, description, amount, payment_method } = req.body;

  const { data, error } = await supabase
    .from('expenses')
    .insert([{
      business_id: BIZ_ID,
      category,
      description,
      amount: parseFloat(amount),
      payment_method,
      expense_date: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// =============================================
// BUSINESS SETUP
// =============================================
app.post('/api/setup', async (req, res) => {
  const { name, owner_name, phone, address } = req.body;

  const { data, error } = await supabase
    .from('businesses')
    .insert([{ name, owner_name, phone, address }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ...data, message: 'আপনার BUSINESS_ID হলো: ' + data.id + ' — এটি .env ফাইলে রাখুন' });
});

// =============================================
// START SERVER
// =============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  ✅ আমার ব্যবসা সার্ভার চালু হয়েছে!
  🌐 http://localhost:${PORT}
  📡 API: http://localhost:${PORT}/api
  `);
});
