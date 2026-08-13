window.D2D = window.D2D || {};

// Admin panel: login gate + Dashboard Collection management (Add/Edit/
// Delete), backed by Supabase (data2dashboard schema). RLS on the products
// table enforces that only an authenticated admin can write — this file
// never manages tokens itself; supabase-js attaches the session
// automatically to every request once signed in via D2D.auth.login().
D2D.admin = (() => {
    let products = [];
    let pendingThumbnailFile = null;
    let pendingPreviewFile = null;
    let pendingThumbnailUrl = '';
    let pendingPreviewUrl = '';

    const db = () => D2D.supabase;

    // ---------- Data ----------

    const setBanner = (message) => {
        const el = document.getElementById('admin-connection-banner');
        if (!el) return;
        if (message) { el.hidden = false; el.textContent = message; }
        else { el.hidden = true; }
    };

    const refreshProducts = async () => {
        const countEl = document.getElementById('admin-product-count');
        if (countEl) countEl.textContent = 'Memuatkan...';
        const { data, error } = await db().from('products').select('*').order('id', { ascending: true });
        if (error) {
            products = [];
            setBanner('⚠️ Gagal memuatkan senarai dashboard: ' + error.message);
        } else {
            products = data;
            setBanner('');
        }
        renderTable();
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
                <td><img src="${p.thumbnail_url || ''}" alt="" class="admin-thumb"></td>
                <td>${p.id}</td>
                <td>${p.product_name}</td>
                <td>${p.category}</td>
                <td>RM${p.price_self_setup}</td>
                <td>RM${p.price_full_setup}</td>
                <td>${badgeLabel(p.badge)}</td>
                <td><span class="admin-status-pill admin-status-${p.status}">${p.status === 'active' ? 'Active' : 'Inactive'}</span></td>
                <td class="admin-row-actions">
                    <button type="button" class="btn btn-sm btn-outline" data-edit="${p.id}">Edit</button>
                    <button type="button" class="btn btn-sm btn-outline" data-toggle="${p.id}">${p.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                    <button type="button" class="btn btn-sm btn-outline admin-delete-btn" data-delete="${p.id}">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (countEl) countEl.textContent = `${products.length} dashboard dalam koleksi (Supabase)`;
    };

    // ---------- Form modal ----------

    const modal = () => document.getElementById('admin-product-modal');

    const resetImagePreviews = () => {
        pendingThumbnailFile = null;
        pendingPreviewFile = null;
        pendingThumbnailUrl = '';
        pendingPreviewUrl = '';
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
        document.getElementById('pf-product-id').value = isEdit ? product.id : '';
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
        pendingThumbnailUrl = isEdit ? (product.thumbnail_url || '') : '';
        pendingPreviewUrl = isEdit ? (product.preview_image_url || '') : '';
        if (pendingThumbnailUrl) {
            const tp = document.getElementById('pf-thumbnail-preview');
            tp.src = pendingThumbnailUrl; tp.hidden = false;
        }
        if (pendingPreviewUrl) {
            const pp = document.getElementById('pf-preview-preview');
            pp.src = pendingPreviewUrl; pp.hidden = false;
        }

        modal().showModal();
    };

    const previewImageFile = (input, imgEl, onSelected) => {
        input.addEventListener('change', () => {
            const file = input.files && input.files[0];
            if (!file) return;
            onSelected(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                imgEl.src = e.target.result;
                imgEl.hidden = false;
            };
            reader.readAsDataURL(file);
        });
    };

    // Uploads to the product-images Storage bucket (public read, admin-only
    // write per its RLS policy) and returns the public URL to store on the
    // product row. Returns the existing URL unchanged if no new file was
    // picked, so saving other fields doesn't clear an already-uploaded image.
    const uploadImageIfNeeded = async (file, existingUrl, prefix) => {
        if (!file) return existingUrl;
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await db().storage.from('product-images').upload(path, file, { upsert: false });
        if (error) throw new Error('Gagal upload imej: ' + error.message);
        const { data } = db().storage.from('product-images').getPublicUrl(path);
        return data.publicUrl;
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const submitBtn = document.querySelector('#admin-product-form button[type="submit"]');

        const id = document.getElementById('pf-product-id').value;
        const isEdit = Boolean(id);

        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Menyimpan...'; }
        try {
            const thumbnailUrl = await uploadImageIfNeeded(pendingThumbnailFile, pendingThumbnailUrl, 'thumb');
            const previewUrl = await uploadImageIfNeeded(pendingPreviewFile, pendingPreviewUrl, 'preview');

            const data = {
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
                thumbnail_url: thumbnailUrl,
                preview_image_url: previewUrl
            };

            const { error } = isEdit
                ? await db().from('products').update(data).eq('id', id)
                : await db().from('products').insert(data);

            if (error) throw new Error(error.message);

            modal().close();
            await refreshProducts();
        } catch (err) {
            alert(err.message);
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Simpan Dashboard'; }
        }
    };

    const handleTableClick = async (e) => {
        const editId = e.target.dataset.edit;
        const toggleId = e.target.dataset.toggle;
        const deleteId = e.target.dataset.delete;

        if (editId) {
            openForm(products.find(p => String(p.id) === editId));
            return;
        }

        if (toggleId) {
            const p = products.find(p => String(p.id) === toggleId);
            const newStatus = p.status === 'active' ? 'inactive' : 'active';
            e.target.disabled = true;
            const { error } = await db().from('products').update({ status: newStatus }).eq('id', toggleId);
            if (error) {
                alert(error.message);
                e.target.disabled = false;
            } else {
                await refreshProducts();
            }
            return;
        }

        if (deleteId) {
            if (!confirm('Padam dashboard ini daripada Supabase? Tindakan ini tidak boleh dibatalkan.')) return;
            const { error } = await db().from('products').delete().eq('id', deleteId);
            if (error) alert(error.message);
            else await refreshProducts();
        }
    };

    // ---------- Login gate ----------

    const showDashboard = () => {
        document.getElementById('admin-login-view').hidden = true;
        document.getElementById('admin-dashboard-view').hidden = false;
        refreshProducts();
    };

    const initLoginForm = () => {
        const form = document.getElementById('admin-login-form');
        const errorEl = document.getElementById('admin-login-error');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorEl.hidden = true;
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;

            const email = document.getElementById('admin-email').value.trim();
            const password = document.getElementById('admin-password').value;

            const result = await D2D.auth.login(email, password);
            submitBtn.disabled = false;
            if (result.ok) {
                showDashboard();
            } else {
                errorEl.textContent = result.message;
                errorEl.hidden = false;
            }
        });
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
            (file) => { pendingThumbnailFile = file; }
        );
        previewImageFile(
            document.getElementById('pf-preview-file'),
            document.getElementById('pf-preview-preview'),
            (file) => { pendingPreviewFile = file; }
        );

        D2D.utils.closeDialogOnOutsideClick(modal());
    };

    const init = async () => {
        initLoginForm();
        initLogout();
        initProductManagement();

        if (await D2D.auth.isLoggedIn()) {
            showDashboard();
        }
    };

    return { init };
})();
