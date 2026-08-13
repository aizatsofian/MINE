window.D2D = window.D2D || {};

// Admin panel: login gate + Dashboard Collection management (Add/Edit/Delete).
//
// Data is held in localStorage (seeded from D2D.PRODUCTS_SEED) until the
// Google Apps Script backend from js/config.js is connected. This is real,
// working persistence scoped to this browser — it is not presented as a
// shared production database, and the UI says so.
D2D.admin = (() => {
    const STORAGE_KEY = 'd2d_admin_products';
    let products = [];
    let pendingThumbnail = '';
    let pendingPreview = '';

    const isRemote = () => D2D.auth.isBackendConnected();

    // ---------- Data ----------

    const loadProducts = () => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try { return JSON.parse(raw); } catch (err) { /* fall through to seed */ }
        }
        return JSON.parse(JSON.stringify(D2D.PRODUCTS_SEED));
    };

    const saveProducts = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    };

    // When a backend is connected, PRODUCTS lives in the Google Sheet —
    // every mutation calls Code.gs directly and the table is re-fetched
    // afterwards rather than kept in sync by hand.
    const setBanner = (message) => {
        const el = document.getElementById('admin-connection-banner');
        if (!el) return;
        if (message) { el.hidden = false; el.textContent = message; }
        else { el.hidden = true; }
    };

    const refreshProducts = async () => {
        if (!isRemote()) {
            products = loadProducts();
            renderTable();
            return;
        }
        const countEl = document.getElementById('admin-product-count');
        if (countEl) countEl.textContent = 'Memuatkan...';
        try {
            const data = await D2D.auth.call('listProducts', {}, false);
            if (!data || !data.ok) throw new Error((data && data.message) || 'Gagal memuatkan senarai dashboard.');
            products = data.products || [];
            setBanner('');
        } catch (err) {
            products = [];
            setBanner('⚠️ ' + err.message);
        }
        renderTable();
    };

    // Logs back out to the login screen if the server says the session
    // expired (D2D.auth.call already clears the stale token for this).
    const handleApiError = (err) => {
        alert(err.message);
        if (!D2D.auth.isLoggedIn()) window.location.reload();
    };

    const nextProductId = () => {
        const nums = products
            .map(p => parseInt(String(p.product_id).replace(/\D/g, ''), 10))
            .filter(n => !isNaN(n));
        const next = (nums.length ? Math.max(...nums) : 0) + 1;
        return 'DB' + String(next).padStart(3, '0');
    };

    // ---------- Rendering ----------

    const badgeLabel = (badge) => ({
        popular: 'Popular', bestseller: 'Best Seller', new: 'New', featured: 'Featured'
    }[badge] || '—');

    const renderTable = () => {
        const tbody = document.getElementById('admin-product-tbody');
        const countEl = document.getElementById('admin-product-count');
        if (!tbody) return;

        tbody.innerHTML = '';
        products.forEach(p => {
            const tr = document.createElement('tr');
            if (p.status !== 'active') tr.classList.add('admin-row-inactive');
            tr.innerHTML = `
                <td><img src="${p.thumbnail || ''}" alt="" class="admin-thumb"></td>
                <td>${p.product_id}</td>
                <td>${p.product_name}</td>
                <td>${p.category}</td>
                <td>RM${p.price_self_setup}</td>
                <td>RM${p.price_full_setup}</td>
                <td>${badgeLabel(p.badge)}</td>
                <td><span class="admin-status-pill admin-status-${p.status}">${p.status === 'active' ? 'Active' : 'Inactive'}</span></td>
                <td class="admin-row-actions">
                    <button type="button" class="btn btn-sm btn-outline" data-edit="${p.product_id}">Edit</button>
                    <button type="button" class="btn btn-sm btn-outline" data-toggle="${p.product_id}">${p.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                    <button type="button" class="btn btn-sm btn-outline admin-delete-btn" data-delete="${p.product_id}">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (countEl) {
            countEl.textContent = isRemote()
                ? `${products.length} dashboard dalam koleksi (Google Sheet)`
                : `${products.length} dashboard dalam koleksi (tersimpan secara local dalam pelayar ini)`;
        }
    };

    // ---------- Form modal ----------

    const modal = () => document.getElementById('admin-product-modal');

    const resetImagePreviews = () => {
        pendingThumbnail = '';
        pendingPreview = '';
        const tp = document.getElementById('pf-thumbnail-preview');
        const pp = document.getElementById('pf-preview-preview');
        if (tp) { tp.hidden = true; tp.src = ''; }
        if (pp) { pp.hidden = true; pp.src = ''; }
        document.getElementById('pf-thumbnail-file').value = '';
        document.getElementById('pf-preview-file').value = '';
    };

    const openForm = (product) => {
        const isEdit = Boolean(product);
        document.getElementById('admin-modal-title').textContent = isEdit ? 'Edit Dashboard' : 'Add Dashboard';
        document.getElementById('pf-product-id').value = isEdit ? product.product_id : '';
        document.getElementById('pf-name').value = isEdit ? product.product_name : '';
        document.getElementById('pf-category').value = isEdit ? product.category : '';
        document.getElementById('pf-price-self').value = isEdit ? product.price_self_setup : 90;
        document.getElementById('pf-price-full').value = isEdit ? product.price_full_setup : 180;
        document.getElementById('pf-badge').value = isEdit ? (product.badge || '') : '';
        document.getElementById('pf-status').value = isEdit ? product.status : 'active';
        document.getElementById('pf-demo-url').value = isEdit ? product.demo_url : '';
        document.getElementById('pf-powerbi').checked = isEdit ? Boolean(product.powerbi_available) : true;
        document.getElementById('pf-desc').value = isEdit ? product.description : '';
        document.getElementById('pf-features').value = isEdit ? product.features : '';
        document.getElementById('pf-technology').value = isEdit ? product.technology : '';

        resetImagePreviews();
        pendingThumbnail = isEdit ? (product.thumbnail || '') : '';
        pendingPreview = isEdit ? (product.preview_image || '') : '';
        if (pendingThumbnail) {
            const tp = document.getElementById('pf-thumbnail-preview');
            tp.src = pendingThumbnail; tp.hidden = false;
        }
        if (pendingPreview) {
            const pp = document.getElementById('pf-preview-preview');
            pp.src = pendingPreview; pp.hidden = false;
        }

        modal().showModal();
    };

    const previewImageFile = (input, imgEl, onLoaded) => {
        input.addEventListener('change', () => {
            const file = input.files && input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                imgEl.src = e.target.result;
                imgEl.hidden = false;
                onLoaded(e.target.result);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        const id = document.getElementById('pf-product-id').value;
        const isEdit = Boolean(id);

        const data = {
            product_id: isEdit ? id : nextProductId(),
            product_name: document.getElementById('pf-name').value.trim(),
            category: document.getElementById('pf-category').value.trim(),
            price_self_setup: Number(document.getElementById('pf-price-self').value) || 0,
            price_full_setup: Number(document.getElementById('pf-price-full').value) || 0,
            badge: document.getElementById('pf-badge').value,
            status: document.getElementById('pf-status').value,
            demo_url: document.getElementById('pf-demo-url').value.trim(),
            powerbi_available: document.getElementById('pf-powerbi').checked,
            description: document.getElementById('pf-desc').value.trim(),
            features: document.getElementById('pf-features').value.trim(),
            technology: document.getElementById('pf-technology').value.trim(),
            thumbnail: pendingThumbnail,
            preview_image: pendingPreview,
            rating: isEdit ? undefined : 0,
            review_count: isEdit ? undefined : 0,
            demo_views: isEdit ? undefined : '0',
            purchase_count: isEdit ? undefined : 0
        };

        if (isRemote()) {
            const payload = { ...data };
            if (!isEdit) delete payload.product_id; // let Code.gs assign the next DBxxx id
            // Upload storage isn't connected yet (see admin-upload-note in the
            // form) — a locally-previewed image is a data: URI, not a real
            // URL, so it must never be written into the Sheet as one.
            if (typeof payload.thumbnail === 'string' && payload.thumbnail.startsWith('data:')) delete payload.thumbnail;
            if (typeof payload.preview_image === 'string' && payload.preview_image.startsWith('data:')) delete payload.preview_image;

            const submitBtn = document.querySelector('#admin-product-form button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;
            try {
                const result = await D2D.auth.call('saveProduct', { product: payload }, true);
                if (!result || !result.ok) throw new Error((result && result.message) || 'Gagal menyimpan dashboard.');
                modal().close();
                await refreshProducts();
            } catch (err) {
                handleApiError(err);
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
            return;
        }

        if (isEdit) {
            const idx = products.findIndex(p => p.product_id === id);
            products[idx] = { ...products[idx], ...data };
        } else {
            products.push({ ...data, rating: 0, review_count: 0, demo_views: '0', purchase_count: 0 });
        }

        saveProducts();
        renderTable();
        modal().close();
    };

    const handleTableClick = async (e) => {
        const editId = e.target.dataset.edit;
        const toggleId = e.target.dataset.toggle;
        const deleteId = e.target.dataset.delete;

        if (editId) {
            openForm(products.find(p => p.product_id === editId));
            return;
        }

        if (toggleId) {
            const p = products.find(p => p.product_id === toggleId);
            const newStatus = p.status === 'active' ? 'inactive' : 'active';

            if (isRemote()) {
                e.target.disabled = true;
                try {
                    const result = await D2D.auth.call('saveProduct', { product: { product_id: toggleId, status: newStatus } }, true);
                    if (!result || !result.ok) throw new Error((result && result.message) || 'Gagal mengemaskini status.');
                    await refreshProducts();
                } catch (err) {
                    handleApiError(err);
                    e.target.disabled = false;
                }
                return;
            }

            p.status = newStatus;
            saveProducts();
            renderTable();
            return;
        }

        if (deleteId) {
            const confirmMsg = isRemote()
                ? 'Padam dashboard ini daripada Google Sheet? Tindakan ini tidak boleh dibatalkan.'
                : 'Padam dashboard ini daripada koleksi local? Tindakan ini tidak boleh dibatalkan.';
            if (!confirm(confirmMsg)) return;

            if (isRemote()) {
                try {
                    const result = await D2D.auth.call('deleteProduct', { product_id: deleteId }, true);
                    if (!result || !result.ok) throw new Error((result && result.message) || 'Gagal memadam dashboard.');
                    await refreshProducts();
                } catch (err) {
                    handleApiError(err);
                }
                return;
            }

            products = products.filter(p => p.product_id !== deleteId);
            saveProducts();
            renderTable();
        }
    };

    // ---------- Login gate ----------

    const showBackendBanner = (el) => {
        if (!el) return;
        if (!D2D.auth.isBackendConnected()) {
            el.hidden = false;
            el.textContent = '⚠️ Backend (Google Apps Script) belum disambungkan. Login sebenar tidak akan berjaya sehingga GAS_WEB_APP_URL dikonfigurasikan dalam js/config.js.';
        } else {
            el.hidden = true;
        }
    };

    const showDashboard = () => {
        document.getElementById('admin-login-view').hidden = true;
        const dash = document.getElementById('admin-dashboard-view');
        dash.hidden = false;

        if (!isRemote()) {
            showBackendBanner(document.getElementById('admin-connection-banner'));
        }

        refreshProducts();
    };

    const initLoginForm = () => {
        const form = document.getElementById('admin-login-form');
        const errorEl = document.getElementById('admin-login-error');

        showBackendBanner(document.getElementById('admin-backend-banner'));

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorEl.hidden = true;

            const email = document.getElementById('admin-email').value.trim();
            const password = document.getElementById('admin-password').value;

            const result = await D2D.auth.login(email, password);
            if (result.ok) {
                showDashboard();
            } else {
                errorEl.textContent = result.message;
                errorEl.hidden = false;
            }
        });

        // Dev Mode: let the UI be reviewed before a real backend exists.
        // This is NOT authentication — it only appears while no backend is
        // configured. Once GAS_WEB_APP_URL is set (a real login exists),
        // the button is removed outright rather than left as a bypass.
        const devBtn = document.getElementById('admin-dev-preview-btn');
        const devNote = document.getElementById('admin-dev-note');
        if (D2D.auth.isBackendConnected()) {
            if (devBtn) devBtn.remove();
            if (devNote) devNote.remove();
        } else if (devBtn) {
            devBtn.addEventListener('click', () => showDashboard());
        }
    };

    const initLogout = () => {
        const btn = document.getElementById('admin-logout-btn');
        if (btn) btn.addEventListener('click', () => D2D.auth.logout());
    };

    const initProductManagement = () => {
        document.getElementById('admin-add-product-btn').addEventListener('click', () => openForm(null));
        document.getElementById('admin-modal-cancel').addEventListener('click', () => modal().close());
        document.getElementById('admin-modal-close').addEventListener('click', () => modal().close());
        document.getElementById('admin-product-form').addEventListener('submit', handleFormSubmit);
        document.getElementById('admin-product-tbody').addEventListener('click', handleTableClick);

        previewImageFile(
            document.getElementById('pf-thumbnail-file'),
            document.getElementById('pf-thumbnail-preview'),
            (dataUrl) => { pendingThumbnail = dataUrl; }
        );
        previewImageFile(
            document.getElementById('pf-preview-file'),
            document.getElementById('pf-preview-preview'),
            (dataUrl) => { pendingPreview = dataUrl; }
        );

        D2D.utils.closeDialogOnOutsideClick(modal());
    };

    const init = () => {
        initLoginForm();
        initLogout();
        initProductManagement();

        if (D2D.auth.isLoggedIn()) {
            showDashboard();
        }
    };

    return { init };
})();
