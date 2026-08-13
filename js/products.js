window.D2D = window.D2D || {};

// Dashboard Collection: renders the public marketplace grid from Supabase
// (data2dashboard.products, status='active' only — also enforced by RLS),
// then keeps category/search filtering, sorting and card action delegation
// (Demo, Detail, Buy, Setup) working the same way they did against the old
// static HTML cards.
D2D.products = (() => {
    const categoryBtns = document.querySelectorAll('.category-btn');
    const searchInput = document.getElementById('filter-search');
    const sortSelect = document.getElementById('sort-select');
    const dashboardGrid = document.getElementById('dashboard-grid');

    const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%27400%27%20height%3D%27250%27%20viewBox%3D%270%200%20400%20250%27%3E%3Crect%20width%3D%27400%27%20height%3D%27250%27%20fill%3D%27%231e3a8a%27%2F%3E%3Ctext%20x%3D%2750%25%27%20y%3D%2750%25%27%20font-family%3D%27Arial%2C%20Helvetica%2C%20sans-serif%27%20font-size%3D%2723%27%20fill%3D%27%23ffffff%27%20text-anchor%3D%27middle%27%20dominant-baseline%3D%27middle%27%3EDashboard%3C%2Ftext%3E%3C%2Fsvg%3E";

    let allProducts = [];

    const esc = (v) => D2D.utils.escapeHtml(v);
    const formatPrice = (v) => D2D.utils.formatPrice(v);

    const formatViews = (n) => Number(n || 0).toLocaleString('en-US');

    const getById = (id) => allProducts.find(p => String(p.id) === String(id));

    const badgeMarkup = (badge) => {
        const labels = { popular: 'Popular', bestseller: 'Best Seller', new: 'New', featured: 'Featured' };
        if (!badge || !labels[badge]) return '';
        return `<span class="card-badge ${esc(badge)}">${labels[badge]}</span>`;
    };

    const cardHtml = (p) => `
        <article class="dashboard-card" data-product-id="${p.id}" data-category="${esc(p.category)}">
            <div class="card-thumbnail">
                ${badgeMarkup(p.badge)}
                <img src="${esc(p.thumbnail_url || PLACEHOLDER_IMG)}" alt="Preview ${esc(p.product_name)}">
            </div>
            <div class="card-body">
                <p class="card-category">${esc(p.category)}</p>
                <h3 class="card-title">${esc(p.product_name)}</h3>
                <p class="card-desc">${esc(p.description)}</p>
                <div class="card-meta">
                    <span class="meta-rating">⭐ ${p.rating != null ? Number(p.rating).toFixed(1) : '—'} (${esc(p.review_count || 0)} reviews)</span>
                    <span class="meta-views">👁 ${formatViews(p.demo_views)} demo views</span>
                </div>
                <div class="card-price">RM${formatPrice(p.price_self_setup)}</div>
                <div class="card-price-setup">RM${formatPrice(p.price_full_setup)} Setup Service</div>
            </div>
            <div class="card-footer">
                <button class="btn btn-sm btn-outline demo-btn" data-demo-url="${esc(p.demo_url || '')}">Cuba Demo</button>
                <button class="btn btn-sm btn-outline detail-btn" data-action="view-detail">Lihat Detail</button>
                <button class="btn btn-sm btn-primary buy-btn" data-action="buy">Beli RM${formatPrice(p.price_self_setup)}</button>
                <button class="btn btn-sm btn-outline setup-btn" data-action="setup">Minta Setup RM${formatPrice(p.price_full_setup)}</button>
            </div>
        </article>
    `;

    const showStatus = (message, isError) => {
        dashboardGrid.innerHTML = `<p class="grid-status-message${isError ? ' grid-status-error' : ''}">${esc(message)}</p>`;
    };

    const renderCards = (list) => {
        if (!list.length) {
            showStatus('Tiada dashboard dijumpai buat masa ini.', false);
            return;
        }
        dashboardGrid.innerHTML = list.map(cardHtml).join('');
    };

    const sortProducts = (list) => {
        const sorted = list.slice();
        switch (sortSelect ? sortSelect.value : 'popular') {
            case 'newest':
                sorted.sort((a, b) => Number(b.id) - Number(a.id));
                break;
            case 'rating':
                sorted.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
                break;
            case 'price_low':
                sorted.sort((a, b) => (Number(a.price_self_setup) || 0) - (Number(b.price_self_setup) || 0));
                break;
            case 'popular':
            default:
                sorted.sort((a, b) => (Number(b.purchase_count) || 0) - (Number(a.purchase_count) || 0)
                    || (Number(b.demo_views) || 0) - (Number(a.demo_views) || 0));
                break;
        }
        return sorted;
    };

    // Category/search filtering runs against the already-rendered DOM cards
    // (not a re-fetch or re-render) so the existing fade-out/fade-in
    // transition on the cards is preserved exactly as before.
    const filterDashboards = () => {
        const activeBtn = document.querySelector('.category-btn.active');
        const activeCategory = activeBtn ? activeBtn.dataset.category : 'All';
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

        dashboardGrid.querySelectorAll('.dashboard-card').forEach(card => {
            const cardCategory = card.dataset.category;
            const cardTitle = card.querySelector('.card-title').textContent.toLowerCase();
            const cardDesc = card.querySelector('.card-desc').textContent.toLowerCase();

            const matchesCategory = activeCategory === 'All' || cardCategory === activeCategory;
            const matchesSearch = cardTitle.includes(searchTerm) || cardDesc.includes(searchTerm);

            if (matchesCategory && matchesSearch) {
                card.style.display = 'flex';
                setTimeout(() => { card.style.opacity = '1'; card.style.transform = 'scale(1)'; }, 10);
            } else {
                card.style.opacity = '0';
                card.style.transform = 'scale(0.95)';
                setTimeout(() => { card.style.display = 'none'; }, 300);
            }
        });
    };

    const renderAndFilter = () => {
        renderCards(sortProducts(allProducts));
        filterDashboards();
    };

    const initFilters = () => {
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                categoryBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                filterDashboards();
            });
        });

        if (searchInput) searchInput.addEventListener('input', filterDashboards);
        if (sortSelect) sortSelect.addEventListener('change', renderAndFilter);
    };

    // Header Search box (redirects to marketplace section and filters)
    const initHeaderSearch = () => {
        const headerSearch = document.getElementById('header-search');
        const headerSearchBtn = document.querySelector('.search-box button');

        const triggerHeaderSearch = () => {
            if (headerSearch.value.trim() !== '') {
                window.location.hash = '#marketplace';
                if (searchInput) {
                    searchInput.value = headerSearch.value;
                    filterDashboards();
                }
            }
        };

        if (headerSearch && headerSearchBtn) {
            headerSearchBtn.addEventListener('click', triggerHeaderSearch);
            headerSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    triggerHeaderSearch();
                }
            });
        }
    };

    // Event Delegation for Dashboard Cards (Handles Demo, Detail, Buy and Setup clicks)
    const initCardActions = () => {
        if (!dashboardGrid) return;

        dashboardGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.dashboard-card');
            if (!card) return;

            const product = getById(card.dataset.productId);
            if (!product) return;

            const demoUrl = card.querySelector('.demo-btn').dataset.demoUrl;

            if (e.target.closest('.demo-btn')) {
                D2D.modal.openDemo(demoUrl, product.product_name);
            }
            if (e.target.closest('.detail-btn')) {
                D2D.modal.openDetail(product);
            }
            if (e.target.closest('.buy-btn')) {
                D2D.payment.open(product.product_name, product.id, 90);
            }
            if (e.target.closest('.setup-btn')) {
                D2D.payment.open(product.product_name, product.id, 180);
            }
        });
    };

    const fetchProducts = async () => {
        showStatus('Memuatkan dashboard...', false);
        const { data, error } = await D2D.supabase
            .from('products')
            .select('*')
            .eq('status', 'active')
            .order('id', { ascending: true });

        if (error) {
            console.error('Gagal memuatkan dashboard:', error.message);
            showStatus('Tidak dapat memuatkan senarai dashboard buat masa ini. Sila muat semula halaman atau cuba lagi sebentar lagi.', true);
            return;
        }

        allProducts = data || [];
        renderAndFilter();
    };

    const init = () => {
        initFilters();
        initHeaderSearch();
        initCardActions();
        fetchProducts();
    };

    return { init, getById };
})();
