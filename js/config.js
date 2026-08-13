window.D2D = window.D2D || {};

/**
 * Backend connection config for the Admin panel (admin/index.html).
 *
 * The public site (index.html) needs none of this — it is fully static.
 * Only the Admin panel talks to a backend, and only once one is deployed.
 *
 * ── Not yet connected ─────────────────────────────────────────────────
 * GAS_WEB_APP_URL is intentionally empty. Until a Google Apps Script Web
 * App is deployed and its URL is pasted below, D2D.auth.login() and every
 * D2D.admin save/delete action will refuse to pretend success — they will
 * report "backend not connected" instead of faking a result.
 *
 * ── Google Sheet database schema ──────────────────────────────────────
 * One Google Sheet, five tabs:
 *
 * PRODUCTS
 *   product_id, product_name, category, description, price_self_setup,
 *   price_full_setup, demo_url, powerbi_available, thumbnail, preview_image,
 *   features, technology, rating, review_count, demo_views, purchase_count,
 *   badge, status, created_at, updated_at
 *
 * REVIEWS
 *   review_id, product_id, name, phone, rating, comment, date, status
 *   (status: Pending | Approved — only Approved reviews are public)
 *
 * ORDERS
 *   order_id, product_id, customer_name, phone, package, price,
 *   payment_status, date
 *
 * SETTINGS
 *   setting, value
 *   (e.g. duitnow_qr_url, whatsapp_number, statistics overrides)
 *
 * ADMIN_USERS
 *   email, password_hash, role, created_at, last_login
 *   Password is NEVER stored as plain text. GAS hashes the submitted
 *   password (salted, e.g. SHA-256) and compares it against password_hash
 *   server-side — the hash never leaves the sheet, and the browser never
 *   holds a password after the login request completes.
 *
 * ── Auth flow ────────────────────────────────────────────────────────
 * Browser --POST { action:'login', email, password }--> GAS Web App
 *   GAS looks up ADMIN_USERS by email, hashes the submitted password with
 *   the stored salt, compares to password_hash.
 * GAS --{ ok:true, token } or { ok:false, message }--> Browser
 *   The browser stores only the short-lived token (sessionStorage), never
 *   the email/password pair, and sends the token on every later request.
 *
 * ── Image upload flow (once connected) ──────────────────────────────
 * Browser picks a file → uploads it to the configured storage backend
 * (e.g. Google Drive via GAS, or Supabase Storage) → storage returns a
 * public URL → that URL (not the file) is written to PRODUCTS.thumbnail /
 * preview_image. A browser cannot write straight into this repo's
 * images/ folder, so until storage is wired, D2D.admin only shows a
 * local file preview and clearly labels it as not yet uploaded.
 */
D2D.backendConfig = {
    GAS_WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbwrRBjAHeNFW7e6J1T6wAnP5yYiyWgsII2bnUxVOEVVtw0RcbxKUqruubCUv5IKKIonCw/exec',

    isConnected() {
        return Boolean(D2D.backendConfig.GAS_WEB_APP_URL);
    }
};
