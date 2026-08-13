window.D2D = window.D2D || {};

D2D.config = {
    whatsappNumber: '60102314951'
};

D2D.utils = {
    buildWhatsAppUrl(message) {
        return `https://wa.me/${D2D.config.whatsappNumber}?text=${encodeURIComponent(message)}`;
    },

    // Escapes text pulled from Supabase (product/review fields are admin- or
    // public-submitted) before it's interpolated into innerHTML templates.
    escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value === null || value === undefined ? '' : String(value);
        return div.innerHTML;
    },

    // numeric(10,2) price columns come back from PostgREST as strings (to
    // avoid JS float precision loss) — normalize before printing "RM..." labels.
    formatPrice(value) {
        const n = Number(value);
        if (Number.isNaN(n)) return '0';
        return Number.isInteger(n) ? String(n) : n.toFixed(2);
    },

    // Native <dialog> elements don't close on backdrop click by default — this adds that behavior.
    closeDialogOnOutsideClick(dialog) {
        if (!dialog) return;
        dialog.addEventListener('click', (e) => {
            const rect = dialog.getBoundingClientRect();
            const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height
                && rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
            if (!isInDialog) {
                dialog.close();
            }
        });
    }
};
