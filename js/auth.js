window.D2D = window.D2D || {};

// Admin authentication. No email/password is ever hardcoded here — this
// module only relays a login attempt to the Google Apps Script backend
// configured in js/config.js and stores the short-lived token it returns.
D2D.auth = (() => {
    const TOKEN_KEY = 'd2d_admin_token';

    const getToken = () => sessionStorage.getItem(TOKEN_KEY);
    const setToken = (token) => sessionStorage.setItem(TOKEN_KEY, token);
    const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);
    const isLoggedIn = () => Boolean(getToken());
    const isBackendConnected = () => D2D.backendConfig.isConnected();

    // Content-Type is deliberately text/plain, not application/json:
    // Apps Script Web Apps can't answer a CORS preflight (OPTIONS)
    // request, so a "simple" request is required to avoid one being
    // triggered. Code.gs parses the body as JSON regardless.
    //
    // Apps Script delivers a Web App's response via a redirect to a
    // separate googleusercontent.com "echo" URL, and that hop is flaky:
    // the same request can non-deterministically come back as a clean
    // JSON response, an HTML error page, or (if the browser silently
    // downgrades the POST to a GET while following the redirect) doGet's
    // health-check payload instead of the action that was actually asked
    // for. None of this is under this code's control, so it's handled
    // here with a few silent retries rather than surfacing a raw parse
    // error or wrong-handler response to the caller.
    const HEALTH_CHECK_MESSAGE = 'Data2Dashboard API is running.';
    const MAX_ATTEMPTS = 4;

    const post = async (body, attempt = 1) => {
        let text;
        try {
            const res = await fetch(D2D.backendConfig.GAS_WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(body)
            });
            text = await res.text();
        } catch (err) {
            if (attempt < MAX_ATTEMPTS) return post(body, attempt + 1);
            throw new Error('Tidak dapat menghubungi server. Sila cuba lagi.');
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch (err) {
            if (attempt < MAX_ATTEMPTS) return post(body, attempt + 1);
            throw new Error('Google Apps Script tidak stabil buat masa ini. Sila cuba lagi sebentar.');
        }

        // The action we asked for never returns this exact message — only
        // doGet's health check does, so seeing it here means the POST got
        // downgraded to a GET somewhere along the redirect.
        if (data && data.message === HEALTH_CHECK_MESSAGE && attempt < MAX_ATTEMPTS) {
            return post(body, attempt + 1);
        }

        return data;
    };

    // Returns { ok, message }. Never fakes success — if the backend isn't
    // configured yet, it says so instead of letting anyone "log in".
    const login = async (email, password) => {
        if (!isBackendConnected()) {
            return {
                ok: false,
                message: 'Backend belum disambungkan. Konfigurasikan GAS_WEB_APP_URL dalam js/config.js selepas Google Apps Script dideploy.'
            };
        }

        try {
            const data = await post({ action: 'login', email, password });
            if (data && data.ok && data.token) {
                setToken(data.token);
                return { ok: true };
            }
            return { ok: false, message: (data && data.message) || 'Email atau password tidak sah.' };
        } catch (err) {
            return { ok: false, message: err.message || 'Tidak dapat menghubungi server. Sila cuba lagi.' };
        }
    };

    const logout = () => {
        clearToken();
        window.location.reload();
    };

    // Generic authenticated call to a Code.gs action (listProducts, saveProduct,
    // deleteProduct, etc). Attaches the session token automatically and clears
    // it if the server reports the session expired, so the next page load
    // returns to the login screen instead of looping on stale-token errors.
    const call = async (action, payload = {}, requireAuth = true) => {
        const body = Object.assign({ action }, payload);
        if (requireAuth) body.token = getToken();
        const data = await post(body);
        if (requireAuth && data && data.ok === false && /Sesi tamat/.test(data.message || '')) {
            clearToken();
        }
        return data;
    };

    return { login, logout, isLoggedIn, isBackendConnected, getToken, call };
})();
