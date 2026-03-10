import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚀 Iniciando servidor Gesso Forteleve...");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Database initialization with fallback
  let db: any;
  try {
    db = new Database("gesso_forteleve.db");
    console.log("✅ Banco de dados conectado.");
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS materials (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, category TEXT, unit TEXT, quantity REAL, cost REAL, price REAL, supplier TEXT);
      CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, type TEXT, description TEXT, category TEXT, value REAL);
      CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, material_id INTEGER, quantity REAL, unit_price REAL, total_price REAL, client TEXT, payment_method TEXT);
      CREATE TABLE IF NOT EXISTS works (id INTEGER PRIMARY KEY AUTOINCREMENT, client_name TEXT, address TEXT, service TEXT, materials_used TEXT, total_value REAL, total_cost REAL, status TEXT);
      CREATE TABLE IF NOT EXISTS budgets (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, client_name TEXT, client_phone TEXT, items TEXT, total_value REAL);
      CREATE TABLE IF NOT EXISTS recurring_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, description TEXT, category TEXT, value REAL, day_of_month INTEGER, last_generated_month TEXT);
      
      -- Add date column to works if it doesn't exist
      PRAGMA table_info(works);
    `);

    // Check if date column exists, if not add it
    const columns = db.prepare("PRAGMA table_info(works)").all();
    if (!columns.some((c: any) => c.name === 'date')) {
      db.exec("ALTER TABLE works ADD COLUMN date TEXT;");
    }
  } catch (e) {
    console.error("❌ Erro no banco de dados:", e);
    db = null;
  }

  // API Routes
  app.get("/api/health", (req, res) => res.json({ status: "ok", db: !!db }));

  const processRecurringTransactions = () => {
    if (!db) return;
    try {
      const now = new Date();
      const currentMonth = now.toISOString().substring(0, 7); // YYYY-MM
      const recurring = db.prepare("SELECT * FROM recurring_transactions").all();

      recurring.forEach((rt: any) => {
        if (rt.last_generated_month !== currentMonth) {
          // Check if today is >= day_of_month
          if (now.getDate() >= rt.day_of_month) {
            const dateStr = `${currentMonth}-${String(rt.day_of_month).padStart(2, '0')}`;
            db.prepare("INSERT INTO transactions (date, type, description, category, value) VALUES (?, ?, ?, ?, ?)").run(dateStr, rt.type, `[MENSAL] ${rt.description}`, rt.category, rt.value);
            db.prepare("UPDATE recurring_transactions SET last_generated_month = ? WHERE id = ?").run(currentMonth, rt.id);
            console.log(`✅ Transação mensal gerada: ${rt.description}`);
          }
        }
      });
    } catch (e) {
      console.error("❌ Erro ao processar transações recorrentes:", e);
    }
  };
  
  app.get("/api/stats", (req, res) => {
    if (!db) return res.json({ dailySales: 0, dailyInflow: 0, dailyOutflow: 0, dailyProfit: 0, monthlyProfit: 0, totalStockValue: 0, activeWorks: 0, topProducts: [], totalSalesProfit: 0 });
    processRecurringTransactions();
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = today.substring(0, 7) + '-01';

      const stats = {
        dailySales: db.prepare("SELECT SUM(total_price) as total FROM sales WHERE date = ?").get(today)?.total || 0,
        dailyInflow: db.prepare("SELECT SUM(value) as total FROM transactions WHERE date = ? AND type = 'entrada'").get(today)?.total || 0,
        dailyOutflow: db.prepare("SELECT SUM(value) as total FROM transactions WHERE date = ? AND type = 'saida'").get(today)?.total || 0,
        totalStockValue: db.prepare("SELECT SUM(quantity * cost) as total FROM materials").get()?.total || 0,
        activeWorks: db.prepare("SELECT COUNT(*) as count FROM works WHERE status = 'em andamento'").get()?.count || 0,
        totalSalesProfit: db.prepare(`
          SELECT SUM((s.unit_price - m.cost) * s.quantity) as total 
          FROM sales s 
          JOIN materials m ON s.material_id = m.id
        `).get()?.total || 0,
        topProducts: db.prepare(`
          SELECT m.name, SUM(s.quantity) as total_qty 
          FROM sales s 
          JOIN materials m ON s.material_id = m.id 
          GROUP BY s.material_id 
          ORDER BY total_qty DESC 
          LIMIT 5
        `).all()
      };

      const monthlyInflow = db.prepare("SELECT SUM(value) as total FROM transactions WHERE date >= ? AND type = 'entrada'").get(monthStart)?.total || 0;
      const monthlyOutflow = db.prepare("SELECT SUM(value) as total FROM transactions WHERE date >= ? AND type = 'saida'").get(monthStart)?.total || 0;

      res.json({ 
        ...stats, 
        dailyProfit: stats.dailyInflow - stats.dailyOutflow, 
        monthlyProfit: monthlyInflow - monthlyOutflow 
      });
    } catch (e) { res.json({ error: String(e) }); }
  });

  // Generic Get
  app.get("/api/:resource", (req, res) => {
    if (!db) return res.json([]);
    try {
      const table = req.params.resource;
      const rows = db.prepare(`SELECT * FROM ${table} ORDER BY id DESC`).all();
      res.json(rows);
    } catch (e) { res.json([]); }
  });

  // Materials
  app.post("/api/materials", (req, res) => {
    const { name, category, unit, quantity, cost, price, supplier } = req.body;
    const info = db.prepare("INSERT INTO materials (name, category, unit, quantity, cost, price, supplier) VALUES (?, ?, ?, ?, ?, ?, ?)").run(name, category, unit, quantity, cost, price, supplier);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/materials/:id", (req, res) => {
    const { name, category, unit, quantity, cost, price, supplier } = req.body;
    db.prepare("UPDATE materials SET name = ?, category = ?, unit = ?, quantity = ?, cost = ?, price = ?, supplier = ? WHERE id = ?").run(name, category, unit, quantity, cost, price, supplier, req.params.id);
    res.json({ success: true });
  });

  // Sales (with stock update)
  app.post("/api/sales", (req, res) => {
    const { date, material_id, quantity, unit_price, total_price, client, payment_method } = req.body;
    const transaction = db.transaction(() => {
      const info = db.prepare("INSERT INTO sales (date, material_id, quantity, unit_price, total_price, client, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)").run(date, material_id, quantity, unit_price, total_price, client, payment_method);
      db.prepare("UPDATE materials SET quantity = quantity - ? WHERE id = ?").run(quantity, material_id);
      db.prepare("INSERT INTO transactions (date, type, description, category, value) VALUES (?, ?, ?, ?, ?)").run(date, 'entrada', `Venda: ${client || 'Consumidor'}`, 'Vendas', total_price);
      return info.lastInsertRowid;
    });
    res.json({ id: transaction() });
  });

  // Works (with stock update for materials used)
  app.post("/api/works", (req, res) => {
    const { client_name, address, service, materials_used, total_value, total_cost, service_value, status, date: workDate } = req.body;
    const date = workDate || new Date().toISOString().split('T')[0];
    
    const transaction = db.transaction(() => {
      const info = db.prepare("INSERT INTO works (client_name, address, service, materials_used, total_value, total_cost, status, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(client_name, address, service, JSON.stringify(materials_used), total_value, total_cost || 0, status, date);
      
      let materialsTotalSalePrice = 0;

      // Deduct stock and record sales for each material used in the work
      if (Array.isArray(materials_used)) {
        materials_used.forEach((item: any) => {
          if (item.material_id && item.quantity) {
            // Deduct stock
            db.prepare("UPDATE materials SET quantity = quantity - ? WHERE id = ?").run(item.quantity, item.material_id);
            
            // Record as a sale to track profit (using sale price as unit_price)
            const itemTotal = item.quantity * item.price;
            materialsTotalSalePrice += itemTotal;
            
            db.prepare("INSERT INTO sales (date, material_id, quantity, unit_price, total_price, client, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)").run(date, item.material_id, item.quantity, item.price, itemTotal, `Obra: ${client_name}`, 'Obra');
          }
        });
      }
      
      // Record the money split in transactions
      // 1. Material portion goes to "Estoque/Vendas"
      if (materialsTotalSalePrice > 0) {
        db.prepare("INSERT INTO transactions (date, type, description, category, value) VALUES (?, ?, ?, ?, ?)").run(date, 'entrada', `Materiais Obra: ${client_name}`, 'Venda Material', materialsTotalSalePrice);
      }
      
      // 2. Service portion goes to "Serviços"
      const actualServiceValue = service_value || (total_value - materialsTotalSalePrice);
      if (actualServiceValue > 0) {
        db.prepare("INSERT INTO transactions (date, type, description, category, value) VALUES (?, ?, ?, ?, ?)").run(date, 'entrada', `Mão de Obra: ${client_name}`, 'Serviço Obra', actualServiceValue);
      }
      
      return info.lastInsertRowid;
    });
    
    res.json({ id: transaction() });
  });

  app.put("/api/works/:id", (req, res) => {
    const { client_name, address, service, materials_used, total_value, total_cost, status, date } = req.body;
    db.prepare("UPDATE works SET client_name = ?, address = ?, service = ?, materials_used = ?, total_value = ?, total_cost = ?, status = ?, date = ? WHERE id = ?").run(client_name, address, service, JSON.stringify(materials_used), total_value, total_cost, status, date, req.params.id);
    res.json({ success: true });
  });

  // Budgets
  app.post("/api/budgets", (req, res) => {
    const { date, client_name, client_phone, items, total_value } = req.body;
    const info = db.prepare("INSERT INTO budgets (date, client_name, client_phone, items, total_value) VALUES (?, ?, ?, ?, ?)").run(date, client_name, client_phone, JSON.stringify(items), total_value);
    res.json({ id: info.lastInsertRowid });
  });

  // Transactions
  app.post("/api/transactions", (req, res) => {
    const { date, type, description, category, value } = req.body;
    const info = db.prepare("INSERT INTO transactions (date, type, description, category, value) VALUES (?, ?, ?, ?, ?)").run(date, type, description, category, value);
    res.json({ id: info.lastInsertRowid });
  });

  // Recurring Transactions
  app.post("/api/recurring_transactions", (req, res) => {
    const { type, description, category, value, day_of_month } = req.body;
    const info = db.prepare("INSERT INTO recurring_transactions (type, description, category, value, day_of_month) VALUES (?, ?, ?, ?, ?)").run(type, description, category, value, day_of_month);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/recurring_transactions/:id", (req, res) => {
    db.prepare("DELETE FROM recurring_transactions WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/:resource/:id", (req, res) => {
    if (!db) return res.status(500).json({ error: "Database not connected" });
    try {
      const { resource, id } = req.params;
      const allowedTables = ['materials', 'transactions', 'sales', 'works', 'budgets'];
      if (!allowedTables.includes(resource)) {
        return res.status(400).json({ error: "Invalid resource" });
      }
      db.prepare(`DELETE FROM ${resource} WHERE id = ?`).run(id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.delete("/api/system/reset", (req, res) => {
    if (!db) return res.status(500).json({ error: "Database not connected" });
    try {
      const tables = ['materials', 'transactions', 'sales', 'works', 'budgets', 'recurring_transactions'];
      const transaction = db.transaction(() => {
        tables.forEach(table => {
          db.prepare(`DELETE FROM ${table}`).run();
        });
      });
      transaction();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) { next(e); }
    });
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.resolve(__dirname, "dist", "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✨ Servidor rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
