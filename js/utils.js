window.D2D = window.D2D || {};

D2D.config = {
    whatsappNumber: '60102314951'
};

D2D.utils = {
    buildWhatsAppUrl(message) {
        return `https://wa.me/${D2D.config.whatsappNumber}?text=${encodeURIComponent(message)}`;
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
