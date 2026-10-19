const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');

const source = readFileSync(join(__dirname, '..', 'site.js'), 'utf8');

// This small DOM double exercises browser-independent state and event behavior.
class Element {
  constructor(id = '', classes = [], text = '', attrs = {}) {
    this.id = id;
    this.attributes = { ...attrs };
    this.children = [];
    this.listeners = {};
    this.hidden = false;
    this.value = '';
    this.innerHTML = text;
    const tokens = new Set(classes);
    this.classList = {
      contains: value => tokens.has(value),
      add: value => tokens.add(value),
      remove: value => tokens.delete(value),
      toggle: (value, force = !tokens.has(value)) => force ? tokens.add(value) : tokens.delete(value),
    };
  }
  set innerHTML(value) { this.html = value; this.text = value.replace(/<[^>]+>/g, ''); }
  get innerHTML() { return this.html; }
  set textContent(value) { this.text = value; this.html = value; }
  get textContent() { return this.text; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
  fire(type, event = {}) {
    return Promise.all((this.listeners[type] || []).map(callback => callback({ target: this, stopPropagation() {}, ...event })));
  }
  append(child) { this.children.push(child); child.parent = this; return child; }
  contains(target) { return target === this || this.children.some(child => child.contains(target)); }
  closest(selector) { return this.tag === selector ? this : this.parent?.closest(selector); }
  focus() { this.focused = true; }
  scrollIntoView() { this.scrolled = true; }
}

function setup({ storageFails = false, savedTheme = null, clipboard = { writeText: async () => {} }, readyState = 'complete' } = {}) {
  const elements = [];
  const add = (...args) => { const element = new Element(...args); elements.push(element); return element; };
  const root = add('root', ['no-js']);
  const theme = add('themeToggleBtn');
  const menu = add('mobileMenuBtn');
  const nav = add('navLinks');
  const navLink = nav.append(add('navLink'));
  navLink.tag = 'a';
  const linkIcon = navLink.append(add('linkIcon'));
  const copy = add('copyEmail', ['copy-btn'], '<span>Copy email</span>', { 'data-copy': 'hello@example.com' });
  const siteStatus = add('siteStatus');
  const grid = add('projectsGrid');
  const cards = [
    grid.append(add('forest', ['case-card'], 'Forest   fire analytics', { 'data-category': 'ai' })),
    grid.append(add('mail', ['case-card'], 'Email automation', { 'data-category': 'email' })),
    grid.append(add('bank', ['case-card'], 'Bank CRM strategy', { 'data-category': 'strategy ai' })),
  ];
  cards[0].append(add('nested', ['case-card'], 'Nested detail', { 'data-category': 'ai' }));
  const filters = ['all', 'ai', 'strategy'].map(value => add(`filter-${value}`, ['filter-btn'], value, { 'data-filter': value }));
  const search = add('projectSearchInput');
  const filterStatus = add('filterStatus');
  const noResults = add('noResults');
  const clear = add('clearFilters');
  const document = new Element();
  Object.assign(document, {
    documentElement: root,
    readyState,
    getElementById: id => elements.find(element => element.id === id) || null,
    querySelectorAll: selector => elements.filter(element => element.classList.contains(selector.slice(1))),
  });
  const timers = new Map();
  const storage = new Map(savedTheme ? [['theme', savedTheme]] : []);
  const window = new Element();
  let nextTimer = 0;
  Object.assign(window, {
    innerWidth: 390,
    location: { hash: '' },
    localStorage: {
      getItem: key => { if (storageFails) throw new Error('Blocked'); return storage.get(key); },
      setItem: (key, value) => { if (storageFails) throw new Error('Blocked'); storage.set(key, value); },
    },
    setTimeout: callback => { timers.set(++nextTimer, callback); return nextTimer; },
    clearTimeout: id => timers.delete(id),
  });
  runInNewContext(source, { document, window, navigator: { clipboard } });
  const runTimers = () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()); };
  return { root, theme, menu, nav, linkIcon, copy, siteStatus, cards, filters, search, filterStatus, noResults, clear, document, window, timers, runTimers, storage };
}

test('blocked storage does not prevent theme state or page initialization', async () => {
  const page = setup({ storageFails: true });
  assert.equal(page.root.getAttribute('data-theme'), 'light');
  assert.equal(page.theme.getAttribute('aria-pressed'), 'false');
  assert.equal(page.root.classList.contains('js'), true);
  assert.equal(page.root.classList.contains('no-js'), false);
  await page.theme.fire('click');
  assert.equal(page.root.getAttribute('data-theme'), 'dark');
  assert.equal(page.theme.getAttribute('aria-pressed'), 'true');
  assert.equal(page.theme.getAttribute('aria-label'), 'Dark mode');
  assert.equal(page.theme.getAttribute('title'), 'Switch to light mode');
  assert.equal(page.filterStatus.textContent, '3 projects');
});

test('saved theme is restored and initialization waits for the DOM when needed', async () => {
  const page = setup({ savedTheme: 'dark', readyState: 'loading' });
  assert.equal(page.root.getAttribute('data-theme'), 'dark');
  assert.equal(page.menu.getAttribute('aria-expanded'), null);
  await page.document.fire('DOMContentLoaded');
  assert.equal(page.theme.getAttribute('aria-pressed'), 'true');
  await page.theme.fire('click');
  assert.equal(page.storage.get('theme'), 'light');
});

test('mobile menu toggles once and closes through links, outside click, Escape, and desktop resize', async () => {
  const page = setup();
  const isOpen = () => page.nav.classList.contains('open');
  await page.menu.fire('click');
  await page.document.fire('click', { target: page.menu });
  assert.equal(isOpen(), true);
  assert.equal(page.menu.getAttribute('aria-expanded'), 'true');
  assert.equal(page.menu.getAttribute('aria-controls'), 'navLinks');
  await page.menu.fire('click');
  assert.equal(isOpen(), false);
  await page.menu.fire('click');
  await page.nav.fire('click', { target: page.linkIcon });
  assert.equal(isOpen(), false);
  await page.menu.fire('click');
  await page.document.fire('click', { target: page.search });
  assert.equal(isOpen(), false);
  await page.menu.fire('click');
  await page.document.fire('keydown', { key: 'Escape' });
  assert.equal(isOpen(), false);
  assert.equal(page.menu.focused, true);
  await page.menu.fire('click');
  page.window.innerWidth = 860;
  await page.window.fire('resize');
  assert.equal(isOpen(), true);
  page.window.innerWidth = 861;
  await page.window.fire('resize');
  assert.equal(isOpen(), false);
  assert.equal(page.menu.getAttribute('aria-expanded'), 'false');
});

test('filters match category tokens, combine search, announce counts, and reset empty results', async () => {
  const page = setup();
  assert.equal(page.filterStatus.textContent, '3 projects');
  await page.filters[1].fire('click');
  assert.deepEqual(page.cards.map(card => card.hidden), [false, true, false]);
  assert.equal(page.filters[1].getAttribute('aria-pressed'), 'true');
  assert.equal(page.filters[0].getAttribute('aria-pressed'), 'false');
  page.search.value = '  FOREST FIRE  ';
  await page.search.fire('input');
  assert.deepEqual(page.cards.map(card => card.hidden), [false, true, true]);
  assert.equal(page.filterStatus.textContent, '1 of 3 projects');
  page.search.value = 'no matching project';
  await page.search.fire('input');
  assert.equal(page.noResults.hidden, false);
  assert.equal(page.filterStatus.textContent, '0 of 3 projects');
  await page.clear.fire('click');
  assert.equal(page.noResults.hidden, true);
  assert.equal(page.search.value, '');
  assert.equal(page.search.focused, true);
  assert.deepEqual(page.cards.map(card => card.hidden), [false, false, false]);
});

test('hash changes reveal a filtered project and tolerate malformed fragments', async () => {
  const page = setup();
  await page.filters[1].fire('click');
  assert.equal(page.cards[1].hidden, true);
  page.window.location.hash = '#mail';
  await page.window.fire('hashchange');
  assert.equal(page.cards[1].hidden, false);
  assert.equal(page.cards[1].scrolled, true);
  assert.equal(page.filters[0].getAttribute('aria-pressed'), 'true');
  page.window.location.hash = '#%invalid';
  await page.window.fire('hashchange');
});

test('clipboard success, repeated clicks, and failure preserve original button content', async () => {
  let fail = false;
  const page = setup({ clipboard: { writeText: async value => {
    assert.equal(value, 'hello@example.com');
    if (fail) throw new Error('Permission denied');
  } } });
  await page.copy.fire('click');
  assert.equal(page.copy.textContent, 'Copied');
  assert.match(page.siteStatus.textContent, /Copied hello@example.com/);
  assert.equal(page.timers.size, 1);
  fail = true;
  await page.copy.fire('click');
  assert.equal(page.copy.textContent, 'Copy failed');
  assert.match(page.siteStatus.textContent, /Select and copy hello@example.com manually/);
  assert.equal(page.timers.size, 1);
  page.runTimers();
  assert.equal(page.copy.innerHTML, '<span>Copy email</span>');
  // Explicitly unavailable clipboard also exercises the synchronous error path.
  const missing = setup({ clipboard: null });
  await missing.copy.fire('click');
  assert.equal(missing.copy.textContent, 'Copy failed');
});

test('an older clipboard request cannot overwrite a newer result or restoration timer', async () => {
  const pending = [];
  const page = setup({ clipboard: { writeText: () => new Promise((resolve, reject) => pending.push({ resolve, reject })) } });
  const first = page.copy.fire('click');
  const second = page.copy.fire('click');
  pending[1].resolve();
  await second;
  pending[0].reject(new Error('Old failure'));
  await first;
  assert.equal(page.copy.textContent, 'Copied');
  assert.equal(page.timers.size, 1);
  page.runTimers();
  assert.equal(page.copy.innerHTML, '<span>Copy email</span>');
});
