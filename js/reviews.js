window.D2D = window.D2D || {};

// Customer Reviews: write-review toggle + real submission to Supabase.
// Every insert lands as status='Pending' regardless of what's sent — the
// data2dashboard.reviews table forces that server-side (see the
// trg_reviews_force_pending trigger in the migration), so a review only
// becomes publicly visible once an admin approves it.
D2D.reviews = (() => {
    const btnWriteReview = document.getElementById('btn-write-review');
    const reviewFormContainer = document.getElementById('review-form-container');
    const btnCancelReview = document.getElementById('btn-cancel-review');
    const reviewForm = document.getElementById('review-form');

    const initToggle = () => {
        if (btnWriteReview && reviewFormContainer) {
            btnWriteReview.addEventListener('click', () => {
                const isHidden = reviewFormContainer.style.display === 'none';
                reviewFormContainer.style.display = isHidden ? 'block' : 'none';
                if (isHidden) {
                    // Scroll slightly so the form is fully in view inside the modal
                    reviewFormContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        }

        if (btnCancelReview && reviewFormContainer) {
            btnCancelReview.addEventListener('click', () => {
                reviewFormContainer.style.display = 'none';
                reviewForm.reset();
            });
        }
    };

    const showFormError = (message) => {
        let errorEl = document.getElementById('review-form-error');
        if (!errorEl) {
            errorEl = document.createElement('p');
            errorEl.id = 'review-form-error';
            errorEl.style.color = 'var(--danger)';
            errorEl.style.marginBottom = '1rem';
            reviewForm.insertBefore(errorEl, reviewForm.firstChild);
        }
        errorEl.textContent = message;
    };

    const initSubmit = () => {
        if (!reviewForm) return;

        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = reviewForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Menghantar...';
            submitBtn.disabled = true;

            const productId = document.getElementById('form-product-id').value;
            const { error } = await D2D.supabase.from('reviews').insert({
                product_id: productId ? Number(productId) : null,
                name: document.getElementById('review-name').value.trim(),
                phone: document.getElementById('review-phone').value.trim(),
                rating: Number(document.getElementById('review-rating').value),
                comment: document.getElementById('review-comment').value.trim()
            });

            submitBtn.textContent = originalText;
            submitBtn.disabled = false;

            if (error) {
                showFormError('Gagal menghantar review: ' + error.message);
                return;
            }

            const existingError = document.getElementById('review-form-error');
            if (existingError) existingError.remove();

            // Create success message element
            const successMsg = document.createElement('div');
            successMsg.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            successMsg.style.color = 'var(--success)';
            successMsg.style.padding = '1rem';
            successMsg.style.borderRadius = 'var(--radius-sm)';
            successMsg.style.marginBottom = '1.5rem';
            successMsg.style.border = '1px solid var(--success)';
            successMsg.innerHTML = '<strong>Terima Kasih!</strong> Review anda telah dihantar dan sedang diproses (Pending Moderation).';

            // Insert success message at the top of the form container
            reviewFormContainer.insertBefore(successMsg, reviewFormContainer.firstChild);

            // Hide actual form fields
            reviewForm.style.display = 'none';

            // Remove success message and close form after a few seconds
            setTimeout(() => {
                successMsg.remove();
                reviewFormContainer.style.display = 'none';
                reviewForm.style.display = 'flex'; // Bring form back for next time
                reviewForm.reset();
            }, 4000);
        });
    };

    const init = () => {
        initToggle();
        initSubmit();
    };

    return { init };
})();
