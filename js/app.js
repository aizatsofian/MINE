document.addEventListener('DOMContentLoaded', () => {

    // Mobile Menu Toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');
    const header = document.getElementById('main-header');

    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', () => {
            const isExpanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
            mobileMenuToggle.setAttribute('aria-expanded', !isExpanded);
            navLinks.classList.toggle('active');
        });

        // Close mobile menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // Sticky Header Shadow on Scroll
    if (header) {
        window.addEventListener('scroll', () => {
            header.style.boxShadow = window.scrollY > 10 ? 'var(--shadow-md)' : 'var(--shadow-sm)';
        });
    }

    // Animate Statistics Numbers using Intersection Observer
    const statNumbers = document.querySelectorAll('.stat-number');
    let hasAnimated = false;

    const animateCounters = () => {
        statNumbers.forEach(stat => {
            const target = +stat.dataset.value;
            const duration = 2000; // 2 seconds
            const increment = target / (duration / 16); // 60fps
            let current = 0;

            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    // Check if it's a decimal (like rating 4.9)
                    if (target % 1 !== 0) {
                        stat.textContent = current.toFixed(1) + (stat.textContent.includes('+') ? '+' : '');
                    } else {
                        stat.textContent = Math.ceil(current) + (stat.textContent.includes('+') ? '+' : '');
                    }
                    requestAnimationFrame(updateCounter);
                } else {
                    stat.textContent = target + (stat.textContent.includes('+') ? '+' : '');
                }
            };
            updateCounter();
        });
    };

    // Setup Observer to trigger animation when stats section is visible
    const statsSection = document.getElementById('statistics');
    if (statsSection) {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !hasAnimated) {
                animateCounters();
                hasAnimated = true;
            }
        }, { threshold: 0.5 });

        observer.observe(statsSection);
    }

    // Initialize feature modules (see js/modal.js, payment.js, reviews.js, products.js)
    D2D.modal.init();
    D2D.payment.init();
    D2D.reviews.init();
    D2D.products.init();

    // Modal close (×) buttons only carry formmethod="dialog", which does
    // nothing outside a <form> — wire them to actually close their dialog.
    document.querySelectorAll('.modal-close').forEach(btn => {
        const dialog = btn.closest('dialog');
        if (dialog) btn.addEventListener('click', () => dialog.close());
    });
});
