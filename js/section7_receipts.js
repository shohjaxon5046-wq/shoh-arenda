// =========================================================================
// SECTION 7: MIJOZLARGA ELEKTRON CHEK, TELEGRAM/SMS VA SHARTNOMA GENERATORI
// =========================================================================

let activeReceiptOrderId = null;
let activeReceiptSubtab = 'rtab-web'; // 'rtab-web', 'rtab-telegram', 'rtab-thermal', 'rtab-contract'

function openOrderReceiptModal(orderId, defaultSubtab = 'rtab-web') {
    const order = (DB.orders || []).find(o => o.id === orderId);
    if (!order) return;

    activeReceiptOrderId = order.id;

    const numEl = document.getElementById('modal-receipt-order-num');
    if (numEl) numEl.innerText = order.order_number;

    // Render all 4 formats for this order
    renderWebReceipt(order);
    renderTelegramMessages(order);
    renderThermal80mmReceipt(order);
    renderContractA4(order);

    switchReceiptSubtab(defaultSubtab);
    openModal('modal-order-receipt');
    lucide.createIcons();
}

function switchReceiptSubtab(tabId) {
    activeReceiptSubtab = tabId;
    const tabs = ['rtab-web', 'rtab-telegram', 'rtab-thermal', 'rtab-contract'];
    
    tabs.forEach(t => {
        const el = document.getElementById(t);
        const btn = document.getElementById(`rtab-btn-${t.replace('rtab-', '')}`);
        if (t === tabId) {
            if (el) el.classList.remove('hidden');
            if (btn) {
                btn.className = "receipt-tab-btn py-3 px-4 text-xs font-bold text-blue-400 border-b-2 border-blue-500 flex items-center gap-2 transition whitespace-nowrap";
            }
        } else {
            if (el) el.classList.add('hidden');
            if (btn) {
                btn.className = "receipt-tab-btn py-3 px-4 text-xs font-semibold text-slate-400 border-b-2 border-transparent hover:text-white flex items-center gap-2 transition whitespace-nowrap";
            }
        }
    });

    lucide.createIcons();
}

function switchReceiptTab(tabId) {
    switchReceiptSubtab(tabId);
}

// -------------------------------------------------------------------------
// 1. ELEKTRON CHEK (MOBIL & VEB KO'RINISH)
// -------------------------------------------------------------------------
function renderWebReceipt(order) {
    const customer = (DB.customers || []).find(c => c.id === order.customer_id);
    const tools = (DB.order_tool_items || []).filter(t => t.order_id === order.id);
    const services = (DB.order_service_items || []).filter(s => s.order_id === order.id);

    const onlineUrl = `https://arenda.uz/receipt/${order.uuid || order.order_number}`;
    const container = document.getElementById('web-receipt-card-container');
    if (!container) return;

    const isClosed = order.status === 'yakunlandi';
    const dayLabel = typeof t === 'function' ? t('unit.day', 'kun') : 'kun';
    const currLabel = typeof t === 'function' ? t('unit.currency', "so'm") : "so'm";

    container.innerHTML = `
        <div class="max-w-md mx-auto rounded-3xl border border-slate-700 bg-slate-950 p-6 shadow-2xl text-slate-200 space-y-5">
            <!-- Brand & Order Header -->
            <div class="flex items-start justify-between border-b border-slate-800 pb-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                        <i data-lucide="layers" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="text-sm font-extrabold text-white tracking-wide">WMS ARENDA</h3>
                        <p class="text-[10px] text-slate-400">${typeof t === 'function' ? t('contract.subtitle') : 'Ijara & Professional Xizmatlar'}</p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="font-mono font-bold text-xs text-white">#${order.order_number}</span>
                    <p class="text-[10px] text-slate-400 mt-0.5">${order.created_at || order.start_date || ''}</p>
                </div>
            </div>

            <!-- Customer & Status Badge -->
            <div class="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                    <p class="text-[10px] text-slate-400 uppercase font-semibold">${typeof t === 'function' ? t('receipt.customer') : 'Mijoz'}:</p>
                    <p class="font-bold text-white text-xs">${customer ? customer.full_name : (typeof t === 'function' ? t('receipt.customer') : 'Mijoz')}</p>
                    <p class="font-mono text-[11px] text-blue-400">${customer ? customer.phone_primary : ''}</p>
                </div>
                <div class="text-right">
                    ${isClosed ? `
                        <span class="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                            <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> ${typeof t === 'function' ? t('status.completed') : 'Yopildi'}
                        </span>
                    ` : `
                        <span class="px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 font-bold text-[11px] flex items-center gap-1 animate-pulse">
                            <span class="w-2 h-2 rounded-full bg-blue-400"></span> ${typeof t === 'function' ? t('status.in_rent') : 'Ijarada (Faol)'}
                        </span>
                    `}
                </div>
            </div>

            <!-- Items & Services List -->
            <div>
                <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">📦 ${typeof t === 'function' ? t('receipt.services_tools') : 'Xizmatlar va Asboblar'}:</p>
                <div class="space-y-2">
                    ${tools.map((item, idx) => {
                        const m = (DB.product_models || []).find(pm => pm.id === item.product_model_id);
                        const displayName = (typeof getLocalizedName === 'function' && m) ? getLocalizedName(m) : item.model_name;
                        return `
                        <div class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex justify-between items-start text-xs">
                            <div>
                                <div class="font-bold text-white">${idx + 1}. ${displayName}</div>
                                <div class="text-[10px] text-blue-400 font-mono">SN: ${item.serial_number}</div>
                                <div class="text-[10px] text-slate-400">${item.rent_days} ${dayLabel} x ${item.daily_price.toLocaleString()} ${currLabel}</div>
                            </div>
                            <div class="text-right">
                                <span class="font-mono font-bold text-white">${item.total_tool_rent.toLocaleString()} ${currLabel}</span>
                                <div class="text-[10px] text-amber-400 font-mono">${typeof t === 'function' ? t('receipt.deposit_collected') : 'Zalog'}: ${item.deposit_price.toLocaleString()}</div>
                            </div>
                        </div>
                        `;
                    }).join('')}

                    ${services.map((s, idx) => `
                        <div class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex justify-between items-start text-xs">
                            <div>
                                <div class="font-bold text-amber-300">${tools.length + idx + 1}. ${s.service_category.toUpperCase()}</div>
                                <div class="text-[10px] text-slate-400 max-w-[200px] truncate">${s.service_details}</div>
                                ${s.task_instruction ? `<div class="text-[9px] text-amber-300/80 font-mono mt-0.5 leading-tight">📋 ${s.task_instruction}</div>` : ''}
                            </div>
                            <div class="text-right">
                                <span class="font-mono font-bold text-white">${s.customer_price.toLocaleString()} ${currLabel}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Financial Calculation Box -->
            <div class="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">💰 ${typeof t === 'function' ? t('receipt.financial_calc') : 'Moliyaviy Hisob-kitob'}:</p>
                <div class="flex justify-between text-slate-300">
                    <span>${typeof t === 'function' ? t('receipt.total_fee') : 'Jami Xizmat Haqi'}:</span>
                    <b class="text-emerald-400 font-mono">${(order.total_rent_amount || 0).toLocaleString()} ${currLabel} (${typeof t === 'function' ? t('receipt.paid') : "To'landi"} ✅)</b>
                </div>
                <div class="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                    <span>${typeof t === 'function' ? t('receipt.deposit_collected') : 'Olingan Zalog (Depozit)'}:</span>
                    <b class="text-amber-400 font-mono">${(order.total_deposit_amount || 0).toLocaleString()} ${currLabel} (${typeof t === 'function' ? t('receipt.holding') : 'Saqlanmoqda'} 🔒)</b>
                </div>
            </div>

            <!-- Return Deadline & Contact -->
            <div class="space-y-1 text-xs text-slate-400 p-3 rounded-2xl bg-slate-900/50 border border-slate-800/60">
                <div class="flex items-center gap-2">
                    <i data-lucide="calendar" class="w-3.5 h-3.5 text-blue-400"></i>
                    <span>${typeof t === 'function' ? t('receipt.return_deadline') : 'Qaytarish vaqti'}: <b class="text-white font-mono">${order.expected_return_date || '-'}</b></span>
                </div>
                <div class="flex items-center gap-2">
                    <i data-lucide="map-pin" class="w-3.5 h-3.5 text-red-400"></i>
                    <span>${typeof t === 'function' ? t('receipt.return_address') : 'Qaytarish manzili'}: Toshkent sh., Chilonzor sanoat zonasi, 4</span>
                </div>
                <div class="flex items-center gap-2">
                    <i data-lucide="phone" class="w-3.5 h-3.5 text-emerald-400"></i>
                    <span>${typeof t === 'function' ? t('receipt.contact') : 'Aloqa'}: <a href="tel:+998712000000" class="text-emerald-400 font-mono">+998 71 200-00-00</a></span>
                </div>
            </div>

            <!-- QR Code Verification -->
            <div class="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div>
                    <p class="text-[10px] text-slate-400 uppercase font-semibold">${typeof t === 'function' ? t('receipt.online_link') : 'Onlayn Tekshiruv'}:</p>
                    <a href="${onlineUrl}" target="_blank" class="text-[11px] text-blue-400 hover:underline break-all font-mono">
                        ${onlineUrl}
                    </a>
                </div>
                <div id="web-receipt-qr-box" class="p-1.5 rounded-xl bg-white shrink-0"></div>
            </div>

            <!-- Quick Action Buttons -->
            <div class="pt-2 flex gap-2">
                <button type="button" onclick="copyOnlineReceiptLink('${onlineUrl}')" class="flex-1 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition">
                    <i data-lucide="copy" class="w-3.5 h-3.5"></i> ${typeof t === 'function' ? t('action.copy') : 'Havolani Nusxalash'}
                </button>
                <button type="button" onclick="switchReceiptSubtab('rtab-telegram')" class="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition shadow-lg shadow-blue-500/20">
                    <i data-lucide="send" class="w-3.5 h-3.5"></i> ${typeof t === 'function' ? t('action.send') : 'Telegramda Yuborish'}
                </button>
            </div>
        </div>
    `;

    // Render QR Code using QRCode.js
    setTimeout(() => {
        const qrContainer = document.getElementById('web-receipt-qr-box');
        if (qrContainer) {
            qrContainer.innerHTML = '';
            new QRCode(qrContainer, {
                text: onlineUrl,
                width: 64,
                height: 64,
                colorDark : "#0f172a",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.M
            });
        }
    }, 50);
}

function copyOnlineReceiptLink(url) {
    navigator.clipboard.writeText(url).then(() => {
        showNotification("Onlayn chek havolasi nusxalandi!", "success");
    }).catch(() => {
        prompt("Chek havolasi:", url);
    });
}

// -------------------------------------------------------------------------
// 2. TELEGRAM VA SMS BILDIRISHNOMALARI (3 TA SHABLON)
// -------------------------------------------------------------------------
function renderTelegramMessages(order) {
    const customer = (DB.customers || []).find(c => c.id === order.customer_id);
    const tools = (DB.order_tool_items || []).filter(t => t.order_id === order.id);
    const services = (DB.order_service_items || []).filter(s => s.order_id === order.id);
    const onlineUrl = `https://arenda.uz/receipt/${order.uuid || order.order_number}`;

    const isRu = (typeof currentLang !== 'undefined' && currentLang === 'ru');
    const dayLabel = isRu ? "дней" : "kun";
    const currLabel = isRu ? "сум" : "so'm";

    const toolsLines = tools.map((t, i) => {
        const m = (DB.product_models || []).find(pm => pm.id === t.product_model_id);
        const displayName = (typeof getLocalizedName === 'function' && m) ? getLocalizedName(m) : t.model_name;
        return `${i + 1}. ${displayName} (SN: ${t.serial_number})\n   • ${t.rent_days} ${dayLabel} x ${t.daily_price.toLocaleString()} = ${t.total_tool_rent.toLocaleString()} ${currLabel}`;
    }).join('\n');

    const servicesLines = services.map((s, i) => {
        let line = `${tools.length + i + 1}. ${s.service_category.toUpperCase()} (${s.service_details})\n   • ${s.customer_price.toLocaleString()} ${currLabel}`;
        if (s.task_instruction) {
            line += `\n   • 📋 ${s.task_instruction}`;
        }
        return line;
    }).join('\n');

    // Template 1: Order Created Receipt
    const textOrderCreated = isRu ? 
`🧾 ЧЕК ЗАКАЗА: #${order.order_number}
🏢 Компания: "WMS ARENDA — Аренда и услуги"
👤 Клиент: ${customer ? customer.full_name : 'Клиент'} (${customer ? customer.phone_primary : ''})

📦 Услуги / Инструменты:
${toolsLines}
${servicesLines}

💰 Финансовый расчет:
• Итого за услуги: ${(order.total_rent_amount || 0).toLocaleString()} сум (Оплачено ✅)
• Принятый залог (депозит): ${(order.total_deposit_amount || 0).toLocaleString()} сум (Удерживается 🔒)

📅 Срок возврата: до ${order.expected_return_date || '-'}
📍 Адрес возврата: г. Ташкент, Чиланзарская промзона, 4
📞 Контакты: +998 71 200-00-00

🔗 Посмотреть чек онлайн: ${onlineUrl}`
:
`🧾 BUYURTMA CHEKI: #${order.order_number}
🏢 Kompaniya: "WMS ARENDA — Ijara & Xizmatlar"
👤 Mijoz: ${customer ? customer.full_name : 'Mijoz'} (${customer ? customer.phone_primary : ''})

📦 Xizmatlar / Asboblar:
${toolsLines}
${servicesLines}

💰 Moliyaviy hisob-kitob:
• Jami xizmat haqi: ${(order.total_rent_amount || 0).toLocaleString()} so'm (To'landi ✅)
• Olingan Zalog (Depozit): ${(order.total_deposit_amount || 0).toLocaleString()} so'm (Saqlanmoqda 🔒)

📅 Qaytarish vaqti: ${order.expected_return_date || '-'} gacha
📍 Qaytarish manzili: Toshkent sh., Chilonzor sanoat zonasi, 4
📞 Aloqa: +998 71 200-00-00

🔗 Onlayn chekni ko'rish: ${onlineUrl}`;

    // Template 2: 3-hour Reminder
    const textReminder = isRu ?
`⏰ УВАЖАЕМЫЙ(АЯ) ${customer ? customer.full_name.toUpperCase() : 'КЛИЕНТ'}!

Арендованное вами оборудование:
${tools.map(t => {
    const m = (DB.product_models || []).find(pm => pm.id === t.product_model_id);
    const displayName = (typeof getLocalizedName === 'function' && m) ? getLocalizedName(m) : t.model_name;
    return `• ${displayName} (SN: ${t.serial_number})`;
}).join('\n')}

Срок вашей аренды истекает сегодня в ${order.expected_return_date ? order.expected_return_date.substring(11, 16) : '18:00'}. Просим вернуть оборудование вовремя, в исправном и очищенном виде.

📍 Адрес: г. Ташкент, Чиланзарская промзона, 4
📞 Контакты: +998 71 200-00-00
🏢 WMS ARENDA`
:
`⏰ HURMATLI ${customer ? customer.full_name.toUpperCase() : 'MIJOZ'}!

Siz ijaraga olgan quyidagi uskuna(lar):
${tools.map(t => `• ${t.model_name} (SN: ${t.serial_number})`).join('\n')}

Ijarangiz muddati bugun ${order.expected_return_date ? order.expected_return_date.substring(11, 16) : '18:00'} da tugaydi. Uskunani o'z vaqtida, soz va tozalangan holda topshirishingizni so'raymiz.

📍 Manzil: Toshkent sh., Chilonzor sanoat zonasi, 4
📞 Aloqa: +998 71 200-00-00
🏢 WMS ARENDA`;

    // Template 3: Return Closing Confirmation
    const textClosing = isRu ?
`✅ УВАЖАЕМЫЙ(АЯ) ${customer ? customer.full_name.toUpperCase() : 'КЛИЕНТ'}!

Оборудование по вашему заказу (#${order.order_number}) успешно принято на склад.
🔒 Принятый залог: ${(order.total_deposit_amount || 0).toLocaleString()} сум полностью возвращен.

Благодарим за сотрудничество!
🏢 WMS ARENDA — Аренда строительного оборудования
📞 +998 71 200-00-00`
:
`✅ HURMATLI ${customer ? customer.full_name.toUpperCase() : 'MIJOZ'}!

Buyurtmangiz (#${order.order_number}) bo'yicha uskunalar muvaffaqiyatli qabul qilindi.
🔒 Olingan zalog: ${(order.total_deposit_amount || 0).toLocaleString()} so'm to'liq qaytarildi.

Xizmatimizdan foydalanganingiz uchun tashakkur, sizni yana kutib qolamiz!
🏢 WMS ARENDA — Qurilish uskunalari ijarasi
📞 +998 71 200-00-00`;

    const container = document.getElementById('telegram-messages-container');
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-6 max-w-2xl mx-auto">
            <!-- Template 1: Order Created -->
            <div class="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <div class="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span class="text-xs font-bold text-white flex items-center gap-2">
                        <i data-lucide="receipt" class="w-4 h-4 text-emerald-400"></i>
                        <span>1. Yangi Buyurtma Cheki (Rasmiylashtirilganda)</span>
                    </span>
                    <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">Asosiy Chek</span>
                </div>
                <pre class="p-3 rounded-xl bg-slate-900 border border-slate-800/80 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">${textOrderCreated}</pre>
                <div class="flex justify-end gap-2 pt-1">
                    <button type="button" onclick="copyTextToClipboard(\`${escapeForTemplate(textOrderCreated)}\`)" class="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i> Nusxalash
                    </button>
                    <button type="button" onclick="shareToTelegram(\`${escapeForTemplate(textOrderCreated)}\`)" class="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-1.5 transition shadow-md shadow-blue-500/20">
                        <i data-lucide="send" class="w-3.5 h-3.5"></i> Telegramda Yuborish
                    </button>
                </div>
            </div>

            <!-- Template 2: 3-hour Reminder -->
            <div class="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <div class="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span class="text-xs font-bold text-white flex items-center gap-2">
                        <i data-lucide="clock" class="w-4 h-4 text-amber-400"></i>
                        <span>2. Muddat Tugashi Eslatmasi (3 soat oldin)</span>
                    </span>
                    <span class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-semibold">Eslatma</span>
                </div>
                <pre class="p-3 rounded-xl bg-slate-900 border border-slate-800/80 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">${textReminder}</pre>
                <div class="flex justify-end gap-2 pt-1">
                    <button type="button" onclick="copyTextToClipboard(\`${escapeForTemplate(textReminder)}\`)" class="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i> Nusxalash
                    </button>
                    <button type="button" onclick="shareToTelegram(\`${escapeForTemplate(textReminder)}\`)" class="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-slate-950 flex items-center gap-1.5 transition shadow-md shadow-amber-500/20">
                        <i data-lucide="send" class="w-3.5 h-3.5"></i> Telegramda Yuborish
                    </button>
                </div>
            </div>

            <!-- Template 3: Return Closing Confirmation -->
            <div class="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <div class="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span class="text-xs font-bold text-white flex items-center gap-2">
                        <i data-lucide="check-circle" class="w-4 h-4 text-purple-400"></i>
                        <span>3. Priyomka va Zalog Qaytarish Tasdig'i (Yopilganda)</span>
                    </span>
                    <span class="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-semibold">Yakuniy Kvitansiya</span>
                </div>
                <pre class="p-3 rounded-xl bg-slate-900 border border-slate-800/80 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">${textClosing}</pre>
                <div class="flex justify-end gap-2 pt-1">
                    <button type="button" onclick="copyTextToClipboard(\`${escapeForTemplate(textClosing)}\`)" class="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i> Nusxalash
                    </button>
                    <button type="button" onclick="shareToTelegram(\`${escapeForTemplate(textClosing)}\`)" class="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white flex items-center gap-1.5 transition shadow-md shadow-purple-500/20">
                        <i data-lucide="send" class="w-3.5 h-3.5"></i> Telegramda Yuborish
                    </button>
                </div>
            </div>
        </div>
    `;
}

function escapeForTemplate(str) {
    return (str || '').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

function copyTextToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification("Xabar matni nusxalandi!", "success");
    }).catch(() => {
        prompt("Xabar matni:", text);
    });
}

function shareToTelegram(text) {
    const url = `https://t.me/share/url?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

// -------------------------------------------------------------------------
// 3. 80MM KASSA CHEKI (TERMOPRINTER UCHUN IXCHAM FORMAT)
// -------------------------------------------------------------------------
function renderThermal80mmReceipt(order) {
    const customer = (DB.customers || []).find(c => c.id === order.customer_id);
    const tools = (DB.order_tool_items || []).filter(t => t.order_id === order.id);
    const services = (DB.order_service_items || []).filter(s => s.order_id === order.id);
    const onlineUrl = `https://arenda.uz/receipt/${order.uuid || order.order_number}`;

    const container = document.getElementById('thermal-receipt-preview-container');
    if (!container) return;

    const isRu = (typeof currentLang !== 'undefined' && currentLang === 'ru');
    const dayLabel = isRu ? "дней" : "kun";

    container.innerHTML = `
        <div id="thermal-printable-receipt" class="w-[300px] mx-auto p-4 bg-white text-slate-900 font-mono text-[11px] leading-tight space-y-2.5 border border-slate-300 shadow-md">
            <!-- Header -->
            <div class="text-center pb-2 border-b-2 border-dashed border-slate-400">
                <h2 class="text-sm font-black tracking-wider">WMS ARENDA TOOLS</h2>
                <p class="text-[9px] text-slate-600 mt-0.5">${typeof t === 'function' ? t('contract.subtitle') : 'Qurilish Asboblari Ijarasi'}</p>
                <p class="text-[9px] text-slate-500">Toshkent sh., Chilonzor sanoat zonasi</p>
                <p class="text-[9px] text-slate-500 font-bold">Tel: +998 71 200-00-00</p>
                <p class="text-[11px] font-bold mt-1.5">${typeof t === 'function' ? t('receipt.order_receipt') : 'BUYURTMA CHEKI'}: #${order.order_number}</p>
            </div>

            <!-- Metadata -->
            <div class="text-[10px] space-y-0.5 pb-1 border-b border-dashed border-slate-300">
                <div>${typeof t === 'function' ? t('receipt.date') : 'Sana'}: <b>${order.created_at || order.start_date || ''}</b></div>
                <div>${typeof t === 'function' ? t('receipt.customer') : 'Mijoz'}: <b>${customer ? customer.full_name : (typeof t === 'function' ? t('receipt.customer') : 'Mijoz')}</b></div>
                <div>Tel: <b>${customer ? customer.phone_primary : ''}</b></div>
                <div>${typeof t === 'function' ? t('receipt.operator') : 'Operator'}: <b>${currentUser ? currentUser.full_name : 'Kassir'}</b></div>
            </div>

            <!-- Items -->
            <div class="space-y-1.5 py-1 border-b-2 border-dashed border-slate-400">
                <div class="flex justify-between font-bold text-[10px] pb-1 border-b border-slate-200">
                    <span>${typeof t === 'function' ? t('receipt.services_tools') : 'Xizmat / Uskuna'}</span>
                    <span>Summa</span>
                </div>
                ${tools.map((tItem, idx) => {
                    const m = (DB.product_models || []).find(pm => pm.id === tItem.product_model_id);
                    const displayName = (typeof getLocalizedName === 'function' && m) ? getLocalizedName(m) : tItem.model_name;
                    return `
                    <div>
                        <div class="font-bold">${idx + 1}. ${displayName}</div>
                        <div class="text-[9px] text-slate-600">SN: ${tItem.serial_number}</div>
                        <div class="flex justify-between text-[10px]">
                            <span>${tItem.rent_days} ${dayLabel} x ${tItem.daily_price.toLocaleString()}</span>
                            <b>${tItem.total_tool_rent.toLocaleString()}</b>
                        </div>
                    </div>
                    `;
                }).join('')}

                ${services.map((s, idx) => `
                    <div>
                        <div class="font-bold">${tools.length + idx + 1}. ${s.service_category.toUpperCase()}</div>
                        <div class="flex justify-between text-[10px]">
                            <span class="truncate max-w-[170px]">${s.service_details}</span>
                            <b>${s.customer_price.toLocaleString()}</b>
                        </div>
                        ${s.task_instruction ? `<div class="text-[8px] text-slate-600 italic leading-tight">${s.task_instruction}</div>` : ''}
                    </div>
                `).join('')}
            </div>

            <!-- Totals -->
            <div class="space-y-1 text-[11px] pt-1 pb-1 border-b-2 border-dashed border-slate-400">
                <div class="flex justify-between font-bold text-xs">
                    <span>${typeof t === 'function' ? t('receipt.total_fee').toUpperCase() : 'JAMI IJARA HAQI'}:</span>
                    <span>${(order.total_rent_amount || 0).toLocaleString()} UZS</span>
                </div>
                <div class="flex justify-between font-bold text-slate-800">
                    <span>${typeof t === 'function' ? t('receipt.deposit_collected').toUpperCase() : 'OLINGAN ZALOG'}:</span>
                    <span>${(order.total_deposit_amount || 0).toLocaleString()} UZS</span>
                </div>
                <div class="flex justify-between text-[10px] text-slate-600">
                    <span>${typeof t === 'function' ? t('receipt.payment_method') : "To'lov usuli"}:</span>
                    <span class="uppercase font-bold">${order.payments?.[0]?.payment_method || 'Naqd'}</span>
                </div>
            </div>

            <!-- Deadline & Rule -->
            <div class="text-[9px] text-slate-700 space-y-0.5 pt-0.5">
                <div>${typeof t === 'function' ? t('receipt.return_deadline') : 'Qaytarish vaqti'}: <b>${order.expected_return_date || '-'}</b></div>
                <p class="leading-tight text-slate-500 mt-1">${isRu ? 'Примечание: При возврате оборудования в чистом и исправном состоянии залог возвращается полностью.' : 'Eslatma: Asbob toza va soz holatda topshirilganda zalog to\'liq qaytariladi.'}</p>
            </div>

            <!-- QR Code -->
            <div class="pt-2 text-center flex flex-col items-center justify-center">
                <div id="thermal-receipt-qr-box" class="p-1 border border-slate-300"></div>
                <span class="text-[8px] text-slate-500 mt-1 font-mono">${onlineUrl}</span>
                <p class="text-[10px] font-bold mt-2">${typeof t === 'function' ? t('receipt.thank_you') : 'XARIDINGIZ UCHUN TASHAKKUR!'}</p>
            </div>
        </div>
    `;

    // Render Thermal QR code
    setTimeout(() => {
        const qrContainer = document.getElementById('thermal-receipt-qr-box');
        if (qrContainer) {
            qrContainer.innerHTML = '';
            new QRCode(qrContainer, {
                text: onlineUrl,
                width: 70,
                height: 70,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.M
            });
        }
    }, 50);
}

function printThermalReceipt() {
    const el = document.getElementById('thermal-printable-receipt');
    if (!el) return;

    // Temporarily apply active print class
    el.classList.add('printable-active');
    window.print();
    setTimeout(() => el.classList.remove('printable-active'), 1000);
}

// -------------------------------------------------------------------------
// 4. A4 / A5 QISQA IJARA SHARTNOMASI VA TILXAT
// -------------------------------------------------------------------------
function renderContractA4(order) {
    const customer = (DB.customers || []).find(c => c.id === order.customer_id);
    const tools = (DB.order_tool_items || []).filter(t => t.order_id === order.id);
    const services = (DB.order_service_items || []).filter(s => s.order_id === order.id);

    const container = document.getElementById('contract-a4-preview-container');
    if (!container) return;

    const isRu = (typeof currentLang !== 'undefined' && currentLang === 'ru');
    const dayLabel = isRu ? "дней" : "kun";
    const currLabel = isRu ? "сум" : "so'm";

    container.innerHTML = `
        <div id="contract-printable-doc" class="max-w-3xl mx-auto p-8 bg-white text-slate-900 font-sans text-xs space-y-4 border border-slate-300 rounded shadow-md" style="font-family: Arial, sans-serif;">
            <!-- Header -->
            <div class="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                <div>
                    <h1 class="text-lg font-extrabold tracking-tight">"WMS ARENDA TOOLS" MChJ</h1>
                    <p class="text-[11px] text-slate-600">${typeof t === 'function' ? t('contract.subtitle') : 'Qurilish asboblari va uskunalari ijarasi markazi'}</p>
                    <p class="text-[10px] text-slate-500">Toshkent sh., Chilonzor sanoat zonasi, 4-bino | Tel: +998 71 200-00-00</p>
                </div>
                <div class="text-right">
                    <span class="px-2.5 py-1 bg-slate-900 text-white font-mono text-xs font-bold rounded">№ ${order.order_number}</span>
                    <p class="text-[10px] text-slate-600 mt-1">${typeof t === 'function' ? t('receipt.date') : 'Sana'}: ${order.created_at || order.start_date || ''}</p>
                </div>
            </div>

            <!-- Title -->
            <div class="text-center my-1">
                <h2 class="text-sm font-extrabold uppercase tracking-wider">${typeof t === 'function' ? t('contract.title') : 'USKUNALARNI IJARAGA BERISH SHARTNOMASI VA TILXAT'}</h2>
                <p class="text-[10px] text-slate-500">${typeof t === 'function' ? t('contract.subtitle') : 'Uskunalarni vaqtincha foydalanishga qabul qilish va garov (zalog) dalolatnomasi'}</p>
            </div>

            <!-- Parties -->
            <div class="grid grid-cols-2 gap-4 p-3 bg-slate-100 rounded border border-slate-200 text-xs">
                <div>
                    <p class="font-bold text-slate-800 text-[10px] uppercase">${typeof t === 'function' ? t('contract.party_company') : 'Ijaraga Beruvchi (Kompaniya):'}</p>
                    <p class="font-bold text-slate-900">"WMS ARENDA TOOLS" MChJ</p>
                    <p class="text-slate-600 text-[11px]">${typeof t === 'function' ? t('receipt.operator') : "Mas'ul operator"}: ${currentUser ? currentUser.full_name : 'Admin'}</p>
                </div>
                <div>
                    <p class="font-bold text-slate-800 text-[10px] uppercase">${typeof t === 'function' ? t('contract.party_customer') : 'Ijaraga Oluvchi (Mijoz):'}</p>
                    <p class="font-bold text-slate-900">${customer ? customer.full_name : (typeof t === 'function' ? t('receipt.customer') : 'Mijoz')} ${customer?.company_name ? `(${customer.company_name})` : ''}</p>
                    <p class="text-slate-700 text-[11px]">Tel: <b>${customer?.phone_primary || ''}</b> | Pasport / STIR: <b>${customer?.passport_series_number || ''}</b></p>
                </div>
            </div>

            <!-- Table -->
            <div>
                <table class="w-full text-left border border-slate-300 text-xs">
                    <thead class="bg-slate-200 font-bold text-slate-800">
                        <tr>
                            <th class="p-2 border border-slate-300">${typeof t === 'function' ? t('contract.table_no') : '№'}</th>
                            <th class="p-2 border border-slate-300">${typeof t === 'function' ? t('contract.table_item') : 'Uskuna / Xizmat Turi'}</th>
                            <th class="p-2 border border-slate-300">${typeof t === 'function' ? t('contract.table_serial') : 'Zavod Seriya Raqami'}</th>
                            <th class="p-2 border border-slate-300 text-center">${typeof t === 'function' ? t('contract.table_period') : 'Muddat'}</th>
                            <th class="p-2 border border-slate-300 text-right">${typeof t === 'function' ? t('contract.table_rent') : 'Ijara Summasi'}</th>
                            <th class="p-2 border border-slate-300 text-right">${typeof t === 'function' ? t('contract.table_deposit') : 'Depozit (Zalog)'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tools.map((tItem, idx) => {
                            const m = (DB.product_models || []).find(pm => pm.id === tItem.product_model_id);
                            const displayName = (typeof getLocalizedName === 'function' && m) ? getLocalizedName(m) : tItem.model_name;
                            return `
                            <tr>
                                <td class="p-2 border border-slate-300">${idx + 1}</td>
                                <td class="p-2 border border-slate-300 font-semibold">${displayName}</td>
                                <td class="p-2 border border-slate-300 font-mono font-bold">${tItem.serial_number}</td>
                                <td class="p-2 border border-slate-300 text-center">${tItem.rent_days} ${dayLabel}</td>
                                <td class="p-2 border border-slate-300 text-right font-mono font-bold">${tItem.total_tool_rent.toLocaleString()}</td>
                                <td class="p-2 border border-slate-300 text-right font-mono text-slate-700">${tItem.deposit_price.toLocaleString()}</td>
                            </tr>
                            `;
                        }).join('')}

                        ${services.map((s, idx) => `
                            <tr>
                                <td class="p-2 border border-slate-300">${tools.length + idx + 1}</td>
                                <td class="p-2 border border-slate-300 font-semibold" colspan="2">
                                    ${s.service_category.toUpperCase()} (${s.service_details})
                                    ${s.task_instruction ? `<div class="text-[9px] text-slate-600 font-normal italic mt-0.5">Topshiriq: ${s.task_instruction}</div>` : ''}
                                </td>
                                <td class="p-2 border border-slate-300 text-center">1 ${isRu ? 'услуга' : 'xizmat'}</td>
                                <td class="p-2 border border-slate-300 text-right font-mono font-bold">${s.customer_price.toLocaleString()}</td>
                                <td class="p-2 border border-slate-300 text-right font-mono text-slate-700">-</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot class="bg-slate-100 font-bold">
                        <tr>
                            <td colspan="4" class="p-2 border border-slate-300 text-right">${typeof t === 'function' ? t('contract.total') : 'JAMI:'}</td>
                            <td class="p-2 border border-slate-300 text-right text-emerald-800 font-mono">${(order.total_rent_amount || 0).toLocaleString()} ${currLabel}</td>
                            <td class="p-2 border border-slate-300 text-right text-amber-800 font-mono">${(order.total_deposit_amount || 0).toLocaleString()} ${currLabel}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <!-- Terms -->
            <div class="p-3 bg-slate-50 border border-slate-200 rounded text-[10px] space-y-1 text-slate-600 leading-relaxed">
                <p class="font-bold text-slate-800 mb-1">${typeof t === 'function' ? t('contract.terms_title') : 'Ijara Qoidalari va Shartlari:'}</p>
                <p>${typeof t === 'function' ? t('contract.terms_1') : '1. Qabul qilish: Ijarachi uskunani to\'liq soz, nuqsonsiz va butun holda qabul qildi va uni belgilangan muddatgacha qaytarish majburiyatini oladi.'}</p>
                <p>${typeof t === 'function' ? t('contract.terms_2') : '2. Kechikish: Belgilangan muddatdan kechiktirilgan har bir soat yoki kun uchun shartnoma stavkasi bo\'yicha qo\'shimcha to\'lov va jarima undiriladi.'}</p>
                <p>${typeof t === 'function' ? t('contract.terms_3') : '3. Javobgarlik: Uskuna buzilgan taqdirda ta\'mirlash xarajati garovdan ushlab qolinadi. Uskuna yo\'qolgan taqdirda Ijarachi to\'liq qiymatini qoplaydi.'}</p>
                <p>${typeof t === 'function' ? t('contract.terms_4') : '4. Zalog: Qabul qilingan garov mablag\'i uskuna soz qaytarilgach, darhol to\'liq qaytariladi.'}</p>
            </div>

            <!-- Signatures -->
            <div class="pt-6 grid grid-cols-2 gap-8 border-t border-slate-300 text-xs">
                <div>
                    <p class="font-bold text-slate-800 mb-8">${typeof t === 'function' ? t('contract.sign_company') : 'Topshirdi (Kompaniya nomidan):'}</p>
                    <p class="border-t border-slate-400 pt-1 text-slate-600">${isRu ? 'Подпись' : 'Imzo'}: _____________________ / ${currentUser ? currentUser.full_name : 'Admin'}</p>
                </div>
                <div>
                    <p class="font-bold text-slate-800 mb-8">${typeof t === 'function' ? t('contract.sign_customer') : 'Qabul qildi (Mijoz / Tilxat):'}</p>
                    <p class="border-t border-slate-400 pt-1 text-slate-600">${isRu ? 'Подпись' : 'Imzo'}: _____________________ / ${customer ? customer.full_name : (typeof t === 'function' ? t('receipt.customer') : 'Mijoz')}</p>
                </div>
            </div>
        </div>
    `;
}

function printContractDocument() {
    const el = document.getElementById('contract-printable-doc');
    if (!el) return;

    el.classList.add('printable-active');
    window.print();
    setTimeout(() => el.classList.remove('printable-active'), 1000);
}
