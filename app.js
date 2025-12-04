
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
    const cartLines = document.getElementById('cartLines');
    const cartTotal = document.getElementById('cartTotal');
    const wishListLines = document.getElementById('wishListLines');

    const viewCartBtn = document.getElementById('viewCart');
    const clearCartBtn = document.getElementById('clearCart');
    const checkoutBtn = document.getElementById('checkout');
    const openWishlistBtn = document.getElementById('open-wishlist');

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


    function renderCart() {
        cartLines.innerHTML = '';
        const ids = Object.keys(cart);
        if (!ids.length) { cartLines.innerHTML = '<div class="muted">Səbət boşdur</div>' }
        let total = 0;
        ids.forEach(id => {
            const item = cart[id];
            total += item.product.price * item.qty;
            const row = document.createElement('div');
            row.className = 'cart-line';
            row.innerHTML = `
        <img src="${item.product.image}" alt="${escape(item.product.title)}" />
        <div style="flex:1">
          <div style="font-size:13px">${escape(item.product.title)}</div>
          <div class="muted small">${fmt(item.product.price)} x ${item.qty} = ${(item.product.price * item.qty).toFixed(2)}</div>
        </div>
        <div class="qty">
          <button class="dec">-</button>
          <div style="min-width:28px;text-align:center">${item.qty}</div>
          <button class="inc">+</button>
          <button class="btn remove" data-id="${id}" style="margin-left:8px">Sil</button>
        </div>
      `;
            row.querySelector('.inc').addEventListener('click', () => changeQty(id, item.qty + 1));
            row.querySelector('.dec').addEventListener('click', () => changeQty(id, Math.max(1, item.qty - 1)));
            row.querySelector('.remove').addEventListener('click', (e) => {
                const rid = e.currentTarget.getAttribute('data-id'); removeFromCart(rid);
            });
            cartLines.appendChild(row);
        });
        cartTotal.textContent = fmt(total);
        const count = ids.reduce((s, i) => s + cart[i].qty, 0);
        cartCountBadge.textContent = count;
    }


    function renderWish() {
        wishListLines.innerHTML = '';
        const ids = Object.keys(wish);
        if (!ids.length) { wishListLines.innerHTML = '<div class="muted">Wishlist boşdur</div>' }
        ids.forEach(id => {
            const p = wish[id];
            const row = document.createElement('div');
            row.className = 'cart-line';
            row.innerHTML = `
        <img src="${p.image}" alt="${escape(p.title)}" />
        <div style="flex:1">
          <div style="font-size:13px">${escape(p.title)}</div>
          <div class="muted small">${fmt(p.price)}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button class="btn primary wish-to-cart" data-id="${id}">Səbətə</button>
          <button class="btn remove-wish" data-id="${id}">Sil</button>
        </div>
      `;
            row.querySelector('.wish-to-cart').addEventListener('click', (e) => {
                const pid = e.currentTarget.getAttribute('data-id'); addToCart(wish[pid], 1); removeFromWish(pid);
            });
            row.querySelector('.remove-wish').addEventListener('click', (e) => {
                const pid = e.currentTarget.getAttribute('data-id'); removeFromWish(pid);
            });
            wishListLines.appendChild(row);
        });
        wishCountBadge.textContent = ids.length;
    }


    function addToCart(product, qty = 1) {
        const id = String(product.id);
        if (cart[id]) cart[id].qty += qty;
        else cart[id] = { product, qty };
        save(CART_KEY, cart);
        renderCart();
        toast('success', 'Məhsul səbətə əlavə edildi');
    }
    function changeQty(id, qty) { if (!cart[id]) return; cart[id].qty = qty; save(CART_KEY, cart); renderCart(); }
    function removeFromCart(id) { delete cart[id]; save(CART_KEY, cart); renderCart(); toast('success', 'Məhsul səbətdən silindi'); }
    function clearCart() { cart = {}; save(CART_KEY, cart); renderCart(); toast('success', 'Səbət təmizləndi'); }


    function toggleWish(product) {
        const id = String(product.id);
        if (wish[id]) { removeFromWish(id); }
        else { wish[id] = product; save(WISH_KEY, wish); renderWish(); toast('success', 'Wishlist-ə əlavə edildi'); }
    }
    function removeFromWish(id) { delete wish[id]; save(WISH_KEY, wish); renderWish(); toast('success', 'Wishlist-dən silindi'); }


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

    viewCartBtn.addEventListener('click', () => {

        document.querySelector('.sidebar').scrollIntoView({ behavior: 'smooth' });
        toast('', 'Səbətə bax');
    });

    openWishlistBtn.addEventListener('click', () => {
        document.querySelector('.sidebar').scrollIntoView({ behavior: 'smooth' });
        toast('', 'Wishlist açıldı');
    });

    clearCartBtn.addEventListener('click', () => {
        if (confirm('Səbəti tam təmizləmək istədiyinizə əminsiniz?')) clearCart();
    });

    checkoutBtn.addEventListener('click', () => {
        if (Object.keys(cart).length === 0) { toast('error', 'Səbət boşdur'); return; }
        toast('success', 'Ödəniş səhifəsinə yönləndirilirsiniz (demo)');
        setTimeout(() => clearCart(), 1000);
    });


    function escape(s) { return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#39;" }[m])); }


    (function init() {
        renderCart(); renderWish();
        initFetch();
    })();
});
