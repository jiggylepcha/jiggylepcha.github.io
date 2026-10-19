/* Small, dependency-free enhancements. All portfolio content works without JS. */
(() => {
  'use strict';

  const root = document.documentElement;
  let initialTheme = 'light';
  try {
    if (window.localStorage.getItem('theme') === 'dark') initialTheme = 'dark';
  } catch {
    // Storage may be unavailable in private or restricted browser sessions.
  }
  root.setAttribute('data-theme', initialTheme);

  const icon = (paths, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

  function init() {
    const status = document.getElementById('siteStatus');
    const announce = message => {
      if (status) status.textContent = message;
    };

    const themeButton = document.getElementById('themeToggleBtn');
    if (themeButton) {
      const sun = icon('<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>');
      const moon = icon('<path d="M20.9 13.1A9 9 0 0 1 10.9 3.1a9 9 0 1 0 10 10Z"/>');
      function updateThemeButton() {
        const isDark = root.getAttribute('data-theme') === 'dark';
        themeButton.innerHTML = isDark ? sun : moon;
        themeButton.setAttribute('aria-label', 'Dark mode');
        themeButton.setAttribute('aria-pressed', String(isDark));
        themeButton.setAttribute('title', `Switch to ${isDark ? 'light' : 'dark'} mode`);
      }
      themeButton.addEventListener('click', () => {
        const nextTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', nextTheme);
        try {
          window.localStorage.setItem('theme', nextTheme);
        } catch {
          // The selected theme still works for the current page.
        }
        updateThemeButton();
      });
      updateThemeButton();
    }

    const menuButton = document.getElementById('mobileMenuBtn');
    const nav = document.getElementById('navLinks');
    if (menuButton && nav) {
      const hamburger = icon('<path d="M4 6h16M4 12h16M4 18h16"/>');
      const close = icon('<path d="m6 6 12 12M6 18 18 6"/>');
      function setMenu(open) {
        nav.classList.toggle('open', open);
        menuButton.setAttribute('aria-expanded', String(open));
        menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        menuButton.innerHTML = open ? close : hamburger;
      }
      menuButton.setAttribute('aria-controls', nav.id);
      menuButton.addEventListener('click', event => {
        event.stopPropagation();
        setMenu(!nav.classList.contains('open'));
      });
      nav.addEventListener('click', event => {
        if (event.target.closest?.('a')) setMenu(false);
      });
      document.addEventListener('click', event => {
        const path = event.composedPath?.() || [];
        if (!path.includes(menuButton) && !menuButton.contains(event.target) && !nav.contains(event.target)) setMenu(false);
      });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && nav.classList.contains('open')) {
          setMenu(false);
          menuButton.focus();
        }
      });
      window.addEventListener('resize', () => {
        if (window.innerWidth > 860 && nav.classList.contains('open')) setMenu(false);
      });
      setMenu(false);
    }
    root.classList.remove('no-js');
    root.classList.add('js');

    document.querySelectorAll('.copy-btn').forEach(button => {
      const originalHTML = button.innerHTML;
      let restoreTimer;
      let latestRequest = 0;
      button.addEventListener('click', async () => {
        const value = button.getAttribute('data-copy');
        if (!value) return;
        const request = ++latestRequest;
        window.clearTimeout(restoreTimer);
        button.textContent = 'Copying…';
        try {
          if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
          await navigator.clipboard.writeText(value);
          if (request !== latestRequest) return;
          button.textContent = 'Copied';
          announce(`Copied ${value} to clipboard.`);
        } catch {
          if (request !== latestRequest) return;
          button.textContent = 'Copy failed';
          announce(`Could not copy. Select and copy ${value} manually.`);
        }
        restoreTimer = window.setTimeout(() => {
          button.innerHTML = originalHTML;
        }, 2500);
      });
    });

    const grid = document.getElementById('projectsGrid');
    if (!grid) return;
    const cards = Array.from(grid.children).filter(card => card.classList.contains('case-card'));
    const filters = Array.from(document.querySelectorAll('.filter-btn'));
    const search = document.getElementById('projectSearchInput');
    const filterStatus = document.getElementById('filterStatus');
    const noResults = document.getElementById('noResults');
    const clearFilters = document.getElementById('clearFilters');
    const normalize = value => value.toLowerCase().replace(/\s+/g, ' ').trim();
    const searchableCards = cards.map(card => ({
      card,
      categories: normalize(card.getAttribute('data-category') || '').split(' '),
      text: normalize(card.textContent),
    }));
    let activeFilter = 'all';

    function applyFilters() {
      const query = normalize(search?.value || '');
      let visible = 0;
      searchableCards.forEach(({ card, categories, text }) => {
        card.hidden = !(activeFilter === 'all' || categories.includes(activeFilter)) || !text.includes(query);
        if (!card.hidden) visible += 1;
      });
      filters.forEach(button => {
        const active = normalize(button.getAttribute('data-filter') || 'all') === activeFilter;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      if (filterStatus) {
        filterStatus.textContent = visible === cards.length
          ? `${visible} ${visible === 1 ? 'project' : 'projects'}`
          : `${visible} of ${cards.length} projects`;
      }
      if (noResults) noResults.hidden = visible > 0;
    }

    function resetFilters() {
      activeFilter = 'all';
      if (search) search.value = '';
      applyFilters();
    }

    filters.forEach(button => {
      button.addEventListener('click', () => {
        activeFilter = normalize(button.getAttribute('data-filter') || 'all');
        applyFilters();
      });
    });
    search?.addEventListener('input', applyFilters);
    clearFilters?.addEventListener('click', () => {
      resetFilters();
      (search || filters[0])?.focus();
    });

    function revealHashTarget() {
      let id;
      try {
        id = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      if (!id) return;
      const target = document.getElementById(id);
      const card = target && cards.find(item => item.contains(target));
      if (card?.hidden) {
        resetFilters();
        target.scrollIntoView({ block: 'start' });
      }
    }
    window.addEventListener('hashchange', revealHashTarget);
    applyFilters();
    revealHashTarget();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
