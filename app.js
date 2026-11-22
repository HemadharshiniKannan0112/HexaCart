/* HexaCart – storefront + admin. All data goes through HexaCart (hexacart-firestore-api.js) = Firestore REST via jQuery Ajax */
const H = HexaCart;

/* ---------- APPEARANCE ---------- */
function setTheme(theme) {
  const selected = theme === 'dark' ? 'dark' : 'warm';
  document.documentElement.setAttribute('data-theme', selected);
  try { localStorage.setItem('hexacart-theme', selected); } catch (x) {}
  $('#theme-warm').toggleClass('active', selected === 'warm').attr('aria-pressed', selected === 'warm');
  $('#theme-dark').toggleClass('active', selected === 'dark').attr('aria-pressed', selected === 'dark');
}
let initialTheme = 'warm';
try { initialTheme = localStorage.getItem('hexacart-theme') || 'warm'; } catch (x) {}
setTheme(initialTheme);
$(document).on('click', '#theme-warm', () => setTheme('warm'));
$(document).on('click', '#theme-dark', () => setTheme('dark'));
const productImage = id => (P[id] && P[id].imageUrl) ? e(P[id].imageUrl) : `assets/products/${e(id)}.jpg`;
const money = n => '₹' + Number(n).toLocaleString('en-IN');
const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const today = () => new Date().toISOString().slice(0, 10);
const RE = { e: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, m: /^[6-9]\d{9}$/, p: /^(?=.*\d).{6,}$/ };
const MSG = { EMAIL_EXISTS: 'Email already registered', INVALID_LOGIN_CREDENTIALS: 'Wrong email or password', EMAIL_NOT_FOUND: 'Email not registered', INVALID_PASSWORD: 'Wrong password' };
const msg = x => {
  if (typeof x === 'string') return x; if (x instanceof Error) return x.message;
  const m = (x.responseJSON && x.responseJSON.error && x.responseJSON.error.message) || x.statusText || 'Error';
  return MSG[m] || m;
};
const ok = (p, f) => p.done(f).fail(x => toast(msg(x), 1));
let C = {}, P = {}, S = { v: 'shop', cat: 'all', q: '', searchItems: [], searchPage: 1, cart: {}, cur: [null], next: null, auth: 'in', tab: 'inv', ipg: [null], ipn: null, me: null, rep: 's_all', O: {}, IP: {}, U: {} };

/* ---------- small UI helpers ---------- */
function toast(m, bad) { $('#toast').text(m).toggleClass('bad', !!bad).addClass('on'); clearTimeout(toast.t); toast.t = setTimeout(() => $('#toast').removeClass('on'), 3000); }
function modal(h) { $('#modal').html('<div class="mb">' + h + '</div>').addClass('on'); }
const T = (h, r) => `<div class="sc"><table><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr>${r.map(x => `<tr>${x.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="9">No data</td></tr>'}</table></div>`;
const G = (a, kf, vf) => { const m = {}; a.forEach(x => { const k = kf(x); m[k] = (m[k] || 0) + vf(x); }); return Object.entries(m); };
const pagerHtml = (prev, label, next, pa, na) => `<div class="pager">${prev ? `<button class="pg" data-a="${pa}">‹ Previous</button>` : ''}<button class="pg on">${label}</button>${next ? `<button class="pg" data-a="${na}">Next ›</button>` : ''}</div>`;

function nav() {
  const session = H.session(), n = Object.values(S.cart).reduce((a, b) => a + b.q, 0);
  const who = S.me ? S.me.name.split(' ')[0] : (session ? session.email.split('@')[0] : '');
  const ico = (path) => `<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
  $('#nav').html(`<button data-a="go" data-v="shop">${ico('<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>')}Shop</button>` + (session
    ? `<button data-a="go" data-v="cart">${ico('<path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 1.9-1.4L22 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>')}Cart <b class="pill">${n}</b></button><button data-a="go" data-v="orders">${ico('<path d="M7 3h10l3 3v15H4V3z"/><path d="M8 11h8M8 15h8M8 7h5"/>')}Orders</button>` +
      (H.isAdmin() ? `<button data-a="go" data-v="admin">${ico('<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/>')}Admin</button>` : '') + `<button data-a="out">Sign out (${e(who)})</button>`
    : `<button data-a="go" data-v="auth">${ico('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>')}Sign in / Register</button>`));
}
function draw() {
  let v = S.v; const s = H.session();
  if (['cart', 'orders', 'admin'].includes(v) && !s) v = S.v = 'auth';
  if (v === 'admin' && !H.isAdmin()) v = S.v = 'shop';
  nav(); ({ shop, auth, cart, orders, admin }[v])(); window.scrollTo(0, 0);
}
function go(v) { S.v = v; if (v === 'shop') S.cur = [null]; draw(); }

/* ---------- SHOP (customers) ---------- */
function shop() {
  const chips = ['all', ...Object.keys(C)].map(id =>
    `<button class="chip ${S.cat == id ? 'on' : ''}" data-a="cat" data-v="${id}">${id == 'all' ? 'All products' : e(C[id].name)}</button>`
  ).join('');
  $('#app').html(`
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">WELCOME TO HEXACART</p>
        <h1>Good finds for everyday life.</h1>
        <p>Browse useful essentials across technology, fashion, home and more. Straightforward prices, secure checkout and order tracking in one place.</p>
        <button class="btn" data-a="shopnow">Browse products</button>
      </div>
      <div class="hero-note"><strong>Shop with confidence</strong><span>Clear prices · Stock visibility · Order history</span></div>
    </section>
    <div class="trust-row"><span>Secure account sign-in</span><span>Cash or approved credit</span><span>Order details in your account</span></div>
    <div class="shop-toolbar">
      <div class="search-wrap"><input id="sq" type="search" placeholder="Search products by name…" value="${e(S.q)}" aria-label="Search products"></div>
      <div class="category-list">${chips}</div>
    </div>
    <div class="section-row"><div><h2>Products</h2><p>Explore the current collection</p></div></div>
    <div class="grid" id="grid"></div><div id="pager"></div>`);
  fetchShop();
}
function card(p) {
  P[p.id] = p;
  const out = p.qty <= 0;
  return `<article class="card">
    <img class="product-image" src="${productImage(p.id)}" alt="${e(p.title)}" loading="lazy" data-a="detail" data-v="${e(p.id)}" onerror="this.onerror=null;this.src='assets/products/placeholder.svg'">
    <div class="cb">
      <h3><button class="product-title-link" data-a="detail" data-v="${e(p.id)}">${e(p.title)}</button></h3>
      <p class="product-description">${e(p.des)}</p>
      <div class="row"><b class="pr">${money(p.price)}</b><span class="tag ${p.qty < 15 ? 'low' : ''}">${out ? 'Out of stock' : p.qty < 15 ? `${p.qty} left` : 'In stock'}</span></div>
      <div class="row"><button class="btn g" data-a="detail" data-v="${e(p.id)}">Details</button><button class="btn" data-a="add" data-v="${e(p.id)}" ${out ? 'disabled' : ''}>Add to cart</button></div>
    </div>
  </article>`;
}
function renderSearchPage() {
  const size = 6, pages = Math.max(1, Math.ceil(S.searchItems.length / size));
  S.searchPage = Math.min(S.searchPage, pages);
  const items = S.searchItems.slice((S.searchPage - 1) * size, S.searchPage * size);
  $('#grid').html(items.map(card).join('') || '<p class="mut">No matching products found. Try another search.</p>');
  $('#pager').html(S.searchItems.length > size ? pagerHtml(S.searchPage > 1, `Page ${S.searchPage} of ${pages}`, S.searchPage < pages, 'searchprev', 'searchnext') : '');
}
function fetchShop() {
  const q = S.q.trim();
  $('#grid').html('<p class="mut">Loading products…</p>'); $('#pager').empty();
  if (q) {
    ok(H.searchProducts(q), items => {
      S.searchItems = items.filter(x => x.active !== false && (S.cat === 'all' || x.cat_id === S.cat));
      S.searchPage = 1;
      renderSearchPage();
    });
    return;
  }
  ok(H.shopPage(S.cur[S.cur.length - 1], 6, S.cat), r => {
    S.next = r.next;
    $('#grid').html(r.items.map(card).join('') || '<p class="mut">No products in this category yet.</p>');
    $('#pager').html(pagerHtml(S.cur.length > 1, 'Page ' + S.cur.length, r.hasMore, 'prev', 'next'));
  });
}

/* ---------- AUTH ---------- */
function auth() {
  const t = S.auth, tb = (k, l) => `<button class="chip ${t == k ? 'on' : ''}" data-a="atab" data-v="${k}">${l}</button>`;
  const f = {
    in: `<div class="f"><input id="e1" placeholder="Email"><input id="p1" type="password" placeholder="Password"><button class="btn" data-a="in">Sign in</button></div>`,
    up: `<div class="f"><input id="n2" placeholder="Full name"><input id="e2" placeholder="Email"><input id="m2" placeholder="Mobile (10 digits)"><input id="p2" type="password" placeholder="Password (6+, with a number)"><button class="btn" data-a="up">Create account</button></div>`,
    rs: `<div class="f"><input id="e3" placeholder="Registered email"><button class="btn" data-a="rs">Send reset mail</button><p class="mut">Firebase emails you a link to set a new password.</p></div>`
  }[t];
  $('#app').html(`<section class="panel auth-panel"><div class="page-heading"><p class="eyebrow">YOUR HEXACART ACCOUNT</p><h1>Welcome back</h1><p>Sign in to manage your cart, purchases and account details.</p></div><div class="tabs">${tb('in', 'Sign in')}${tb('up', 'Create account')}${tb('rs', 'Reset password')}</div>${f}</section>`);
}

/* ---------- CART / CHECKOUT ---------- */
function cart() {
  const ids = Object.keys(S.cart); let tot = 0;
  const rows = ids.map(id => { const { p, q } = S.cart[id]; tot += p.price * q;
    return `<tr><td><div class="order-line"><img src="${productImage(id)}" alt="${e(p.title)}" onerror="this.onerror=null;this.src='assets/products/placeholder.svg'"><strong>${e(p.title)}</strong></div></td><td>${money(p.price)}</td><td><input type="number" class="sm" min="1" max="${p.qty}" value="${q}" data-c="${id}"></td><td>${money(p.price * q)}</td><td><button class="ic" data-a="rm" data-v="${id}">Remove</button></td></tr>`; }).join('');
  $('#app').html('<div class="panel"><h2>Your cart</h2>' + (ids.length
    ? `<div class="sc"><table><tr><th>Item</th><th>Price</th><th>Qty</th><th>Total</th><th></th></tr>${rows}</table></div><h3>Total: ${money(tot)}</h3>
    <div class="bar"><label><input type="radio" name="pay" value="cash" checked> Cash</label><label><input type="radio" name="pay" value="credit"> Credit limit (available <b id="cl">…</b>)</label></div><button class="btn" data-a="buy">Place order</button>`
    : '<p class="mut">Cart is empty – go add something lovely.</p>') + '</div>');
  if (ids.length) H.me().done(m => $('#cl').text(money(m.creditLimit))).fail(() => $('#cl').text('n/a'));
}
function bill(o) {
  modal(`<h2>Bill #${e(o.id.slice(-6))}</h2><p class="mut">${e(o.name)} · ${o.date} · ${o.pay.toUpperCase()}</p><table>${Object.entries(o.items).map(([id, i]) => `<tr><td><div class="order-line"><img src="${productImage(id)}" alt="${e(i.title)}" onerror="this.onerror=null;this.src='assets/products/placeholder.svg'"><span>${e(i.title)} × ${i.qty}</span></div></td><td>${money(i.qty * i.price)}</td></tr>`).join('')}</table>
  <h3>Total ${money(o.total)}</h3><p class="mut">${H.cfg.EMAILJS.service ? 'Bill emailed to ' + e(o.email) : 'Email skipped (fill EMAILJS in hexacart-firestore-api.js to send real bills)'}</p><button class="btn" data-a="close">Close</button>`);
}

/* ---------- ORDERS ---------- */
function orders() {
  const adm = H.isAdmin();
  $('#app').html(`<div class="panel"><h2>${adm ? 'All orders' : 'Order history'}</h2><div id="ol">Loading…</div></div>`);
  ok(adm ? H.allOrders() : H.myOrders(), os => {
    S.O = {}; os.forEach(o => S.O[o.id] = o);
    $('#ol').html(T(['Order', 'Date', 'Customer', 'Items', 'Pay', 'Total', ''], os.map(o => [e(o.id.slice(-6)), o.date, e(o.name), Object.values(o.items).map(i => e(i.title) + ' ×' + i.qty).join(', '), o.pay, money(o.total), `<button class="btn s" data-a="bill" data-v="${o.id}">Bill</button>`])));
  });
}

/* ---------- ADMIN ---------- */
function admin() {
  const tb = (k, l) => `<button class="chip ${S.tab == k ? 'on' : ''}" data-a="tab" data-v="${k}">${l}</button>`;
  $('#app').html(`<div class="tabs">${tb('inv', 'Inventory')}${tb('cus', 'Customer credit')}${tb('rep', 'Reports')}</div><div id="tabc"></div>`);
  ({ inv, cus, rep }[S.tab])();
}
function inv() {
  $('#tabc').html('<p class="mut">Loading…</p>');
  ok(H.productsPage(S.ipg[S.ipg.length - 1], 5), r => {
    S.ipn = r.next; S.IP = {}; r.items.forEach(p => S.IP[p.id] = p);
    $('#tabc').html(`<div class="panel"><div class="row"><h2>Inventory (CRUD)</h2><button class="btn" data-a="edit" data-v="">+ New item</button></div>` +
      T(['Id', 'Item', 'Category', 'Qty', 'Price', 'Status', 'Actions'], r.items.map(p => [e(p.id), e(p.title), e((C[p.cat_id] || {}).name), p.qty, money(p.price),
        `<span class="tag ${p.active === false ? 'off' : ''}">${p.active === false ? 'Inactive' : 'Active'}</span>`,
        `<button class="btn s" data-a="edit" data-v="${p.id}">Edit</button> <button class="btn g s" data-a="tog" data-v="${p.id}">${p.active === false ? 'Activate' : 'Deactivate'}</button> <button class="btn r s" data-a="del" data-v="${p.id}">Delete</button>`])) +
      pagerHtml(S.ipg.length > 1, 'Page ' + S.ipg.length, !!r.next, 'iprev', 'inext') + '</div>');
  });
}
function cus() {
  $('#tabc').html('<p class="mut">Loading…</p>');
  ok(H.customers(), l => {
    S.U = {}; l = l.filter(u => (u.email || '').toLowerCase() != H.cfg.ADMIN.toLowerCase()); l.forEach(u => S.U[u.id] = u);
    $('#tabc').html('<div class="panel"><h2>Customer credit limit (CRUD)</h2>' + T(['Name', 'Email', 'Mobile', 'Credit limit', 'Actions'], l.map(u => [e(u.name), e(u.email), e(u.mob),
      `<input type="number" min="0" id="cl_${u.id}" value="${u.creditLimit}" style="width:100px">`,
      `<button class="btn s" data-a="cl" data-v="${u.id}">Save</button> <button class="btn g s" data-a="cl0" data-v="${u.id}">Reset to 0</button> <button class="btn r s" data-a="delu" data-v="${u.id}">Delete</button>`])) + '</div>');
  });
}
const oh = ['Date', 'Order', 'Customer', 'Pay', 'Total'], ot = o => [o.date, e(o.id.slice(-6)), e(o.name), o.pay, money(o.total)];
const prods = () => H.productsPage(null, 300).then(r => r.items);
const lines = os => os.flatMap(o => Object.values(o.items || {}).map(i => Object.assign({}, i, { pay: o.pay })));
const cn = id => e((C[id] || {}).name || id);
function R(k, f, t) {
  const od = () => H.allOrders(f, t);
  switch (k) {
    case 'c_all': return $.when(H.customers(), H.allOrders()).then((cs, os) => T(['Name', 'Email', 'Mobile', 'Credit limit', 'Orders', 'Spent'],
      cs.filter(u => (u.email || '').toLowerCase() != H.cfg.ADMIN.toLowerCase()).map(u => { const m = os.filter(o => o.uid == u.id); return [e(u.name), e(u.email), e(u.mob), money(u.creditLimit), m.length, money(m.reduce((a, o) => a + o.total, 0))]; })));
    case 'c_top': return od().then(os => {
      const byCustomer = {};
      os.forEach(o => {
        const key = o.uid || o.email || o.name;
        if (!byCustomer[key]) byCustomer[key] = { name: o.name, total: 0 };
        byCustomer[key].total += o.total;
      });
      return T(['#', 'Customer', 'Spent'], Object.values(byCustomer).sort((a, b) => b.total - a.total).slice(0, 10).map((x, i) => [i + 1, e(x.name), money(x.total)]));
    });
    case 'c_cash': case 'c_credit': case 's_cash': case 's_credit': return od().then(os => T(oh, os.filter(o => o.pay == k.slice(2)).map(ot)));
    case 'i_all': return prods().then(ps => T(['Id', 'Item', 'Category', 'Qty', 'Price', 'Status'], ps.map(p => [e(p.id), e(p.title), cn(p.cat_id), p.qty, money(p.price), p.active === false ? 'Inactive' : 'Active'])));
    case 'i_cat': return prods().then(ps => T(['Category', 'Items', 'Units in stock', 'Stock value'], Object.keys(C).map(id => { const a = ps.filter(p => p.cat_id == id); return [cn(id), a.length, a.reduce((s, p) => s + p.qty, 0), money(a.reduce((s, p) => s + p.qty * p.price, 0))]; })));
    case 'i_high': return H.highStock().then(ps => T(['Item', 'Qty (>100)'], ps.map(p => [e(p.title), p.qty])));
    case 'i_low': return H.lowStock().then(ps => T(['Item', 'Qty (<15)'], ps.map(p => [e(p.title), p.qty])));
    case 's_all': return od().then(os => T(oh, os.map(ot).concat([['', '', '', '<b>Total</b>', '<b>' + money(os.reduce((a, o) => a + o.total, 0)) + '</b>']])));
    case 's_cat': return od().then(os => { const ln = lines(os); return T(['Category', 'Units', 'Revenue'], G(ln, x => x.cat, x => x.qty * x.price).map(([c, r]) => [cn(c), ln.filter(x => x.cat == c).reduce((a, x) => a + x.qty, 0), money(r)])); });
    case 's_top': return od().then(os => T(['#', 'Item', 'Units sold'], G(lines(os), x => x.title, x => x.qty).sort((a, b) => b[1] - a[1]).slice(0, 10).map((x, i) => [i + 1, e(x[0]), x[1]])));
    case 's_bot': return $.when(od(), prods()).then((os, ps) => { const m = Object.fromEntries(G(lines(os), x => x.title, x => x.qty)); return T(['#', 'Item', 'Units sold'], ps.map(p => [p.title, m[p.title] || 0]).sort((a, b) => a[1] - b[1]).slice(0, 10).map((x, i) => [i + 1, e(x[0]), x[1]])); });
  }
}
function rep() {
  const gr = [['Customer reports', [['c_all', 'All customers (all columns)'], ['c_top', 'Top 10 customers (dates)'], ['c_cash', 'Cash purchases (dates)'], ['c_credit', 'Credit purchases (dates)']]],
    ['Inventory reports', [['i_all', 'Current stock – all'], ['i_cat', 'Current stock – category wise'], ['i_high', 'High stock (>100)'], ['i_low', 'Low stock (<15)']]],
    ['Sales reports (dates)', [['s_all', 'All sales'], ['s_cat', 'Category wise'], ['s_cash', 'Cash wise'], ['s_credit', 'Credit wise'], ['s_top', 'Top 10 selling items'], ['s_bot', 'Bottom 10 selling items']]]];
  $('#tabc').html(`<div class="panel"><h2>Reports</h2><div class="bar"><select id="rs">${gr.map(g => `<optgroup label="${g[0]}">${g[1].map(o => `<option value="${o[0]}" ${o[0] == S.rep ? 'selected' : ''}>${o[1]}</option>`).join('')}</optgroup>`).join('')}</select>
  From <input type="date" id="rf" value="${S.rf || today().slice(0, 8) + '01'}"> to <input type="date" id="rt" value="${S.rt || today()}"><button class="btn" data-a="run">Show</button></div><div id="rout"></div></div>`);
  A.run();
}

/* ---------- actions (buttons use data-a="name") ---------- */
const A = {
  go: v => go(v), close: () => $('#modal').removeClass('on').empty(),
  out: () => { H.signOut(); S.me = null; S.cart = {}; toast('Signed out '); go('shop'); },
  cat: v => { S.cat = v; S.q = ''; S.searchItems = []; S.cur = [null]; shop(); },
  shopnow: () => document.getElementById('grid').scrollIntoView({ behavior: 'smooth' }),
  searchprev: () => { S.searchPage = Math.max(1, S.searchPage - 1); renderSearchPage(); },
  searchnext: () => { S.searchPage += 1; renderSearchPage(); },
  detail: id => {
    const p = P[id];
    if (!p) return;
    modal(`<div class="page-heading"><p class="eyebrow">PRODUCT DETAILS</p><h2>${e(p.title)}</h2></div>
      <img class="detail-image" src="${productImage(id)}" alt="${e(p.title)}" onerror="this.onerror=null;this.src='assets/products/placeholder.svg'">
      <p>${e(p.des)}</p><div class="row"><strong class="pr">${money(p.price)}</strong><span class="tag ${p.qty < 15 ? 'low' : ''}">${p.qty > 0 ? `${p.qty} available` : 'Out of stock'}</span></div>
      <div class="row"><label for="detail-qty">Quantity</label><input id="detail-qty" class="sm" type="number" min="1" max="${p.qty}" value="1" ${p.qty <= 0 ? 'disabled' : ''}></div>
      <div class="row"><button class="btn" data-a="adddetail" data-v="${e(id)}" ${p.qty <= 0 ? 'disabled' : ''}>Add to cart</button><button class="btn g" data-a="close">Close</button></div>`);
  },
  adddetail: id => {
    if (!H.session()) { A.close(); toast('Please sign in before adding products to your cart.', 1); return go('auth'); }
    const p = P[id], q = parseInt($('#detail-qty').val(), 10);
    if (!p || !Number.isInteger(q) || q < 1 || q > p.qty) return toast('Enter a valid quantity within available stock.', 1);
    const current = S.cart[id] ? S.cart[id].q : 0;
    if (current + q > p.qty) return toast('Your cart quantity exceeds available stock.', 1);
    S.cart[id] = { p, q: current + q }; A.close(); nav(); toast(`${p.title} added to your cart.`);
  },
  prev: () => { S.cur.pop(); fetchShop(); }, next: () => { S.cur.push(S.next); fetchShop(); },
  add: id => {
    if (!H.session()) { toast('Please sign in to shop', 1); return go('auth'); }
    const p = P[id], q = Math.max(1, parseInt($('#q' + id).val()) || 1), c = S.cart[id];
    if ((c ? c.q : 0) + q > p.qty) return toast('Your cart quantity exceeds available stock.', 1);
    S.cart[id] = { p, q: (c ? c.q : 0) + q }; nav(); toast(p.title + ' added to your cart.');
  },
  rm: id => { delete S.cart[id]; nav(); cart(); },
  buy: () => {
    if (H.isAdmin()) return toast('Admin cannot shop – sign in as a customer', 1);
    const pay = $('input[name=pay]:checked').val(), m = {}; Object.entries(S.cart).forEach(([id, x]) => m[id] = x.q);
    ok(H.placeOrder(m, pay), o => { S.cart = {}; bill(o); if (H.cfg.EMAILJS.service) H.sendBill(o).done(() => toast('Order placed. Bill email sent.')).fail(() => toast('Order placed, but bill email could not be sent.')); else toast('Order placed. Bill is available in Orders.'); go('orders'); });
  },
  atab: v => { S.auth = v; auth(); },
  in: () => ok(H.signIn($('#e1').val().trim(), $('#p1').val()).then(() => H.me().then(m => { S.me = m; }, () => { S.me = null; })),
    () => { toast('Welcome '); go(H.isAdmin() ? 'admin' : 'shop'); }),
  up: () => {
    const n = $('#n2').val().trim(), m = $('#e2').val().trim(), b = $('#m2').val().trim(), p = $('#p2').val();
    if (n.length < 3) return toast('Name needs 3+ characters', 1); if (!RE.e.test(m)) return toast('Enter a valid email', 1);
    if (!RE.m.test(b)) return toast('Mobile must be 10 digits', 1); if (!RE.p.test(p)) return toast('Password: 6+ characters with a number', 1);
    ok(H.signUp(n, m, b, p), pr => { S.me = pr; toast('Account created – welcome! '); go('shop'); });
  },
  rs: () => { const m = $('#e3').val().trim(); if (!RE.e.test(m)) return toast('Enter a valid email', 1); ok(H.resetPassword(m), () => toast('Password reset email sent. Check your inbox.')); },
  bill: id => bill(S.O[id]),
  tab: v => { S.tab = v; admin(); },
  iprev: () => { S.ipg.pop(); inv(); }, inext: () => { S.ipg.push(S.ipn); inv(); },
  edit: id => {
    const p = S.IP[id] || { cat_id: Object.keys(C)[0] };
    modal(`<h2>${id ? 'Edit item' : 'New item'}</h2><div class="f" style="max-width:none"><input id="ft" placeholder="Title" value="${e(p.title)}"><select id="fc">${Object.entries(C).map(([k, c]) => `<option value="${k}" ${k == p.cat_id ? 'selected' : ''}>${e(c.name)}</option>`).join('')}</select>
    <textarea id="fd" placeholder="Description">${e(p.des)}</textarea><label class="field-label" for="furl">Product image URL (HTTPS)</label><input id="furl" type="url" placeholder="https://example.com/product.jpg" value="${e(p.imageUrl || '')}"><input id="fq" type="number" min="0" placeholder="Quantity" value="${p.qty == null ? '' : p.qty}"><input id="fp" type="number" min="1" placeholder="Price" value="${p.price == null ? '' : p.price}"><p class="mut">New product IDs are generated automatically and saved as the Firestore document ID.</p>
    <div class="row"><button class="btn" data-a="saveitem" data-v="${id}">Save</button><button class="btn g" data-a="close">Cancel</button></div></div>`);
  },
  saveitem: id => {
    const b = { title: $('#ft').val().trim(), cat_id: $('#fc').val(), des: $('#fd').val().trim(), qty: parseInt($('#fq').val()), price: parseFloat($('#fp').val()) };
    const imageUrl = $('#furl').val().trim();
    if (!b.title || !b.cat_id || !Number.isInteger(b.qty) || b.qty < 0 || !(b.price > 0)) return toast('Enter a title, category, valid quantity and price.', 1);
    if (imageUrl && !/^https:\/\//i.test(imageUrl)) return toast('Image URL must start with https://', 1);
    if (!imageUrl && !id) return toast('Paste an HTTPS image URL for this product.', 1);
    if (!imageUrl && id && !(S.IP[id] || {}).imageUrl) return toast('Paste an HTTPS image URL for this product.', 1);
    if (imageUrl) b.imageUrl = imageUrl;
    const task = id ? H.updateProduct(id, b) : H.addProduct(b);
    ok(task, result => { A.close(); toast('Product saved. ' + (result && result.id ? 'ID: ' + result.id : '')); admin(); });
  },
  tog: id => ok(H.setActive(id, S.IP[id].active === false), () => { toast('Status changed'); admin(); }),
  del: id => modal(`<h2>Delete item?</h2><p>Really delete <b>${e(S.IP[id].title)}</b>?</p><div class="row"><button class="btn r" data-a="del2" data-v="${id}">Yes, delete</button><button class="btn g" data-a="close">No</button></div>`),
  del2: id => ok(H.deleteProduct(id), () => { A.close(); toast('Deleted '); admin(); }),
  cl: id => { const v = parseFloat($('#cl_' + id).val()); if (isNaN(v) || v < 0) return toast('Enter a valid limit', 1); ok(H.setCredit(id, v), () => toast('Credit limit updated ')); },
  cl0: id => ok(H.setCredit(id, 0), () => { toast('Limit reset to 0'); cus(); }),
  delu: id => modal(`<h2>Delete customer?</h2><p>Remove the profile of <b>${e(S.U[id].name)}</b>?</p><div class="row"><button class="btn r" data-a="delu2" data-v="${id}">Yes, delete</button><button class="btn g" data-a="close">No</button></div>`),
  delu2: id => ok(H.deleteCustomer(id), () => { A.close(); cus(); }),
  run: () => { S.rep = $('#rs').val(); S.rf = $('#rf').val(); S.rt = $('#rt').val(); $('#rout').html('<p class="mut">Loading…</p>'); ok(R(S.rep, S.rf, S.rt), h => $('#rout').html(h)); }
};
$(document).on('click', '[data-a]', function () { const f = A[$(this).data('a')]; if (f) f(String($(this).attr('data-v') === undefined ? '' : $(this).attr('data-v'))); });
$(document).on('input', '#sq', function () { S.q = this.value; S.searchPage = 1; clearTimeout(A.dt); A.dt = setTimeout(fetchShop, 350); });
$(document).on('change', '[data-c]', function () { const id = $(this).data('c'), q = Math.max(1, Math.min(S.cart[id].p.qty, parseInt(this.value) || 1)); S.cart[id].q = q; nav(); cart(); });
$(document).on('click', '#modal', ev => { if (ev.target.id == 'modal') A.close(); });
$(document).ajaxComplete((ev, x, o) => { try { $('#log').prepend('<div>' + o.type + ' …' + e(o.url.replace(/\?.*$/, '').replace(/^.*\/documents/, '') || '/') + ' → ' + x.status + '</div>'); } catch (z) {} });

/* ---------- start ---------- */
H.categories().done(l => {
  l.forEach(c => C[c.id] = c);
  (H.session() ? H.me().then(m => { S.me = m; }, () => {}) : $.Deferred().resolve()).always(() => go('shop'));
}).fail(x => $('#app').html(`<div class="panel"><h2>Cannot reach Firestore</h2><p>${e(msg(x))}</p><p class="mut">Check CFG in hexacart-firestore-api.js, the published rules, and that you ran "0 ADMIN seed demo data" in api-test.html.</p></div>`));
