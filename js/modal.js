window.D2D = window.D2D || {};

// Product Detail Modal + Demo Maintenance Modal. Product fields come
// straight from a Supabase products row (passed in by D2D.products), and
// the review list underneath is fetched live per-product from
// data2dashboard.reviews (Approved only — the same rows RLS lets the
// public read).
D2D.modal = (() => {
    const detailModal = document.getElementById('product-detail-modal');
    const maintenanceModal = document.getElementById('demo-maintenance-modal');

    const PLACEHOLDER_DETAIL_IMG = "data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%27600%27%20height%3D%27400%27%20viewBox%3D%270%200%20600%20400%27%3E%3Crect%20width%3D%27600%27%20height%3D%27400%27%20fill%3D%27%23eeeeee%27%2F%3E%3Ctext%20x%3D%2750%25%27%20y%3D%2750%25%27%20font-family%3D%27Arial%2C%20Helvetica%2C%20sans-serif%27%20font-size%3D%2736%27%20fill%3D%27%23999999%27%20text-anchor%3D%27middle%27%20dominant-baseline%3D%27middle%27%3EPreview%3C%2Ftext%3E%3C%2Fsvg%3E";

    const esc = (v) => D2D.utils.escapeHtml(v);

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

    const splitList = (text) => (text || '').split(',').map(s => s.trim()).filter(Boolean);

    const renderFeatures = (features) => {
        const el = document.getElementById('detail-features');
        if (!el) return;
        const items = splitList(features);
        el.innerHTML = items.length
            ? items.map(f => `<li>${esc(f)}</li>`).join('')
            : '<li>Maklumat ciri akan dikemaskini tidak lama lagi.</li>';
    };

    const renderTech = (technology) => {
        const el = document.getElementById('detail-tech');
        if (!el) return;
        const items = splitList(technology);
        el.innerHTML = items.map(t => `<span class="tag">${esc(t)}</span>`).join('');
    };

    const formatReviewDate = (iso) => {
        try {
            return new Date(iso).toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' });
        } catch (e) {
            return '';
        }
    };

    const renderReviews = (reviews) => {
        const container = document.getElementById('review-list-container');
        if (!container) return;
        if (!reviews.length) {
            container.innerHTML = '<p class="review-list-status">Belum ada review untuk dashboard ini. Jadilah yang pertama menulis review!</p>';
            return;
        }
        container.innerHTML = reviews.map(r => `
            <div class="review-item">
                <div class="reviewer-meta">
                    <strong>${esc(r.name)}</strong> <span class="review-date">${esc(formatReviewDate(r.created_at))}</span>
                </div>
                <div class="review-stars">${'⭐'.repeat(Math.max(1, Math.min(5, Number(r.rating) || 0)))}</div>
                <p class="review-text">"${esc(r.comment)}"</p>
            </div>
        `).join('');
    };

    const loadReviews = async (productId) => {
        const container = document.getElementById('review-list-container');
        if (container) container.innerHTML = '<p class="review-list-status">Memuatkan review...</p>';

        const { data, error } = await D2D.supabase
            .from('reviews')
            .select('name, rating, comment, created_at')
            .eq('product_id', productId)
            .eq('status', 'Approved')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Gagal memuatkan review:', error.message);
            if (container) container.innerHTML = '<p class="review-list-status">Tidak dapat memuatkan review buat masa ini.</p>';
            return;
        }
        renderReviews(data || []);
    };

    const openDetail = (product) => {
        if (!detailModal || !product) return;

        document.getElementById('modal-title').textContent = product.product_name;
        document.getElementById('detail-category').textContent = product.category;
        document.getElementById('detail-price').textContent = `RM${D2D.utils.formatPrice(product.price_self_setup)}`;
        document.getElementById('detail-image').src = product.preview_image_url || product.thumbnail_url || PLACEHOLDER_DETAIL_IMG;
        document.getElementById('detail-desc').textContent = product.description || '';
        document.getElementById('detail-rating-score').textContent = product.rating != null ? Number(product.rating).toFixed(1) : '—';
        document.getElementById('review-total').textContent = product.review_count || 0;

        renderFeatures(product.features);
        renderTech(product.technology);

        // Store product ID in form so the review submission attaches to the right product
        document.getElementById('form-product-id').value = product.id;

        document.getElementById('detail-demo-btn').onclick = () => openDemo(product.demo_url, product.product_name);

        document.getElementById('detail-buy-btn').onclick = () => {
            detailModal.close();
            D2D.payment.open(product.product_name, product.id, 90);
        };

        document.getElementById('detail-setup-btn').onclick = () => {
            detailModal.close();
            D2D.payment.open(product.product_name, product.id, 180);
        };

        // Reset Review form state if it was open
        const reviewFormContainer = document.getElementById('review-form-container');
        if (reviewFormContainer) reviewFormContainer.style.display = 'none';

        detailModal.showModal();
        loadReviews(product.id);
    };

    const init = () => {
        D2D.utils.closeDialogOnOutsideClick(detailModal);
        D2D.utils.closeDialogOnOutsideClick(maintenanceModal);
    };

    return { init, openDetail, openDemo, openMaintenance };
})();
