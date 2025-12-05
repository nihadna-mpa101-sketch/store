
document.addEventListener('DOMContentLoaded', () => {
    const API = 'https://fakestoreapi.com';


    let products = [];
    let filtered = [];
    const state = { query: '', category: 'all', sort: 'relevance' };

    const CART_KEY = 'fs_cart_v1';
    const WISH_KEY = 'fs_wish_v1';


    const productGrid = document.getElementById('productGrid');
    const categorySelect = document.getElementById('category');
    const sortSelect = document.getElementById('sort');
    const searchInput = document.getElementById('search');
    const clearSearchBtn = document.getElementById('clearSearch');
    const resultsInfo = document.getElementById('resultsInfo');

    const cartCountBadge = document.getElementById('cartCount');
    const wishCountBadge = document.getElementById('wishCount');

    let cart = load(CART_KEY) || {};
    let wish = load(WISH_KEY) || {};


    function load(k) { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } }
    function save(k, v) { localStorage.setItem(k, JSON.stringify(v)) }

    function toast(type, text, t = 2800) {
        const toasts = document.getElementById('toasts');
        const el = document.createElement('div');
        el.className = 'toast ' + (type || '');
        el.textContent = text;
        toasts.appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; el.addEventListener('transitionend', () => el.remove()) }, t);
    }

    function fmt(p) { return Number(p).toFixed(2) + ' AZN'; }


    async function initFetch() {
        try {
            const [items, cats] = await Promise.all([
                fetch(API + '/products').then(r => r.json()),
                fetch(API + '/products/categories').then(r => r.json())
            ]);
            products = items;
            populateCategories(cats);
            applyFilters();
        } catch (e) {
            console.error(e);
            toast('error', 'Məhsullar yüklənə bilmədi — şəbəkə xəta');
        }
    }

    function populateCategories(cats) {
        categorySelect.innerHTML = '';
        const all = document.createElement('option'); all.value = 'all'; all.textContent = 'Bütün kateqoriyalar';
        categorySelect.appendChild(all);
        cats.forEach(c => {
            const o = document.createElement('option'); o.value = c; o.textContent = c;
            categorySelect.appendChild(o);
        });
    }

    function renderProducts(list) {
        productGrid.innerHTML = '';
        if (!list.length) { productGrid.innerHTML = '<div class="muted">Heç bir məhsul tapılmadı</div>'; return }
        list.forEach(p => {
            const card = document.createElement('article');
            card.className = 'card';
            card.innerHTML = `
        <img src="${p.image}" alt="${escape(p.title)}" />
        <h4 title="${escape(p.title)}">${escape(p.title)}</h4>
        <div class="meta">
          <div class="muted small">${escape(p.category)}</div>
          <div class="price">${fmt(p.price)}</div>
        </div>
        <div class="actions">
          <button class="btn primary add-cart">Səbətə əlavə</button>
          <button class="btn ghost add-wish">♡ Wishlist</button>
        </div>
      `;
            card.querySelector('.add-cart').addEventListener('click', () => addToCart(p, 1));
            card.querySelector('.add-wish').addEventListener('click', () => toggleWish(p));
            productGrid.appendChild(card);
        });
    }


    function updateCartBadge() {
        const ids = Object.keys(cart);
        const count = ids.reduce((s, i) => s + cart[i].qty, 0);
        cartCountBadge.textContent = count;
    }

    function updateWishBadge() {
        const ids = Object.keys(wish);
        wishCountBadge.textContent = ids.length;
    }


    function addToCart(product, qty = 1) {
        const id = String(product.id);
        if (cart[id]) cart[id].qty += qty;
        else cart[id] = { product, qty };
        save(CART_KEY, cart);
        updateCartBadge();
        toast('success', 'Məhsul səbətə əlavə edildi');
    }


    function toggleWish(product) {
        const id = String(product.id);
        if (wish[id]) { removeFromWish(id); }
        else { wish[id] = product; save(WISH_KEY, wish); updateWishBadge(); toast('success', 'Wishlist-ə əlavə edildi'); }
    }
    function removeFromWish(id) { delete wish[id]; save(WISH_KEY, wish); updateWishBadge(); toast('success', 'Wishlist-dən silindi'); }


    function applyFilters() {
        const q = state.query.trim().toLowerCase();
        filtered = products.filter(p => {
            if (state.category !== 'all' && p.category !== state.category) return false;
            if (!q) return true;
            return (p.title + ' ' + (p.description || '')).toLowerCase().includes(q);
        });
        if (state.sort === 'price_asc') filtered.sort((a, b) => a.price - b.price);
        if (state.sort === 'price_desc') filtered.sort((a, b) => b.price - a.price);
        renderProducts(filtered);
        resultsInfo.textContent = `${filtered.length} məhsul tapıldı`;
    }


    function debounce(fn, wait = 300) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait) } }


    searchInput.addEventListener('input', debounce((e) => { state.query = e.target.value; applyFilters(); }, 300));
    clearSearchBtn.addEventListener('click', () => { searchInput.value = ''; state.query = ''; applyFilters(); });

    categorySelect.addEventListener('change', (e) => { state.category = e.target.value; applyFilters(); });
    sortSelect.addEventListener('change', (e) => { state.sort = e.target.value; applyFilters(); });

    function escape(s) { return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#39;" }[m])); }

    (function init() {
        updateCartBadge(); updateWishBadge();
        initFetch();
    })();
});