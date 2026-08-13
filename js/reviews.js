window.D2D = window.D2D || {};

// Customer Reviews: write-review toggle + mock submission (Google Sheet moderation wiring comes later)
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

    const initSubmit = () => {
        if (!reviewForm) return;

        reviewForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Change button state to simulate loading
            const submitBtn = reviewForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Menghantar...';
            submitBtn.disabled = true;

            // Simulate API Call delay
            setTimeout(() => {
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

                // Reset button for future
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;

                // Remove success message and close form after a few seconds
                setTimeout(() => {
                    successMsg.remove();
                    reviewFormContainer.style.display = 'none';
                    reviewForm.style.display = 'flex'; // Bring form back for next time
                    reviewForm.reset();
                }, 4000);
            }, 1500);
        });
    };

    const init = () => {
        initToggle();
        initSubmit();
    };

    return { init };
})();
