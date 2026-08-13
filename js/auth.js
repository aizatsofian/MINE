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
    const post = (body) => fetch(D2D.backendConfig.GAS_WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body)
    }).then(res => res.json());

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
            return { ok: false, message: 'Tidak dapat menghubungi server. Sila cuba lagi.' };
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
