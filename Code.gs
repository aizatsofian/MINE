/**
 * Data2Dashboard — Backend (Google Apps Script + Google Sheet)
 * ==============================================================
 *
 * This is the backend for admin/index.html, matching the architecture
 * documented in js/config.js. It does two jobs:
 *
 *   1. setupSheets()  — run once to create the 5 sheet tabs (PRODUCTS,
 *      REVIEWS, ORDERS, SETTINGS, ADMIN_USERS) with headers, and seed
 *      PRODUCTS with the 15 dashboards already on the public site.
 *   2. doPost(e)       — the Web App API the admin panel (and later the
 *      public site) calls for login, and PRODUCTS / REVIEWS / ORDERS /
 *      SETTINGS reads and writes.
 *
 * ── Deploy ────────────────────────────────────────────────────────────
 *   1. Go to https://script.google.com/ → New project.
 *   2. Paste this whole file in as Code.gs (replace the default content).
 *   3. Run > setupSheets (first run will ask you to authorize access to
 *      your Google Sheets — this creates a brand-new Spreadsheet the
 *      first time it runs, and logs its URL).
 *   4. Fill in SETUP_ADMIN_EMAIL / SETUP_ADMIN_PASSWORD below, then
 *      Run > createInitialAdmin. Check the Execution Log for
 *      confirmation, then delete the password (line below) and re-save.
 *   5. Deploy > New deployment > type: Web app.
 *        Execute as: Me
 *        Who has access: Anyone
 *      Click Deploy, copy the Web app URL.
 *   6. Paste that URL into js/config.js as D2D.backendConfig.GAS_WEB_APP_URL.
 *
 * ── Redeploying after edits ──────────────────────────────────────────
 * Apps Script Web App URLs don't change on their own, but editing this
 * file does NOT update a live deployment — use Deploy > Manage
 * deployments > ✎ Edit > Version: New version > Deploy.
 */

// ── One-time admin bootstrap ──────────────────────────────────────────
// Fill these in, run createInitialAdmin() once from the function
// dropdown above, confirm success in the Execution Log, then delete the
// password below (and ideally the email too) and re-save this file.
// Only a salted hash is ever written to the sheet — this plaintext only
// exists here transiently so you can type it once.
const SETUP_ADMIN_EMAIL = '';
const SETUP_ADMIN_PASSWORD = '';

const SHEET_NAMES = {
    PRODUCTS: 'PRODUCTS',
    REVIEWS: 'REVIEWS',
    ORDERS: 'ORDERS',
    SETTINGS: 'SETTINGS',
    ADMIN_USERS: 'ADMIN_USERS'
};

const PRODUCTS_HEADERS = [
    'product_id', 'product_name', 'category', 'description', 'price_self_setup',
    'price_full_setup', 'demo_url', 'powerbi_available', 'thumbnail', 'preview_image',
    'features', 'technology', 'rating', 'review_count', 'demo_views', 'purchase_count',
    'badge', 'status', 'created_at', 'updated_at'
];

const REVIEWS_HEADERS = ['review_id', 'product_id', 'name', 'phone', 'rating', 'comment', 'date', 'status'];

const ORDERS_HEADERS = ['order_id', 'product_id', 'customer_name', 'phone', 'package', 'price', 'payment_status', 'date'];

const SETTINGS_HEADERS = ['setting', 'value'];

// password_hash stores "salt$hash" — see hashPassword_() / handleLogin_().
const ADMIN_USERS_HEADERS = ['email', 'password_hash', 'role', 'created_at', 'last_login'];

const SESSION_TTL_SECONDS = 21600; // 6 hours — CacheService's own max

// ============================================================
// SETUP
// ============================================================

function setupSheets() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    createSheetWithHeaders_(ss, SHEET_NAMES.PRODUCTS, PRODUCTS_HEADERS);
    createSheetWithHeaders_(ss, SHEET_NAMES.REVIEWS, REVIEWS_HEADERS);
    createSheetWithHeaders_(ss, SHEET_NAMES.ORDERS, ORDERS_HEADERS);
    createSheetWithHeaders_(ss, SHEET_NAMES.SETTINGS, SETTINGS_HEADERS);
    createSheetWithHeaders_(ss, SHEET_NAMES.ADMIN_USERS, ADMIN_USERS_HEADERS);

    seedProductsIfEmpty_(ss);
    seedSettingsIfEmpty_(ss);

    // Remove the blank default "Sheet1" Apps Script creates, if it's still empty.
    const sheet1 = ss.getSheetByName('Sheet1');
    if (sheet1 && sheet1.getLastRow() === 0 && ss.getSheets().length > 1) {
        ss.deleteSheet(sheet1);
    }

    Logger.log('Setup complete. Spreadsheet URL: ' + ss.getUrl());
}

function createSheetWithHeaders_(ss, name, headers) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
        sheet = ss.insertSheet(name);
    }
    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
        sheet.setFrozenRows(1);
    }
    return sheet;
}

function seedProductsIfEmpty_(ss) {
    const sheet = ss.getSheetByName(SHEET_NAMES.PRODUCTS);
    if (sheet.getLastRow() > 1) return; // already has data beyond the header row

    const rows = seedProductsData_().map(row => {
        const withTimestamps = row.slice();
        const now = new Date();
        withTimestamps[withTimestamps.length - 2] = now; // created_at
        withTimestamps[withTimestamps.length - 1] = now; // updated_at
        return withTimestamps;
    });

    sheet.getRange(2, 1, rows.length, PRODUCTS_HEADERS.length).setValues(rows);
}

function seedSettingsIfEmpty_(ss) {
    const sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
    if (sheet.getLastRow() > 1) return;

    sheet.getRange(2, 1, 2, 2).setValues([
        ['whatsapp_number', '60102314951'],
        ['duitnow_qr_url', '']
    ]);
}

// The 15 dashboards already on the public site (index.html), so the
// Sheet starts out matching what visitors already see.
function seedProductsData_() {
    return [
        ["DB001", "HSE KPI Dashboard", "HSE", "Sistem pemantauan Keselamatan dan Kesihatan Pekerjaan dengan analitik insiden dan KPI keselamatan.", 90, 180, "", true, "https://via.placeholder.com/400x250/1e3a8a/ffffff?text=HSE+Dashboard", "", "Responsive dashboard, KPI cards, Interactive charts, Filter / slicer, Search functionality, Data table, CRUD compatible, Mobile friendly", "HTML5, CSS3, JavaScript, Microsoft Excel, Microsoft Power BI, Google Apps Script, Google Sheet", 4.9, 45, "1,200", 0, "popular", "active", '', ''],
        ["DB002", "OSH Dashboard", "OSH", "Papar KPI OSH, statistik insiden, audit keselamatan dan trend pematuhan dalam satu paparan.", 90, 180, "", true, "https://via.placeholder.com/400x250/2563eb/ffffff?text=OSH+Dashboard", "", "Responsive dashboard, KPI cards, Interactive charts, Filter / slicer, Search functionality, Data table, CRUD compatible, Mobile friendly", "HTML5, CSS3, JavaScript, Microsoft Excel, Microsoft Power BI, Google Apps Script, Google Sheet", 4.8, 30, "860", 0, "featured", "active", '', ''],
        ["DB003", "PAJSK Dashboard", "PAJSK", "Analisis pencapaian PAJSK pelajar mengikut domain, kelas dan tahun dengan carta interaktif.", 90, 180, "", true, "https://via.placeholder.com/400x250/0ea5e9/ffffff?text=PAJSK+Dashboard", "", "Responsive dashboard, KPI cards, Interactive charts, Filter / slicer, Search functionality, Data table, CRUD compatible, Mobile friendly", "HTML5, CSS3, JavaScript, Microsoft Excel, Microsoft Power BI, Google Apps Script, Google Sheet", 4.7, 18, "540", 0, "new", "active", '', ''],
        ["DB004", "Akademik Dashboard", "Akademik", "Pantau prestasi akademik pelajar, purata gred, perbandingan kelas dan trend keputusan peperiksaan.", 90, 180, "", true, "https://via.placeholder.com/400x250/1d4ed8/ffffff?text=Akademik+Dashboard", "", "Responsive dashboard, KPI cards, Interactive charts, Filter / slicer, Search functionality, Data table, CRUD compatible, Mobile friendly", "HTML5, CSS3, JavaScript, Microsoft Excel, Microsoft Power BI, Google Apps Script, Google Sheet", 4.9, 52, "1,340", 0, "bestseller", "active", '', ''],
        ["DB005", "Kokurikulum Dashboard", "Kokurikulum", "Rekod penyertaan dan pencapaian kokurikulum pelajar mengikut unit, kelab dan persatuan.", 90, 180, "", true, "https://via.placeholder.com/400x250/3b82f6/ffffff?text=Kokurikulum+Dashboard", "", "Responsive dashboard, KPI cards, Interactive charts, Filter / slicer, Search functionality, Data table, CRUD compatible, Mobile friendly", "HTML5, CSS3, JavaScript, Microsoft Excel, Microsoft Power BI, Google Apps Script, Google Sheet", 4.6, 14, "410", 0, "", "active", '', ''],
        ["DB006", "Project Monitoring Dashboard", "Project", "Pantau status projek, bajet dan tugasan team dengan paparan Gantt chart mudah.", 90, 180, "", true, "https://via.placeholder.com/400x250/1e40af/ffffff?text=Project+Dashboard", "", "Responsive dashboard, KPI cards, Interactive charts, Filter / slicer, Search functionality, Data table, CRUD compatible, Mobile friendly", "HTML5, CSS3, JavaScript, Microsoft Excel, Microsoft Power BI, Google Apps Script, Google Sheet", 4.7, 34, "980", 0, "featured", "active", '', ''],
        ["DB007", "Kos Projek Dashboard", "Project", "Analisis kos projek, perbelanjaan mengikut fasa dan perbandingan bajet vs actual.", 90, 180, "", true, "https://via.placeholder.com/400x250/1e3a8a/ffffff?text=Kos+Projek+Dashboard", "", "Responsive dashboard, KPI cards, Interactive charts, Filter / slicer, Search functionality, Data table, CRUD compatible, Mobile friendly", "HTML5, CSS3, JavaScript, Microsoft Excel, Microsoft Power BI, Google Apps Script, Google Sheet", 4.8, 22, "610", 0, "", "active", '', ''],
        ["DB008", "Operasi Projek Dashboard", "Project", "Pantau status kerja, milestone dan prestasi operasi projek secara real-time.", 90, 180, "", true, "https://via.placeholder.com/400x250/2563eb/ffffff?text=Operasi+Projek+Dashboard", "", "Responsive dashboard, KPI cards, Interactive charts, Filter / slicer, Search functionality, Data table, CRUD compatible, Mobile friendly", "HTML5, CSS3, JavaScript, Microsoft Excel, Microsoft Power BI, Google Apps Script, Google Sheet", 4.7, 16, "480", 0, "", "active", '', ''],
        ["DB009", "Finance Dashboard", "Finance", "Laporan kewangan, aliran tunai dan analisis perbelanjaan syarikat harian.", 90, 180, "", true, "https://via.placeholder.com/400x250/0f172a/38bdf8?text=Finance+Dashboard", "", "Responsive dashboard, KPI cards, Interactive charts, Filter / slicer, Search functionality, Data table, CRUD compatible, Mobile friendly", "HTML5, CSS3, JavaScript, Microsoft Excel, Microsoft Power BI, Google Apps Script, Google Sheet", 4.9, 56, "1,450", 0, "popular", "active", '', ''],
        ["DB010", "Result Exam Dashboard", "Akademik", "Analisis keputusan peperiksaan mengikut subjek, kelas dan gred dengan perbandingan tahun ke tahun.", 90, 180, "", true, "https://via.placeholder.com/400x250/1d4ed8/ffffff?text=Result+Exam+Dashboard", "", "Responsive dashboard, KPI cards, Interactive charts, Filter / slicer, Search functionality, Data table, CRUD compatible, Mobile friendly", "HTML5, CSS3, JavaScript, Microsoft Excel, Microsoft Power BI, Google Apps Script, Google Sheet", 4.8, 27, "700", 0, "new", "active", '', ''],
        ["DB011", "HR Management Dashboard", "HR", "Urus rekod pekerja, kehadiran, dan KPI kakitangan dalam satu sistem bersepadu.", 90, 180, "", true, "https://via.placeholder.com/400x250/2b4162/ffffff?text=HR+Dashboard", "", "Responsive dashboard, KPI cards, Interactive charts, Filter / slicer, Search functionality, Data table, CRUD compatible, Mobile friendly", "HTML5, CSS3, JavaScript, Microsoft Excel, Microsoft Power BI, Google Apps Script, Google Sheet", 4.8, 82, "2,500", 0, "bestseller", "active", '', ''],
        ["DB012", "Inventory Dashboard", "Inventory", "Urus stok barang masuk dan keluar dengan notifikasi stok rendah (low stock alert).", 90, 180, "", true, "https://via.placeholder.com/400x250/662e9b/ffffff?text=Inventory+Dashboard", "", "Responsive dashboard, KPI cards, Interactive charts, Filter / slicer, Search functionality, Data table, CRUD compatible, Mobile friendly", "HTML5, CSS3, JavaScript, Microsoft Excel, Microsoft Power BI, Google Apps Script, Google Sheet", 5, 12, "430", 0, "new", "active", '', ''],
        ["DB013", "Sales Performance Dashboard", "Operations", "Track sales harian, target bulanan, dan prestasi agen jualan syarikat anda.", 90, 180, "", true, "https://via.placeholder.com/400x250/ea3546/ffffff?text=Sales+Dashboard", "", "Responsive dashboard, KPI cards, Interactive charts, Filter / slicer, Search functionality, Data table, CRUD compatible, Mobile friendly", "HTML5, CSS3, JavaScript, Microsoft Excel, Microsoft Power BI, Google Apps Script, Google Sheet", 4.6, 28, "890", 0, "", "active", '', ''],
        ["DB014", "Training Dashboard", "Education", "Rekod latihan staf, jam kursus, sijil tamat dan analisis bajet latihan tahunan.", 90, 180, "", true, "https://via.placeholder.com/400x250/0392cf/ffffff?text=Training+Dashboard", "", "Responsive dashboard, KPI cards, Interactive charts, Filter / slicer, Search functionality, Data table, CRUD compatible, Mobile friendly", "HTML5, CSS3, JavaScript, Microsoft Excel, Microsoft Power BI, Google Apps Script, Google Sheet", 4.8, 19, "600", 0, "", "active", '', ''],
        ["DB015", "Asset Management Dashboard", "Operations", "Sistem inventori aset syarikat, susut nilai, lokasi aset dan rekod penyelenggaraan.", 90, 180, "", true, "https://via.placeholder.com/400x250/7bc043/ffffff?text=Asset+Dashboard", "", "Responsive dashboard, KPI cards, Interactive charts, Filter / slicer, Search functionality, Data table, CRUD compatible, Mobile friendly", "HTML5, CSS3, JavaScript, Microsoft Excel, Microsoft Power BI, Google Apps Script, Google Sheet", 4.9, 41, "1,150", 0, "popular", "active", '', '']
    ];
}

// Run this once (see the deploy instructions at the top of this file).
function createInitialAdmin() {
    if (!SETUP_ADMIN_EMAIL || !SETUP_ADMIN_PASSWORD) {
        throw new Error('Isi SETUP_ADMIN_EMAIL dan SETUP_ADMIN_PASSWORD dahulu, kemudian jalankan semula.');
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.ADMIN_USERS) || createSheetWithHeaders_(ss, SHEET_NAMES.ADMIN_USERS, ADMIN_USERS_HEADERS);

    const email = SETUP_ADMIN_EMAIL.trim().toLowerCase();
    const existing = sheetToObjects_(SHEET_NAMES.ADMIN_USERS).find(u => String(u.email).toLowerCase() === email);
    if (existing) {
        throw new Error('Admin dengan email ini sudah wujud: ' + email);
    }

    const salt = generateSalt_();
    const hash = hashPassword_(SETUP_ADMIN_PASSWORD, salt);
    sheet.appendRow([email, salt + '$' + hash, 'admin', new Date(), '']);

    Logger.log('Admin user created: ' + email + ' — sila padam SETUP_ADMIN_PASSWORD dari fail ini sekarang.');
}

// ============================================================
// WEB APP ENTRY POINTS
// ============================================================

function doGet(e) {
    return jsonResponse_({ ok: true, message: 'Data2Dashboard API is running.' });
}

function doPost(e) {
    let body;
    try {
        body = JSON.parse(e.postData.contents);
    } catch (err) {
        return jsonResponse_({ ok: false, message: 'Invalid request body.' });
    }

    try {
        switch (body.action) {
            case 'login': return jsonResponse_(handleLogin_(body));

            case 'listProducts': return jsonResponse_(handleListProducts_());
            case 'saveProduct': return jsonResponse_(requireAuth_(body, handleSaveProduct_));
            case 'deleteProduct': return jsonResponse_(requireAuth_(body, handleDeleteProduct_));

            case 'listReviews': return jsonResponse_(requireAuth_(body, handleListReviews_));
            case 'submitReview': return jsonResponse_(handleSubmitReview_(body));
            case 'setReviewStatus': return jsonResponse_(requireAuth_(body, handleSetReviewStatus_));

            case 'listOrders': return jsonResponse_(requireAuth_(body, handleListOrders_));
            case 'submitOrder': return jsonResponse_(handleSubmitOrder_(body));

            case 'getSettings': return jsonResponse_(handleGetSettings_());
            case 'saveSetting': return jsonResponse_(requireAuth_(body, handleSaveSetting_));

            default: return jsonResponse_({ ok: false, message: 'Unknown action: ' + body.action });
        }
    } catch (err) {
        return jsonResponse_({ ok: false, message: 'Server error: ' + err.message });
    }
}

function jsonResponse_(obj) {
    return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// AUTH
// ============================================================

function handleLogin_(body) {
    const email = String(body.email || '').trim().toLowerCase();
    const password = body.password || '';
    if (!email || !password) return { ok: false, message: 'Email dan password diperlukan.' };

    const user = sheetToObjects_(SHEET_NAMES.ADMIN_USERS).find(u => String(u.email).trim().toLowerCase() === email);
    if (!user) return { ok: false, message: 'Email atau password tidak sah.' };

    const parts = String(user.password_hash).split('$');
    const salt = parts[0];
    const storedHash = parts[1];
    const attemptHash = hashPassword_(password, salt);

    if (attemptHash !== storedHash) {
        return { ok: false, message: 'Email atau password tidak sah.' };
    }

    const token = Utilities.getUuid();
    CacheService.getScriptCache().put('session_' + token, email, SESSION_TTL_SECONDS);
    updateAdminLastLogin_(email);

    return { ok: true, token: token, role: user.role || 'admin' };
}

function updateAdminLastLogin_(email) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.ADMIN_USERS);
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const emailCol = headers.indexOf('email');
    const lastLoginCol = headers.indexOf('last_login');

    for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][emailCol]).trim().toLowerCase() === email) {
            sheet.getRange(i + 1, lastLoginCol + 1).setValue(new Date());
            return;
        }
    }
}

function requireAuth_(body, handler) {
    const email = validateToken_(body.token);
    if (!email) return { ok: false, message: 'Sesi tamat tempoh atau tidak sah. Sila login semula.' };
    return handler(body, email);
}

function validateToken_(token) {
    if (!token) return null;
    return CacheService.getScriptCache().get('session_' + token);
}

function generateSalt_() {
    return Utilities.getUuid();
}

function hashPassword_(password, salt) {
    const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + password, Utilities.Charset.UTF_8);
    return bytes.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
}

// ============================================================
// SHARED SHEET HELPERS
// ============================================================

function sheetToObjects_(name) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    return rows.slice(1).map(row => rowToObject_(headers, row));
}

function rowToObject_(headers, row) {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
}

// ============================================================
// PRODUCTS
// ============================================================

function handleListProducts_() {
    return { ok: true, products: sheetToObjects_(SHEET_NAMES.PRODUCTS) };
}

function handleSaveProduct_(body) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PRODUCTS);
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const idCol = headers.indexOf('product_id');
    const product = body.product || {};
    const now = new Date();

    let rowIndex = -1;
    if (product.product_id) {
        for (let i = 1; i < rows.length; i++) {
            if (rows[i][idCol] === product.product_id) { rowIndex = i; break; }
        }
    }

    if (rowIndex === -1) {
        product.product_id = product.product_id || nextId_(rows, idCol, 'DB');
        product.created_at = now;
        product.updated_at = now;
        const newRow = headers.map(h => product[h] !== undefined ? product[h] : '');
        sheet.appendRow(newRow);
    } else {
        const existing = rowToObject_(headers, rows[rowIndex]);
        const merged = Object.assign({}, existing, product, { updated_at: now });
        const newRow = headers.map(h => merged[h] !== undefined ? merged[h] : '');
        sheet.getRange(rowIndex + 1, 1, 1, headers.length).setValues([newRow]);
        product.product_id = existing.product_id;
    }

    return { ok: true, product: product };
}

function handleDeleteProduct_(body) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PRODUCTS);
    const rows = sheet.getDataRange().getValues();
    const idCol = rows[0].indexOf('product_id');

    for (let i = 1; i < rows.length; i++) {
        if (rows[i][idCol] === body.product_id) {
            sheet.deleteRow(i + 1);
            return { ok: true };
        }
    }
    return { ok: false, message: 'Product tidak dijumpai.' };
}

function nextId_(rows, idCol, prefix) {
    let max = 0;
    for (let i = 1; i < rows.length; i++) {
        const n = parseInt(String(rows[i][idCol]).replace(/\D/g, ''), 10);
        if (!isNaN(n) && n > max) max = n;
    }
    return prefix + String(max + 1).padStart(3, '0');
}

// ============================================================
// REVIEWS
// ============================================================

function handleListReviews_(body) {
    return { ok: true, reviews: sheetToObjects_(SHEET_NAMES.REVIEWS) };
}

// Public: anyone can submit a review. It always lands as Pending —
// only setReviewStatus_ (admin, authenticated) can approve it.
function handleSubmitReview_(body) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.REVIEWS);
    const review = body.review || {};
    const review_id = 'RV' + new Date().getTime();
    sheet.appendRow([
        review_id, review.product_id || '', review.name || '', review.phone || '',
        review.rating || '', review.comment || '', new Date(), 'Pending'
    ]);
    return { ok: true, review_id: review_id };
}

function handleSetReviewStatus_(body) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.REVIEWS);
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const idCol = headers.indexOf('review_id');
    const statusCol = headers.indexOf('status');

    for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][idCol]) === String(body.review_id)) {
            sheet.getRange(i + 1, statusCol + 1).setValue(body.status);
            return { ok: true };
        }
    }
    return { ok: false, message: 'Review tidak dijumpai.' };
}

// ============================================================
// ORDERS
// ============================================================

function handleListOrders_(body) {
    return { ok: true, orders: sheetToObjects_(SHEET_NAMES.ORDERS) };
}

// Public: the payment modal can log an order attempt before WhatsApp
// hand-off. payment_status starts Pending until Dr Excel verifies it.
function handleSubmitOrder_(body) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.ORDERS);
    const order = body.order || {};
    const order_id = 'ORD' + new Date().getTime();
    sheet.appendRow([
        order_id, order.product_id || '', order.customer_name || '', order.phone || '',
        order.package || '', order.price || '', 'Pending', new Date()
    ]);
    return { ok: true, order_id: order_id };
}

// ============================================================
// SETTINGS
// ============================================================

// Public: read-only, e.g. so the public site could one day pull the
// live DuitNow QR / WhatsApp number instead of hardcoding them.
function handleGetSettings_() {
    const rows = sheetToObjects_(SHEET_NAMES.SETTINGS);
    const settings = {};
    rows.forEach(r => { settings[r.setting] = r.value; });
    return { ok: true, settings: settings };
}

function handleSaveSetting_(body) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.SETTINGS);
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const keyCol = headers.indexOf('setting');
    const valCol = headers.indexOf('value');

    for (let i = 1; i < rows.length; i++) {
        if (rows[i][keyCol] === body.setting) {
            sheet.getRange(i + 1, valCol + 1).setValue(body.value);
            return { ok: true };
        }
    }
    sheet.appendRow([body.setting, body.value]);
    return { ok: true };
}
