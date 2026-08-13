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
            const res = await fetch(D2D.backendConfig.GAS_WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'login', email, password })
            });
            const data = await res.json();

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

    return { login, logout, isLoggedIn, isBackendConnected, getToken };
})();
