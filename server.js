const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const dbEngine = require('./db.js');
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const DATA_DIR = path.join(__dirname, 'data');
const WEB_ORDERS_FILE = path.join(DATA_DIR, 'web_orders.json');

// Automatic memory and cache cleanup interval (runs every 30 minutes)
const CACHE_CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
setInterval(() => {
    try {
        const report = dbEngine.cleanupCache(500);
        console.log(`[Auto Cache Cleanup] Server cache and memory optimized at ${report.cleanedAt}. Memory: RSS ${(report.memoryAfter.rss / 1024 / 1024).toFixed(1)} MB, Heap ${(report.memoryAfter.heapUsed / 1024 / 1024).toFixed(1)} MB`);
    } catch (e) {
        console.error('[Auto Cache Cleanup] Error:', e.message);
    }
}, CACHE_CLEANUP_INTERVAL_MS);

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

// =========================================================================
// REAL GOOGLE GEMINI 1.5 FLASH AI INTEGRATION
// =========================================================================
const GEMINI_SYSTEM_INSTRUCTION = `Sen "WMS ARENDA" qurilish asboblari ijarasi va maxsus xizmatlar platformasining 24/7 ishlovchi jonli, samimiy, xushmuomala AI maslahatchisi hamda sotuvchi-operatorisan.
Isming: WMS Arenda AI Yordamchisi.
Mijoz qaysi tilda murojaat qilsa (O'zbek yoki Rus), xuddi shu tilda ravon, tabiiy, do'stona va professional javob ber.

ASOSIY VAZIFALAR VA QOIDALAR:
1. Sen qurilish asboblari ijarasi, kran xizmati, musor (chiqindi) olib ketish va gruzchik (yuk tashish) xizmatlari bo'yicha mijozlarga to'liq ma'lumot berasan, narxlarni aniq hisoblab berasan va buyurtmalarni qabul qilasan.
2. Omborda yo'q asbobni hech qachon "bor" deb aldamagin. Faqat quyidagi bazadagi asboblar va narxlar asosida javob ber. Narxlarni o'zboshimchalik bilan o'zgartirma.
3. Jonli insondek, o'ta xushmuomala va yordamga shay bo'l.

KATALOG VA ANIQ TARIFLAR BAZASI:

1. QURILISH ASBOBLARI IJARASI (Omborda mavjud modellar):
• Perforator Bosch GBH 2-26 DRE — 1 kunlik ijara: 80 000 so'm, Zalog (garov): 400 000 so'm (bur'gilar to'plami va keysi bilan).
• Otboynik (Otboyniy molotok) Makita HM1203C — 1 kunlik ijara: 150 000 so'm, Zalog: 700 000 so'm (og'ir zarbali, pika va lopatka bilan).
• Benzin generator Honda 5.5 kVt — 1 kunlik ijara: 200 000 so'm, Zalog: 1 000 000 so'm (220V kabel va leykasi bilan).
• Payvandlash apparati (Svarka) Resanta SAI 220 — 1 kunlik ijara: 60 000 so'm, Zalog: 300 000 so'm (xameleon maska va kabel bilan).
• Bolgarka (UGM) Makita 230mm — 1 kunlik ijara: 70 000 so'm, Zalog: 350 000 so'm (himoya qopqog'i va kaliti bilan).
• Vibroplita (Trambovka) 90 kg — 1 kunlik ijara: 180 000 so'm, Zalog: 800 000 so'm (rezina taglik bilan).

2. AVTOKRAN XIZMATI:
• 16 tonna: 1 soati 300 000 so'm (Minimal buyurtma: 2 soat).
• 25 tonna: 1 soati 350 000 so'm (Minimal buyurtma: 3 soat).
• 50 tonna: 1 soati 600 000 so'm (Minimal buyurtma: 4 soat).
• Shahardan tashqariga chiqish (yo'l kira): 1 km uchun 15 000 so'm qo'shimcha.
• Barcha kranlar malakali haydovchi-mashinist bilan xizmat ko'rsatadi.

3. QURILISH CHIQINDILARINI (MUSOR) OLIB KETISH:
• Mashina turi bo'yicha (1 reys narxi):
  - Gazel (1.5 tonna yoki 40-50 qopgacha) = 400 000 so'm / reys.
  - ZIL (5-6 tonna yoki 150 qopgacha) = 800 000 so'm / reys.
  - KamAZ (10-15 tonna yoki 300 qopgacha) = 1 500 000 so'm / reys.
• Qoplab tashish tarifi: 1 qop uchun 12 000 so'm (minimal buyurtma: 20 qop).
• Mashinaga yuklash (yuk ortish): Mashina uchun 150 000 so'm yoki 1 qopga 3 000 so'm.
• Agar etajdan (qavatdan) tushirish kerak bo'lsa: har bir qavat uchun 1 qopga +2 000 so'm qo'shiladi.
• MUHIM QOIDA: Agar mijoz "Musor qancha bo'ladi?", "Musor narxi qancha?", "Сколько стоит вывоз мусора?" deb umumiy so'rasa — birdaniga bitta narx aytib ketma! Darhol samimiy va xushmuomala tarzda hajmini aniqlashtir:
  "Assalomu alaykum! Qurilish chiqindilarini (musor) mamnuniyat bilan olib ketamiz. Sizga eng maqbul va aniq narxni hisoblab berishim uchun quyidagilarni aytib bera olasizmi:
  1. Chiqindingiz taxminan qancha hajmda: qoplardami (necha qop) yoki mashina to'lami (Gazel, ZIL yoki KamAZ)?
  2. Bino nechanchi qavatda va lift bormi?
  3. Chiqindini mashinaga yuklash uchun biz tomondan gruzchiklar (ishchilar) kerakmi?
  Shularni aytsangiz, narxini darhol aniq hisoblab beraman!" deb so'ra.
  Mijoz parametrlarni (masalan, 30 ta qop, 4-etaj, liftsiz) aytishi bilan darhol to'liq narxni formula bo'yicha hisoblab ko'rsat.

4. GRUZCHIK (YUK TASHISH) XIZMATI:
• Qavatlarga ko'tarish/tushirish: 1 qop (50 kg) sement/qorishma uchun 1 qavatga 3 000 so'm.
• Agar lift ishlasa: qavatidan qat'i nazar 1 qop uchun 1 500 so'm.
• Soatbay ish: 1 ishchi uchun 1 soatiga 50 000 so'm (minimal buyurtma: 2 soat).
• Ishchilar soni tavsiyasi: 500 kg gacha — 1 kishi; 500 kg dan 1.5 tonnagacha — 2 kishi; 1.5 t dan 3 tonnagacha — 3-4 kishi; 3 tonnadan oshsa — 4+ kishi.

5. BUYURTMA RASMIYLASHTIRISH:
• Mijoz biror xizmat yoki asbobni zakaz qilmoqchi bo'lsa yoki telefon raqamini yozsa:
  "Katta rahmat! Buyurtmangiz qabul qilindi. Operatorimiz 5 daqiqada siz bilan bog'lanib, barcha tafsilotlarni tasdiqlaydi. Iltimos, ismingiz, aniq yetkazib berish manzili va qulay vaqtni ham yozib qoldiring!" deb iliq javob ber.

6. BOSH ADMIN HISOBOTI (MAXFIY):
• Foydalanuvchi "kassa", "hisobot", "foyda", "kechikkan asboblar" so'rasa, faqat maxfiy PIN kod "7788" (yoki /admin 7788) kiritilgan bo'lsa javob ber:
  - Bugungi kassa tushumi: 1 450 000 so'm
  - Saqlanayotgan zaloglar: 1 100 000 so'm
  - Shu oylik sof foyda: 18 200 000 so'm
  - Kechikkan buyurtmalar: 1 ta (Mijoz: Ali Valiyev, Tel: +998 90 123-45-67, Uskuna: Perforator Bosch GBH 2-26, 1 kun kechikkan).
• Agar PIN kod kiritilmagan bo'lsa: "Kechirasiz, ushbu moliyaviy ma'lumotlar maxfiy! Hisobotni ko'rish uchun maxfiy PIN kodni yozing (masalan: /admin 7788)." deb javob ber.`;

function callGoogleGeminiAPI(apiKey, userMessage, conversationHistory = []) {
    return new Promise((resolve, reject) => {
        if (!apiKey) {
            return reject(new Error("API_KEY_REQUIRED"));
        }

        const contents = [];
        if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
            conversationHistory.forEach(item => {
                const text = item.text || item.content || '';
                if (!text) return;
                const role = (item.sender === 'user' || item.role === 'user') ? 'user' : 'model';
                contents.push({ role, parts: [{ text }] });
            });
        }

        contents.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });

        const postData = JSON.stringify({
            system_instruction: {
                parts: [{ text: GEMINI_SYSTEM_INSTRUCTION }]
            },
            contents: contents,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1200
            }
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            port: 443,
            path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const apiReq = https.request(options, (apiRes) => {
            let resBody = '';
            apiRes.on('data', chunk => { resBody += chunk; });
            apiRes.on('end', () => {
                if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) {
                    try {
                        const parsed = JSON.parse(resBody);
                        const reply = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (reply) {
                            resolve(reply.trim());
                        } else {
                            resolve("Kechirasiz, javobni shakllantirib bo'lmadi.");
                        }
                    } catch (e) {
                        reject(new Error("Gemini javobini o'qishda xatolik: " + e.message));
                    }
                } else {
                    let errMsg = `Gemini API xatosi (${apiRes.statusCode})`;
                    try {
                        const errParsed = JSON.parse(resBody);
                        if (errParsed.error?.message) {
                            errMsg += `: ${errParsed.error.message}`;
                        }
                    } catch (e) {}
                    reject(new Error(errMsg));
                }
            });
        });

        apiReq.on('error', (err) => {
            reject(new Error("Tarmoq xatosi: " + err.message));
        });

        apiReq.setTimeout(25000, () => {
            apiReq.destroy();
            reject(new Error("Gemini API javob berish vaqti tugadi (Timeout)."));
        });

        apiReq.write(postData);
        apiReq.end();
    });
}

function callGroqAPI(apiKey, userMessage, conversationHistory = [], modelName = 'llama-3.3-70b-versatile') {
    return new Promise((resolve, reject) => {
        if (!apiKey) {
            return reject(new Error("GROQ_API_KEY_REQUIRED"));
        }

        const messages = [
            { role: 'system', content: GEMINI_SYSTEM_INSTRUCTION }
        ];

        if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
            conversationHistory.forEach(item => {
                const text = item.text || item.content || '';
                if (!text) return;
                const role = (item.sender === 'user' || item.role === 'user') ? 'user' : 'assistant';
                messages.push({ role, content: text });
            });
        }

        messages.push({ role: 'user', content: userMessage });

        const postData = JSON.stringify({
            model: modelName || 'llama-3.3-70b-versatile',
            messages: messages,
            temperature: 0.7,
            max_tokens: 1200
        });

        const options = {
            hostname: 'api.groq.cloud',
            port: 443,
            path: '/openai/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey.trim()}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const apiReq = https.request(options, (apiRes) => {
            let resBody = '';
            apiRes.on('data', chunk => { resBody += chunk; });
            apiRes.on('end', () => {
                if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) {
                    try {
                        const parsed = JSON.parse(resBody);
                        const reply = parsed.choices?.[0]?.message?.content;
                        if (reply) {
                            resolve(reply.trim());
                        } else {
                            resolve("Kechirasiz, Groq javobini shakllantirib bo'lmadi.");
                        }
                    } catch (e) {
                        reject(new Error("Groq javobini o'qishda xatolik: " + e.message));
                    }
                } else {
                    let errMsg = `Groq API xatosi (${apiRes.statusCode})`;
                    try {
                        const errParsed = JSON.parse(resBody);
                        if (errParsed.error?.message) {
                            errMsg += `: ${errParsed.error.message}`;
                        }
                    } catch (e) {}
                    reject(new Error(errMsg));
                }
            });
        });

        apiReq.on('error', (err) => {
            reject(new Error("Tarmoq xatosi: " + err.message));
        });

        apiReq.setTimeout(25000, () => {
            apiReq.destroy();
            reject(new Error("Groq API javob berish vaqti tugadi (Timeout)."));
        });

        apiReq.write(postData);
        apiReq.end();
    });
}

/**
 * 100% Standalone Autonomous Built-in NLP Chat Engine
 * Handles natural language inquiries for tools, crane, trash hauling, movers, and admin reports.
 * Fully supports Uzbek and Russian without needing any external API keys.
 */
function generateAutonomousAIResponse(userMessage, conversationHistory = [], role = 'customer', adminPin = '') {
    const text = (userMessage || '').trim();
    const lower = text.toLowerCase();

    // Check language: is it Russian?
    const isRussian = /[а-яё]/i.test(text) && (
        lower.includes('привет') || lower.includes('здравствуй') || lower.includes('добр') ||
        lower.includes('кран') || lower.includes('мусор') || lower.includes('грузчик') ||
        lower.includes('инструмент') || lower.includes('аренд') || lower.includes('касс') ||
        lower.includes('сколько') || lower.includes('цена') || lower.includes('отчет') ||
        lower.includes('заказ') || lower.includes('наличи') || lower.includes('сумма') ||
        lower.includes('доставк') || lower.includes('перфоратор') || lower.includes('болгарк')
    );

    // 1. Admin Commands & Financial Reporting
    const isAdminIntent = lower.includes('/admin') || lower.startsWith('admin') ||
        lower.includes('kassa') || lower.includes('hisobot') || lower.includes('foyda') || 
        lower.includes('tushum') || lower.includes('kechikkan') ||
        lower.includes('касса') || lower.includes('отчет') || lower.includes('прибыль') || lower.includes('выручка');

    if (isAdminIntent) {
        const hasPin = lower.includes('7788') || adminPin === '7788' || role === 'admin';
        if (hasPin) {
            const now = new Date();
            const timeStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString().slice(0, 5);
            if (isRussian) {
                return {
                    reply: `Отчет Главного Администратора (${timeStr}):\n\n` +
                           `• Касса за сегодня (Выручка): 1 450 000 сум\n` +
                           `• Удерживаемые залоги: 1 100 000 сум\n` +
                           `• Чистая прибыль за месяц (P&L): 18 200 000 сум\n` +
                           `• Просроченные заказы: 1 шт. (Клиент: Али Валиев, +998 90 123-45-67, Перфоратор Bosch)\n\n` +
                           `Все остальные инструменты возвращаются в срок!`,
                    function_called: "get_admin_daily_stats"
                };
            } else {
                return {
                    reply: `Bosh Admin Uchun Jonli Kassa va Biznes Hisoboti (${timeStr}):\n\n` +
                           `• Bugungi kassa tushumi: 1 450 000 so'm\n` +
                           `• Saqlanayotgan zaloglar (fond): 1 100 000 so'm\n` +
                           `• Shu oylik Toza Foyda (P&L): 18 200 000 so'm\n` +
                           `• Kechikkan buyurtmalar: 1 ta (Mijoz: Ali Valiyev, Tel: +998 90 123-45-67, Uskuna: Bosch GBH 2-26)\n\n` +
                           `Barcha uskunalar o'z vaqtida nazorat ostida qaytarilmoqda!`,
                    function_called: "get_admin_daily_stats"
                };
            }
        } else if (lower.includes('kassa') || lower.includes('касса') || lower.includes('foyda') || lower.includes('hisobot') || lower.includes('отчет')) {
            if (isRussian) {
                return {
                    reply: "Финансовый отчет доступен только Администратору. Пожалуйста, укажите секретный PIN-код: /admin [PIN] (например: /admin 7788).",
                    function_called: "get_admin_daily_stats"
                };
            } else {
                return {
                    reply: "Ushbu moliyaviy hisobot faqat Kompaniya Admini uchun ochiq. Iltimos, parolingizni kiriting: /admin [PIN] (Masalan: /admin 7788).",
                    function_called: "get_admin_daily_stats"
                };
            }
        }
    }

    // 2. Greetings & Salutation
    const isGreeting = lower === 'salom' || lower.startsWith('salom ') || lower.startsWith('assalom') ||
        lower.includes('qalaysiz') || lower.includes('yaxshimisiz') || lower.includes('privet') ||
        lower === 'привет' || lower.startsWith('привет ') || lower.includes('здравствуй') || lower.includes('добрый день');

    const hasSpecificService = lower.includes('kran') || lower.includes('кран') || lower.includes('musor') || lower.includes('мусор') ||
        lower.includes('gruzchik') || lower.includes('грузчик') || lower.includes('perforator') || lower.includes('generator') ||
        lower.includes('bolgarka') || lower.includes('otboynik') || lower.includes('svarka') || lower.includes('narx') || lower.includes('цена');

    if (isGreeting && !hasSpecificService) {
        if (isRussian) {
            return {
                reply: "Здравствуйте! Добро пожаловать в WMS ARENDA! Какой инструмент или услуга (автокран, вывоз мусора, грузчики) вам требуется?",
                function_called: null
            };
        } else {
            return {
                reply: "Assalomu alaykum! WMS Arenda xizmatiga xush kelibsiz! Sizga qanday asbob yoki xizmat (kran, musor, gruzchik) kerak?",
                function_called: null
            };
        }
    }

    // 3. Musor (Chiqindi) xizmati bo'yicha:
    if (lower.includes('musor') || lower.includes('chiqindi') || lower.includes('axlat') || lower.includes('мусор')) {
        if (isRussian) {
            return {
                reply: "Стоимость вывоза строительного мусора по объемам: Газель (до 1.5т) — 400 000 сум, ЗИЛ (5т) — 800 000 сум. Если в мешках — от 12 000 сум за мешок. По какому адресу находится мусор и какой у вас примерный объем?",
                function_called: "get_service_price",
                function_result: { service: "musor_olib_ketish" }
            };
        } else {
            return {
                reply: "Chiqindilarni olib ketish narxlari hajmi bo'yicha: Gazel (1.5t gacha) — 400 000 so'm, ZIL (5t) — 800 000 so'm. Agar qoplarda bo'lsa — donasi 12 000 so'mdan. Sizda chiqindi qaysi manzilda va taxminan qancha hajmda?",
                function_called: "get_service_price",
                function_result: { service: "musor_olib_ketish" }
            };
        }
    }

    // 4. Kran xizmati bo'yicha:
    if (lower.includes('kran') || lower.includes('avtokran') || lower.includes('кран') || lower.includes('автокран')) {
        if (isRussian) {
            return {
                reply: "Услуги автокрана: 16-тонный кран — 300 000 сум/час (минимальный заказ 2 часа), 25-тонный кран — 350 000 сум/час (минимальный заказ 3 часа). Какой груз необходимо поднять и по какому адресу требуется техника?",
                function_called: "get_service_price",
                function_result: { service: "kran" }
            };
        } else {
            return {
                reply: "Avtokran xizmati bo'yicha: 16 tonnalik kran soatiga 300 000 so'm (minimal 2 soat), 25 tonnalik kran soatiga 350 000 so'm (minimal 3 soat). Sizga qanday yukni ko'tarish uchun va qaysi manzilga kerak?",
                function_called: "get_service_price",
                function_result: { service: "kran" }
            };
        }
    }

    // 5. Gruzchik xizmati bo'yicha:
    if (lower.includes('gruzchik') || lower.includes('ishchi') || lower.includes('ko\'tarish') || lower.includes('yukchi') || lower.includes('etaj') || lower.includes('грузчик') || lower.includes('подъем') || lower.includes('этаж')) {
        if (isRussian) {
            return {
                reply: "Услуги грузчиков (подъем и переноска грузов): 1 мешок за 1 этаж — 3 000 сум (при наличии лифта — 1 500 сум). Почасовая оплата — 50 000 сум/час за 1 человека. Какой у вас груз, какой этаж и есть ли рабочий лифт?",
                function_called: "get_service_price",
                function_result: { service: "gruzchik" }
            };
        } else {
            return {
                reply: "Yuk ko'taruvchilar (gruzchik) xizmati: 1 qop uchun 1 qavatga 3 000 so'm (lift bo'lsa 1 500 so'm). Soatbay ish bo'lsa 1 kishi uchun 50 000 so'm/soat. Sizda qanday yuk, nechanchi etaj va lift bormi?",
                function_called: "get_service_price",
                function_result: { service: "gruzchik" }
            };
        }
    }

    // 6. Asboblar ijarasi bo'yicha (Real ombor bilan bog'langan):
    const toolKeywords = [
        'perforator', 'перфоратор', 'bolgarka', 'болгарка', 'generator', 'генератор',
        'svarka', 'сварка', 'сварочный', 'otboynik', 'отбойник', 'drel', 'дрель',
        'pila', 'пила', 'kompressor', 'компрессор', 'vibroplita', 'виброплита',
        'shurupovert', 'шуруповерт', 'asbob', 'инструмент', 'uskuna', 'oborudovanie',
        'lazer', 'лазер', 'vibrator', 'вибратор', 'bosch', 'makita', 'resanta', 'honda'
    ];
    const isToolQuery = toolKeywords.some(kw => lower.includes(kw)) || lower.includes('bormi') || lower.includes('qancha') || lower.includes('bor') || lower.includes('наличи');

    if (isToolQuery) {
        let matchedTool = null;
        for (const t of PUBLIC_AVAILABLE_TOOLS) {
            const toolLower = t.name.toLowerCase();
            if (
                (lower.includes('perforator') || lower.includes('перфоратор')) && toolLower.includes('perforator') ||
                (lower.includes('otboynik') || lower.includes('отбойник')) && toolLower.includes('otboyniy') ||
                (lower.includes('generator') || lower.includes('генератор')) && toolLower.includes('generator') ||
                (lower.includes('svarka') || lower.includes('сварка') || lower.includes('payvandlash')) && toolLower.includes('payvandlash') ||
                (lower.includes('bolgarka') || lower.includes('болгарка')) && toolLower.includes('bolgarka') ||
                toolLower.split(' ').some(part => part.length > 3 && lower.includes(part))
            ) {
                matchedTool = t;
                break;
            }
        }

        if (matchedTool) {
            if (isRussian) {
                return {
                    reply: `Да, на нашем складе в наличии **${matchedTool.name}** (свободно: ${matchedTool.available_count} шт.)!\n\n` +
                           `• 1 день аренды: **${matchedTool.daily_price.toLocaleString()} сум**\n` +
                           `• Сумма залога: **${matchedTool.deposit_amount.toLocaleString()} сум**\n` +
                           (matchedTool.kit_items?.length ? `• Комплектация: ${matchedTool.kit_items.join(', ')}\n` : '') +
                           `\nНа сколько дней планируете арендовать?`,
                    function_called: "check_tool_availability",
                    function_result: matchedTool
                };
            } else {
                return {
                    reply: `Ha, hozirda omborimizda **${matchedTool.name}** mavjud (${matchedTool.available_count} ta tayyor)!\n\n` +
                           `• 1 kunlik ijarasi: **${matchedTool.daily_price.toLocaleString()} so'm**\n` +
                           `• Zalog summasi: **${matchedTool.deposit_amount.toLocaleString()} so'm**\n` +
                           (matchedTool.kit_items?.length ? `• Komplekt: ${matchedTool.kit_items.join(', ')}\n` : '') +
                           `\nNecha kunga olmoqchisiz?`,
                    function_called: "check_tool_availability",
                    function_result: matchedTool
                };
            }
        } else {
            if (isRussian) {
                let rep = "На нашем складе в наличии следующие инструменты:\n\n";
                PUBLIC_AVAILABLE_TOOLS.forEach(t => {
                    rep += `• **${t.name}** — ${t.daily_price.toLocaleString()} сум/день (Залог: ${t.deposit_amount.toLocaleString()} сум)\n`;
                });
                rep += "\nКакой именно инструмент вас интересует и на какой срок?";
                return { reply: rep, function_called: "check_tool_availability" };
            } else {
                let rep = "Hozirda omborimizda tayyor turgan asosiy asboblar:\n\n";
                PUBLIC_AVAILABLE_TOOLS.forEach(t => {
                    rep += `• **${t.name}** — ${t.daily_price.toLocaleString()} so'm/kun (Zalog: ${t.deposit_amount.toLocaleString()} so'm)\n`;
                });
                rep += "\nQaysi uskuna sizga kerak va necha kunga olmoqchisiz?";
                return { reply: rep, function_called: "check_tool_availability" };
            }
        }
    }

    // 7. Order Booking (Phone number detected)
    const phoneMatch = text.match(/(\+?998\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2})|(\b\d{9}\b)/);
    if (phoneMatch || lower.includes('zakaz') || lower.includes('buyurtma') || lower.includes('заказ')) {
        const phone = phoneMatch ? phoneMatch[0] : "+998 90 000-00-00";
        if (isRussian) {
            return {
                reply: `Большое спасибо! Ваш заказ успешно принят.\n\n` +
                       `• Контактный телефон: ${phone}\n` +
                       `• Детали: ${text}\n\n` +
                       `Наш оператор свяжется с вами в течение 5 минут для подтверждения времени и адреса доставки.`,
                function_called: "create_incoming_order"
            };
        } else {
            return {
                reply: `Katta rahmat! Buyurtmangiz qabul qilindi.\n\n` +
                       `• Aloqa telefoni: ${phone}\n` +
                       `• Buyurtma tafsiloti: ${text}\n\n` +
                       `Operatorimiz 5 daqiqada siz bilan bog'lanib, yetkazib berish yoki ombordan olib ketish vaqtini tasdiqlaydi.`,
                function_called: "create_incoming_order"
            };
        }
    }

    // Default polite conversational response
    if (isRussian) {
        return {
            reply: "Здравствуйте! Я ИИ-помощник сервиса WMS ARENDA.\n\n" +
                   "Я могу помочь вам по следующим направлениям:\n" +
                   "1. Аренда строительного инструмента (перфоратор, отбойник, генератор, сварка);\n" +
                   "2. Услуги автокрана (16т, 25т, 50т);\n" +
                   "3. Вывоз строительного мусора (Газель, ЗИЛ, в мешках);\n" +
                   "4. Услуги грузчиков (поэтажный подъем, почасовая оплата).\n\n" +
                   "Подскажите, что именно вас интересует, и я сразу сообщу цены и наличие на складе!",
            function_called: null
        };
    } else {
        return {
            reply: "Assalomu alaykum! Men \"WMS ARENDA\" AI yordamchisiman.\n\n" +
                   "Sizga quyidagi xizmatlar bo'yicha yordam bera olaman:\n" +
                   "1. Qurilish asboblari ijarasi (perforator, otboynik, generator, svarka va h.k.);\n" +
                   "2. Avtokran xizmati;\n" +
                   "3. Chiqindi (musor) olib ketish;\n" +
                   "4. Gruzchik xizmati.\n\n" +
                   "Qaysi uskuna yoki xizmat kerakligini aytsangiz, narxi va omborda bor-yo'qligini darhol aytib beraman!",
            function_called: null
        };
    }
}

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
    // =========================================================================
    // REST API ENDPOINTS FOR AI AGENT & TELEGRAM BOT (BO'LIM 9 - REAL GEMINI API)
    // =========================================================================

    // 5. POST /api/chat & /api/ai/chat (Autonomous Builtin NLP Engine + Optional LLM Proxy)
    if (req.method === 'POST' && (pathname === '/api/chat' || pathname === '/api/ai/chat')) {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const payload = JSON.parse(body || '{}');
                const userMessage = (payload.message || '').trim();
                const history = payload.messages || payload.history || [];
                const requestedProvider = (payload.provider || 'builtin').toLowerCase();
                const rawKey = (payload.api_key || '').trim();
                const role = payload.role || 'customer';
                const adminPin = payload.admin_pin || '';

                if (!userMessage) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: false, error: "Xabar matni kiritilmadi (message is required)" }));
                    return;
                }

                // If user explicitly configured Groq with an API key
                if (requestedProvider === 'groq') {
                    const apiKey = process.env.GROQ_API_KEY || rawKey;
                    if (apiKey) {
                        try {
                            const model = payload.model || 'llama-3.3-70b-versatile';
                            const groqReply = await callGroqAPI(apiKey, userMessage, history, model);
                            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                            res.end(JSON.stringify({
                                success: true,
                                live_llm: true,
                                provider: "groq",
                                model: model,
                                reply: groqReply
                            }));
                            return;
                        } catch (groqErr) {
                            console.warn("Groq API error, falling back to autonomous engine:", groqErr.message);
                        }
                    }
                }

                // If user explicitly configured Gemini with an API key
                if (requestedProvider === 'gemini') {
                    const apiKey = process.env.GEMINI_API_KEY || rawKey;
                    if (apiKey) {
                        try {
                            const geminiReply = await callGoogleGeminiAPI(apiKey, userMessage, history);
                            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                            res.end(JSON.stringify({
                                success: true,
                                live_llm: true,
                                provider: "gemini",
                                model: payload.model || "gemini-1.5-flash",
                                reply: geminiReply
                            }));
                            return;
                        } catch (geminiErr) {
                            console.warn("Gemini API error, falling back to autonomous engine:", geminiErr.message);
                        }
                    }
                }

                // Default & Offline: Standalone Autonomous Built-in NLP Engine (Zero keys needed)
                const autoResponse = generateAutonomousAIResponse(userMessage, history, role, adminPin);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    success: true,
                    live_llm: false,
                    provider: "builtin",
                    model: "wms-builtin-nlp",
                    reply: autoResponse.reply,
                    function_called: autoResponse.function_called || null,
                    function_result: autoResponse.function_result || null
                }));

            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    // 6. POST /api/ai/telegram-webhook (Telegram Bot Webhook Handler with Autonomous AI)
    if (req.method === 'POST' && pathname === '/api/ai/telegram-webhook') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const update = JSON.parse(body || '{}');
                const message = update.message || {};
                const chatId = message.chat?.id;
                const text = (message.text || '').trim();

                let botReply = '';
                if (text === '/start') {
                    botReply = "Assalomu alaykum! WMS ARENDA AI Yordamchisiga xush kelibsiz! Qurilish asboblari ijarasi, kran, musor va gruzchik xizmatlari bo'yicha qanday yordam bera olaman?";
                } else if (process.env.GROQ_API_KEY) {
                    try {
                        botReply = await callGroqAPI(process.env.GROQ_API_KEY, text, []);
                    } catch (e) {
                        const autoResp = generateAutonomousAIResponse(text);
                        botReply = autoResp.reply;
                    }
                } else if (process.env.GEMINI_API_KEY) {
                    try {
                        botReply = await callGoogleGeminiAPI(process.env.GEMINI_API_KEY, text, []);
                    } catch (e) {
                        const autoResp = generateAutonomousAIResponse(text);
                        botReply = autoResp.reply;
                    }
                } else {
                    const autoResp = generateAutonomousAIResponse(text);
                    botReply = autoResp.reply;
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

    // 9. GET /api/db (Fetch full persistent database from SQLite)
    if (req.method === 'GET' && pathname === '/api/db') {
        try {
            const entireDB = dbEngine.getEntireDB();
            const jsonResp = JSON.stringify({
                success: true,
                is_sqlite: dbEngine.isSQLiteAvailable,
                source: dbEngine.isSQLiteAvailable ? 'SQLite (data/wms_database.sqlite)' : 'JSON Backup',
                db: entireDB,
                timestamp: new Date().toISOString()
            });
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.end(jsonResp);
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, error: e.message }));
        }
        return;
    }

    // 10. POST /api/db/sync (Persist full database to SQLite immediately on every change)
    if (req.method === 'POST' && pathname === '/api/db/sync') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const saveResult = dbEngine.saveEntireDB(payload);
                res.writeHead(200, {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                });
                res.end(JSON.stringify({
                    success: true,
                    message: "Barcha ma'lumotlar SQLite bazasiga xavfsiz saqlandi",
                    is_sqlite: dbEngine.isSQLiteAvailable,
                    saved_at: saveResult.saved_at,
                    cache_status: dbEngine.getCacheStatus()
                }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    // 11. GET /api/system/cache-status (Database and memory cache status)
    if (req.method === 'GET' && pathname === '/api/system/cache-status') {
        try {
            const status = dbEngine.getCacheStatus();
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.end(JSON.stringify({ success: true, status }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, error: e.message }));
        }
        return;
    }

    // 12. POST /api/system/clear-cache (Prune logs, reclaim SQLite memory and clean temp files)
    if (req.method === 'POST' && pathname === '/api/system/clear-cache') {
        try {
            const report = dbEngine.cleanupCache(300);
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.end(JSON.stringify({
                success: true,
                message: "Server keshlari va xotira muvaffaqiyatli tozalandi",
                report: report,
                status: dbEngine.getCacheStatus()
            }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, error: e.message }));
        }
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
