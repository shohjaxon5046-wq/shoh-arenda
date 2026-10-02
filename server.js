const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const DATA_DIR = path.join(__dirname, 'data');
const WEB_ORDERS_FILE = path.join(DATA_DIR, 'web_orders.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {}
}

// Initial demo web orders from external website
const INITIAL_WEB_ORDERS = [
    {
        id: 1727851200001,
        order_number: "WEB-2026-0042",
        customer_name: "Sherzodbek Toirov",
        customer_phone: "+998 90 912-34-56",
        service_type: "asbob_ijarasi",
        tool_id: 1,
        tool_name: "Perforator Bosch GBH 2-26 DRE",
        service_details: "3 kunlik muddatga kerak, ta'mir ishlari uchun",
        delivery_address: "Toshkent sh., Olmazor tumani, Qorasaroy ko'chasi 42",
        requested_date: "2026-10-03 09:30",
        status: "yangi",
        created_at: "2026-10-02 12:15",
        source: "tashqi_sayt_onlayn"
    },
    {
        id: 1727851200002,
        order_number: "WEB-2026-0043",
        customer_name: "Olimjon Rahimov",
        customer_phone: "+998 93 789-01-23",
        service_type: "musor_olib_ketish",
        tool_id: null,
        tool_name: null,
        service_details: "Qurilish chiqindisi (Musor Gazel) - 40 qop g'isht parchalari",
        delivery_address: "Toshkent sh., Yunusobod 14-mavze, 12-uy",
        requested_date: "2026-10-02 16:00",
        status: "yangi",
        created_at: "2026-10-02 12:35",
        source: "tashqi_sayt_onlayn"
    },
    {
        id: 1727851200003,
        order_number: "WEB-2026-0044",
        customer_name: "Temur Xoliqov",
        customer_phone: "+998 97 555-12-89",
        service_type: "kran",
        tool_id: null,
        tool_name: null,
        service_details: "Avtokran 25t - 4 soatlik plita ko'tarish",
        delivery_address: "Toshkent v., Zangiota tumani, Yangi yo'l",
        requested_date: "2026-10-03 08:00",
        status: "qabul_qilindi",
        created_at: "2026-10-02 11:10",
        source: "tashqi_sayt_onlayn"
    }
];

function loadWebOrders() {
    try {
        if (fs.existsSync(WEB_ORDERS_FILE)) {
            const data = fs.readFileSync(WEB_ORDERS_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (e) {}
    saveWebOrders(INITIAL_WEB_ORDERS);
    return INITIAL_WEB_ORDERS;
}

function saveWebOrders(orders) {
    try {
        fs.writeFileSync(WEB_ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
    } catch (e) {
        console.error('Failed to save web orders:', e);
    }
}

// Available tools catalog for public API
const PUBLIC_AVAILABLE_TOOLS = [
    {
        model_id: 1,
        name: "Perforator Bosch GBH 2-26 DRE",
        brand: "Bosch",
        category: "Elektr asboblar",
        daily_price: 80000,
        hourly_price: 15000,
        deposit_amount: 400000,
        available_count: 2,
        total_count: 3,
        status: "mavjud",
        specs: { "Quvvati": "800W", "Og'irligi": "2.7 kg", "Patron": "SDS-Plus", "Zarba kuchi": "2.7 J" },
        kit_items: ["Keys/Chemodan", "2 ta bur", "Qo'shimcha tutqich", "Chuqurlik o'lchagich"]
    },
    {
        model_id: 2,
        name: "Otboyniy Molotok Makita HM1203C",
        brand: "Makita",
        category: "Elektr asboblar",
        daily_price: 150000,
        hourly_price: 25000,
        deposit_amount: 700000,
        available_count: 1,
        total_count: 2,
        status: "mavjud",
        specs: { "Quvvati": "1510W", "Og'irligi": "9.7 kg", "Patron": "SDS-Max", "Zarba kuchi": "19.1 J" },
        kit_items: ["Metall keys", "1 ta pik (nayza)", "1 ta lopatka", "Maxsus moylash moyi"]
    },
    {
        model_id: 3,
        name: "Benzinli Generator Honda EM5500CXS",
        brand: "Honda",
        category: "Benzinli texnika",
        daily_price: 200000,
        hourly_price: 35000,
        deposit_amount: 1000000,
        available_count: 1,
        total_count: 1,
        status: "mavjud",
        specs: { "Quvvati": "5.5 kVA", "Yoqilg'i": "Benzin AI-92", "Bak hajmi": "25 L", "Ishlash vaqti": "8 soat" },
        kit_items: ["G'ildiraklar to'plami", "Zaryadka klemmalari", "Svecha kaliti"]
    },
    {
        model_id: 4,
        name: "Payvandlash Apparati Resanta SAI-220",
        brand: "Resanta",
        category: "Payvandlash",
        daily_price: 60000,
        hourly_price: 12000,
        deposit_amount: 300000,
        available_count: 2,
        total_count: 2,
        status: "mavjud",
        specs: { "Tok kuchi": "10-220 A", "Elektrod": "1.6 - 5.0 mm", "Og'irligi": "4.9 kg" },
        kit_items: ["Massa kabeli", "Elektrod ushlagich kabel", "Himoya niqobi"]
    }
];

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // 1. CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    // =========================================================================
    // REST API ENDPOINTS FOR WEBSITE INTEGRATION (BO'LIM 8)
    // =========================================================================

    // 1. GET /api/public/tools/available
    if (req.method === 'GET' && pathname === '/api/public/tools/available') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            success: true,
            status: "success",
            timestamp: new Date().toISOString(),
            total_available_models: PUBLIC_AVAILABLE_TOOLS.length,
            tools: PUBLIC_AVAILABLE_TOOLS
        }, null, 2));
        return;
    }

    // 2. GET /api/public/orders (Fetch all web leads / orders)
    if (req.method === 'GET' && pathname === '/api/public/orders') {
        const orders = loadWebOrders();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            success: true,
            count: orders.length,
            orders: orders
        }, null, 2));
        return;
    }

    // 3. POST /api/public/orders (Create order from external website)
    if (req.method === 'POST' && pathname === '/api/public/orders') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');

                // Validation
                if (!payload.customer_name || !payload.customer_phone) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        success: false,
                        error: "customer_name va customer_phone maydonlari majburiy!"
                    }));
                    return;
                }

                const orders = loadWebOrders();
                const newId = Date.now();
                const orderNum = `WEB-2026-${String(orders.length + 1).padStart(4, '0')}`;

                let serviceTitle = payload.service_type || 'asbob_ijarasi';
                if (payload.service_type === 'asbob_ijarasi') {
                    serviceTitle = `Asbob ijarasi (${payload.tool_name || 'Uskuna'})`;
                } else if (payload.service_type === 'kran') {
                    serviceTitle = `Avtokran xizmati`;
                } else if (payload.service_type === 'musor_olib_ketish') {
                    serviceTitle = `Qurilish axlatini olib ketish`;
                } else if (payload.service_type === 'gruzchik') {
                    serviceTitle = `Gruzchik xizmati`;
                }

                const newOrder = {
                    id: newId,
                    order_number: orderNum,
                    customer_name: payload.customer_name.trim(),
                    customer_phone: payload.customer_phone.trim(),
                    service_type: payload.service_type || 'asbob_ijarasi',
                    tool_id: payload.tool_id || null,
                    tool_name: payload.tool_name || (payload.tool_id ? `Model #${payload.tool_id}` : null),
                    service_details: payload.service_details || 'Saytdan kiritilgan',
                    delivery_address: payload.delivery_address || 'Yetkazib berish ko\'rsatilmagan (Olib ketish)',
                    requested_date: payload.requested_date || new Date().toLocaleString('uz-UZ'),
                    status: "yangi",
                    created_at: new Date().toLocaleString('uz-UZ'),
                    source: "tashqi_sayt_onlayn"
                };

                orders.unshift(newOrder);
                saveWebOrders(orders);

                // Telegram Group Notification Format
                const telegramAlert = [
                    `🔔 SAYTDAN YANGI ZAKAZ! #${orderNum}`,
                    `━━━━━━━━━━━━━━━━━━━`,
                    `👤 Mijoz: ${newOrder.customer_name}`,
                    `📞 Tel: ${newOrder.customer_phone}`,
                    `📦 Xizmat: ${serviceTitle}`,
                    `📍 Manzil: ${newOrder.delivery_address}`,
                    `📅 Sana/Vaqt: ${newOrder.requested_date}`,
                    `📝 Tafsilot: ${newOrder.service_details}`,
                    `━━━━━━━━━━━━━━━━━━━`,
                    `⚡️ Iltimos, mijoz bilan 5 daqiqa ichida bog'laning!`
                ].join('\n');

                res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    success: true,
                    status: "success",
                    message: "Buyurtmangiz muvaffaqiyatli qabul qilindi! Tez orada operatorimiz siz bilan bog'lanadi.",
                    order_id: newId,
                    order_number: orderNum,
                    order: newOrder,
                    telegram_notification: telegramAlert
                }, null, 2));

            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    success: false,
                    error: "Noto'g'ri JSON formati: " + err.message
                }));
            }
        });
        return;
    }

    // 4. PATCH /api/public/orders/:id/status (Update web lead status)
    if (req.method === 'PATCH' && pathname.startsWith('/api/public/orders/')) {
        const orderId = parseInt(pathname.split('/')[4]);
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const orders = loadWebOrders();
                const targetOrder = orders.find(o => o.id === orderId);
                if (targetOrder) {
                    if (payload.status) targetOrder.status = payload.status;
                    saveWebOrders(orders);
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: true, order: targetOrder }));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: false, error: "Buyurtma topilmadi" }));
                }
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    // =========================================================================
    // REST API ENDPOINTS FOR AI AGENT & TELEGRAM BOT (BO'LIM 9)
    // =========================================================================

    // 5. POST /api/ai/chat (AI Assistant Chat Endpoint)
    if (req.method === 'POST' && pathname === '/api/ai/chat') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const msg = (payload.message || '').toLowerCase();
                const role = payload.role || 'customer';
                const adminPin = payload.admin_pin || '';

                let reply = '';
                let functionCalled = null;
                let functionResult = null;

                // A. Admin Stats Check
                if (role === 'admin' || msg.includes('kassa') || msg.includes('hisobot') || msg.includes('foyda') || msg.includes('kechikkan') || msg.startsWith('/admin')) {
                    if (adminPin === '7788' || msg.includes('7788') || role === 'admin') {
                        const orders = loadWebOrders();
                        functionCalled = "get_admin_daily_stats";
                        functionResult = {
                            authorized: true,
                            today_income: 1450000,
                            today_deposits: 1100000,
                            monthly_net_profit: 18200000,
                            delayed_count: 1,
                            delayed_details: [
                                { customer: "Ali Valiyev", phone: "+998 90 123-45-67", tool: "Perforator Bosch GBH 2-26", overdue: "1 kun kechikdi" }
                            ]
                        };
                        reply = `👑 Bosh Admin Hisoboti:\n• Bugungi tushum: 1 450 000 so'm\n• Saqlanayotgan zaloglar: 1 100 000 so'm\n• Oylik sof foyda: 18 200 000 so'm\n• Kechikkan buyurtmalar: 1 ta (Ali Valiyev, +998 90 123-45-67)`;
                    } else {
                        reply = `🔒 Maxfiy ma'lumot! Admin hisobotini ko'rish uchun maxfiy PIN kodni yozing: /admin 7788`;
                    }
                } 
                // B. Tool Availability Check
                else if (msg.includes('perforator') || msg.includes('generator') || msg.includes('bolgarka') || msg.includes('svarka') || msg.includes('otboynik') || msg.includes('asbob') || msg.includes('bormi')) {
                    const matched = PUBLIC_AVAILABLE_TOOLS.find(t => msg.includes(t.name.toLowerCase().split(' ')[0]) || msg.includes(t.brand.toLowerCase())) || PUBLIC_AVAILABLE_TOOLS[0];
                    functionCalled = "check_tool_availability";
                    functionResult = {
                        found: true,
                        model_name: matched.name,
                        brand: matched.brand,
                        available_count: matched.available_count,
                        daily_price: matched.daily_price,
                        deposit: matched.deposit_amount,
                        specs: matched.specs
                    };
                    reply = `🔨 Ha, omborimizda ${matched.available_count} ta "${matched.name}" mavjud!\n• 1 kunlik narxi: ${matched.daily_price.toLocaleString()} so'm\n• Garov (Zalog): ${matched.deposit_amount.toLocaleString()} so'm\n• Komplekt: ${matched.kit_items.join(', ')}\n\nBuyurtma berishni istaysizmi?`;
                }
                // C. Services Check (Kran, Musor, Gruzchik)
                else if (msg.includes('kran') || msg.includes('musor') || msg.includes('gruzchik') || msg.includes('axlat')) {
                    functionCalled = "get_service_price";
                    if (msg.includes('kran')) {
                        functionResult = { service: "kran", price: "400 000 so'm / soat", min: "3 soat" };
                        reply = `🏗️ Avtokran xizmati narxi: 400 000 so'm / soat (kamida 3 soat). Haydovchi-mashinist bilan xizmat ko'rsatiladi.`;
                    } else if (msg.includes('musor') || msg.includes('axlat')) {
                        functionResult = { service: "musor", price: "350 000 so'm / reys" };
                        reply = `🚛 Qurilish chiqindilarini (musor) Gazelda olib ketish narxi: 350 000 so'm / 1 reys (1.5t yoki 40-50 qopgacha).`;
                    } else {
                        functionResult = { service: "gruzchik", price: "75 000 so'm / soat" };
                        reply = `👷 Gruzchik xizmati: 1 kishi uchun 75 000 so'm / soat yoki qavatga qarab kelishiladi.`;
                    }
                }
                // D. Order Creation
                else if (msg.includes('zakaz') || msg.includes('buyurtma') || msg.includes('+998')) {
                    functionCalled = "create_incoming_order";
                    const newId = Date.now();
                    const orderNum = `AI-ORD-${String(newId).slice(-4)}`;
                    functionResult = { order_number: orderNum, status: "yangi" };
                    reply = `✅ Buyurtmangiz qabul qilindi! Buyurtma raqami: #${orderNum}. Operatorimiz 5 daqiqada siz bilan bog'lanadi.`;
                }
                // E. General Greeting
                else {
                    reply = `Assalomu alaykum! Men WMS Arenda AI sotuvchi va operator yordamchisiman. Qurilish asboblari, kran, musor olib ketish va gruzchik xizmatlari bo'yicha qanday yordam bera olaman?`;
                }

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    success: true,
                    reply: reply,
                    function_called: functionCalled,
                    function_result: functionResult
                }));

            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    // 6. POST /api/ai/telegram-webhook (Telegram Bot Webhook Handler)
    if (req.method === 'POST' && pathname === '/api/ai/telegram-webhook') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const update = JSON.parse(body || '{}');
                const message = update.message || {};
                const chatId = message.chat?.id;
                const text = (message.text || '').trim();

                let botReply = '';
                if (text === '/start') {
                    botReply = "Assalomu alaykum! WMS ARENDA AI Yordamchisiga xush kelibsiz! Asboblar qoldig'i, narxlar va xizmatlar bo'yicha savolingizni bering.";
                } else if (text.startsWith('/admin 7788')) {
                    botReply = "👑 Bosh Admin rejimi faol! Bugungi kassa: 1 450 000 so'm. Olingan zalog: 1 100 000 so'm. Oylik sof foyda: 18 200 000 so'm. Kechikkan uskunalar: 1 ta.";
                } else {
                    botReply = `Xabaringiz qabul qilindi: "${text}". Omborni tekshirib, xizmat ko'rsatishga tayyormiz!`;
                }

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    ok: true,
                    chat_id: chatId,
                    reply_sent: botReply
                }));
            } catch (e) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: e.message }));
            }
        });
        return;
    }

    // 7. POST /api/partner-bot/dispatch (Send interactive order to partner bot)
    if (req.method === 'POST' && pathname === '/api/partner-bot/dispatch') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const orderId = payload.order_id;
                const orderNum = payload.order_number || `SRV-${String(orderId).slice(-4)}`;
                const partnerName = payload.partner_name || 'Hamkor';
                const serviceName = payload.service_type || 'Xizmat';
                const payoutAmount = payload.payout_amount || 0;
                const address = payload.address || 'Toshkent sh.';
                const time = payload.time || '10:00';
                const task = payload.task_instruction || payload.details || 'Ko\'rsatma berilmagan';

                const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
                const botMessage = 
`🔔 YANGI BUYURTMA! (#${orderNum})
🏢 WMS ARENDA DISPECHERLIK
🛠 Xizmat: ${serviceName}
📍 Ish joyi: ${address}
🗺 Xarita: ${mapUrl}
🕒 Vaqt: Bugun soat ${time} da
💵 Sizga to'lanadigan summa: ${Number(payoutAmount).toLocaleString()} so'm
📋 Topshiriq: ${task}`;

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    success: true,
                    status: "sent",
                    order_id: orderId,
                    order_number: orderNum,
                    partner_name: partnerName,
                    bot_message: botMessage,
                    map_url: mapUrl,
                    inline_keyboard: [
                        [{ text: "✅ Qabul qilaman", callback_data: `accept_${orderId}` }],
                        [{ text: "❌ Bandman / Rad etish", callback_data: `reject_${orderId}` }],
                        [{ text: "📍 Xaritada ko'rish", url: mapUrl }]
                    ]
                }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    // 8. POST /api/partner-bot/callback (Partner presses inline buttons in bot)
    if (req.method === 'POST' && pathname === '/api/partner-bot/callback') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const { order_id, action, partner_name, payout_amount } = payload;

                let newStatus = 'yangi';
                let replyText = '';
                let alertTone = 'info';

                if (action === 'accept') {
                    newStatus = 'bajarilmoqda';
                    replyText = `👍 Buyurtma #${order_id} qabul qilindi! Ishni bajargach, [🏁 Ish yakunlandi] tugmasini bosing.`;
                    alertTone = 'success';
                } else if (action === 'reject') {
                    newStatus = 'yangi';
                    replyText = `❌ Buyurtma rad etildi. Boshqa buyurtmalar kutmoqda!`;
                    alertTone = 'warning';
                } else if (action === 'finish') {
                    newStatus = 'bajarildi';
                    replyText = `🎉 Ish muvaffaqiyatli yakunlandi! Hisobingizga +${Number(payoutAmount || 0).toLocaleString()} so'm qo'shildi. Rahmat!`;
                    alertTone = 'success';
                }

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    success: true,
                    order_id: order_id,
                    action: action,
                    new_status: newStatus,
                    partner_name: partnerName || 'Hamkor',
                    reply_text: replyText,
                    alert_tone: alertTone,
                    timestamp: new Date().toLocaleTimeString('uz-UZ')
                }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    // =========================================================================
    // STATIC FILE SERVING & SPA FALLBACK
    // =========================================================================
    let reqUrl = pathname;
    if (reqUrl === '/' || reqUrl === '') {
        reqUrl = '/index.html';
    }

    const filePath = path.join(PUBLIC_DIR, reqUrl);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // If not found, serve index.html for SPA behavior
                fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e, fallback) => {
                    if (e) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('404 Not Found');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(fallback);
                    }
                });
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`   WMS ARENDA ERP - ADMIN BOSHQARUV TIZIMI`);
    console.log(`   Server ishga tushdi: http://localhost:${PORT}`);
    console.log(`   Public REST API:`);
    console.log(`   - POST http://localhost:${PORT}/api/public/orders`);
    console.log(`   - GET  http://localhost:${PORT}/api/public/tools/available`);
    console.log(`   - GET  http://localhost:${PORT}/api/public/orders`);
    console.log(`====================================================`);
});
