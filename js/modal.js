window.D2D = window.D2D || {};

// Product Detail Modal + Demo Maintenance Modal
D2D.modal = (() => {
    const detailModal = document.getElementById('product-detail-modal');
    const maintenanceModal = document.getElementById('demo-maintenance-modal');

    const openMaintenance = (productName) => {
        if (!maintenanceModal) return;
        const powerbiBtn = document.getElementById('btn-whatsapp-powerbi');
        if (powerbiBtn) {
            powerbiBtn.href = D2D.utils.buildWhatsAppUrl(D2D.whatsapp.demoRequestMessage(productName));
        }
        maintenanceModal.showModal();
    };

    // Opens the real demo in a new tab, or falls back to the maintenance modal
    // when a dashboard doesn't have a live demo URL yet.
    const openDemo = (demoUrl, productName) => {
        if (demoUrl) {
            window.open(demoUrl, '_blank');
        } else {
            openMaintenance(productName);
        }
    };

    const openDetail = (card) => {
        if (!detailModal) return;

        const productId = card.dataset.productId;
        const title = card.querySelector('.card-title').textContent;
        const category = card.dataset.category;
        const price = card.querySelector('.card-price').textContent;
        const imgUrl = card.querySelector('img').src;
        const desc = card.querySelector('.card-desc').textContent;
        const demoUrl = card.querySelector('.demo-btn').dataset.demoUrl;

        document.getElementById('modal-title').textContent = title;
        document.getElementById('detail-category').textContent = category;
        document.getElementById('detail-price').textContent = price;
        document.getElementById('detail-image').src = imgUrl;
        document.getElementById('detail-desc').textContent = desc;

        // Store product ID in form for future backend use
        document.getElementById('form-product-id').value = productId;

        document.getElementById('detail-demo-btn').onclick = () => openDemo(demoUrl, title);

        document.getElementById('detail-buy-btn').onclick = () => {
            detailModal.close();
            D2D.payment.open(title, productId, 90);
        };

        document.getElementById('detail-setup-btn').onclick = () => {
            detailModal.close();
            D2D.payment.open(title, productId, 180);
        };

        // Reset Review form state if it was open
        const reviewFormContainer = document.getElementById('review-form-container');
        if (reviewFormContainer) reviewFormContainer.style.display = 'none';

        detailModal.showModal();
    };

    const init = () => {
        D2D.utils.closeDialogOnOutsideClick(detailModal);
        D2D.utils.closeDialogOnOutsideClick(maintenanceModal);
    };

    return { init, openDetail, openDemo, openMaintenance };
})();
