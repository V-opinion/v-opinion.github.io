function showSectionFromHash() {
    // Get current hash from URL (e.g. #demokrati), default to #index if empty
    const hash = window.location.hash || '#index';
    
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // Show target section matching hash
    const targetSection = document.querySelector(hash);
    if (targetSection) {
        targetSection.style.display = 'block';
    } else {
        // Fallback to main page if hash doesn't exist
        const fallback = document.querySelector('#index');
        if (fallback) fallback.style.display = 'block';
    }
}

// Run on initial page load
window.addEventListener('DOMContentLoaded', showSectionFromHash);

// Run when hash changes (user clicks links or navigates back/forward)
window.addEventListener('hashchange', showSectionFromHash);
