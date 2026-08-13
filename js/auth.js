window.D2D = window.D2D || {};

// Admin authentication via Supabase Auth. No password ever touches our own
// code — signInWithPassword() talks to Supabase's auth server directly,
// and only a session (JWT, managed by supabase-js) is kept afterward.
D2D.auth = (() => {
    const translateAuthError_ = (error) => {
        const msg = (error && error.message) || '';
        if (msg.includes('Invalid login credentials')) return 'Email atau password tidak sah.';
        if (msg.includes('Email not confirmed')) return 'Email belum disahkan. Semak peti mel anda.';
        return msg || 'Tidak dapat menghubungi server. Sila cuba lagi.';
    };

    const getSession = async () => {
        const { data } = await D2D.supabase.auth.getSession();
        return data.session;
    };

    const isLoggedIn = async () => Boolean(await getSession());

    // Returns { ok, message }. Never fakes success.
    const login = async (email, password) => {
        const { error } = await D2D.supabase.auth.signInWithPassword({ email, password });
        if (error) return { ok: false, message: translateAuthError_(error) };
        return { ok: true };
    };

    const logout = async () => {
        await D2D.supabase.auth.signOut();
        window.location.reload();
    };

    return { login, logout, isLoggedIn, getSession };
})();
