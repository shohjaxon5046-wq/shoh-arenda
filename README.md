# WMS Arenda ERP — Qurilish Uskunalari Ijarasi va Boshqaruv Tizimi

## 1. Loyiha haqida
Ushbu tizim qurilish uskunalari ijarasi (WMS ERP) uchun to'liq boshqaruv paneli bo'lib, quyidagi modullarni o'z ichiga oladi:
* **Autentifikatsiya va Rollar:** Admin, Menejer, Kassir, Skladchi;
* **1-bo'lim: "Kirim" Zanjiri (4 ta bosqich):** PO buyurtma, Faktik qabul, Joylashtirish & Barcode, Vozvrat;
* **2-bo'lim: Asboblar Katalogi va 5 Blokli Tovar Kartochkasi:** Texnik ko'rsatkichlar, Admin narxlari auditi, Komplektatsiya (Checklist), Donalar reyestri va Texnik ko'rik (TO);
* **3-bo'lim: Xodimlar va Rollar Matritsasi:** Xodimlar boshqaruvi, faol/bloklash, checkboxlar orqali huquqlarni boshqarish;
* **Yetkazib Beruvchilar va Oldi-berdi (Akt-sverka):** Balans (qarz/haq), chiqim to'lovlari, tranzaksiyalar tarixi va Akt-sverka chop etish;
* **Mijozlar Bazasi (CRM 360°):** VIP / Qarz / Qora ro'yxat filtrlari, 360° mijoz profili, 4 ta yo'nalish bo'yicha xizmatlar tarixi va moliyaviy audit;
* **4-bo'lim: Tashqi Hamkorlar (P2P / Subpudrat) va Dispecherlik:** Avtokran, Musor va Gruzchik hamkorlari bazasi, Narxlar va Sof Marja kalkulyatori, Dispecherlik jurnali hamda Hamkorlarga to'lov (Vypłata);
* **5-bo'lim: Yagona Buyurtmalar (POS) va Operator Ish Stoli:** Tezkor 1 minutlik savat, asbob va tashqi xizmatlarni bitta chekda birlashtirish, qora ro'yxat/qarz ogohlantirishlari, avtomatik muddat/kechikish nazorati, asboblarni qabul qilish (Priyomka & Checklist) hamda A4 Shartnoma/Tilxat chop etish;
* **6-bo'lim: Kassa, Moliya, Xarajatlar va Sof Foyda (P&L):** Naqd, Bank va Karta kassa hisoblari, Zaloglar xavfsiz depozit fondi (daromadga qo'shilmaydi), Xarajatlar (Rasxod) jurnali, P&L Sof Foyda hisoboti (Gross Revenue - Expenses = Net Profit) hamda Kunlik smenani yopish Z-Otchyoti (Print);
* **7-bo'lim: Elektron Chek (Telegram/Web), Kvitansiya va Shartnoma Generatori:** Mobil veb-chek (QR-kod bilan), Telegram/SMS 3 xil avtomatlashtirilgan xabar shablonlari, 80mm ixcham termo kassa printer cheki hamda A4/A5 qisqa ijara shartnomasi & tilxat.

---

## 2. Test / Demo Hisoblar:
| Rol | Login | Parol | Huquqlar |
| :--- | :--- | :--- | :--- |
| **Bosh Admin** | `admin` | `admin123` | Tizimning to'liq boshqaruvi, narxlar tahriri, rollar va xodimlar |
| **Menejer** | `manager` | `mgr123` | Buyurtmalar, ombor va mijozlar CRM bilan ishlash |
| **Kassir** | `kassir` | `kas123` | To'lovlar qabul qilish, zalog kiritish va qaytarish |
| **Skladchi** | `skladchi` | `sklad123` | Kirim qabul qilish, seriyalar, shtrix-kod va joylashtirish |

---

## 3. Modullar Imkoniyatlari:
1. **1-Bo'lim — Kirim Zanjiri:**
   - PO buyurtma -> Faktik tekshiruv -> Omborga joylash (unikal seriya tekshiruvi, barcode generatsiya va stiker print) -> Brak/Vozvrat.
2. **2-Bo'lim — Asboblar Katalogi:**
   - 5 blokli modal, Admin-only narx tahriri va audit logi, komplektatsiya, donalar texnik ko'rigi (TO).
3. **3-Bo'lim — Xodimlar, Yetkazuvchilar & CRM:**
   - Rollar matritsasi, Yetkazuvchilar balansi va Akt-sverka, Mijozlar CRM 360° (Qarzdor va Qora ro'yxat blokirovkalari bilan).
4. **4-Bo'lim — Tashqi Hamkorlar va Dispecherlik (P2P Brokerlik):**
   - Hamkorlar ro'yxati, Narxlar/Marja kalkulyatori, Dispecherlik doskasi, Vypłata jurnali.
5. **5-Bo'lim — Yagona Buyurtmalar (POS & Operator Ish Stoli):**
   - Tezkor POS Savat (Asbob + Tashqi xizmat), `omborda_bosh` qat'iy nazorati, Kechikkanlarni ogohlantirish (`tel:...`), Priyomka tekshiruv checklisti, Zalogdan jarimani chegirish va A4 Shartnoma/Tilxat print.
6. **6-Bo'lim — Kassa, Moliya, Xarajatlar & P&L Sof Foyda:**
   - **Kassa Dashboardi:** 💵 Naqd Kassa, 🏛️ Bank/Hisob raqam, 💳 Karta/Terminal qoldiqlari;
   - **🔒 Zaloglar Fondi (Safe):** Mijozlardan olingan va hali qaytarilmagan garov pullari — qat'iy qoida bo'yicha kompaniya daromadiga aralashtirilmaydi, alohida xavfsiz saqlanadi;
   - **Xarajatlar (Rasxod) Jurnali:** Toifalar bo'yicha xarajat kiritish (Zapchast, Oylik, Arenda, Benzin, Kommunal), chiqim kassa hisobini avtomatik kamaytirish;
   - **Moliya va Sof Foyda (P&L Hisoboti):** (+) Asboblar ijarasidan tushum + (+) Tashqi xizmatlar sof marjasi + (+) Jarimalar - (-) Tashkiliy xarajatlar = **(=) TOZA SOF FOYDA (Net Profit)**;
   - **Kunlik Smena (Z-Otchyot):** Kassir uchun kun oxirida naqd tushum, karta tushumi, olingan va qaytarilgan zaloglar hamda faktik kassa qoldig'i hisoboti va chek formatida chop etish (Print).
7. **7-Bo'lim — Mijozlarga Elektron Chek, Telegram/SMS & Shartnomalar:**
   - **📱 Ommaviy Mobil Web Chek:** `/receipt/[uuid]` (yoki `?receipt=[uuid]`) unikal himoyalangan havola orqali har bir dona uskunaning unikal seriya raqami, tashqi xizmatlar, ijara summasi, zalog (saqlanayotgan summa), qaytarish muddati, manzil va tekshiruv QR-kodi bilan taqdim etiladi;
   - **💬 Telegram / SMS Xabar Shablonlari (1-bosishda nusxalash va Telegramda yuborish):**
     * *1-shablon (Buyurtma ochilganda):* 🧾 Buyurtma cheki (uskunalar, zalog, muddat, lokatsiya va onlayn chek havolasi);
     * *2-shablon (3 soatlik eslatma):* ⏰ Muddat tugash eslatmasi, kechikish jarimasi haqida xabarnoma va uzaytirish uchun aloqa raqami;
     * *3-shablon (Priyomka / Yakunlash):* ✅ Asboblar to'liq soz qabul qilinganligi va olingan depozit/zalog to'liq qaytarilganligi haqida rasmiy kvitansiya;
   - **🖨️ 80mm Termo Chek (Kassa Printeri):** Kassa qog'ozi uchun ixcham monospaced shriftli, punktir chiziqli, shtrix-kod/QR-kodli qog'oz chek formati (Print tugmasi bilan);
   - **📄 A4 / A5 Qisqa Ijara Shartnomasi & Tilxat:** Qurilish asboblari ijarasi shartlari, javobgarlik (yo'qolish/buzilish), zalog qaytarish kafolati va ikki tomonlama imzo/tilxat bloki.
8. **8-Bo'lim — Bosh Boshqaruv Paneli (Executive Dashboard) & Sayt Rest API Integratsiyasi:**
   - **📊 Real vaqtdagi 4 ta KPI Kartochkasi:**
     * 📦 *Uskunalar holati:* Jami uskunalar soni, omborda bo'sh, ijarada va ta'mirdagi donalar balansi;
     * ⚠️ *Kechikkan uskunalar:* Muddati o'tib ketgan asboblar qizil indikatori (ustiga bosilganda to'g'ridan-to'g'ri o'sha buyurtmalarni filtrlash);
     * 💵 *Bugungi Kassa:* Bugungi sof ijara tushumi va olingan zaloglar summasi;
     * 📈 *Shu oylik Toza Foyda:* Kompaniyaning sof daromadi (P&L Net Profit).
   - **⚡ Tezkor Harakat Tugmalari (Quick Actions):** [+ Yangi Buyurtma], [+ Tezkor Kirim], [+ Xarajat (Rasxod)], [Asbobni Priyomka qilish];
   - **🚨 Diqqat Jadvali:** Kechikayotgan va bugun qaytishi kerak bo'lgan mijozlar reyestri, 1-bosishda qo'ng'iroq qilish (`tel:...`) yoki Telegramdan eslatma yuborish;
   - **🚚 P2P Hamkorlar Xulosasi:** Bugungi kran, musor va gruzchik xizmatlari soni hamda ulardan qolgan sof marja;
   - **🏆 Top-5 Eng Serdaromad Uskunalar:** Qaysi modellar eng ko'p daromad keltirayotganligi reytingi;
   - **🌐 Saytdan Tushgan Buyurtmalar (Online Leads):** Tashqi veb-saytingizdan kelgan so'rovlar jurnali va ularni bitta tugma bilan POS savatga yuklash;
   - **🔌 Tashqi Sayt bilan Rest API Integratsiyasi:**
     * `POST /api/public/orders` — Tashqi saytdan yangi buyurtma qabul qilish va Telegram guruhiga darhol xabarnoma chiqarish;
     * `GET /api/public/tools/available` — Tashqi saytda faqat omborda haqiqatda bo'sh turgan asboblarni ko'rsatish;
     * `GET /api/public/orders` — Onlayn buyurtmalar ro'yxati;
     * Interaktiv Jonli API Tester va bildirishnoma simulyatori.
9. **9-Bo'lim — AI Agent (LLM / Gemini / OpenAI & Telegram Bot 24/7):**
   - **🧠 Avtonom Function Calling (4 ta tizim vositasi):**
     * `check_tool_availability(tool_name)` — Haqiqiy ombor qoldig'ini tekshirish, bo'sh donalari soni, kunlik narxi, zalogi va komplektatsiyasini berish (asbob yo'q bo'lsa muqobil variantlarni taklif qiladi);
     * `get_service_price(service_type, details)` — Kran, Musor va Gruzchik xizmatlari bo'yicha aniq narxlar kalkulyatsiyasi va minimal buyurtma shartlari;
     * `create_incoming_order(customer_data, items, address, date)` — Muloqot davomida mijoz ma'lumotlarini yig'ib, CRM va ERP tizimida avtomatik buyurtma ochish;
     * `get_admin_daily_stats(admin_pin)` — Maxfiy PIN orqali faqat Bosh Admin uchun kunlik kassa, zaloglar fondi, sof foyda va kechikkan asboblar hisobotini generatsiya qilish.
   - **⚙️ Provayderlar va Sozlamalar:**
     * Google Gemini API (`gemini-1.5-flash`, `gemini-2.0-flash`);
     * OpenAI API (`gpt-4o-mini`, `gpt-4o`);
     * Ichki Aqlli Dvigatel (Offline Demo — API kalitsiz 100% to'liq funksional);
     * Xush kelibsiz xabari, System Prompt va Admin PIN kodi tahriri.
   - **💬 Jonli AI Chat Simulyatori:**
     * 👤 *Mijoz Ko'rinishi:* AI sotuvchi va maslahatchi sifatida xizmat ko'rsatadi;
     * 👑 *Admin Ko'rinishi:* AI biznes analitigi va shaxsiy hisobchi yordamchisiga aylanadi;
     * Bajarilgan funksiyalar (Function Calls) va qaytgan JSON ma'lumotlarining shaffof vizualizatsiyasi.
   - **🤖 Telegram Bot Webhook API:**
     * `POST /api/ai/chat` — HTTP orqali AI bilan muloqot;
     * `POST /api/ai/telegram-webhook` — Telegram bot orqali mijozlar va admin so'rovlarini qabul qilish.
10. **10-Bo'lim — To'liq va Mukammal Ko'p Tillilik (i18n: O'zbek va Rus tillari):**
   - **🌐 100% Sinxron Ikki Tilli Arxitektura:**
     * `locales/uz.json` — O'zbek tilidagi mukammal lug'at bazasi;
     * `locales/ru.json` — Rus tilidagi 1-ga-1 moslashgan lug'at bazasi;
     * `js/i18n.js` — Lokalizatsiya dvigateli, `t(key)` kalit funksiyasi va `localStorage`da tilni eslab qolish (`WMS_LANG`);
   - **🔄 Qulay Til Tanlash Tugmalari (Language Switcher):**
     * Boshqaruv paneli Header qismida 🇺🇿 UZ / 🇷🇺 RU;
     * Kirish / Login oynasida 🇺🇿 UZ / 🇷🇺 RU (tizimga kirmasdan oldin ham tilni tanlash imkoniyati);
   - **📋 To'liq Qamrov:**
     * Barcha navigatsiya modullari va ichki tablar;
     * O'lchov birliklari (dona/шт., soat/час, kun/дней, etaj/этаж, qop/мешок, reys/рейс, so'm/сум);
     * Holat va statuslar (Yangi/Новый, Faol Ijarada/В аренде, Kechikkan/Просрочено, Yakunlandi/Завершено, Omborda bo'sh/На складе, Remontda/В ремонте, Qarzdor/Должник, Qora ro'yxat/Черный список);
     * Barcha xabarnomalar, toastlar va modallar;
     * Mijoz elektron cheki (Web), Telegram/SMS xabarnomalari, 80mm termo chek va A4 Tilxat/Shartnoma avtomatik tanlangan tilda generatsiya qilinadi;
     * Ma'lumotlar bazasi adapteri (`name_uz`, `name_ru`) orqali asboblar va toifalar nomi tanlangan tilda ko'rsatiladi.

---

11. **WMS (Ombor Boshqaruv Tizimi) — Picking, Putaway va Topografik Polka Xaritasi:**
    - **📦 Buyurtma Rasmiylashtirilganda (Picking / Olib Chiqish):**
      * *Ekrandagi Ko'rsatma:* POS savatga va buyurtmaga asbob qo'shilganda har bir asbobning yonida uning aniq joylashuv manzili ko'zga yaqqol tashlanadigan qilib ko'rsatiladi: 👉 `[Sektor A | 2-Polka | 3-Yacheyka (Kod: A-02-03)]`;
      * *Sborshik Varag'i (Pick List A4):* Omborda uskunani tez yig'ish uchun polkalar ketma-ketligi bo'yicha (`A-01-01 -> A-02-03 -> B-01-01 ...`) saralangan, shtrix-kodli va checkboxli chop etish formati;
      * *Skaner Bilan Tasdiqlash:* Skladchi asbob shtrix-kodi yoki unikal seriyasini skaner qilganda buyurtmadagi asbob "Olib chiqildi va mijozga berildi" deb tasdiqlanadi (jonli progress bar bilan).
    - **📥 Asbob Qaytib Kelganda (Putaway / Qayta Joylashtirish):**
      * *Asl Joy Ko'rsatmasi:* Priyomka oynasida tizim uskunaning asl polkasini avtomatik ko'rsatadi: `"Asbobning asl joyi: [Sektor A | 2-Polka | 3-Yacheyka]"`;
      * *Joyni O'zgartirish (Re-location):* Agar o'sha polka to'lgan bo'lsa yoki boshqa sabab bilan skladchi uni boshqa bo'sh polkaga joylashtirib, yangi manzilni tanlay oladi;
      * *Skladchi Tasdig'i:* Skladchi asbobni polkaga joylashtirganini tasdiqlamaguncha, u tizimda `omborda_bosh` statusiga o'tmaydi (`tozalanmoqda/joylashtirish kutilmoqda` holatida qoladi) — boshqa mijozga adashib berib yuborilishining oldi olinadi.
    - **🗺️ Ombor Xaritasi va Bo'sh Polka Qidirish (Interactive WMS Layout):**
      * *Topografik Xarita:* Ombor sektorlari (A, B, C, D) bo'yicha stellajlar va yacheykalar vizual to'ri;
      * *Holat Ranglari:* 🟢 Bo'sh (0 ta), 🔵 Band (1-3 ta), 🔴 To'lgan (4/4 ta);
      * *Interaktiv Drawer:* Polka ustiga bosilganda ichidagi barcha asboblarni ko'rish, boshqa polkaga tezkor ko'chirish va polka uchun 1D shtrix-kod stikerini chop etish (Print).

12. **11-Bo'lim — Xizmatlar Uchun Parametrli Dinamik Narx Kalkulyatorlari (Gruzchik, Kran, Musor):**
    - **⚙️ Admin Sozlamalari — Tarif va Formulalar (Admin Pricing Rules):**
      * Faqat Bosh Admin o'zgartira oladi: Boshqaruv paneli -> Tashqi Hamkorlar -> `[⚙️ Tarif & Formulalar (Admin)]`;
      * *Gruzchik tariflari:* `bag_carry_price_per_floor` (1 qop 1 qavatga ko'tarish: masalan 3 000 so'm), `bag_carry_with_elevator` (lift bilan 1 qop: masalan 1 500 so'm), `hourly_worker_rate` (soatbay 1 kishi: masalan 50 000 so'm/soat, min 2 soat), `worker_count_rules` (<=500 kg: 1 kishi, 500kg-1.5t: 2 kishi, 1.5t-3t: 3 kishi, >3t: 4 kishi);
      * *Kran tariflari:* 16t (300 000 so'm/soat, min 2 soat), 25t (350 000 so'm/soat, min 3 soat), 50t (600 000 so'm/soat, min 4 soat), `outside_city_km_rate` (shahardan tashqari 1 km yo'l haqi: masalan 15 000 so'm/km);
      * *Chiqindi (Musor) tariflari:* Gazel (400 000 so'm), ZIL (800 000 so'm), KamAZ (1 500 000 so'm); Qopbay (12 000 so'm, minimal 20 qop); Ishchilar yuklash yordami (150 000 so'm / mashina, 3 000 so'm / qop), qavatdan tushirish (2 000 so'm/qop/qavat);
      * *Hamkor ulushi & Korxona marjasi:* Har bir xizmat uchun avtomatik marja taqsimoti (masalan: 75% hamkorga, 25% korxona brokerlik sof foydasi).
    - **🧮 Smart Kalkulyator Foydalanuvchi Interfeysi (POS & Dispecherlik):**
      * Buyurtma va Dispecherlik oynalarida Gruzchik, Kran yoki Musor tanlanishi bilan parametrli shakllar jonli chiqadi;
      * Foydalanuvchi parametrlarni (qoplar soni, og'irlik, qavat, lift bor/yo'q, mashina turi, soat, shahar tashqarisi masofasi) o'zgartirishi bilan real vaqtda:
        1. 👷 **Kerakli resurs:** Avtomatik hisoblangan ishchilar soni yoki mos texnika tavsiyasi;
        2. 💰 **Moliyaviy taqsimot:** Jami mijoz narxi, hamkor ulushi va korxona sof marjasi;
        3. ⚡ **Hisob-kitob formulasi:** Masalan: `20 qop x 4 etaj x 3 000 = 240 000 so'm`;
        4. 📲 **Hamkor uchun topshiriq matni:** `"Vazifa: 20 qop sement, 4-etaj, lift yo'q. 2 ta ishchi kerak."` shakllantiriladi.
    - **🔗 To'liq Zanjir Integratsiyasi (POS, Kvitansiya, Telegram & Dispecherlik):**
      * Hisoblangan parametrlar bitta tugma bilan POS savatiga va buyurtmaga birikadi;
      * Mijozning chekida (Mobil Veb-chek, Termoprinter cheki, Shartnoma & Tilxat) xizmatning to'liq formulasi va parametrlari aks etadi;
      * Dispecherlik doskasida har bir buyurtma yonida `[Topshiriq]` tugmasi orqali hamkorga Telegramda 1-bosishda topshiriq yuborish/nusxalash ta'minlangan.

13. **12-Bo'lim — Mobil Qulayliklar (Kamera bilan Skanerlash, PWA), Hamkorlar uchun Telegram Bot va Universal Search (Ctrl+K):**
    - **📷 Telefon Kamerasi orqali Shtrix-kod / QR Skanerlash (Barcode Scanner):**
      * Qimmatbaho lazer skaner apparatlarisiz — smartfon yoki noutbuk kamerasi orqali shtrix-kod va QR-kodlarni bir zumda skanerlash;
      * *Audio Bip:* Skaner muvaffaqiyatli o'qiganda Web Audio API orqali POS kassa ovozli signali (Bip) yangraydi va telefon tebranadi (vibrate);
      * *Kontekstual harakat:*
        - POS buyurtma oynasida: asbobni topib avtomatik savatga biriktiradi;
        - Priyomka oynasida: qaytib kelgan uskunani checklistdan avtomatik tekshirib belgilaydi;
        - Universal rejimda: asbobning polkadagi joylashuvi, ijarada yoki bo'shligi va narxini ko'rsatadi;
      * Lazer nuri animatsiyasi, fonar/torch tugmasi va qo'lda kiritish varianti.
    - **📱 PWA (Progressive Web App — Telefonga O'rnatish):**
      * `manifest.json` va `sw.js` (Service Worker) to'liq sozlangan;
      * Smartfonda ochilganda Headerda yoki bannerda `[📱 O'rnatish]` taklifi chiqadi;
      * Telefonning bosh ekraniga mustaqil mobil ilova belgisi (ikonka) bilan o'rnatiladi, brauzer qatori ko'rinmaydi va to'liq ekranli mobil ilova kabi ishlaydi;
      * Offline kesh strategiyasi orqali internet uzilganda ham tizim qobig'i ochiladi.
    - **🤖 Hamkorlar uchun Interaktiv Telegram Bot (Dispecherlik Avtomatkasi):**
      * Operator buyurtmani uzatganda hamkorning Telegramiga chiroyli interaktiv xabarnoma boradi:
        `🔔 YANGI BUYURTMA! (#SRV-2026-0045) | Xizmat: Avtokran 25t | Manzil: Chilonzor | To'lov: 350 000 so'm | Topshiriq: ...`
      * *Interaktiv tugmalar:*
        - `[✅ Qabul qilaman]`: Admin panelda zakaz bir zumda `Bajarilmoqda` holatiga o'tadi va operatorga bildirishnoma chiqadi;
        - `[❌ Bandman / Rad etish]`: Zakaz qayta `yangi` holatiga qaytadi va boshqa ijrochiga yo'naltiriladi;
        - `[📍 Xaritada ko'rish]`: To'g'ridan-to'g'ri Google Maps orqali obyekt lokatsiyasini ochadi;
        - `[🏁 Ish yakunlandi]`: Zakaz `bajarildi` deb yopiladi va hamkor balansiga uning haqi yoziladi;
      * *Telegram Bot Simulyatori:* Admin panelda haydovchi/kranistning telefon ekranidagi bot muloqotini jonli ko'rish va tugmalarni bosib sinash imkoniyati (`modal-partner-telegram-bot`).
    - **🔍 Tezkor Universal Qidiruv (Universal Search — Ctrl+K):**
      * Tizimning istalgan joyida `Ctrl+K` yoki tepada qidiruv tugmasi bosilganda ochiladi;
      * Real vaqtda parallel qidiradi:
        - 👤 *Mijozlar:* Ismi, telefoni, kompaniyasi, balansi va VIP/Qarzdor holati (bosilganda CRM 360° profili ochiladi);
        - 🔧 *Asboblar & Donalar:* Modeli, seriya raqami (`SN: ...`), shtrix-kodi, joylashgan polkasi va holati;
        - 📦 *Buyurtmalar:* `#ORD-...` yoki `#SRV-...` raqamlari bo'yicha (bosilganda to'liq elektron chek va shartnoma ochiladi);
      * Klaviatura bilan boshqaruv (`Up`, `Down`, `Enter`, `ESC`).

---

## 4. Ishga tushirish:
* Windowsda `dasturni-ochish.bat` fayliga 2 marta bosing;
* Yoki Node.js orqali: `node server.js` buyrug'i orqali `http://localhost:3000` ga kiring.
