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

    // 2. Staff Users (Xodimlar)
    users: [
        { id: 1, full_name: "Akrom Aliyev", phone: "+998 90 111-22-33", username: "admin", password: "admin123", role_id: "admin", is_active: true, last_login: "2026-10-02 11:45" },
        { id: 2, full_name: "Jasur Karimov", phone: "+998 93 444-55-66", username: "manager", password: "mgr123", role_id: "manager", is_active: true, last_login: "2026-10-02 10:15" },
        { id: 3, full_name: "Otabek Boboyev", phone: "+998 94 777-88-99", username: "skladchi", password: "sklad123", role_id: "warehouseman", is_active: true, last_login: "2026-10-02 09:30" },
        { id: 4, full_name: "Madina Rahimova", phone: "+998 97 222-33-44", username: "kassir", password: "kas123", role_id: "cashier", is_active: true, last_login: "2026-10-01 18:00" }
    ],

    // SECTION 4: SERVICE PARTNERS & BROKERAGE (Tashqi Hamkorlar)
    service_partners: [
        {
            id: 1,
            company_name: "KranSpetsTex OOO",
            contact_person: "Rustam Jo'rayev",
            phone_primary: "+998 90 333-11-22",
            phone_secondary: "+998 71 280-90-00",
            service_category: "kran", // 'kran', 'musor_olib_ketish', 'gruzchik'
            address: "Toshkent sh., Sergeli sanoat zonasi",
            rating: 5,
            balance: -2400000, // Hamkorga 2.4 mln qarzimiz bor
            status: "faol" // 'faol', 'band', 'bloklangan'
        },
        {
            id: 2,
            company_name: "MusorTrans Servis",
            contact_person: "Farhod Ahmedov",
            phone_primary: "+998 93 111-44-55",
            phone_secondary: "+998 99 400-50-60",
            service_category: "musor_olib_ketish",
            address: "Toshkent sh., Yunusobod 15-mavze",
            rating: 4.8,
            balance: -900000,
            status: "faol"
        },
        {
            id: 3,
            company_name: "YukchiMaster Brigada",
            contact_person: "Sanjar Rustamov",
            phone_primary: "+998 97 888-99-00",
            phone_secondary: "",
            service_category: "gruzchik",
            address: "Toshkent sh., Chilonzor 9-mavze",
            rating: 4.9,
            balance: 0,
            status: "faol"
        }
    ],

    // Partner Price List & Margins (Hamkor tannarxi va bizning ustamamiz)
    partner_price_list: [
        { id: 1, partner_id: 1, service_type_detail: "Avtokran 25t (XCMG)", unit: "soat", cost_price: 300000, selling_price: 360000, margin_amount: 60000 },
        { id: 2, partner_id: 1, service_type_detail: "Avtokran 50t (Zoomlion)", unit: "soat", cost_price: 550000, selling_price: 680000, margin_amount: 130000 },
        { id: 3, partner_id: 2, service_type_detail: "Musor olib ketish (Gazel 2t)", unit: "reys", cost_price: 350000, selling_price: 450000, margin_amount: 100000 },
        { id: 4, partner_id: 2, service_type_detail: "Musor olib ketish (ZIL 6t)", unit: "reys", cost_price: 650000, selling_price: 800000, margin_amount: 150000 },
        { id: 5, partner_id: 3, service_type_detail: "Gruzchik xizmati (1 kishi)", unit: "soat", cost_price: 50000, selling_price: 75000, margin_amount: 25000 },
        { id: 6, partner_id: 3, service_type_detail: "Etajga ko'tarish xizmati", unit: "etaj", cost_price: 20000, selling_price: 30000, margin_amount: 10000 }
    ],

    // Service Orders (Dispecherlik buyurtmalari)
    service_orders: [
        {
            id: 1,
            order_number: "SRV-2026-001",
            customer_id: 1,
            service_category: "kran",
            order_date: "2026-10-01",
            service_date: "2026-10-02",
            execution_time: "14:00",
            destination_address: "Toshkent sh., Mirzo Ulug'bek tumani, 44-uy",
            details: "Avtokran 25t, 4 soatlik ish, og'ir plitalarni 4-etajga ko'tarish",
            assigned_partner_id: 1,
            customer_total_price: 1440000,
            partner_payout_amount: 1200000,
            net_profit: 240000,
            order_status: "bajarilmoqda", // 'yangi', 'hamkorga_uzatildi', 'qabul_qilindi', 'bajarilmoqda', 'bajarildi', 'bekor_qilindi'
            payment_status: "tolandi",
            created_at: "2026-10-01 15:20"
        },
        {
            id: 2,
            order_number: "SRV-2026-002",
            customer_id: 2,
            service_category: "musor_olib_ketish",
            order_date: "2026-10-01",
            service_date: "2026-10-02",
            execution_time: "16:30",
            destination_address: "Toshkent sh., Yunusobod 12-mavze",
            details: "ZIL 6t, buzilgan g'isht va beton chiqindilarini yuklab olib ketish",
            assigned_partner_id: 2,
            customer_total_price: 800000,
            partner_payout_amount: 650000,
            net_profit: 150000,
            order_status: "qabul_qilindi",
            payment_status: "qisman",
            created_at: "2026-10-01 17:10"
        },
        {
            id: 3,
            order_number: "SRV-2026-003",
            customer_id: 1,
            service_category: "gruzchik",
            order_date: "2026-10-02",
            service_date: "2026-10-03",
            execution_time: "10:00",
            destination_address: "Toshkent sh., Chilonzor 5-mavze",
            details: "4 nafar gruzchik, 3 soat gipsokarton va profil ko'tarish",
            assigned_partner_id: 3,
            customer_total_price: 900000,
            partner_payout_amount: 600000,
            net_profit: 300000,
            order_status: "yangi",
            payment_status: "tolanmadi",
            created_at: "2026-10-02 11:00"
        }
    ],

    // Partner Payout Transactions (Hamkorlar bilan hisob-kitob)
    partner_payouts: [
        { id: 1, partner_id: 1, order_id: "SRV-2026-001", payout_amount: 1200000, payment_method: "bank_utkazma", date: "2026-10-02", paid_by: "Madina Rahimova (Kassir)" }
    ],

    // SECTION 11: DYNAMIC SERVICE PRICING RULES (ADMIN CONFIGURABLE)
    service_pricing_rules: {
        gruzchik: {
            bag_carry_price_per_floor: 3000,    // 1 qop (50kg) 1 qavatga ko'tarish narxi
            bag_carry_with_elevator: 1500,      // Lift bo'lsa 1 qop narxi
            hourly_worker_rate: 50000,          // 1 ishchi uchun 1 soatlik stavka
            min_hours: 2,                       // Soatbay minimal soat
            partner_share_percent: 75,          // Hamkorga to'lanadigan ulush (%)
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
            outside_city_per_km: 15000,         // Shahardan tashqari 1 km narxi
            partner_share_percent: 80           // Hamkor ulushi (%)
        },
        musor: {
            trucks: {
                "gazel": { price: 400000, capacity: "1.5 tonna / 40 qopgacha", label: "Gazel (1.5t / 40 qop)" },
                "zil": { price: 800000, capacity: "5 tonna", label: "ZIL (5 tonna)" },
                "kamaz": { price: 1500000, capacity: "10-15 tonna", label: "KamAZ / Samosval (10-15t)" }
            },
            bag_price: 12000,                   // 1 dona qop narxi (kichik hajm)
            min_bags: 20,                       // Minimal qop soni
            loading_help_per_truck: 150000,     // Ishchilar yuklash yordami (mashina uchun fiks)
            loading_help_per_bag: 3000,         // Ishchilar yuklash yordami (qop uchun)
            floor_carry_down_per_bag: 2000,     // Qavatdan tushirish (1 etaj / 1 qop)
            partner_share_percent: 75           // Hamkor ulushi (%)
        }
    },

    // 3. Suppliers & Accounting (Yetkazib beruvchilar va Oldi-berdi)
    suppliers: [
        { 
            id: 1, 
            company_name: "MegaTool OOO", 
            contact_person: "Dilshod Rahimov", 
            phone: "+998 90 123-45-67", 
            secondary_phone: "+998 71 200-11-22",
            address: "Toshkent, Sergeli sanoat zonasi 4-blok", 
            bank_details: "H/r: 20208000400500123001, Bank: O'zsanoatqurilishbank, MFO: 00440",
            balance: -15000000 // Biz qarzdormiz (-15 mln)
        },
        { 
            id: 2, 
            company_name: "StroyMaster Supply", 
            contact_person: "Sardor Olimov", 
            phone: "+998 93 987-65-43", 
            secondary_phone: "+998 66 230-10-20",
            address: "Samarqand sh., Gagarin ko'chasi 58", 
            bank_details: "H/r: 20208000800900987002, Bank: Kapitalbank, MFO: 01088",
            balance: 0 // Qarzimiz yo'q
        },
        { 
            id: 3, 
            company_name: "PowerEquipment LLC", 
            contact_person: "Alisher Tursunov", 
            phone: "+998 99 333-22-11", 
            secondary_phone: "",
            address: "Toshkent, Chilonzor 19-mavze", 
            bank_details: "H/r: 20208000300400555001, Bank: Ipak Yo'li Banki, MFO: 00990",
            balance: 5000000 // Biz haqdormiz (+5 mln)
        }
    ],

    // Supplier Ledger / Transactions (Akt-sverka tranzaksiyalari)
    supplier_transactions: [
        { id: 1, supplier_id: 1, type: "kirim_tovarlar", amount: 25000000, payment_method: "shartnoma", receipt_id: "NAK-7712", comment: "PO-2026-001 bo'yicha asboblar partiyasi keldi", date: "2026-09-20", created_by: "Akrom Aliyev" },
        { id: 2, supplier_id: 1, type: "tolov_chiqim", amount: 10000000, payment_method: "bank_utkazma", receipt_id: "TO'L-0012", comment: "Bank o'tkazmasi orqali qisman to'lov", date: "2026-09-22", created_by: "Madina Rahimova" },
        { id: 3, supplier_id: 1, type: "vozvrat", amount: 1100000, payment_method: "hisobdan_ayirish", receipt_id: "RET-2026-001", comment: "Brak sababli qaytarilgan DeWalt bolgarka hisobga olindi", date: "2026-09-25", created_by: "Akrom Aliyev" }
    ],

    // 4. Customers CRM (Mijozlar bazasi va 360 kartochkasi)
    customers: [
        {
            id: 1,
            customer_type: "jismoniy_shaxs",
            full_name: "Bobur Mirzayev",
            company_name: "",
            phone_primary: "+998 90 999-88-77",
            phone_secondary: "+998 91 123-45-00",
            passport_series_number: "AA 1234567",
            passport_scan_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80",
            current_debt: 0,
            current_deposit: 500000,
            status: "vip", // 'oddiy', 'vip', 'ishonchsiz', 'qora_royxat'
            blacklist_reason: "",
            notes: "Doimiy ishonchli usta, to'lovlarni o'z vaqtida qiladi.",
            created_at: "2026-08-10"
        },
        {
            id: 2,
            customer_type: "yuridik_shaxs",
            full_name: "Sanjar Qodirov (Direktor)",
            company_name: "Orient Building MChJ",
            phone_primary: "+998 93 555-44-33",
            phone_secondary: "+998 71 250-90-80",
            passport_series_number: "STIR: 305889124",
            passport_scan_url: "",
            current_debt: 1200000,
            current_deposit: 2000000,
            status: "oddiy",
            blacklist_reason: "",
            notes: "Qurilish kompaniyasi, 1.2 mln qarzi bor, payshanba kuni yopishini aytgan.",
            created_at: "2026-09-01"
        },
        {
            id: 3,
            customer_type: "jismoniy_shaxs",
            full_name: "Dilshod Jo'rayev",
            company_name: "",
            phone_primary: "+998 97 777-66-55",
            phone_secondary: "",
            passport_series_number: "AB 9876543",
            passport_scan_url: "",
            current_debt: 450000,
            current_deposit: 0,
            status: "qora_royxat", // QORA RO'YXATDA!
            blacklist_reason: "Asbobni 5 kunga kechiktirib, singan holda qaytargan va jarimani to'lamagan!",
            notes: "DIQQAT! Hech qanday asbob berilmasin!",
            created_at: "2026-07-15"
        }
    ],

    // Customer financial transactions (Mijoz moliya tarixi)
    customer_transactions: [
        { id: 1, customer_id: 1, type: "zalog_qabul", amount: 500000, payment_method: "naqd", order_id: "ORD-8812", date: "2026-09-28", created_by: "Madina Rahimova" },
        { id: 2, customer_id: 1, type: "ijara_tolovi", amount: 240000, payment_method: "karta", order_id: "ORD-8812", date: "2026-09-28", created_by: "Madina Rahimova" },
        { id: 3, customer_id: 2, type: "ijara_tolovi", amount: 1500000, payment_method: "bank_utkazma", order_id: "ORD-8810", date: "2026-09-25", created_by: "Akrom Aliyev" },
        { id: 4, customer_id: 3, type: "jarima", amount: 450000, payment_method: "qarzga_yozildi", order_id: "ORD-8700", date: "2026-09-10", created_by: "Jasur Karimov" }
    ],

    // Customer service order history across 4 service branches
    customer_orders: [
        { id: "ORD-8812", customer_id: 1, service_type: "Asbob ijarasi", details: "Bosch GBH 2-26 DRE (3 kun)", total_sum: 240000, deposit: 500000, status: "faol", date: "2026-09-28" },
        { id: "ORD-8810", customer_id: 2, service_type: "Asbob ijarasi", details: "Wacker Neuson DPU 6555 (4 kun)", total_sum: 1800000, deposit: 5000000, status: "qaytarildi", date: "2026-09-20" },
        { id: "ORD-8805", customer_id: 2, service_type: "Kran xizmati", details: "Avtokran 25t (8 soat)", total_sum: 2800000, deposit: 0, status: "yakunlandi", date: "2026-09-18" },
        { id: "ORD-8700", customer_id: 3, service_type: "Asbob ijarasi", details: "Hilti TE 70-ATC (singan)", total_sum: 1250000, deposit: 800000, status: "muammoli", date: "2026-09-05" }
    ],

    // Categories
    categories: [
        { id: 1, name: "Elektr asboblar", icon: "zap" },
        { id: 2, name: "Benzinli texnika", icon: "fuel" },
        { id: 3, name: "Payvandlash & Metall", icon: "flame" },
        { id: 4, name: "Beton & Buzish", icon: "hammer" },
        { id: 5, name: "Bog' & Tozalash", icon: "trees" }
    ],

    // ProductModels
    product_models: [
        {
            id: 1,
            category_id: 1,
            name: "Bosch GBH 2-26 DRE",
            brand: "Bosch",
            model_code: "GBH-2-26-DRE",
            image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80",
            specifications: { power: "800 W", impact: "2.7 J", chuck: "SDS-Plus", weight: "2.8 kg", fuel: "220V Tarmoq", extra: "Maks. beton 26 mm" },
            hourly_price: 15000,
            daily_price: 80000,
            discount_3_days: 70000,
            discount_7_days: 60000,
            late_fee_per_hour: 20000,
            deposit_amount: 500000,
            replacement_cost: 1800000,
            expected_price: 1400000,
            kit_items: ["Plastik Keys/Chemodan", "Qo'shimcha tutqich", "Chuqurlik o'lchagich", "2 ta SDS-plus bur", "Pasport/Yo'riqnoma"],
            consumables: ["SDS-plus bur 6x160mm", "SDS-plus bur 8x160mm", "Reduktor moyi"],
            created_at: "2026-09-01",
            updated_at: "2026-09-28"
        },
        {
            id: 2,
            category_id: 1,
            name: "Makita HR2470",
            brand: "Makita",
            model_code: "HR-2470",
            image: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=400&q=80",
            specifications: { power: "780 W", impact: "2.4 J", chuck: "SDS-Plus", weight: "2.6 kg", fuel: "220V Tarmoq", extra: "3 xil rejim" },
            hourly_price: 14000,
            daily_price: 75000,
            discount_3_days: 65000,
            discount_7_days: 55000,
            late_fee_per_hour: 18000,
            deposit_amount: 450000,
            replacement_cost: 1600000,
            expected_price: 1300000,
            kit_items: ["Keys", "Tutqich", "1 ta bur 8mm"],
            consumables: ["Bur to'plami SDS"],
            created_at: "2026-09-05",
            updated_at: "2026-09-25"
        },
        {
            id: 3,
            category_id: 1,
            name: "DeWalt DWE4257",
            brand: "DeWalt",
            model_code: "DWE-4257",
            image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80",
            specifications: { power: "1500 W", impact: "-", chuck: "M14 / 125mm", weight: "2.5 kg", fuel: "220V Tarmoq", extra: "Tezlik regulyatori" },
            hourly_price: 12000,
            daily_price: 60000,
            discount_3_days: 50000,
            discount_7_days: 45000,
            late_fee_per_hour: 15000,
            deposit_amount: 400000,
            replacement_cost: 1400000,
            expected_price: 1100000,
            kit_items: ["Himoya kojuxi 125mm", "Maxsus kalit", "Antivibratsion tutqich"],
            consumables: ["Metall qirquvchi disk 125x1.2mm"],
            created_at: "2026-09-10",
            updated_at: "2026-09-22"
        },
        {
            id: 4,
            category_id: 4,
            name: "Hilti TE 70-ATC",
            brand: "Hilti",
            model_code: "TE-70-ATC",
            image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80",
            specifications: { power: "1800 W", impact: "11.5 J", chuck: "SDS-Max", weight: "9.5 kg", fuel: "220V Tarmoq", extra: "ATC tizimi" },
            hourly_price: 45000,
            daily_price: 250000,
            discount_3_days: 220000,
            discount_7_days: 190000,
            late_fee_per_hour: 50000,
            deposit_amount: 2000000,
            replacement_cost: 11000000,
            expected_price: 9500000,
            kit_items: ["Og'ir keys", "Pika SDS-Max", "Zubilo SDS-Max"],
            consumables: ["SDS-Max bur 25x520mm"],
            created_at: "2026-09-12",
            updated_at: "2026-09-28"
        },
        {
            id: 5,
            category_id: 2,
            name: "Wacker Neuson DPU 6555",
            brand: "Wacker Neuson",
            model_code: "DPU-6555",
            image: "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=400&q=80",
            specifications: { power: "9.6 kW / 13 ot kuchi", impact: "65 kN", chuck: "Plita 550x900 mm", weight: "495 kg", fuel: "Dizel", extra: "Reversiv harakat" },
            hourly_price: 80000,
            daily_price: 450000,
            discount_3_days: 400000,
            discount_7_days: 350000,
            late_fee_per_hour: 90000,
            deposit_amount: 5000000,
            replacement_cost: 48000000,
            expected_price: 42000000,
            kit_items: ["Starter kaliti", "Yoqilg'i voronkasi", "Rezina gilamcha"],
            consumables: ["Dizel filtri", "Havo filtri"],
            created_at: "2026-09-15",
            updated_at: "2026-09-29"
        }
    ],

    // ProductItems (Serial Units)
    product_items: [
        { id: 101, product_model_id: 1, serial_number: "SN-BSH-88401", barcode: "400539500101", warehouse_location_id: 1, condition: "a_lo", status: "omborda_bosh", total_rental_count: 14, total_revenue: 1120000, created_at: "2026-09-15" },
        { id: 102, product_model_id: 1, serial_number: "SN-BSH-88402", barcode: "400539500102", warehouse_location_id: 1, condition: "yaxshi", status: "ijarada", total_rental_count: 9, total_revenue: 720000, created_at: "2026-09-15" },
        { id: 103, product_model_id: 2, serial_number: "SN-MKT-33101", barcode: "08838100201", warehouse_location_id: 2, condition: "a_lo", status: "omborda_bosh", total_rental_count: 6, total_revenue: 450000, created_at: "2026-09-18" },
        { id: 104, product_model_id: 3, serial_number: "SN-DWT-55901", barcode: "503504800301", warehouse_location_id: 3, condition: "ortacha", status: "remontda", total_rental_count: 21, total_revenue: 1260000, created_at: "2026-09-20" },
        { id: 105, product_model_id: 4, serial_number: "SN-HLT-99201", barcode: "761302300401", warehouse_location_id: 4, condition: "a_lo", status: "omborda_bosh", total_rental_count: 4, total_revenue: 1000000, created_at: "2026-09-22" },
        { id: 106, product_model_id: 5, serial_number: "SN-WCK-10101", barcode: "402010100501", warehouse_location_id: 5, condition: "a_lo", status: "omborda_bosh", total_rental_count: 2, total_revenue: 900000, created_at: "2026-09-26" }
    ],

    // Locations (WMS Manzillar: Sektor, Polka, Yacheyka va Unikal Kod)
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

    // Maintenance Logs
    maintenance_logs: [
        { id: 1, product_item_id: 104, date: "2026-09-25", maintenance_type: "detal_almashtirish", cost: 120000, description: "Grafit cho'tkalari (ugolki) va podshipnik almashtirildi", performed_by: "Rustam usta" },
        { id: 2, product_item_id: 101, date: "2026-09-20", maintenance_type: "profilaktika", cost: 40000, description: "Reduktor moylandi va tozalash ishlari o'tkazildi", performed_by: "Rustam usta" }
    ],

    // Price Logs
    price_change_logs: [
        { id: 1, product_model_id: 1, changed_by_user: "Akrom Aliyev (Admin)", old_price: "75,000 so'm", new_price: "80,000 so'm", field_name: "Kunlik Ijara Narxi", change_date: "2026-09-28 14:30" }
    ],

    // Supplier Orders
    supplier_orders: [
        { 
            id: "PO-2026-001", 
            supplier_id: 1, 
            order_date: "2026-09-28", 
            status: "yetkazilmoqda",
            total_amount: 5400000,
            items: [
                { product_model_id: 1, quantity: 3, expected_price: 1400000 },
                { product_model_id: 3, quantity: 1, expected_price: 1200000 }
            ]
        }
    ],

    // Inbound Receipts
    inbound_receipts: [
        {
            id: "INB-2026-001",
            order_id: "PO-2026-001",
            supplier_id: 1,
            invoice_number: "NAK-7712",
            received_date: "2026-09-30",
            received_by: "Otabek Boboyev (Skladchi)",
            items_fact: [
                { product_model_id: 1, ordered_qty: 3, received_qty: 3, status: "toliq" },
                { product_model_id: 3, ordered_qty: 1, received_qty: 1, status: "toliq" }
            ]
        }
    ],

    pending_placements: [
        { inbound_id: "INB-2026-001", product_model_id: 1, count: 2 },
        { inbound_id: "INB-2026-001", product_model_id: 3, count: 1 }
    ],

    // Supplier Returns
    supplier_returns: [
        {
            id: "RET-2026-001",
            supplier_id: 1,
            return_date: "2026-09-25",
            product_item_id: 104,
            serial_number: "SN-DWT-55901",
            model_name: "DeWalt DWE4257",
            reason: "brak",
            amount: 1100000,
            status: "tasdiqlandi"
        }
    ],

    // SECTION 5: ORDERS, TOOL ITEMS, SERVICE ITEMS & PAYMENTS
    orders: [
        {
            id: 1,
            order_number: "ORD-2026-0001",
            uuid: "a8f9c2d1",
            customer_id: 2,
            created_by_user_id: 2,
            status: "faol_ijarada", // 'yangi', 'faol_ijarada', 'kechikkan', 'yakunlandi', 'bekor_qilindi'
            total_rent_amount: 240000,
            total_deposit_amount: 500000,
            final_amount: 240000,
            paid_amount: 240000,
            remaining_debt: 0,
            start_date: "2026-10-01 09:00",
            expected_return_date: "2026-10-04 18:00",
            actual_return_date: null,
            created_at: "2026-10-01 09:00",
            notes: "Orient Building obyektiga 3 kunga berildi"
        },
        {
            id: 2,
            order_number: "ORD-2026-0002",
            uuid: "b7e2d9a3",
            customer_id: 1,
            created_by_user_id: 2,
            status: "kechikkan",
            total_rent_amount: 150000,
            total_deposit_amount: 400000,
            final_amount: 150000,
            paid_amount: 150000,
            remaining_debt: 0,
            start_date: "2026-09-28 10:00",
            expected_return_date: "2026-09-30 18:00",
            actual_return_date: null,
            created_at: "2026-09-28 10:00",
            notes: "Mijoz qaytarishga kechikmoqda, telefon qilib ogohlantirish kerak"
        },
        {
            id: 3,
            order_number: "ORD-2026-0003",
            uuid: "c3d4e5f6",
            customer_id: 2,
            created_by_user_id: 1,
            status: "yakunlandi",
            total_rent_amount: 3200000,
            total_deposit_amount: 0,
            final_amount: 3200000,
            paid_amount: 3200000,
            remaining_debt: 0,
            start_date: "2026-09-20 08:30",
            expected_return_date: "2026-09-21 18:00",
            actual_return_date: "2026-09-21 17:45",
            created_at: "2026-09-20 08:30",
            notes: "Avtokran xizmati to'liq topshirildi"
        }
    ],

    order_tool_items: [
        {
            id: 1,
            order_id: 1,
            product_item_id: 102,
            model_name: "Bosch GBH 2-26 DRE",
            serial_number: "SN-BSH-88402",
            daily_price: 80000,
            rent_days: 3,
            total_tool_rent: 240000,
            deposit_price: 500000,
            return_status: "mijozda", // 'mijozda', 'qaytarildi_butun', 'remont_talab', 'yoqolgan'
            kit_check_result: { "Keys": true, "2 ta bur": true, "Tutqich": true },
            penalty_amount: 0
        },
        {
            id: 2,
            order_id: 2,
            product_item_id: 104,
            model_name: "DeWalt DWE4257",
            serial_number: "SN-DWT-55901",
            daily_price: 60000,
            rent_days: 2,
            total_tool_rent: 120000,
            deposit_price: 400000,
            return_status: "mijozda",
            kit_check_result: { "Kojux": true, "Kalit": true },
            penalty_amount: 60000
        }
    ],

    order_service_items: [
        {
            id: 1,
            order_id: 3,
            service_category: "kran",
            assigned_partner_id: 1,
            service_details: "Avtokran 25t (Sergeli qurilish obyekti, 8 soat)",
            customer_price: 3200000,
            partner_cost: 2400000,
            profit_margin: 800000,
            execution_status: "bajarildi" // 'kutilmoqda', 'hamkorga_yuborildi', 'bajarildi'
        }
    ],

    order_payments: [
        {
            id: 1,
            order_id: 1,
            customer_id: 2,
            payment_type: "zalog_olindi",
            amount: 500000,
            payment_method: "naqd",
            cashier_user_id: 4,
            date: "2026-10-01 09:05"
        },
        {
            id: 2,
            order_id: 1,
            customer_id: 2,
            payment_type: "ijara_haqi",
            amount: 240000,
            payment_method: "karta",
            cashier_user_id: 4,
            date: "2026-10-01 09:05"
        },
        {
            id: 3,
            order_id: 2,
            customer_id: 1,
            payment_type: "zalog_olindi",
            amount: 400000,
            payment_method: "naqd",
            cashier_user_id: 4,
            date: "2026-09-28 10:05"
        },
        {
            id: 4,
            order_id: 2,
            customer_id: 1,
            payment_type: "ijara_haqi",
            amount: 150000,
            payment_method: "naqd",
            cashier_user_id: 4,
            date: "2026-09-28 10:05"
        }
    ],

    // SECTION 6: KASSA, MOLIYA, XARAJATLAR & SOF FOYDA (P&L)
    cash_registers: [
        { id: 1, name: "Asosiy Naqd Kassa", code: "naqd", current_balance: 4850000 },
        { id: 2, name: "Bank / Hisob raqam", code: "bank_utkazma", current_balance: 18200000 },
        { id: 3, name: "Karta / Terminal (Payme/Uzum)", code: "karta", current_balance: 6400000 }
    ],

    deposit_safe: {
        id: 1,
        total_holding_deposit: 900000 // Mijozlardan olingan va hali qaytarilmagan garov pullari
    },

    expense_categories: [
        { id: 1, name: "Asboblar ta'miri va zapchastlar", icon: "wrench" },
        { id: 2, name: "Xodimlar oyligi", icon: "user-check" },
        { id: 3, name: "Ombor ijarasi", icon: "warehouse" },
        { id: 4, name: "Benzin va transport", icon: "fuel" },
        { id: 5, name: "Kommunal to'lovlar", icon: "zap" },
        { id: 6, name: "Boshqa xarajatlar", icon: "more-horizontal" }
    ],

    expenses: [
        {
            id: 1,
            category_id: 1,
            cash_register_id: 1,
            amount: 180000,
            description: "Bosch perforatorga yangi rotor va podshipnik olindi",
            recipient: "Usta Rustam",
            date: "2026-10-01",
            created_by_user_id: 1
        },
        {
            id: 2,
            category_id: 4,
            cash_register_id: 1,
            amount: 120000,
            description: "Katta partiyani olib kelish uchun Labo benzin xarajati",
            recipient: "Haydovchi Jamshid",
            date: "2026-10-02",
            created_by_user_id: 2
        },
        {
            id: 3,
            category_id: 5,
            cash_register_id: 2,
            amount: 450000,
            description: "Ombor elektr energiyasi va internet to'lovi",
            recipient: "Toshkent ShEE MChJ",
            date: "2026-09-28",
            created_by_user_id: 1
        },
        {
            id: 4,
            category_id: 3,
            cash_register_id: 2,
            amount: 3500000,
            description: "Sentyabr oyi ombor binosi arenda to'lovi",
            recipient: "Sanoat Bino MChJ",
            date: "2026-09-25",
            created_by_user_id: 1
        }
    ],

    financial_transactions: [
        { id: 1, type: "ijara_tushumi", cash_register_id: 3, amount: 240000, order_id: 1, date: "2026-10-01 09:05", performed_by_user_id: 4 },
        { id: 2, type: "zalog_kirim", cash_register_id: 1, amount: 500000, order_id: 1, date: "2026-10-01 09:05", performed_by_user_id: 4 },
        { id: 3, type: "ijara_tushumi", cash_register_id: 1, amount: 150000, order_id: 2, date: "2026-09-28 10:05", performed_by_user_id: 4 },
        { id: 4, type: "zalog_kirim", cash_register_id: 1, amount: 400000, order_id: 2, date: "2026-09-28 10:05", performed_by_user_id: 4 },
        { id: 5, type: "xizmat_marjasi", cash_register_id: 2, amount: 800000, order_id: 3, date: "2026-09-20 09:00", performed_by_user_id: 1 },
        { id: 6, type: "jarima_tushumi", cash_register_id: 1, amount: 60000, order_id: 2, date: "2026-09-30 18:00", performed_by_user_id: 2 },
        { id: 7, type: "xarajat_chiqim", cash_register_id: 1, amount: 180000, expense_id: 1, date: "2026-10-01 14:00", performed_by_user_id: 1 },
        { id: 8, type: "xarajat_chiqim", cash_register_id: 1, amount: 120000, expense_id: 2, date: "2026-10-02 11:20", performed_by_user_id: 2 }
    ]
};

// State storage
let DB = {};

function loadDB() {
    const saved = localStorage.getItem('WMS_ARENDA_DB_V3');
    if (saved) {
        try {
            DB = JSON.parse(saved);
        } catch(e) {
            DB = JSON.parse(JSON.stringify(DEFAULT_DB));
        }
    } else {
        DB = JSON.parse(JSON.stringify(DEFAULT_DB));
        saveDB();
    }

    // Ensure all collections are present if older version existed in localStorage
    if (!DB.users || !Array.isArray(DB.users) || DB.users.length === 0) DB.users = JSON.parse(JSON.stringify(DEFAULT_DB.users || []));
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

function saveDB() {
    localStorage.setItem('WMS_ARENDA_DB_V3', JSON.stringify(DB));
    if (typeof updateStatsAndBadges === 'function') updateStatsAndBadges();
}

function resetDemoData() {
    if (confirm("Haqiqatan ham barcha ma'lumotlarni dastlabki holatga qaytarmoqchimisiz?")) {
        localStorage.removeItem('WMS_ARENDA_DB_V3');
        loadDB();
        if (typeof renderAllTabs === 'function') renderAllTabs();
        if (typeof renderCatalogCards === 'function') renderCatalogCards();
        if (typeof renderStaffTable === 'function') renderStaffTable();
        if (typeof renderSuppliersLedger === 'function') renderSuppliersLedger();
        if (typeof renderCustomersCRM === 'function') renderCustomersCRM();
        showNotification("Barcha ma'lumotlar qayta tiklandi!", "success");
    }
}

// User session
let currentUser = null;

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
            showMainApp();
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
