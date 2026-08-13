window.D2D = window.D2D || {};

// Payment Modal: RM90 / RM180 package selection + WhatsApp payment-proof submission
D2D.payment = (() => {
    const paymentModal = document.getElementById('payment-modal');
    const packageOptions = document.querySelectorAll('.package-option');
    const payPackageInput = document.getElementById('pay-package');
    const payPriceEl = document.querySelector('.pay-price');

    const setPackage = (amount) => {
        const packageAmount = Number(amount);
        if (payPackageInput) payPackageInput.value = packageAmount;
        if (payPriceEl) payPriceEl.textContent = `RM${packageAmount}`;
        packageOptions.forEach(opt => {
            opt.classList.toggle('active', Number(opt.dataset.package) === packageAmount);
        });
    };

    const open = (productName, productId, packageAmount = 90) => {
        if (!paymentModal) return;
        document.getElementById('pay-product-name').textContent = productName;
        document.getElementById('pay-hidden-product').value = productName;
        // Optionally store product ID if needed for analytics/backend later
        setPackage(packageAmount);
        paymentModal.showModal();
    };

    const initPackageSelector = () => {
        packageOptions.forEach(opt => {
            opt.addEventListener('click', () => setPackage(opt.dataset.package));
        });
    };

    const initWhatsappSubmit = () => {
        const btnSubmitWhatsapp = document.getElementById('btn-submit-whatsapp');
        if (!btnSubmitWhatsapp) return;

        btnSubmitWhatsapp.addEventListener('click', () => {
            const nameInput = document.getElementById('buyer-name');
            const phoneInput = document.getElementById('buyer-phone');
            const productName = document.getElementById('pay-hidden-product').value;

            // Basic validation
            if (!nameInput.value.trim() || !phoneInput.value.trim()) {
                // Create a temporary inline error message instead of alert()
                let errorMsg = document.getElementById('payment-error');
                if (!errorMsg) {
                    errorMsg = document.createElement('p');
                    errorMsg.id = 'payment-error';
                    errorMsg.style.color = 'var(--danger)';
                    errorMsg.style.fontSize = '0.9rem';
                    errorMsg.style.marginTop = '1rem';
                    document.getElementById('payment-form').insertBefore(errorMsg, btnSubmitWhatsapp);
                }
                errorMsg.textContent = 'Sila masukkan Nama dan No. WhatsApp anda sebelum menghantar bukti bayaran.';
                return;
            }

            // Clear any error messages
            const existingError = document.getElementById('payment-error');
            if (existingError) existingError.remove();

            const packageAmount = payPackageInput ? payPackageInput.value : '90';
            const message = D2D.whatsapp.purchaseMessage(productName, packageAmount, nameInput.value, phoneInput.value);

            // Open WhatsApp in new tab
            window.open(D2D.utils.buildWhatsAppUrl(message), '_blank');

            // Close modal after a short delay
            setTimeout(() => {
                paymentModal.close();
                nameInput.value = '';
                phoneInput.value = '';
                setPackage(90);
            }, 1000);
        });
    };

    const init = () => {
        D2D.utils.closeDialogOnOutsideClick(paymentModal);
        initPackageSelector();
        initWhatsappSubmit();
    };

    return { init, open, setPackage };
})();
