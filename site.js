/**
 * Jigme Lobsang Lepcha - Executive & Consultancy Site Engine
 * Minimal, lightweight, zero-dependency theme management, mobile navigation,
 * clipboard actions, and structured case study filtering.
 */

// Theme Management
(function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', initialTheme);
})();

document.addEventListener('DOMContentLoaded', () => {
  // Theme Toggle Button
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    updateThemeIcon();
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateThemeIcon();
    });
  }

  function updateThemeIcon() {
    if (!themeToggleBtn) return;
    const currentTheme = document.documentElement.getAttribute('data-theme');
    themeToggleBtn.innerHTML = currentTheme === 'dark'
      ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
      : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    themeToggleBtn.setAttribute('title', `Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`);
    themeToggleBtn.setAttribute('aria-label', `Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`);
  }

  // Mobile Menu Toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const navLinks = document.getElementById('navLinks');
  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      const isOpen = navLinks.classList.contains('open');
      mobileMenuBtn.setAttribute('aria-expanded', isOpen);
    });

    document.addEventListener('click', (e) => {
      if (!mobileMenuBtn.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('open');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Copy to Clipboard Utility
  const copyButtons = document.querySelectorAll('.copy-btn');
  copyButtons.forEach(button => {
    button.addEventListener('click', () => {
      const textToCopy = button.getAttribute('data-copy');
      if (textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          const originalHTML = button.innerHTML;
          button.innerText = 'Copied';
          setTimeout(() => {
            button.innerHTML = originalHTML;
          }, 2000);
        }).catch(err => {
          console.error('Clipboard error:', err);
        });
      }
    });
  });

  // Filter & Search Engine (supports both .case-card and .project-card)
  const filterBtns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.case-card, .project-card');
  const searchInput = document.getElementById('projectSearchInput');

  if (filterBtns.length > 0 && cards.length > 0) {
    let activeFilter = 'all';
    let searchQuery = '';

    function applyFilter() {
      cards.forEach(card => {
        const category = card.getAttribute('data-category') || '';
        const text = card.textContent.toLowerCase();
        const matchesCategory = (activeFilter === 'all' || category.toLowerCase().includes(activeFilter.toLowerCase()));
        const matchesSearch = (!searchQuery || text.includes(searchQuery));

        card.style.display = (matchesCategory && matchesSearch) ? 'flex' : 'none';
      });
    }

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.getAttribute('data-filter') || 'all';
        applyFilter();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        applyFilter();
      });
    }
  }
});
