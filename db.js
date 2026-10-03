const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
const SQLITE_FILE = path.join(DATA_DIR, 'wms_database.sqlite');
const JSON_BACKUP_FILE = path.join(DATA_DIR, 'wms_database.json');
const INITIAL_SEED_FILE = path.join(DATA_DIR, 'initial_seed.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {}
}

let sqliteModule = null;
let db = null;
let isSQLiteAvailable = false;

try {
    sqliteModule = require('node:sqlite');
    if (sqliteModule && sqliteModule.DatabaseSync) {
        db = new sqliteModule.DatabaseSync(SQLITE_FILE);
        isSQLiteAvailable = true;
        // High performance and crash-safety pragmas
        db.exec("PRAGMA journal_mode = WAL;");
        db.exec("PRAGMA synchronous = NORMAL;");
        db.exec("PRAGMA foreign_keys = ON;");
        console.log('[SQLite Engine] Connected to persistent SQLite database:', SQLITE_FILE);
    }
} catch (e) {
    console.warn('[SQLite Engine] node:sqlite unavailable or failed to initialize, using JSON fallback:', e.message);
    isSQLiteAvailable = false;
}

/**
 * Initialize all required SQLite tables
 */
function initTables() {
    if (!isSQLiteAvailable || !db) return;

    db.exec(`
        -- Meta information (versions, last sync timestamps)
        CREATE TABLE IF NOT EXISTS erp_meta (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TEXT
        );

        -- Master key-value collections table (stores all ERP arrays)
        CREATE TABLE IF NOT EXISTS erp_collections (
            name TEXT PRIMARY KEY,
            data_json TEXT,
            count INTEGER,
            updated_at TEXT
        );

        -- Structured Products Table
        CREATE TABLE IF NOT EXISTS erp_products (
            id INTEGER PRIMARY KEY,
            name TEXT,
            brand TEXT,
            category TEXT,
            daily_price REAL,
            deposit_amount REAL,
            available_count INTEGER,
            total_count INTEGER,
            status TEXT,
            data_json TEXT,
            updated_at TEXT
        );

        -- Structured Product Units / Items (with Barcode & Location)
        CREATE TABLE IF NOT EXISTS erp_product_items (
            id INTEGER PRIMARY KEY,
            model_id INTEGER,
            serial_number TEXT,
            barcode TEXT,
            status TEXT,
            location_id INTEGER,
            data_json TEXT,
            updated_at TEXT
        );

        -- Structured Customers & Debts Table
        CREATE TABLE IF NOT EXISTS erp_customers (
            id INTEGER PRIMARY KEY,
            full_name TEXT,
            phone TEXT,
            balance REAL,
            debt REAL,
            status TEXT,
            data_json TEXT,
            updated_at TEXT
        );

        -- Structured Orders Table
        CREATE TABLE IF NOT EXISTS erp_orders (
            id INTEGER PRIMARY KEY,
            order_number TEXT,
            customer_id INTEGER,
            customer_name TEXT,
            status TEXT,
            total_amount REAL,
            paid_amount REAL,
            debt_amount REAL,
            deposit_amount REAL,
            created_at TEXT,
            data_json TEXT,
            updated_at TEXT
        );

        -- Structured Cash Registers & Safes
        CREATE TABLE IF NOT EXISTS erp_cash_registers (
            id INTEGER PRIMARY KEY,
            name TEXT,
            balance REAL,
            data_json TEXT,
            updated_at TEXT
        );

        -- Structured Order Payments
        CREATE TABLE IF NOT EXISTS erp_order_payments (
            id INTEGER PRIMARY KEY,
            order_id INTEGER,
            amount REAL,
            payment_type TEXT,
            date TEXT,
            data_json TEXT,
            updated_at TEXT
        );

        -- Structured Expenses
        CREATE TABLE IF NOT EXISTS erp_expenses (
            id INTEGER PRIMARY KEY,
            title TEXT,
            amount REAL,
            category TEXT,
            date TEXT,
            data_json TEXT,
            updated_at TEXT
        );

        -- Structured Service Orders (Kran, Musor, Gruzchik)
        CREATE TABLE IF NOT EXISTS erp_service_orders (
            id INTEGER PRIMARY KEY,
            order_number TEXT,
            customer_id INTEGER,
            service_category TEXT,
            order_status TEXT,
            customer_total_price REAL,
            net_profit REAL,
            data_json TEXT,
            updated_at TEXT
        );

        -- Audit and Cache Logs
        CREATE TABLE IF NOT EXISTS system_cache_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT,
            details TEXT,
            timestamp TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_products_cat ON erp_products(category);
        CREATE INDEX IF NOT EXISTS idx_items_barcode ON erp_product_items(barcode);
        CREATE INDEX IF NOT EXISTS idx_customers_debt ON erp_customers(debt);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON erp_orders(status);
        CREATE INDEX IF NOT EXISTS idx_cache_logs_time ON system_cache_logs(timestamp);
    `);
}

/**
 * Load default/seed database if empty
 */
function getSeedData() {
    try {
        if (fs.existsSync(INITIAL_SEED_FILE)) {
            return JSON.parse(fs.readFileSync(INITIAL_SEED_FILE, 'utf-8'));
        }
    } catch (e) {
        console.warn('Could not read seed file:', e.message);
    }
    return {};
}

/**
 * Check if the database has any data
 */
function isDBEmpty() {
    if (isSQLiteAvailable && db) {
        try {
            const row = db.prepare("SELECT count(*) as cnt FROM erp_collections").get();
            return !row || row.cnt === 0;
        } catch (e) {
            return true;
        }
    } else {
        return !fs.existsSync(JSON_BACKUP_FILE);
    }
}

/**
 * Save full database state to SQLite with transaction and dual backup
 */
function saveEntireDB(dbData) {
    if (!dbData || typeof dbData !== 'object') {
        throw new Error('Invalid DB data provided for saving');
    }

    const now = new Date().toISOString();

    if (isSQLiteAvailable && db) {
        db.exec("BEGIN TRANSACTION;");
        try {
            const insertColl = db.prepare(`
                INSERT INTO erp_collections (name, data_json, count, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(name) DO UPDATE SET
                    data_json = excluded.data_json,
                    count = excluded.count,
                    updated_at = excluded.updated_at
            `);

            for (const [key, val] of Object.entries(dbData)) {
                const count = Array.isArray(val) ? val.length : 1;
                insertColl.run(key, JSON.stringify(val), count, now);
            }

            // Sync structured table: erp_products
            if (Array.isArray(dbData.product_models)) {
                db.exec("DELETE FROM erp_products;");
                const insertProd = db.prepare(`
                    INSERT INTO erp_products (id, name, brand, category, daily_price, deposit_amount, available_count, total_count, status, data_json, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                for (const p of dbData.product_models) {
                    insertProd.run(
                        p.id || 0,
                        p.name || '',
                        p.brand || '',
                        p.category || '',
                        Number(p.daily_price || 0),
                        Number(p.deposit_amount || 0),
                        Number(p.available_count || 0),
                        Number(p.total_count || 0),
                        p.status || 'mavjud',
                        JSON.stringify(p),
                        now
                    );
                }
            }

            // Sync structured table: erp_product_items
            if (Array.isArray(dbData.product_items)) {
                db.exec("DELETE FROM erp_product_items;");
                const insertItem = db.prepare(`
                    INSERT INTO erp_product_items (id, model_id, serial_number, barcode, status, location_id, data_json, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `);
                for (const item of dbData.product_items) {
                    insertItem.run(
                        item.id || 0,
                        item.model_id || 0,
                        item.serial_number || '',
                        item.barcode || '',
                        item.status || '',
                        item.warehouse_location_id || 0,
                        JSON.stringify(item),
                        now
                    );
                }
            }

            // Sync structured table: erp_customers (debts & balances)
            if (Array.isArray(dbData.customers)) {
                db.exec("DELETE FROM erp_customers;");
                const insertCust = db.prepare(`
                    INSERT INTO erp_customers (id, full_name, phone, balance, debt, status, data_json, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `);
                for (const c of dbData.customers) {
                    insertCust.run(
                        c.id || 0,
                        c.full_name || '',
                        c.phone || '',
                        Number(c.balance || 0),
                        Number(c.debt || 0),
                        c.status || 'aktiv',
                        JSON.stringify(c),
                        now
                    );
                }
            }

            // Sync structured table: erp_orders
            if (Array.isArray(dbData.orders)) {
                db.exec("DELETE FROM erp_orders;");
                const insertOrder = db.prepare(`
                    INSERT INTO erp_orders (id, order_number, customer_id, customer_name, status, total_amount, paid_amount, debt_amount, deposit_amount, created_at, data_json, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                for (const o of dbData.orders) {
                    insertOrder.run(
                        o.id || 0,
                        o.order_number || '',
                        o.customer_id || 0,
                        o.customer_name || '',
                        o.status || '',
                        Number(o.total_amount || 0),
                        Number(o.paid_amount || 0),
                        Number(o.debt_amount || 0),
                        Number(o.deposit_amount || 0),
                        o.created_at || now,
                        JSON.stringify(o),
                        now
                    );
                }
            }

            // Sync structured table: erp_cash_registers
            if (Array.isArray(dbData.cash_registers)) {
                db.exec("DELETE FROM erp_cash_registers;");
                const insertCash = db.prepare(`
                    INSERT INTO erp_cash_registers (id, name, balance, data_json, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                `);
                for (const cr of dbData.cash_registers) {
                    insertCash.run(
                        cr.id || 0,
                        cr.name || '',
                        Number(cr.balance || 0),
                        JSON.stringify(cr),
                        now
                    );
                }
            }

            // Sync structured table: erp_order_payments
            if (Array.isArray(dbData.order_payments)) {
                db.exec("DELETE FROM erp_order_payments;");
                const insertPay = db.prepare(`
                    INSERT INTO erp_order_payments (id, order_id, amount, payment_type, date, data_json, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);
                for (const p of dbData.order_payments) {
                    insertPay.run(
                        p.id || 0,
                        p.order_id || 0,
                        Number(p.amount || 0),
                        p.payment_type || '',
                        p.date || now,
                        JSON.stringify(p),
                        now
                    );
                }
            }

            // Sync structured table: erp_expenses
            if (Array.isArray(dbData.expenses)) {
                db.exec("DELETE FROM erp_expenses;");
                const insertExp = db.prepare(`
                    INSERT INTO erp_expenses (id, title, amount, category, date, data_json, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);
                for (const exp of dbData.expenses) {
                    insertExp.run(
                        exp.id || 0,
                        exp.title || '',
                        Number(exp.amount || 0),
                        exp.category || '',
                        exp.date || now,
                        JSON.stringify(exp),
                        now
                    );
                }
            }

            // Sync structured table: erp_service_orders
            if (Array.isArray(dbData.service_orders)) {
                db.exec("DELETE FROM erp_service_orders;");
                const insertSrv = db.prepare(`
                    INSERT INTO erp_service_orders (id, order_number, customer_id, service_category, order_status, customer_total_price, net_profit, data_json, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                for (const so of dbData.service_orders) {
                    insertSrv.run(
                        so.id || 0,
                        so.order_number || '',
                        so.customer_id || 0,
                        so.service_category || '',
                        so.order_status || '',
                        Number(so.customer_total_price || 0),
                        Number(so.net_profit || 0),
                        JSON.stringify(so),
                        now
                    );
                }
            }

            // Update meta table
            const updateMeta = db.prepare(`
                INSERT INTO erp_meta (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = excluded.updated_at
            `);
            updateMeta.run('last_full_sync', now, now);
            updateMeta.run('database_version', '15.0_sqlite', now);

            // Log event
            const logStmt = db.prepare("INSERT INTO system_cache_logs (action, details, timestamp) VALUES (?, ?, ?)");
            logStmt.run('SAVE_FULL_DB', `Synced ${Object.keys(dbData).length} collections to SQLite`, now);

            db.exec("COMMIT;");
        } catch (err) {
            db.exec("ROLLBACK;");
            console.error('[SQLite Engine] Error saving to SQLite, rolling back:', err);
            throw err;
        }
    }

    // Atomic write to JSON backup file
    try {
        const tempFile = `${JSON_BACKUP_FILE}.tmp.${Date.now()}`;
        fs.writeFileSync(tempFile, JSON.stringify(dbData, null, 2), 'utf-8');
        fs.renameSync(tempFile, JSON_BACKUP_FILE);
    } catch (err) {
        console.error('[SQLite Engine] Error writing JSON backup:', err);
    }

    return { success: true, saved_at: now };
}

/**
 * Retrieve entire database from SQLite
 */
function getEntireDB() {
    if (isSQLiteAvailable && db) {
        try {
            const rows = db.prepare("SELECT name, data_json FROM erp_collections").all();
            if (rows && rows.length > 0) {
                const result = {};
                for (const row of rows) {
                    try {
                        result[row.name] = JSON.parse(row.data_json);
                    } catch (e) {
                        result[row.name] = null;
                    }
                }
                return result;
            }
        } catch (e) {
            console.error('[SQLite Engine] Error reading from SQLite erp_collections:', e);
        }
    }

    // Fallback: Read from JSON backup file
    if (fs.existsSync(JSON_BACKUP_FILE)) {
        try {
            const raw = fs.readFileSync(JSON_BACKUP_FILE, 'utf-8');
            return JSON.parse(raw);
        } catch (e) {
            console.error('[SQLite Engine] Error reading JSON backup file:', e);
        }
    }

    // Fallback 2: Read from initial seed
    const seed = getSeedData();
    if (Object.keys(seed).length > 0) {
        saveEntireDB(seed);
        return seed;
    }

    return {};
}

/**
 * Cache and Memory Auto-Cleanup Mechanism
 * - Prunes system_cache_logs keeping only latest N entries
 * - Performs SQLite VACUUM / PRAGMA optimize
 * - Deletes stale temporary files
 * - Invokes garbage collection if exposed
 */
function cleanupCache(maxKeepLogs = 500) {
    const report = {
        deletedLogs: 0,
        vacuumed: false,
        tempFilesRemoved: 0,
        cleanedAt: new Date().toISOString(),
        memoryBefore: process.memoryUsage()
    };

    if (isSQLiteAvailable && db) {
        try {
            // Count existing logs
            const countRow = db.prepare("SELECT count(*) as cnt FROM system_cache_logs").get();
            const totalLogs = countRow ? countRow.cnt : 0;

            if (totalLogs > maxKeepLogs) {
                const logsToDelete = totalLogs - maxKeepLogs;
                const delStmt = db.prepare(`
                    DELETE FROM system_cache_logs 
                    WHERE id IN (
                        SELECT id FROM system_cache_logs 
                        ORDER BY id ASC 
                        LIMIT ?
                    )
                `);
                delStmt.run(logsToDelete);
                report.deletedLogs = logsToDelete;
            }

            // Optimize SQLite indexes and reclaim memory
            db.exec("PRAGMA optimize;");
            report.vacuumed = true;
        } catch (e) {
            console.error('[Cache Cleanup] Error optimizing SQLite:', e);
        }
    }

    // Clean up temporary files in data directory
    try {
        const files = fs.readdirSync(DATA_DIR);
        for (const file of files) {
            if (file.includes('.tmp.') || file.endsWith('.bak')) {
                const fullPath = path.join(DATA_DIR, file);
                try {
                    const stats = fs.statSync(fullPath);
                    const ageMs = Date.now() - stats.mtimeMs;
                    // Delete files older than 1 hour
                    if (ageMs > 3600000) {
                        fs.unlinkSync(fullPath);
                        report.tempFilesRemoved++;
                    }
                } catch (err) {}
            }
        }
    } catch (e) {}

    // Force GC if node was launched with --expose-gc
    if (global.gc) {
        try {
            global.gc();
            report.gcInvoked = true;
        } catch (e) {}
    }

    report.memoryAfter = process.memoryUsage();
    return report;
}

/**
 * Get current database and cache statistics
 */
function getCacheStatus() {
    const stats = {
        is_sqlite: isSQLiteAvailable,
        sqlite_file: SQLITE_FILE,
        json_backup_file: JSON_BACKUP_FILE,
        sqlite_file_size_bytes: 0,
        sqlite_file_size_kb: "0 KB",
        records_summary: {},
        memory_usage: process.memoryUsage(),
        uptime_seconds: process.uptime()
    };

    try {
        if (fs.existsSync(SQLITE_FILE)) {
            const st = fs.statSync(SQLITE_FILE);
            stats.sqlite_file_size_bytes = st.size;
            stats.sqlite_file_size_kb = (st.size / 1024).toFixed(1) + " KB";
        }
    } catch (e) {}

    if (isSQLiteAvailable && db) {
        try {
            const collectionsCount = db.prepare("SELECT count(*) as c FROM erp_collections").get()?.c || 0;
            const productsCount = db.prepare("SELECT count(*) as c FROM erp_products").get()?.c || 0;
            const itemsCount = db.prepare("SELECT count(*) as c FROM erp_product_items").get()?.c || 0;
            const customersCount = db.prepare("SELECT count(*) as c FROM erp_customers").get()?.c || 0;
            const ordersCount = db.prepare("SELECT count(*) as c FROM erp_orders").get()?.c || 0;
            const cashCount = db.prepare("SELECT count(*) as c FROM erp_cash_registers").get()?.c || 0;
            const logsCount = db.prepare("SELECT count(*) as c FROM system_cache_logs").get()?.c || 0;

            stats.records_summary = {
                collections: collectionsCount,
                products: productsCount,
                product_items: itemsCount,
                customers: customersCount,
                orders: ordersCount,
                cash_registers: cashCount,
                cache_logs: logsCount
            };
        } catch (e) {}
    }

    return stats;
}

// Initial setup
initTables();
if (isDBEmpty()) {
    console.log('[SQLite Engine] Initializing database with seed data...');
    const seed = getSeedData();
    if (Object.keys(seed).length > 0) {
        saveEntireDB(seed);
        console.log('[SQLite Engine] Seed data loaded successfully.');
    }
} else {
    console.log('[SQLite Engine] Existing database loaded.');
}

module.exports = {
    isSQLiteAvailable,
    saveEntireDB,
    getEntireDB,
    cleanupCache,
    getCacheStatus,
    SQLITE_FILE,
    JSON_BACKUP_FILE
};
