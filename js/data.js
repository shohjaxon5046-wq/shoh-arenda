// ========================================================
// WMS ARENDA ERP - CENTRAL DATA STORE & SCHEMA DEFINITIONS
// ========================================================

const DEFAULT_DB = {
    // 1. Roles & Permissions (Rollar va Huquqlar)
    roles: [
        { id: 'admin', name: "Bosh Admin", description: "Tizimning to'liq boshqaruvi, barcha huquqlar va narxlarni tahrirlash" },
        { id: 'manager', name: "Menejer (Sotuv/Ijara)", description: "Buyurtmalar, mijozlar CRM va shartnomalar bilan ishlash" },
        { id: 'cashier', name: "Kassir", description: "To'lovlar qabul qilish, zalog kiritish va qaytarish" },
        { id: 'warehouseman', name: "Skladchi (Ombor mudiri)", description: "Kirim qabul qilish, seriyalar, shtrix-kod va ombor polkalarini boshqarish" }
    ],
    permissions: [
        { id: 1, code: 'products.edit_price', title: "Mahsulot narxlarini o'zgartirish (Faqat Admin)" },
        { id: 2, code: 'reports.view_profit', title: "Foyda va moliyaviy hisobotlarni ko'rish" },
        { id: 3, code: 'warehouse.manage', title: "Ombor kirim va joylashtirishni boshqarish" },
        { id: 4, code: 'orders.create', title: "Yangi buyurtma va ijara rasmiylashtirish" },
        { id: 5, code: 'staff.manage', title: "Xodimlar va rollarni boshqarish" },
        { id: 6, code: 'suppliers.pay', title: "Yetkazib beruvchilarga pul to'lash (Chiqim)" },
        { id: 7, code: 'customers.blacklist', title: "Mijozlarni Qora ro'yxatga kiritish/chiqarish" }
    ],
    role_permissions: {
        admin: ['products.edit_price', 'reports.view_profit', 'warehouse.manage', 'orders.create', 'staff.manage', 'suppliers.pay', 'customers.blacklist'],
        manager: ['warehouse.manage', 'orders.create', 'customers.blacklist'],
        cashier: ['orders.create'],
        warehouseman: ['warehouse.manage']
    },

    // 2. Staff Users (Asosiy Admin saqlanadi: admin / admin123)
    users: [
        { id: 1, full_name: "Bosh Admin", phone: "+998 90 111-22-33", username: "admin", password: "admin123", role_id: "admin", is_active: true, last_login: "" }
    ],

    // SECTION 4: SERVICE PARTNERS & BROKERAGE (Tashqi Hamkorlar va Tarixi 0)
    service_partners: [],
    partner_price_list: [
        { id: 1, partner_id: 1, service_type_detail: "Avtokran 25t (XCMG)", unit: "soat", cost_price: 300000, selling_price: 360000, margin_amount: 60000 },
        { id: 2, partner_id: 1, service_type_detail: "Avtokran 50t (Zoomlion)", unit: "soat", cost_price: 550000, selling_price: 680000, margin_amount: 130000 },
        { id: 3, partner_id: 2, service_type_detail: "Musor olib ketish (Gazel 2t)", unit: "reys", cost_price: 350000, selling_price: 450000, margin_amount: 100000 },
        { id: 4, partner_id: 2, service_type_detail: "Musor olib ketish (ZIL 6t)", unit: "reys", cost_price: 650000, selling_price: 800000, margin_amount: 150000 },
        { id: 5, partner_id: 3, service_type_detail: "Gruzchik xizmati (1 kishi)", unit: "soat", cost_price: 50000, selling_price: 75000, margin_amount: 25000 },
        { id: 6, partner_id: 3, service_type_detail: "Etajga ko'tarish xizmati", unit: "etaj", cost_price: 20000, selling_price: 30000, margin_amount: 10000 }
    ],
    service_orders: [],
    partner_payouts: [],

    // SECTION 11: DYNAMIC SERVICE PRICING RULES (ADMIN CONFIGURABLE)
    service_pricing_rules: {
        gruzchik: {
            bag_carry_price_per_floor: 3000,
            bag_carry_with_elevator: 1500,
            hourly_worker_rate: 50000,
            min_hours: 2,
            partner_share_percent: 75,
            worker_count_rules: [
                { max_kg: 500, workers: 1, label: "500 kg gacha" },
                { max_kg: 1500, workers: 2, label: "500 kg - 1.5 tonnagacha" },
                { max_kg: 3000, workers: 3, label: "1.5 t - 3 tonnagacha" },
                { max_kg: 999999, workers: 4, label: "3 tonnadan yuqori" }
            ]
        },
        kran: {
            rates: {
                "16": { hourly_rate: 300000, min_hours: 2, label: "16 tonna" },
                "25": { hourly_rate: 350000, min_hours: 3, label: "25 tonna" },
                "50": { hourly_rate: 600000, min_hours: 4, label: "50 tonna" }
            },
            outside_city_per_km: 15000,
            partner_share_percent: 80
        },
        musor: {
            trucks: {
                "gazel": { price: 400000, capacity: "1.5 tonna / 40 qopgacha", label: "Gazel (1.5t / 40 qop)" },
                "zil": { price: 800000, capacity: "5 tonna", label: "ZIL (5 tonna)" },
                "kamaz": { price: 1500000, capacity: "10-15 tonna", label: "KamAZ / Samosval (10-15t)" }
            },
            bag_price: 12000,
            min_bags: 20,
            loading_help_per_truck: 150000,
            loading_help_per_bag: 3000,
            floor_carry_down_per_bag: 2000,
            partner_share_percent: 75
        }
    },

    // 3. Suppliers & Accounting (0 ta)
    suppliers: [],
    supplier_transactions: [],

    // 4. Customers CRM (0 ta mijoz)
    customers: [],
    customer_transactions: [],
    customer_orders: [],

    // Categories (Asosiy kategoriyalar saqlanadi)
    categories: [
        { id: 1, name: "Elektr asboblar", icon: "zap" },
        { id: 2, name: "Benzinli texnika", icon: "fuel" },
        { id: 3, name: "Payvandlash & Metall", icon: "flame" },
        { id: 4, name: "Beton & Buzish", icon: "hammer" },
        { id: 5, name: "Bog' & Tozalash", icon: "trees" },
        { id: 6, name: "O'lchov va lazer", icon: "crosshair" }
    ],

    // ProductModels (0 ta)
    product_models: [],

    // ProductItems (0 ta)
    product_items: [],

    // Locations (WMS Manzillar)
    warehouse_locations: [
        { id: 1, code: "A-01-01", sector: "Sektor A", shelf: "1-Polka", bin: "1-Yacheyka", zone: "Sektor A (Elektr asboblar)", max_capacity: 4 },
        { id: 2, code: "A-01-02", sector: "Sektor A", shelf: "1-Polka", bin: "2-Yacheyka", zone: "Sektor A (Elektr asboblar)", max_capacity: 4 },
        { id: 3, code: "A-02-03", sector: "Sektor A", shelf: "2-Polka", bin: "3-Yacheyka", zone: "Sektor A (Elektr asboblar)", max_capacity: 3 },
        { id: 4, code: "B-01-01", sector: "Sektor B", shelf: "1-Polka", bin: "1-Yacheyka", zone: "Sektor B (Og'ir texnika)", max_capacity: 2 },
        { id: 5, code: "B-02-02", sector: "Sektor B", shelf: "2-Polka", bin: "2-Yacheyka", zone: "Sektor B (Og'ir texnika)", max_capacity: 2 },
        { id: 6, code: "C-01-05", sector: "C", shelf: "1-Polka", bin: "5-Yacheyka", zone: "Sektor C (Aksessuarlar)", max_capacity: 6 },
        { id: 7, code: "C-02-01", sector: "C", shelf: "2-Polka", bin: "1-Yacheyka", zone: "Sektor C (Aksessuarlar)", max_capacity: 5 },
        { id: 8, code: "D-01-01", sector: "D", shelf: "1-Polka", bin: "1-Yacheyka", zone: "Sektor D (Payvandlash va generatorlar)", max_capacity: 3 }
    ],

    maintenance_logs: [],
    price_change_logs: [],
    supplier_orders: [],
    inbound_receipts: [],
    pending_placements: [],
    supplier_returns: [],

    // SECTION 5: ORDERS (0 ta)
    orders: [],
    order_tool_items: [],
    order_service_items: [],
    order_payments: [],

    // SECTION 6: KASSA, MOLIYA & BALANSLAR (Barchasi 0 so'm)
    cash_registers: [
        { id: 1, name: "Asosiy Naqd Kassa", code: "naqd", current_balance: 0 },
        { id: 2, name: "Bank / Hisob raqam", code: "bank_utkazma", current_balance: 0 },
        { id: 3, name: "Karta / Terminal (Payme/Uzum)", code: "karta", current_balance: 0 }
    ],

    deposit_safe: {
        id: 1,
        total_holding_deposit: 0
    },

    expense_categories: [
        { id: 1, name: "Asboblar ta'miri va zapchastlar", icon: "wrench" },
        { id: 2, name: "Xodimlar oyligi", icon: "user-check" },
        { id: 3, name: "Ombor ijarasi", icon: "warehouse" },
        { id: 4, name: "Benzin va transport", icon: "fuel" },
        { id: 5, name: "Kommunal to'lovlar", icon: "zap" },
        { id: 6, name: "Boshqa xarajatlar", icon: "more-horizontal" }
    ],

    expenses: [],
    financial_transactions: [],

    ai_settings: {
        is_enabled: true,
        provider: "builtin",
        api_key: "",
        model_name: "builtin-nlp",
        admin_pin: "7788",
        welcome_message: "Assalomu alaykum! WMS Arenda xizmatiga xush kelibsiz! Sizga qanday asbob yoki xizmat (kran, musor, gruzchik) kerak?",
        system_prompt: "Siz WMS ARENDA kompaniyasining 100% avtonom ichki aqlli AI sotuvchi maslahatchisisiz. Narxlar, asboblar va xizmatlar bo'yicha aniq ma'lumot bering."
    }
};

// Storage Key for production slate
const STORAGE_KEY = 'WMS_ARENDA_DB_PROD_V4';

// State storage
let DB = {};
if (typeof window !== 'undefined') window.DB = DB;

function loadDB() {
    // Automatically wipe legacy demo keys from old test sessions
    ['WMS_ARENDA_DB_V1', 'WMS_ARENDA_DB_V2', 'WMS_ARENDA_DB_V3', 'wms_database'].forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
    });

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            DB = JSON.parse(saved);
        } catch(e) {
            DB = JSON.parse(JSON.stringify(DEFAULT_DB));
        }
    } else {
        DB = JSON.parse(JSON.stringify(DEFAULT_DB));
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
        } catch(e) {}
    }
    if (typeof window !== 'undefined') window.DB = DB;

    // Ensure all collections are present if older version existed in localStorage
    if (!DB.users || !Array.isArray(DB.users) || DB.users.length === 0) DB.users = JSON.parse(JSON.stringify(DEFAULT_DB.users || []));
    if (!DB.roles) DB.roles = JSON.parse(JSON.stringify(DEFAULT_DB.roles || []));
    if (!DB.permissions) DB.permissions = JSON.parse(JSON.stringify(DEFAULT_DB.permissions || []));
    if (!DB.role_permissions) DB.role_permissions = JSON.parse(JSON.stringify(DEFAULT_DB.role_permissions || {}));
    if (!DB.categories) DB.categories = JSON.parse(JSON.stringify(DEFAULT_DB.categories || []));
    if (!DB.cash_registers) DB.cash_registers = JSON.parse(JSON.stringify(DEFAULT_DB.cash_registers || []));
    if (!DB.deposit_safe) DB.deposit_safe = JSON.parse(JSON.stringify(DEFAULT_DB.deposit_safe || { id: 1, total_holding_deposit: 0 }));
    if (!DB.expense_categories) DB.expense_categories = JSON.parse(JSON.stringify(DEFAULT_DB.expense_categories || []));
    if (!DB.service_pricing_rules) DB.service_pricing_rules = JSON.parse(JSON.stringify(DEFAULT_DB.service_pricing_rules || {}));
    if (!DB.warehouse_locations || DB.warehouse_locations.length === 0) DB.warehouse_locations = JSON.parse(JSON.stringify(DEFAULT_DB.warehouse_locations || []));

    // Ensure all data arrays exist (even if 0 items)
    const arrayKeys = [
        'product_models', 'product_items', 'customers', 'suppliers',
        'orders', 'order_tool_items', 'order_service_items', 'order_payments',
        'service_partners', 'partner_price_list', 'service_orders', 'partner_payouts',
        'expenses', 'financial_transactions', 'supplier_orders', 'inbound_receipts',
        'pending_placements', 'supplier_returns', 'maintenance_logs', 'price_change_logs',
        'customer_transactions', 'customer_orders'
    ];
    arrayKeys.forEach(key => {
        if (!Array.isArray(DB[key])) DB[key] = [];
    });
    if (!DB.product_models) DB.product_models = JSON.parse(JSON.stringify(DEFAULT_DB.product_models || []));
    if (!DB.product_items) DB.product_items = JSON.parse(JSON.stringify(DEFAULT_DB.product_items || []));
    if (!DB.customers) DB.customers = JSON.parse(JSON.stringify(DEFAULT_DB.customers || []));
    if (!DB.suppliers) DB.suppliers = JSON.parse(JSON.stringify(DEFAULT_DB.suppliers || []));
    if (!DB.role_permissions) DB.role_permissions = JSON.parse(JSON.stringify(DEFAULT_DB.role_permissions || {}));
    if (!DB.orders) DB.orders = JSON.parse(JSON.stringify(DEFAULT_DB.orders || []));
    if (!DB.order_tool_items) DB.order_tool_items = JSON.parse(JSON.stringify(DEFAULT_DB.order_tool_items || []));
    if (!DB.order_service_items) DB.order_service_items = JSON.parse(JSON.stringify(DEFAULT_DB.order_service_items || []));
    if (!DB.order_payments) DB.order_payments = JSON.parse(JSON.stringify(DEFAULT_DB.order_payments || []));
    if (!DB.service_partners) DB.service_partners = JSON.parse(JSON.stringify(DEFAULT_DB.service_partners || []));
    if (!DB.partner_price_list) DB.partner_price_list = JSON.parse(JSON.stringify(DEFAULT_DB.partner_price_list || []));
    if (!DB.service_orders) DB.service_orders = JSON.parse(JSON.stringify(DEFAULT_DB.service_orders || []));
    if (!DB.partner_payouts) DB.partner_payouts = JSON.parse(JSON.stringify(DEFAULT_DB.partner_payouts || []));
    if (!DB.cash_registers) DB.cash_registers = JSON.parse(JSON.stringify(DEFAULT_DB.cash_registers || []));
    if (!DB.deposit_safe) DB.deposit_safe = JSON.parse(JSON.stringify(DEFAULT_DB.deposit_safe || {}));
    if (!DB.expense_categories) DB.expense_categories = JSON.parse(JSON.stringify(DEFAULT_DB.expense_categories || []));
    if (!DB.expenses) DB.expenses = JSON.parse(JSON.stringify(DEFAULT_DB.expenses || []));
    if (!DB.financial_transactions) DB.financial_transactions = JSON.parse(JSON.stringify(DEFAULT_DB.financial_transactions || []));

    // Ensure AI Agent settings
    if (!DB.ai_settings) {
        DB.ai_settings = {
            is_enabled: true,
            provider: "builtin", // "builtin", "groq", "gemini"
            api_key: "",
            model_name: "builtin-nlp",
            admin_pin: "7788",
            welcome_message: "Assalomu alaykum! WMS Arenda xizmatiga xush kelibsiz! Sizga qanday asbob yoki xizmat (kran, musor, gruzchik) kerak?",
            system_prompt: "Siz WMS ARENDA kompaniyasining 100% avtonom ichki aqlli AI sotuvchi maslahatchisisiz. Narxlar, asboblar va xizmatlar bo'yicha aniq ma'lumot bering."
        };
    }
    if (!DB.ai_settings.provider || DB.ai_settings.provider === 'demo') {
        DB.ai_settings.provider = 'builtin';
    }

    // Ensure all orders have a uuid for online receipts
    (DB.orders || []).forEach((o, idx) => {
        if (!o.uuid) o.uuid = `ord-${o.id}-${Math.random().toString(36).substring(2, 8)}`;
    });

    // Ensure WMS locations have codes and sectors
    const defaultLocMap = {
        1: { code: "A-01-01", sector: "Sektor A", shelf: "1-Polka", bin: "1-Yacheyka", max_capacity: 4 },
        2: { code: "A-01-02", sector: "Sektor A", shelf: "1-Polka", bin: "2-Yacheyka", max_capacity: 4 },
        3: { code: "A-02-03", sector: "Sektor A", shelf: "2-Polka", bin: "3-Yacheyka", max_capacity: 3 },
        4: { code: "B-01-01", sector: "Sektor B", shelf: "1-Polka", bin: "1-Yacheyka", max_capacity: 2 },
        5: { code: "B-02-02", sector: "Sektor B", shelf: "2-Polka", bin: "2-Yacheyka", max_capacity: 2 },
        6: { code: "C-01-05", sector: "C", shelf: "1-Polka", bin: "5-Yacheyka", max_capacity: 6 },
        7: { code: "C-02-01", sector: "C", shelf: "2-Polka", bin: "1-Yacheyka", max_capacity: 5 },
        8: { code: "D-01-01", sector: "D", shelf: "1-Polka", bin: "1-Yacheyka", max_capacity: 3 }
    };

    if (!DB.warehouse_locations || DB.warehouse_locations.length === 0) {
        DB.warehouse_locations = JSON.parse(JSON.stringify(DEFAULT_DB.warehouse_locations));
    } else {
        DB.warehouse_locations.forEach(loc => {
            const def = defaultLocMap[loc.id];
            if (def) {
                if (!loc.code) loc.code = def.code;
                if (!loc.sector) loc.sector = def.sector;
                if (!loc.max_capacity) loc.max_capacity = def.max_capacity;
                if (loc.shelf && loc.shelf.includes("Polka A-01")) loc.shelf = "1-Polka";
                if (loc.shelf && loc.shelf.includes("Polka A-02")) loc.shelf = "2-Polka";
                if (loc.shelf && loc.shelf.includes("Polka B-01")) loc.shelf = "1-Polka";
                if (loc.shelf && loc.shelf.includes("Polka B-02")) loc.shelf = "2-Polka";
                if (loc.shelf && loc.shelf.includes("Polka C-01")) loc.shelf = "1-Polka";
                if (loc.bin && loc.bin.includes("Yacheyka 01")) loc.bin = "1-Yacheyka";
                if (loc.bin && loc.bin.includes("Yacheyka 02")) loc.bin = "2-Yacheyka";
                if (loc.bin && loc.bin.includes("Yacheyka 03")) loc.bin = "3-Yacheyka";
                if (loc.bin && loc.bin.includes("Yacheyka 05")) loc.bin = "5-Yacheyka";
            } else if (!loc.code) {
                loc.code = `LOC-${String(loc.id).padStart(2, '0')}`;
                loc.max_capacity = loc.max_capacity || 4;
            }
        });
        // Ensure 8 standard locations exist
        [7, 8].forEach(extraId => {
            if (!DB.warehouse_locations.some(l => l.id === extraId)) {
                const extraDef = DEFAULT_DB.warehouse_locations.find(l => l.id === extraId);
                if (extraDef) DB.warehouse_locations.push(extraDef);
            }
        });
    }

    // Auto-migration for Section 11 Dynamic Service Pricing Rules
    if (!DB.service_pricing_rules) {
        DB.service_pricing_rules = JSON.parse(JSON.stringify(DEFAULT_DB.service_pricing_rules));
    }

    // Attach Single Source of Truth aliases and getters
    syncDbProperties(DB);

    // Auto-cleanup stale client caches and hydrate from server SQLite
    try {
        autoCleanupClientCache();
        fetchServerDB();
    } catch (e) {}
}

// =========================================================================
// SINGLE SOURCE OF TRUTH ALIASES & HELPERS (DB.tools, DB.cash, DB.partners)
// =========================================================================
function syncDbProperties(targetDb) {
    if (!targetDb) return;

    // 1. DB.tools (asboblar: seriya raqami, zalog, kunlik narx, holati: 'bosh'/'ijarada', polkasi)
    try {
        Object.defineProperty(targetDb, 'tools', {
            get() {
                return (targetDb.product_items || []).map(item => {
                    const model = (targetDb.product_models || []).find(m => m.id === item.product_model_id) || {};
                    const loc = (targetDb.warehouse_locations || []).find(l => l.id === item.warehouse_location_id);
                    const polkasi = loc ? `${loc.sector || loc.zone || 'Sektor'} | ${loc.shelf || '1-Polka'} | ${loc.bin || loc.code || '1-Yacheyka'}` : 'Ombor';
                    return {
                        id: item.id,
                        product_model_id: item.product_model_id,
                        name: model.name || 'Asbob',
                        brand: model.brand || '',
                        model_code: model.model_code || '',
                        serial_number: item.serial_number || '',
                        barcode: item.barcode || '',
                        zalog: model.deposit_amount || 0,
                        deposit: model.deposit_amount || 0,
                        kunlik_narx: model.daily_price || 0,
                        daily_price: model.daily_price || 0,
                        status: item.status,
                        holati: (item.status === 'omborda_bosh' ? 'bosh' : (item.status === 'ijarada' ? 'ijarada' : item.status)),
                        warehouse_location_id: item.warehouse_location_id,
                        polkasi: polkasi,
                        condition: item.condition || 'a_lo',
                        total_rental_count: item.total_rental_count || 0,
                        total_revenue: item.total_revenue || 0
                    };
                });
            },
            configurable: true
        });
    } catch (e) {}

    // 2. DB.cash (kassa tushumi, toza foyda, xarajatlar, saqlanayotgan zaloglar)
    try {
        Object.defineProperty(targetDb, 'cash', {
            get() {
                const totalBal = (targetDb.cash_registers || []).reduce((sum, r) => sum + (r.current_balance || 0), 0);
                const holdingDeposit = targetDb.deposit_safe ? (targetDb.deposit_safe.total_holding_deposit || 0) : 0;
                const totalExpenses = (targetDb.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
                let rentalRevenue = 0;
                (targetDb.orders || []).forEach(o => { rentalRevenue += (o.paid_amount || 0); });
                (targetDb.financial_transactions || []).forEach(t => {
                    if (t.type && (t.type.includes('tushum') || t.type.includes('marja')) && !t.order_id) {
                        rentalRevenue += (t.amount || 0);
                    }
                });
                return {
                    cash_registers: targetDb.cash_registers,
                    current_total: totalBal,
                    kassa_tushumi: rentalRevenue,
                    saqlanayotgan_zaloglar: holdingDeposit,
                    xarajatlar: totalExpenses,
                    toza_foyda: Math.max(0, rentalRevenue - totalExpenses)
                };
            },
            configurable: true
        });
    } catch (e) {}

    // 3. DB.partners (kran, musor, gruzchik hamkorlari va narxlari)
    try {
        Object.defineProperty(targetDb, 'partners', {
            get() {
                return (targetDb.service_partners || []).map(p => {
                    return {
                        ...p,
                        price_list: (targetDb.partner_price_list || []).filter(pr => pr.partner_id === p.id)
                    };
                });
            },
            configurable: true
        });
    } catch (e) {}
}

// =========================================================================
// WMS LOCATION FORMATTERS & OCCUPANCY HELPERS
// =========================================================================
function formatLocationDisplay(locationId) {
    const loc = (DB.warehouse_locations || []).find(l => l.id === locationId);
    if (!loc) return "Ombor hududi (Aniqlanmagan)";
    const sector = loc.sector || (loc.zone ? loc.zone.split(' ')[0] + ' ' + (loc.zone.split(' ')[1] || '') : 'Sektor A');
    const shelf = loc.shelf || '1-Polka';
    const bin = loc.bin || '1-Yacheyka';
    const code = loc.code || `A-${String(loc.id).padStart(2, '0')}`;
    return `${sector} | ${shelf} | ${bin} (Kod: ${code})`;
}

function getLocationCode(locationId) {
    const loc = (DB.warehouse_locations || []).find(l => l.id === locationId);
    return loc ? (loc.code || `LOC-${loc.id}`) : 'NOMA\'LUM';
}

function getLocationOccupancy(locationId) {
    const items = (DB.product_items || []).filter(u => u.warehouse_location_id === locationId && (u.status === 'omborda_bosh' || u.status === 'remontda' || u.status === 'tozalanmoqda'));
    const loc = (DB.warehouse_locations || []).find(l => l.id === locationId);
    const max = (loc && loc.max_capacity) ? loc.max_capacity : 4;
    return {
        count: items.length,
        max: max,
        items: items,
        isFull: items.length >= max,
        isEmpty: items.length === 0,
        availableSlots: Math.max(0, max - items.length)
    };
}

// =========================================================================
// SQLITE REAL-TIME PERSISTENCE & AUTO-CACHE CLEANUP ENGINE
// =========================================================================
let _dbSyncTimeout = null;
let _isSyncing = false;
let _pendingSync = false;

function syncDBToServer(immediate = false) {
    if (typeof window === 'undefined' || !window.fetch) return;
    
    if (_dbSyncTimeout) {
        clearTimeout(_dbSyncTimeout);
        _dbSyncTimeout = null;
    }
    
    const doSync = async () => {
        if (_isSyncing) {
            _pendingSync = true;
            return;
        }
        _isSyncing = true;
        try {
            const resp = await fetch('/api/db/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(DB)
            });
            if (resp.ok) {
                const resData = await resp.json();
                console.log('[SQLite Sync] Ma\'lumotlar server SQLite fayliga yozildi:', resData.saved_at);
            }
        } catch (err) {
            console.warn('[SQLite Sync] Server bilan vaqtincha aloqa yo\'q (offline rejim):', err.message);
        } finally {
            _isSyncing = false;
            if (_pendingSync) {
                _pendingSync = false;
                syncDBToServer(false);
            }
        }
    };

    if (immediate) {
        doSync();
    } else {
        _dbSyncTimeout = setTimeout(doSync, 250);
    }
}

async function fetchServerDB() {
    if (typeof window === 'undefined' || !window.fetch) return;
    try {
        const resp = await fetch('/api/db', { cache: 'no-store' });
        if (resp.ok) {
            const data = await resp.json();
            if (data && data.success && data.db && Object.keys(data.db).length > 0) {
                const localSaved = localStorage.getItem(STORAGE_KEY);
                if (!localSaved) {
                    DB = data.db;
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
                    if (typeof window !== 'undefined') window.DB = DB;
                    if (typeof updateStatsAndBadges === 'function') updateStatsAndBadges();
                    if (typeof renderAllTabs === 'function') renderAllTabs();
                    console.log('[SQLite Sync] Server SQLite bazasidan ma\'lumotlar yuklandi.');
                }
            }
        }
    } catch (e) {
        console.log('[SQLite Sync] Serverga ulanish offline holatda:', e.message);
    }
}

// Automatic cache & storage cleanup to prevent client memory bloating
function autoCleanupClientCache() {
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('wms_tmp_') || k.startsWith('wms_cache_old_') || k.startsWith('temp_order_') || k.startsWith('wms_debug_'))) {
                keysToRemove.push(k);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        if (keysToRemove.length > 0) {
            console.log(`[Cache Cleanup] ${keysToRemove.length} ta eski kesh tozalandi.`);
        }
    } catch (e) {}
}

// Global cache cleaner (Server SQLite + Browser Memory & Cache)
window.clearSystemCacheAndMemory = async function() {
    try {
        autoCleanupClientCache();
        if ('caches' in window) {
            const keys = await caches.keys();
            for (const key of keys) {
                if (key !== 'wms-arenda-v18.0') {
                    await caches.delete(key);
                }
            }
        }
        const resp = await fetch('/api/system/clear-cache', { method: 'POST' });
        const resJson = await resp.json();
        if (typeof showNotification === 'function') {
            showNotification("Xotira va keshlar muvaffaqiyatli tozalandi!", "success");
        } else {
            alert("Xotira va keshlar tozalandi!");
        }
        return resJson;
    } catch (e) {
        console.error('Kesh tozalashda xatolik:', e);
    }
};

function saveDB() {
    if (typeof window !== 'undefined') window.DB = DB;
    syncDbProperties(DB);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
    } catch(e) {}
    try {
        if (typeof updateStatsAndBadges === 'function') updateStatsAndBadges();
    } catch(e) {}
    // Har bir o'zgarishni darhol serverdagi SQLite fayliga yozib borish
    syncDBToServer();
}

// Barcha ma'lumotlarni tozalash (0 ga qaytarish)
window.wipeDatabaseToCleanSlate = function() {
    if (confirm("DIQQAT! Barcha demo buyurtmalar, mijozlar, asboblar, kassa to'lovlari va xarajatlar butunlay o'chiriladi va 0 holatga keltiriladi.\n\nBosh Admin login va paroli saqlanadi (admin / admin123).\n\nDavom ettirilsinmi?")) {
        ['WMS_ARENDA_DB_V1', 'WMS_ARENDA_DB_V2', 'WMS_ARENDA_DB_V3', 'WMS_ARENDA_DB_PROD_V4', 'wms_database'].forEach(k => {
            try { localStorage.removeItem(k); } catch (e) {}
        });
        DB = JSON.parse(JSON.stringify(DEFAULT_DB));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
        if (typeof window !== 'undefined') window.DB = DB;
        syncDbProperties(DB);
        syncDBToServer(true);

        // Re-render all modules
        try { if (typeof renderAllTabs === 'function') renderAllTabs(); } catch (e) {}
        try { if (typeof renderCatalogCards === 'function') renderCatalogCards(); } catch (e) {}
        try { if (typeof renderStaffTable === 'function') renderStaffTable(); } catch (e) {}
        try { if (typeof renderSuppliersLedger === 'function') renderSuppliersLedger(); } catch (e) {}
        try { if (typeof renderCustomersCRM === 'function') renderCustomersCRM(); } catch (e) {}
        try { if (typeof renderPartnersDirectory === 'function') renderPartnersDirectory(); } catch (e) {}
        try { if (typeof renderOrdersSection === 'function') renderOrdersSection(); } catch (e) {}
        try { if (typeof renderFinanceSection === 'function') renderFinanceSection(); } catch (e) {}
        try { if (typeof renderDashboard === 'function') renderDashboard(); } catch (e) {}
        try { if (typeof updateStatsAndBadges === 'function') updateStatsAndBadges(); } catch (e) {}

        if (typeof showNotification === 'function') {
            showNotification("Barcha demo ma'lumotlar tozalandi va tizim 0 holatga keltirildi!", "success");
        } else {
            alert("Barcha demo ma'lumotlar tozalandi va tizim 0 holatga keltirildi!");
        }
    }
};

window.resetDemoData = window.wipeDatabaseToCleanSlate;

// User session
let currentUser = null;
if (typeof window !== 'undefined') window.currentUser = currentUser;

function checkSession() {
    // Check if customer is viewing an online receipt via URL parameter or hash
    const urlParams = new URLSearchParams(window.location.search);
    const receiptKey = urlParams.get('receipt') || (window.location.hash.startsWith('#receipt=') ? window.location.hash.replace('#receipt=', '') : null);

    if (receiptKey) {
        const order = (DB.orders || []).find(o => o.uuid === receiptKey || String(o.id) === receiptKey || (o.order_number && o.order_number.toLowerCase() === receiptKey.toLowerCase()));
        if (order && typeof openOrderReceiptModal === 'function') {
            document.getElementById('auth-screen')?.classList.add('hidden');
            document.getElementById('main-app')?.classList.add('hidden');
            openOrderReceiptModal(order.id, 'rtab-web');
            return;
        }
    }

    const session = localStorage.getItem('WMS_USER_SESSION');
    if (session) {
        try {
            currentUser = JSON.parse(session);
            if (typeof window !== 'undefined') window.currentUser = currentUser;
            showMainApp();
            return;
        } catch(e) {
            showAuthScreen();
        }
    } else {
        showAuthScreen();
    }
}

function hasPermission(permissionCode) {
    if (!currentUser) return false;
    if (currentUser.role_id === 'admin') return true;
    const perms = DB.role_permissions[currentUser.role_id] || [];
    return perms.includes(permissionCode);
}
