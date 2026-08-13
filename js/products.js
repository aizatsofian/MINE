window.D2D = window.D2D || {};

// Dashboard Collection: category/search filtering + card action delegation (Demo, Detail, Buy, Setup)
D2D.products = (() => {
    const categoryBtns = document.querySelectorAll('.category-btn');
    const dashboardCards = document.querySelectorAll('#dashboard-grid .dashboard-card');
    const searchInput = document.getElementById('filter-search');
    const dashboardGrid = document.getElementById('dashboard-grid');

    const filterDashboards = () => {
        const activeCategory = document.querySelector('.category-btn.active').dataset.category;
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

        dashboardCards.forEach(card => {
            const cardCategory = card.dataset.category;
            const cardTitle = card.querySelector('.card-title').textContent.toLowerCase();
            const cardDesc = card.querySelector('.card-desc').textContent.toLowerCase();

            const matchesCategory = activeCategory === 'All' || cardCategory === activeCategory;
            const matchesSearch = cardTitle.includes(searchTerm) || cardDesc.includes(searchTerm);

            if (matchesCategory && matchesSearch) {
                card.style.display = 'flex'; // Restore flex layout
                setTimeout(() => { card.style.opacity = '1'; card.style.transform = 'scale(1)'; }, 10);
            } else {
                card.style.opacity = '0';
                card.style.transform = 'scale(0.95)';
                setTimeout(() => { card.style.display = 'none'; }, 300); // Wait for transition
            }
        });
    };

    const initFilters = () => {
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                categoryBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                filterDashboards();
            });
        });

        if (searchInput) {
            searchInput.addEventListener('input', filterDashboards);
        }
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
            const target = e.target;
            const card = target.closest('.dashboard-card');
            if (!card) return;

            const productId = card.dataset.productId;
            const title = card.querySelector('.card-title').textContent;
            const demoUrl = card.querySelector('.demo-btn').dataset.demoUrl;

            if (target.closest('.demo-btn')) {
                D2D.modal.openDemo(demoUrl, title);
            }

            if (target.closest('.detail-btn')) {
                D2D.modal.openDetail(card);
            }

            if (target.closest('.buy-btn')) {
                D2D.payment.open(title, productId, 90);
            }

            if (target.closest('.setup-btn')) {
                D2D.payment.open(title, productId, 180);
            }
        });
    };

    const init = () => {
        initFilters();
        initHeaderSearch();
        initCardActions();
    };

    return { init };
})();
