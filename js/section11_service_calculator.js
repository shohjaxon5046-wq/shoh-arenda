// =========================================================================
// SECTION 11: XIZMATLAR UCHUN PARAMETRLI DINAMIK NARX KALKULYATORLARI
// (GRUZCHIK, KRAN, MUSOR & ADMIN TARIF SOZLAMALARI)
// =========================================================================

/**
 * Returns current pricing rules from DB or defaults
 */
/**
 * Returns current pricing rules from DB or defaults
 */
/**
 * Returns current pricing rules from DB or defaults
 */
function getServicePricingRules() {
    if (!DB.service_pricing_rules) {
        DB.service_pricing_rules = JSON.parse(JSON.stringify(DEFAULT_DB.service_pricing_rules));
    }
    // Ensure all gruzchik multi-material fields have fallback values
    if (DB.service_pricing_rules && DB.service_pricing_rules.gruzchik) {
        const g = DB.service_pricing_rules.gruzchik;
        if (g.base_standard_bag_price === undefined) g.base_standard_bag_price = 3000;
        if (g.floor_extra_price === undefined) g.floor_extra_price = 2000;
        if (g.elevator_fixed_price === undefined) g.elevator_fixed_price = 1500;
        if (g.lift_high_floor_start === undefined) g.lift_high_floor_start = 5;
        if (g.lift_high_floor_extra === undefined) g.lift_high_floor_extra = 300;
        if (g.heavy_coefficient === undefined) g.heavy_coefficient = 1.5;
        if (g.sheet_base_price === undefined) g.sheet_base_price = 2500;
        if (g.sheet_floor_extra === undefined) g.sheet_floor_extra = 2000;
        if (g.min_order_price === undefined) g.min_order_price = 30000;
        if (g.heavy_volume_min_price === undefined) g.heavy_volume_min_price = 100000;
        if (g.partner_share_percent === undefined) g.partner_share_percent = 75;
    }
    return DB.service_pricing_rules;
}

// -------------------------------------------------------------------------
// 1. HISOB-KITOB FORMULALARI (CORE ALGORITHMS)
// -------------------------------------------------------------------------

/**
 * 1. Gruzchik xizmati kalkulyatori (Qurilish materiallari, Qavatlar, Lift ustamasi & Katta hajm ostonasi)
 * @param {Object} p - { standardBags, heavyBags, sheetCount, floor, hasElevator }
 */
function calculateGruzchikPrice(p) {
    const rules = getServicePricingRules().gruzchik || {};
    const baseStdPrice = Number(rules.base_standard_bag_price) || 3000;
    const floorExtra = Number(rules.floor_extra_price) || 2000;
    const elevFixedPrice = Number(rules.elevator_fixed_price) || 1500;
    const liftHighStart = Number(rules.lift_high_floor_start) || 5;
    const liftHighExtra = Number(rules.lift_high_floor_extra) || 300;
    const heavyCoef = Number(rules.heavy_coefficient) || 1.5;
    const sheetBasePrice = Number(rules.sheet_base_price) || 2500;
    const sheetFloorExtra = Number(rules.sheet_floor_extra) || 2000;
    const minOrderPrice = Number(rules.min_order_price) || 30000;
    const heavyVolMinPrice = Number(rules.heavy_volume_min_price) || 100000;
    const partnerSharePercent = Number(rules.partner_share_percent) || 75;

    const stdBags = Math.max(0, parseInt(p.standardBags || p.bagCount) || 0);
    const heavyBags = Math.max(0, parseInt(p.heavyBags) || 0);
    const sheetCount = Math.max(0, parseInt(p.sheetCount || p.sheets) || 0);
    const floor = Math.max(1, parseInt(p.floor) || 1);
    const hasElevator = !!p.hasElevator;

    // 1. Standart yuklar (0-30 kg):
    // Lift bo'lsa: fiks narx + (agar 5-qavatdan yuqori bo'lsa qavat ustamasi)
    // Lift bo'lmasa: [Baza narxi + ((Qavatlar soni - 1) * Har bir qavat ustamasi)] * Soni
    let stdUnitRate = 0;
    let liftHighExtraPerItem = 0;
    if (hasElevator) {
        if (floor > liftHighStart) {
            liftHighExtraPerItem = (floor - liftHighStart) * liftHighExtra;
            stdUnitRate = elevFixedPrice + liftHighExtraPerItem;
        } else {
            stdUnitRate = elevFixedPrice;
        }
    } else {
        stdUnitRate = floor <= 1 ? baseStdPrice : (baseStdPrice + ((floor - 1) * floorExtra));
    }
    const stdTotal = stdBags * stdUnitRate;

    // 2. Og'ir yuklar (30-50 kg, sement): Standart formula natijasi * 1.5
    const heavyUnitRate = Math.round(stdUnitRate * heavyCoef);
    const heavyTotal = heavyBags * heavyUnitRate;

    // 3. List materiallar (Gipsokarton, OSB): Fiksirlangan list narxi qavatlar va songa qarab
    let sheetUnitRate = 0;
    if (hasElevator) {
        sheetUnitRate = floor > liftHighStart
            ? (sheetBasePrice + ((floor - liftHighStart) * Math.round(liftHighExtra * 1.5)))
            : sheetBasePrice;
    } else {
        sheetUnitRate = floor <= 1
            ? sheetBasePrice
            : (sheetBasePrice + ((floor - 1) * sheetFloorExtra));
    }
    const sheetTotal = sheetCount * sheetUnitRate;

    const rawCalculatedPrice = stdTotal + heavyTotal + sheetTotal;

    // 4. Gruzchilar sonini avtomatik aniqlash mantiqi:
    // 400 kg gacha bo'lgan yuklarga qat'iy 1 nafar gruzchik (pul bo'linmasligi uchun).
    // 400 kg dan oshganda yoki o'ta noqulay listlar bo'lganda 2 nafar gruzchik (xizmat haqi 2x).
    const totalEstWeightKg = (stdBags * 25) + (heavyBags * 50) + (sheetCount * 30);
    const totalItems = stdBags + heavyBags + sheetCount;
    const totalTons = (totalEstWeightKg / 1000).toFixed(1);

    let workerCount = 1;
    let workerMultiplier = 1;
    if (totalEstWeightKg > 400 || sheetCount > 4) {
        workerCount = 2;
        workerMultiplier = 2;
    }
    if (totalEstWeightKg > 2000 || totalItems > 60) {
        workerCount = 3;
        workerMultiplier = 3;
    }
    if (totalEstWeightKg > 3500 || totalItems > 100) {
        workerCount = 4;
        workerMultiplier = 4;
    }

    let calculatedCustomerPrice = rawCalculatedPrice * workerMultiplier;

    // 5. Katta hajmli (1 tonnadan oshiq) yuklar uchun minimal ostonani oshirish:
    // 1 tonnadan (1000 kg) oshganda umumiy hajm bo'yicha minimal ostona qo'llaniladi
    let effectiveMinPrice = minOrderPrice;
    if (totalEstWeightKg >= 1000) {
        const volumeMinThreshold = Math.round((totalEstWeightKg / 1000) * heavyVolMinPrice);
        effectiveMinPrice = Math.max(minOrderPrice, volumeMinThreshold);
    }

    // 6. Minimal chegara qo'llash
    let isMinApplied = false;
    let minReason = "";
    let customerPrice = calculatedCustomerPrice;
    if (totalItems > 0 && customerPrice < effectiveMinPrice) {
        customerPrice = effectiveMinPrice;
        isMinApplied = true;
        minReason = (totalEstWeightKg >= 1000)
            ? `Katta hajm ostonasi (${totalTons} t: ${effectiveMinPrice.toLocaleString()} so'm)`
            : `Minimalovka (${minOrderPrice.toLocaleString()} so'm)`;
    } else if (totalItems === 0) {
        customerPrice = 0;
    }

    const partnerCost = Math.round(customerPrice * (partnerSharePercent / 100));
    const margin = customerPrice - partnerCost;

    // Formula & Task breakdown
    const parts = [];
    if (stdBags > 0) parts.push(`${stdBags} ta standart (${stdTotal.toLocaleString()} so'm)`);
    if (heavyBags > 0) parts.push(`${heavyBags} ta og'ir sement (${heavyTotal.toLocaleString()} so'm)`);
    if (sheetCount > 0) parts.push(`${sheetCount} ta list (${sheetTotal.toLocaleString()} so'm)`);
    if (parts.length === 0) parts.push(`0 ta material (0 so'm)`);

    let formulaText = parts.join(' + ') + ` [${floor}-etaj, ${hasElevator ? `Lift bor${floor > liftHighStart ? ` (+${liftHighExtraPerItem} so'm/dona 5-etajdan yuqori)` : ''}` : 'Lift yo\'q'}]`;
    if (workerMultiplier > 1) {
        formulaText += ` x ${workerCount} ishchi (${totalEstWeightKg} kg > 400 kg)`;
    }
    if (isMinApplied) {
        formulaText += ` → ${minReason}`;
    }

    const taskInstruction = `Vazifa: Yuk ko'tarish (${totalItems} ta material / ~${totalTons} t) — ${floor}-qavat (${hasElevator ? `LIFT BOR${floor > liftHighStart ? ` (${liftHighStart}-qavatdan yuqori)` : ''}` : 'LIFT YO\'Q'}). Biriktirildi: ${workerCount} nafar gruzchik${isMinApplied ? ` [${minReason}]` : ''}.`;
    const detailsText = `Gruzchik: ${totalItems} ta yuk (~${totalTons} t, ${workerCount} kishi), ${floor}-etaj (${hasElevator ? 'Lift bor' : 'Lift yo\'q'})${isMinApplied ? ` (${minReason})` : ''}.`;

    return {
        customerPrice,
        partnerCost,
        margin,
        workerCount,
        workerMultiplier,
        isMinApplied,
        minReason,
        effectiveMinPrice,
        minOrderPrice,
        stdTotal,
        heavyTotal,
        sheetTotal,
        totalItems,
        totalEstWeightKg,
        totalTons,
        formulaText,
        taskInstruction,
        detailsText,
        params: p
    };
}

/**
 * 2. Avtokran xizmati kalkulyatori
 * @param {Object} p - { tonnage, hours, distanceKm }
 */
function calculateKranPrice(p) {
    const rules = getServicePricingRules().kran;
    const tonnage = p.tonnage || '25';
    const rateObj = (rules.rates && rules.rates[tonnage]) ? rules.rates[tonnage] : { hourly_rate: 350000, min_hours: 3, label: '25 tonna' };

    const rawHours = Math.max(1, parseInt(p.hours) || rateObj.min_hours);
    const billedHours = Math.max(rateObj.min_hours, rawHours);
    const isMinApplied = (rawHours < rateObj.min_hours);

    const km = Math.max(0, parseInt(p.distanceKm) || 0);
    const kmFee = km * (rules.outside_city_per_km || 15000);

    const basePrice = billedHours * rateObj.hourly_rate;
    const customerPrice = basePrice + kmFee;

    const partnerCost = Math.round(customerPrice * (rules.partner_share_percent / 100));
    const margin = customerPrice - partnerCost;

    let formulaText = `${billedHours} soat x ${rateObj.hourly_rate.toLocaleString()} so'm (${rateObj.label})`;
    if (isMinApplied) formulaText += ` [Min: ${rateObj.min_hours} soat]`;
    if (km > 0) formulaText += ` + ${km} km x ${rules.outside_city_per_km.toLocaleString()} so'm (${kmFee.toLocaleString()})`;

    const taskInstruction = `Vazifa: Avtokran ${rateObj.label} kerak, ish vaqti: ${billedHours} soat${km > 0 ? `, shahardan tashqari: ${km} km masofada` : ', shahar ichida'}.`;
    const detailsText = `Avtokran ${rateObj.label}, ${billedHours} soat${km > 0 ? ` (+${km} km shahardan tashqari)` : ''}.`;

    return {
        customerPrice,
        partnerCost,
        margin,
        tonnage,
        billedHours,
        isMinApplied,
        km,
        kmFee,
        formulaText,
        taskInstruction,
        detailsText,
        params: p
    };
}

/**
 * 3. Musor (chiqindi) olib ketish kalkulyatori
 * @param {Object} p - { mode, truckType, trips, bagCount, hasLoadingHelp, floor, hasElevator }
 */
function calculateMusorPrice(p) {
    const rules = getServicePricingRules().musor;
    const mode = p.mode || 'mashina'; // 'mashina', 'qoplar'
    let customerPrice = 0;
    let formulaText = "";
    let taskInstruction = "";
    let detailsText = "";

    if (mode === 'mashina') {
        const truckType = p.truckType || 'zil';
        const truck = (rules.trucks && rules.trucks[truckType]) ? rules.trucks[truckType] : rules.trucks['zil'];
        const trips = Math.max(1, parseInt(p.trips) || 1);
        const hasLoadingHelp = !!p.hasLoadingHelp;
        const floor = Math.max(1, parseInt(p.floor) || 1);
        const hasElevator = !!p.hasElevator;

        const baseTruckPrice = truck.price * trips;
        const loadingFee = hasLoadingHelp ? (rules.loading_help_per_truck * trips) : 0;
        const floorFee = (hasLoadingHelp && !hasElevator && floor > 1) ? ((floor - 1) * 60000 * trips) : 0;

        customerPrice = baseTruckPrice + loadingFee + floorFee;

        formulaText = `${truck.label} x ${trips} reys (${baseTruckPrice.toLocaleString()} so'm)`;
        if (hasLoadingHelp) formulaText += ` + Yuklash (${loadingFee.toLocaleString()})`;
        if (floorFee > 0) formulaText += ` + ${floor}-etajdan tushirish (${floorFee.toLocaleString()})`;

        taskInstruction = `Vazifa: Musor olib ketish — ${truck.label}, ${trips} reys. ${hasLoadingHelp ? `Ishchilar yuklab beradi (etaj: ${floor}, ${hasElevator ? 'lift bor' : 'lift yo\'q'}).` : 'Mijoz o\'zi yuklaydi.'}`;
        detailsText = `Musor ${truck.label} (${trips} reys)${hasLoadingHelp ? ' + Yuklash xizmati' : ''}${floorFee > 0 ? ` (${floor}-etaj)` : ''}.`;
    } else {
        // Qopbay (kichik hajm)
        const minB = rules.min_bags || 20;
        const bags = Math.max(minB, parseInt(p.bagCount) || minB);
        const hasLoadingHelp = !!p.hasLoadingHelp;
        const floor = Math.max(1, parseInt(p.floor) || 1);
        const hasElevator = !!p.hasElevator;

        const baseBagPrice = bags * rules.bag_price;
        const loadingFee = hasLoadingHelp ? (bags * rules.loading_help_per_bag) : 0;
        const floorFee = (!hasElevator && floor > 1) ? (bags * (floor - 1) * rules.floor_carry_down_per_bag) : 0;

        customerPrice = baseBagPrice + loadingFee + floorFee;

        formulaText = `${bags} qop x ${rules.bag_price.toLocaleString()} so'm (${baseBagPrice.toLocaleString()})`;
        if (hasLoadingHelp) formulaText += ` + Yuklash (${loadingFee.toLocaleString()})`;
        if (floorFee > 0) formulaText += ` + ${floor}-etaj (${floorFee.toLocaleString()})`;

        taskInstruction = `Vazifa: Chiqindi (musor) — ${bags} qop (qopbay). ${hasLoadingHelp ? `Ishchilar yuklaydi (${floor}-etaj, ${hasElevator ? 'lift bor' : 'lift yo\'q'}).` : 'Yuklashsiz.'}`;
        detailsText = `Musor: ${bags} qop x ${rules.bag_price.toLocaleString()} so'm${hasLoadingHelp ? ' + Yuklash' : ''}${floorFee > 0 ? ` (${floor}-etaj)` : ''}.`;
    }

    const partnerCost = Math.round(customerPrice * (rules.partner_share_percent / 100));
    const margin = customerPrice - partnerCost;

    return {
        customerPrice,
        partnerCost,
        margin,
        formulaText,
        taskInstruction,
        detailsText,
        params: p
    };
}


// -------------------------------------------------------------------------
// 2. UI / UX INTERAKTIV KALKULYATOR KONTROLLERLARI
// -------------------------------------------------------------------------

let currentCalcResult = null;

/**
 * Renders dynamic calculator form into container (e.g. POS or Dispatch modal)
 * @param {string} containerId - DOM container ID
 * @param {string} category - 'gruzchik', 'kran', 'musor_olib_ketish'
 * @param {string} prefix - 'pos' or 'disp'
 */
function renderDynamicServiceCalculator(containerId, category, prefix = 'pos') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const rules = getServicePricingRules();

    if (category === 'gruzchik') {
        container.innerHTML = `
            <div class="p-3.5 rounded-2xl bg-slate-900 border border-indigo-500/30 space-y-3 text-xs">
                <div class="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span class="font-bold text-white flex items-center gap-1.5">
                        <i data-lucide="users-2" class="w-4 h-4 text-indigo-400"></i>
                        <span>Gruzchik Smart Kalkulyatori (Materiallar & Qavatlar)</span>
                    </span>
                    <span class="text-[10px] text-indigo-300 font-mono">Baza: ${(rules.gruzchik.base_standard_bag_price || 3000).toLocaleString()} so'm | Min: ${(rules.gruzchik.min_order_price || 30000).toLocaleString()} so'm</span>
                </div>

                <!-- Material Inputs Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <!-- 1. Standart yuklar -->
                    <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <div class="flex items-center justify-between">
                            <label class="block text-[11px] font-bold text-slate-200">📦 Standart (0-30 kg)</label>
                        </div>
                        <p class="text-[10px] text-slate-400">Rotband, shpaklyovka, qop</p>
                        <input type="number" id="${prefix}-g-std-bags" min="0" value="10" oninput="updateLiveServiceCalculation('${prefix}', 'gruzchik')" class="w-full rounded-lg border border-slate-700 bg-slate-900 py-1.5 px-2.5 text-xs text-white font-bold font-mono">
                        <div class="text-[10px] text-indigo-300 font-mono flex justify-between pt-0.5">
                            <span>Baza: ${(rules.gruzchik.base_standard_bag_price || 3000).toLocaleString()} so'm</span>
                        </div>
                    </div>

                    <!-- 2. Og'ir yuklar -->
                    <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <div class="flex items-center justify-between">
                            <label class="block text-[11px] font-bold text-amber-300">🧱 Og'ir (30-50 kg)</label>
                        </div>
                        <p class="text-[10px] text-slate-400">Sement, qum, og'ir material</p>
                        <input type="number" id="${prefix}-g-heavy-bags" min="0" value="0" oninput="updateLiveServiceCalculation('${prefix}', 'gruzchik')" class="w-full rounded-lg border border-slate-700 bg-slate-900 py-1.5 px-2.5 text-xs text-amber-300 font-bold font-mono">
                        <div class="text-[10px] text-amber-400 font-mono flex justify-between pt-0.5">
                            <span>Koef: x${rules.gruzchik.heavy_coefficient || 1.5}</span>
                        </div>
                    </div>

                    <!-- 3. List materiallar -->
                    <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <div class="flex items-center justify-between">
                            <label class="block text-[11px] font-bold text-emerald-300">📐 Katta listlar</label>
                        </div>
                        <p class="text-[10px] text-slate-400">Gipsokarton, OSB, fanera</p>
                        <input type="number" id="${prefix}-g-sheets" min="0" value="0" oninput="updateLiveServiceCalculation('${prefix}', 'gruzchik')" class="w-full rounded-lg border border-slate-700 bg-slate-900 py-1.5 px-2.5 text-xs text-emerald-300 font-bold font-mono">
                        <div class="text-[10px] text-emerald-400 font-mono flex justify-between pt-0.5">
                            <span>Baza: ${(rules.gruzchik.sheet_base_price || 2500).toLocaleString()} so'm</span>
                        </div>
                    </div>
                </div>

                <!-- Floor & Elevator Settings -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                        <label class="block text-[11px] font-semibold text-slate-300 mb-1">🏢 Ko'tariladigan Qavat (Etaj): 1 - 25</label>
                        <input type="number" id="${prefix}-g-floor" min="1" max="25" value="4" oninput="updateLiveServiceCalculation('${prefix}', 'gruzchik')" class="w-full rounded-xl border border-slate-700 bg-slate-950 py-1.5 px-2.5 text-xs text-white font-bold font-mono">
                    </div>
                    <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <label class="flex items-center gap-2 cursor-pointer text-slate-200">
                            <input type="checkbox" id="${prefix}-g-elevator" onchange="updateLiveServiceCalculation('${prefix}', 'gruzchik')" class="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-0">
                            <span class="text-xs font-semibold">🛗 Bino lifti ishlayapti</span>
                        </label>
                        <span class="text-[10px] text-emerald-400 font-mono">Liftda: ${(rules.gruzchik.elevator_fixed_price || 1500).toLocaleString()} so'm/ta</span>
                    </div>
                </div>

                <!-- Calculation Live Result Card -->
                <div id="${prefix}-calc-result-box" class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"></div>
            </div>
        `;
    } else if (category === 'kran') {
        container.innerHTML = `
            <div class="p-3.5 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-3 text-xs">
                <div class="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span class="font-bold text-white flex items-center gap-1.5">
                        <i data-lucide="truck" class="w-4 h-4 text-amber-400"></i>
                        <span>Avtokran Smart Kalkulyatori</span>
                    </span>
                    <span class="text-[10px] text-amber-300 font-mono">Min stavka: 2-4 soat</span>
                </div>

                <div class="grid grid-cols-3 gap-2">
                    <div>
                        <label class="block text-[11px] text-slate-400 mb-1">Kran quvvati *</label>
                        <select id="${prefix}-k-tonnage" onchange="updateLiveServiceCalculation('${prefix}', 'kran')" class="w-full rounded-xl border border-slate-700 bg-slate-950 py-1.5 px-2 text-xs text-white font-bold">
                            <option value="16">16 tonna (${rules.kran.rates['16'].hourly_rate.toLocaleString()} so'm/s, min 2s)</option>
                            <option value="25" selected>25 tonna (${rules.kran.rates['25'].hourly_rate.toLocaleString()} so'm/s, min 3s)</option>
                            <option value="50">50 tonna (${rules.kran.rates['50'].hourly_rate.toLocaleString()} so'm/s, min 4s)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[11px] text-slate-400 mb-1">Ish soatlari soni *</label>
                        <input type="number" id="${prefix}-k-hours" min="1" value="4" oninput="updateLiveServiceCalculation('${prefix}', 'kran')" class="w-full rounded-xl border border-slate-700 bg-slate-950 py-1.5 px-2 text-xs text-white font-bold font-mono">
                    </div>
                    <div>
                        <label class="block text-[11px] text-slate-400 mb-1">Shahardan tashqari (km)</label>
                        <input type="number" id="${prefix}-k-km" min="0" value="0" placeholder="0 km (shahar ichi)" oninput="updateLiveServiceCalculation('${prefix}', 'kran')" class="w-full rounded-xl border border-slate-700 bg-slate-950 py-1.5 px-2 text-xs text-white font-mono">
                    </div>
                </div>

                <!-- Calculation Live Result Card -->
                <div id="${prefix}-calc-result-box" class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"></div>
            </div>
        `;
    } else if (category === 'musor_olib_ketish') {
        container.innerHTML = `
            <div class="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-3 text-xs">
                <div class="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span class="font-bold text-white flex items-center gap-1.5">
                        <i data-lucide="trash-2" class="w-4 h-4 text-emerald-400"></i>
                        <span>Musor (Chiqindi) Smart Kalkulyatori</span>
                    </span>
                    <span class="text-[10px] text-emerald-300 font-mono">Gazel / ZIL / KamAZ</span>
                </div>

                <!-- Mode selection -->
                <div class="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                    <button type="button" onclick="setCalcMusorMode('${prefix}', 'mashina')" id="${prefix}-mmode-mashina" class="py-1 px-2 rounded-lg text-xs font-bold bg-blue-600 text-white transition">Mashina bo'yicha (Reys)</button>
                    <button type="button" onclick="setCalcMusorMode('${prefix}', 'qoplar')" id="${prefix}-mmode-qoplar" class="py-1 px-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition">Qoplar soni (Kichik hajm)</button>
                </div>
                <input type="hidden" id="${prefix}-musor-mode" value="mashina">

                <!-- Mode A: Mashina -->
                <div id="${prefix}-msec-mashina" class="space-y-2.5">
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="block text-[11px] text-slate-400 mb-1">Mashina turi *</label>
                            <select id="${prefix}-m-truck" onchange="updateLiveServiceCalculation('${prefix}', 'musor_olib_ketish')" class="w-full rounded-xl border border-slate-700 bg-slate-950 py-1.5 px-2 text-xs text-white font-bold">
                                <option value="gazel">Gazel 1.5t (${rules.musor.trucks['gazel'].price.toLocaleString()} so'm)</option>
                                <option value="zil" selected>ZIL 5-6t (${rules.musor.trucks['zil'].price.toLocaleString()} so'm)</option>
                                <option value="kamaz">KamAZ 10-15t (${rules.musor.trucks['kamaz'].price.toLocaleString()} so'm)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[11px] text-slate-400 mb-1">Reyslar soni *</label>
                            <input type="number" id="${prefix}-m-trips" min="1" value="1" oninput="updateLiveServiceCalculation('${prefix}', 'musor_olib_ketish')" class="w-full rounded-xl border border-slate-700 bg-slate-950 py-1.5 px-2 text-xs text-white font-bold font-mono">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
                        <label class="flex items-center gap-2 cursor-pointer text-slate-200">
                            <input type="checkbox" id="${prefix}-m-loading" onchange="updateLiveServiceCalculation('${prefix}', 'musor_olib_ketish')" class="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0">
                            <span class="text-xs font-semibold">Ishchilar yuklab beradi (+${rules.musor.loading_help_per_truck.toLocaleString()})</span>
                        </label>
                        <div>
                            <input type="number" id="${prefix}-m-floor" min="1" value="1" placeholder="Qavatdan tushirish" oninput="updateLiveServiceCalculation('${prefix}', 'musor_olib_ketish')" class="w-full rounded-lg border border-slate-700 bg-slate-900 py-1 px-2 text-[11px] text-white">
                        </div>
                    </div>
                </div>

                <!-- Mode B: Qoplar -->
                <div id="${prefix}-msec-qoplar" class="hidden space-y-2.5">
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="block text-[11px] text-slate-400 mb-1">Qoplar soni (min ${rules.musor.min_bags} ta) *</label>
                            <input type="number" id="${prefix}-m-bags" min="${rules.musor.min_bags}" value="25" oninput="updateLiveServiceCalculation('${prefix}', 'musor_olib_ketish')" class="w-full rounded-xl border border-slate-700 bg-slate-950 py-1.5 px-2 text-xs text-white font-bold font-mono">
                        </div>
                        <div>
                            <label class="block text-[11px] text-slate-400 mb-1">Qavatdan tushirish (Etaj)</label>
                            <input type="number" id="${prefix}-m-bag-floor" min="1" value="1" oninput="updateLiveServiceCalculation('${prefix}', 'musor_olib_ketish')" class="w-full rounded-xl border border-slate-700 bg-slate-950 py-1.5 px-2 text-xs text-white font-mono">
                        </div>
                    </div>
                    <div class="p-2 rounded-xl bg-slate-950 border border-slate-800">
                        <label class="flex items-center gap-2 cursor-pointer text-slate-200">
                            <input type="checkbox" id="${prefix}-m-bag-loading" checked onchange="updateLiveServiceCalculation('${prefix}', 'musor_olib_ketish')" class="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0">
                            <span class="text-xs font-semibold">Ishchilar mashinaga ortadi (+${rules.musor.loading_help_per_bag.toLocaleString()} so'm/qop)</span>
                        </label>
                    </div>
                </div>

                <!-- Calculation Live Result Card -->
                <div id="${prefix}-calc-result-box" class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"></div>
            </div>
        `;
    }

    lucide.createIcons();
    updateLiveServiceCalculation(prefix, category);
}

function setCalcGruzchikMode(prefix, mode) {
    const input = document.getElementById(`${prefix}-gruzchik-mode`);
    if (input) input.value = mode;

    ['qop', 'soatbay', 'mebel'].forEach(m => {
        const btn = document.getElementById(`${prefix}-gmode-${m}`);
        const sec = document.getElementById(`${prefix}-gsec-${m}`);
        if (m === mode) {
            if (btn) btn.className = "py-1 px-2 rounded-lg text-xs font-bold bg-indigo-600 text-white transition";
            if (sec) sec.classList.remove('hidden');
        } else {
            if (btn) btn.className = "py-1 px-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition";
            if (sec) sec.classList.add('hidden');
        }
    });

    updateLiveServiceCalculation(prefix, 'gruzchik');
}

function setCalcMusorMode(prefix, mode) {
    const input = document.getElementById(`${prefix}-musor-mode`);
    if (input) input.value = mode;

    ['mashina', 'qoplar'].forEach(m => {
        const btn = document.getElementById(`${prefix}-mmode-${m}`);
        const sec = document.getElementById(`${prefix}-msec-${m}`);
        if (m === mode) {
            if (btn) btn.className = "py-1 px-2 rounded-lg text-xs font-bold bg-emerald-600 text-white transition";
            if (sec) sec.classList.remove('hidden');
        } else {
            if (btn) btn.className = "py-1 px-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition";
            if (sec) sec.classList.add('hidden');
        }
    });

    updateLiveServiceCalculation(prefix, 'musor_olib_ketish');
}

/**
 * Updates live calculation output and auto-fills price inputs
 */
function updateLiveServiceCalculation(prefix, category) {
    let result = null;

    if (category === 'gruzchik') {
        const standardBags = document.getElementById(`${prefix}-g-std-bags`)?.value || 0;
        const heavyBags = document.getElementById(`${prefix}-g-heavy-bags`)?.value || 0;
        const sheetCount = document.getElementById(`${prefix}-g-sheets`)?.value || 0;
        const floor = document.getElementById(`${prefix}-g-floor`)?.value || 1;
        const hasElevator = document.getElementById(`${prefix}-g-elevator`)?.checked || false;

        result = calculateGruzchikPrice({
            standardBags,
            heavyBags,
            sheetCount,
            floor,
            hasElevator
        });
    } else if (category === 'kran') {
        const tonnage = document.getElementById(`${prefix}-k-tonnage`)?.value || '25';
        const hours = document.getElementById(`${prefix}-k-hours`)?.value || 4;
        const distanceKm = document.getElementById(`${prefix}-k-km`)?.value || 0;

        result = calculateKranPrice({ tonnage, hours, distanceKm });
    } else if (category === 'musor_olib_ketish') {
        const mode = document.getElementById(`${prefix}-musor-mode`)?.value || 'mashina';
        const truckType = document.getElementById(`${prefix}-m-truck`)?.value || 'zil';
        const trips = document.getElementById(`${prefix}-m-trips`)?.value || 1;
        const hasLoadingHelp = document.getElementById(`${prefix}-m-loading`)?.checked || false;
        const floor = document.getElementById(`${prefix}-m-floor`)?.value || 1;
        const bagCount = document.getElementById(`${prefix}-m-bags`)?.value || 25;
        const bagFloor = document.getElementById(`${prefix}-m-bag-floor`)?.value || 1;
        const bagLoading = document.getElementById(`${prefix}-m-bag-loading`)?.checked || false;

        result = calculateMusorPrice({
            mode,
            truckType,
            trips,
            hasLoadingHelp: mode === 'mashina' ? hasLoadingHelp : bagLoading,
            floor: mode === 'mashina' ? floor : bagFloor,
            bagCount
        });
    }

    if (!result) return;
    currentCalcResult = result;

    // Render result card inside calculator box
    const resultBox = document.getElementById(`${prefix}-calc-result-box`);
    if (resultBox) {
        resultBox.innerHTML = `
            <div class="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <div class="flex items-center gap-2">
                    ${result.workerCount ? `
                        <span class="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-xs flex items-center gap-1">
                             Kerakli resurs: ${result.workerCount} nafar ishchi
                        </span>
                    ` : ''}
                    ${result.tonnage ? `
                        <span class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold text-xs flex items-center gap-1">
                            Quvvati: ${result.tonnage} tonna (${result.billedHours} soat)
                        </span>
                    ` : ''}
                </div>
                <div class="text-right">
                    <span class="text-[10px] text-slate-400 block">Hisoblangan jami narx:</span>
                    <b class="text-sm font-black text-emerald-400 font-mono">${result.customerPrice.toLocaleString()} so'm</b>
                </div>
            </div>

            <!-- Formula display -->
            <div class="text-[11px] text-slate-300 flex items-center gap-1.5 font-mono">
                <span class="text-amber-400"> Hisob:</span>
                <span>${result.formulaText}</span>
            </div>

            <!-- Partner Instruction Preview -->
            <div class="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                <b class="text-slate-300 uppercase block"> Hamkorga boradigan aniq topshiriq:</b>
                <span class="text-slate-200 italic font-mono mt-0.5 block">"${result.taskInstruction}"</span>
            </div>

            <!-- Margin Split -->
            <div class="flex justify-between items-center text-[10px] pt-1 border-t border-slate-800 text-slate-400">
                <span>Hamkor haqi: <b class="text-amber-400 font-mono">${result.partnerCost.toLocaleString()} so'm</b></span>
                <span>Sof brokerlik marjasi: <b class="text-emerald-400 font-mono">+${result.margin.toLocaleString()} so'm</b></span>
            </div>
        `;
    }

    // Auto-fill target inputs if in POS or Dispatch modal
    if (prefix === 'pos') {
        const custPriceInput = document.getElementById('pos-service-cust-price');
        const partnerCostInput = document.getElementById('pos-service-partner-cost');
        const detailsInput = document.getElementById('pos-service-details');

        if (custPriceInput) custPriceInput.value = result.customerPrice;
        if (partnerCostInput) partnerCostInput.value = result.partnerCost;
        if (detailsInput && (!detailsInput.value || detailsInput.dataset.autoFilled === 'true')) {
            detailsInput.value = result.detailsText;
            detailsInput.dataset.autoFilled = 'true';
        }
    } else if (prefix === 'disp') {
        const custPriceInput = document.getElementById('so-customer-price');
        const partnerCostInput = document.getElementById('so-partner-payout');
        const detailsInput = document.getElementById('so-details');

        if (custPriceInput) custPriceInput.value = result.customerPrice;
        if (partnerCostInput) partnerCostInput.value = result.partnerCost;
        if (detailsInput && (!detailsInput.value || detailsInput.dataset.autoFilled === 'true')) {
            detailsInput.value = result.detailsText;
            detailsInput.dataset.autoFilled = 'true';
        }
        if (typeof calculateOrderNetProfit === 'function') calculateOrderNetProfit();
    }
}

/**
 * Triggered when user changes service category dropdown in POS
 */
function onPosServiceCategoryChange() {
    const cat = document.getElementById('pos-service-category')?.value || 'kran';
    renderDynamicServiceCalculator('pos-dynamic-calculator-container', cat, 'pos');
}

/**
 * Triggered when user changes service category dropdown in Section 4 Dispatch
 */
function onDispatchServiceCategoryChange() {
    const cat = document.getElementById('so-category')?.value || 'kran';
    renderDynamicServiceCalculator('dispatch-dynamic-calculator-container', cat, 'disp');
}


// -------------------------------------------------------------------------
// 3. ADMIN TARIF VA FORMULALARINI BOSHQARISH (ADMIN PRICING RULES MODAL)
// -------------------------------------------------------------------------

function openAdminPricingRulesModal() {
    if (!currentUser || currentUser.role_id !== 'admin') {
        alert("Kechirasiz, tariflar va formulalarni faqat Bosh Admin o'zgartira oladi!");
        return;
    }

    const rules = getServicePricingRules();

    // 1. Gruzchik inputs (Materiallar & Qavatlar)
    const g = rules.gruzchik || {};
    if (document.getElementById('apr-g-std-base')) document.getElementById('apr-g-std-base').value = g.base_standard_bag_price ?? 3000;
    if (document.getElementById('apr-g-floor-extra')) document.getElementById('apr-g-floor-extra').value = g.floor_extra_price ?? 2000;
    if (document.getElementById('apr-g-elev-rate')) document.getElementById('apr-g-elev-rate').value = g.elevator_fixed_price ?? 1500;
    if (document.getElementById('apr-g-lift-high-extra')) document.getElementById('apr-g-lift-high-extra').value = g.lift_high_floor_extra ?? 300;
    if (document.getElementById('apr-g-heavy-coef')) document.getElementById('apr-g-heavy-coef').value = g.heavy_coefficient ?? 1.5;
    if (document.getElementById('apr-g-sheet-base')) document.getElementById('apr-g-sheet-base').value = g.sheet_base_price ?? 2500;
    if (document.getElementById('apr-g-sheet-floor')) document.getElementById('apr-g-sheet-floor').value = g.sheet_floor_extra ?? 2000;
    if (document.getElementById('apr-g-min-order')) document.getElementById('apr-g-min-order').value = g.min_order_price ?? 30000;
    if (document.getElementById('apr-g-heavy-vol-min')) document.getElementById('apr-g-heavy-vol-min').value = g.heavy_volume_min_price ?? 100000;
    if (document.getElementById('apr-g-share')) document.getElementById('apr-g-share').value = g.partner_share_percent ?? 75;

    // 2. Kran inputs
    document.getElementById('apr-k-16-rate').value = rules.kran.rates['16'].hourly_rate;
    document.getElementById('apr-k-16-min').value = rules.kran.rates['16'].min_hours;
    document.getElementById('apr-k-25-rate').value = rules.kran.rates['25'].hourly_rate;
    document.getElementById('apr-k-25-min').value = rules.kran.rates['25'].min_hours;
    document.getElementById('apr-k-50-rate').value = rules.kran.rates['50'].hourly_rate;
    document.getElementById('apr-k-50-min').value = rules.kran.rates['50'].min_hours;
    document.getElementById('apr-k-km-rate').value = rules.kran.outside_city_per_km;
    document.getElementById('apr-k-share').value = rules.kran.partner_share_percent;

    // 3. Musor inputs
    document.getElementById('apr-m-gazel-rate').value = rules.musor.trucks['gazel'].price;
    document.getElementById('apr-m-zil-rate').value = rules.musor.trucks['zil'].price;
    document.getElementById('apr-m-kamaz-rate').value = rules.musor.trucks['kamaz'].price;
    document.getElementById('apr-m-bag-rate').value = rules.musor.bag_price;
    document.getElementById('apr-m-min-bags').value = rules.musor.min_bags;
    document.getElementById('apr-m-load-truck').value = rules.musor.loading_help_per_truck;
    document.getElementById('apr-m-load-bag').value = rules.musor.loading_help_per_bag;
    document.getElementById('apr-m-floor-carry').value = rules.musor.floor_carry_down_per_bag;
    document.getElementById('apr-m-share').value = rules.musor.partner_share_percent;

    openModal('modal-admin-pricing-rules');
    lucide.createIcons();
}

function handleSaveAdminPricingRules(e) {
    e.preventDefault();

    if (!currentUser || currentUser.role_id !== 'admin') {
        alert("Ruxsat berilmagan!");
        return;
    }

    const rules = getServicePricingRules();

    // 1. Gruzchik (Materiallar & Qavatlar)
    rules.gruzchik = rules.gruzchik || {};
    rules.gruzchik.base_standard_bag_price = parseFloat(document.getElementById('apr-g-std-base')?.value) || 3000;
    rules.gruzchik.floor_extra_price = parseFloat(document.getElementById('apr-g-floor-extra')?.value) || 2000;
    rules.gruzchik.elevator_fixed_price = parseFloat(document.getElementById('apr-g-elev-rate')?.value) || 1500;
    rules.gruzchik.lift_high_floor_start = 5;
    rules.gruzchik.lift_high_floor_extra = parseFloat(document.getElementById('apr-g-lift-high-extra')?.value) || 300;
    rules.gruzchik.heavy_coefficient = parseFloat(document.getElementById('apr-g-heavy-coef')?.value) || 1.5;
    rules.gruzchik.sheet_base_price = parseFloat(document.getElementById('apr-g-sheet-base')?.value) || 2500;
    rules.gruzchik.sheet_floor_extra = parseFloat(document.getElementById('apr-g-sheet-floor')?.value) || 2000;
    rules.gruzchik.min_order_price = parseFloat(document.getElementById('apr-g-min-order')?.value) || 30000;
    rules.gruzchik.heavy_volume_min_price = parseFloat(document.getElementById('apr-g-heavy-vol-min')?.value) || 100000;
    rules.gruzchik.partner_share_percent = parseInt(document.getElementById('apr-g-share')?.value) || 75;

    // 2. Kran
    rules.kran.rates['16'].hourly_rate = parseFloat(document.getElementById('apr-k-16-rate').value) || 300000;
    rules.kran.rates['16'].min_hours = parseInt(document.getElementById('apr-k-16-min').value) || 2;
    rules.kran.rates['25'].hourly_rate = parseFloat(document.getElementById('apr-k-25-rate').value) || 350000;
    rules.kran.rates['25'].min_hours = parseInt(document.getElementById('apr-k-25-min').value) || 3;
    rules.kran.rates['50'].hourly_rate = parseFloat(document.getElementById('apr-k-50-rate').value) || 600000;
    rules.kran.rates['50'].min_hours = parseInt(document.getElementById('apr-k-50-min').value) || 4;
    rules.kran.outside_city_per_km = parseFloat(document.getElementById('apr-k-km-rate').value) || 15000;
    rules.kran.partner_share_percent = parseInt(document.getElementById('apr-k-share').value) || 80;

    // 3. Musor
    rules.musor.trucks['gazel'].price = parseFloat(document.getElementById('apr-m-gazel-rate').value) || 400000;
    rules.musor.trucks['zil'].price = parseFloat(document.getElementById('apr-m-zil-rate').value) || 800000;
    rules.musor.trucks['kamaz'].price = parseFloat(document.getElementById('apr-m-kamaz-rate').value) || 1500000;
    rules.musor.bag_price = parseFloat(document.getElementById('apr-m-bag-rate').value) || 12000;
    rules.musor.min_bags = parseInt(document.getElementById('apr-m-min-bags').value) || 20;
    rules.musor.loading_help_per_truck = parseFloat(document.getElementById('apr-m-load-truck').value) || 150000;
    rules.musor.loading_help_per_bag = parseFloat(document.getElementById('apr-m-load-bag').value) || 3000;
    rules.musor.floor_carry_down_per_bag = parseFloat(document.getElementById('apr-m-floor-carry').value) || 2000;
    rules.musor.partner_share_percent = parseInt(document.getElementById('apr-m-share').value) || 75;

    saveDB();
    closeModal('modal-admin-pricing-rules');
    showNotification("Tariflar va hisob-kitob formulalari muvaffaqiyatli saqlandi!", "success");

    // Refresh active calculators
    if (document.getElementById('pos-dynamic-calculator-container')) {
        const cat = document.getElementById('pos-service-category')?.value || 'kran';
        renderDynamicServiceCalculator('pos-dynamic-calculator-container', cat, 'pos');
    }
}

// -------------------------------------------------------------------------
// 4. HAMKORGA TELEGRAM TOPSHIRIQ YUBORISH / NUSXALASH
// -------------------------------------------------------------------------

/**
 * Copies or prepares dispatch task for the partner
 * @param {number} orderId - Order ID or Service Order ID
 */
function copyPartnerDispatchTask(orderId) {
    let order = (DB.orders || []).find(o => o.id === orderId);
    let srvItem = (DB.order_service_items || []).find(s => s.order_id === orderId);

    if (!srvItem) {
        // Try finding directly in service_orders
        const sOrder = (DB.service_orders || []).find(so => so.id === orderId || so.order_number === orderId);
        if (sOrder) {
            const partner = (DB.service_partners || []).find(p => p.id === sOrder.assigned_partner_id);
            const taskText = ` YANGI TOPSHIRIQ (DISPECHERLIK):\n` +
                ` Kompaniya: "WMS ARENDA"\n` +
                ` Hamkor: ${partner ? partner.company_name : 'Hamkor'}\n` +
                ` Buyurtma: ${sOrder.order_number}\n` +
                ` Sana va vaqt: ${sOrder.service_date} ${sOrder.execution_time || ''}\n` +
                ` Manzil: ${sOrder.destination_address}\n` +
                ` ${sOrder.details}\n` +
                ` Hamkorga to'lanadigan haq: ${sOrder.partner_payout_amount?.toLocaleString() || 0} so'm`;

            navigator.clipboard.writeText(taskText).then(() => {
                showNotification("Hamkor uchun Telegram topshirig'i nusxalandi!", "success");
            }).catch(() => {
                prompt("Hamkor topshirig'i:", taskText);
            });
            return;
        }
        showNotification("Xizmat ma'lumoti topilmadi!", "warning");
        return;
    }

    const partner = (DB.service_partners || []).find(p => p.id === srvItem.assigned_partner_id);
    const taskText = ` YANGI TOPSHIRIQ (DISPECHERLIK):\n` +
        ` Kompaniya: "WMS ARENDA"\n` +
        ` Hamkor: ${partner ? partner.company_name : 'Hamkor'}\n` +
        ` Buyurtma: #${order ? order.order_number : ''}\n` +
        ` ${srvItem.service_details}\n` +
        ` Hamkorga to'lanadigan haq: ${srvItem.partner_cost?.toLocaleString() || 0} so'm`;

    navigator.clipboard.writeText(taskText).then(() => {
        showNotification("Hamkor uchun Telegram topshirig'i nusxalandi!", "success");
    }).catch(() => {
        prompt("Hamkor topshirig'i:", taskText);
    });
}
