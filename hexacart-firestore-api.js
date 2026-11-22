/* HexaCart REST API client – jQuery + Firebase Auth REST + Cloud Firestore REST
   Load jQuery first, then this file. Everything is exposed as window.HexaCart. */
const HexaCart = (function ($) {
  /* ====== 1. FILL THESE ====== */
  const CFG = {
    PROJECT: 'hexacart-b7f3f',                         // Firebase project id
    KEY: 'AIzaSyBpPCyLV-MBzHXgJFC3Vu07tDtDyA29jHM',    // Web API key (safe to keep in client code)
    ADMIN_UID: 'YPa3iN00v4YOZFS9Gle8xkqyAH33',
    ADMIN: 'hemadharshini.kannan@psiog.com',
    EMAILJS: {
  service: 'service_rycou38',
  template: 'x0s1u9r',
  key: 'PASTE_YOUR_PUBLIC_KEY_HERE'
} // configure to enable bill emails
  };

  /* ====== session ====== */
  let S = null;
  try { S = JSON.parse(sessionStorage.getItem('hc')); } catch (x) {}
  const keep = () => { try { sessionStorage.setItem('hc', JSON.stringify(S)); } catch (x) {} };
  const reject = m => $.Deferred().reject(m).promise();

  /* ====== Firestore typed-JSON <-> plain JS ======
     Firestore REST wraps every value with its type: {title:{stringValue:"Shoe"}, qty:{integerValue:"5"}} */
  const toV = v =>
    v === null || v === undefined ? { nullValue: null } :
    typeof v === 'string' ? { stringValue: v } :
    typeof v === 'boolean' ? { booleanValue: v } :
    typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) :
    Array.isArray(v) ? { arrayValue: { values: v.map(toV) } } :
    { mapValue: { fields: toF(v) } };
  const toF = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, toV(v)]));
  const fromV = v =>
    'stringValue' in v ? v.stringValue : 'integerValue' in v ? Number(v.integerValue) :
    'doubleValue' in v ? v.doubleValue : 'booleanValue' in v ? v.booleanValue :
    'nullValue' in v ? null : 'timestampValue' in v ? v.timestampValue :
    'arrayValue' in v ? (v.arrayValue.values || []).map(fromV) :
    'mapValue' in v ? fromF(v.mapValue.fields) : null;
  const fromF = f => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k, fromV(v)]));
  // a Firestore document -> {id, ...fields, _ut}   (_ut = updateTime, used for safe concurrent writes)
  const doc = d => d && d.name ? Object.assign({ id: d.name.split('/').pop(), _ut: d.updateTime }, fromF(d.fields)) : null;
  const docName = (col, id) => 'projects/' + CFG.PROJECT + '/databases/(default)/documents/' + col + '/' + id;

  /* ====== token handling ====== */
  const idt = (action, body) => $.ajax({
    url: 'https://identitytoolkit.googleapis.com/v1/accounts:' + action + '?key=' + CFG.KEY,
    type: 'POST', dataType: 'json', contentType: 'application/json', data: JSON.stringify(body)
  });
  const sess = r => {
    S = { token: r.idToken, refresh: r.refreshToken, uid: r.localId, email: r.email, exp: Date.now() + r.expiresIn * 1000 };
    keep(); return S;
  };
  function refresh() {
    return $.ajax({
      url: 'https://securetoken.googleapis.com/v1/token?key=' + CFG.KEY, type: 'POST', dataType: 'json',
      data: { grant_type: 'refresh_token', refresh_token: S.refresh }
    }).then(r => { S.token = r.id_token; S.refresh = r.refresh_token; S.exp = Date.now() + r.expires_in * 1000; keep(); return S; });
  }
  const fresh = () => (S && Date.now() > S.exp - 60000) ? refresh() : $.Deferred().resolve().promise();

  /* ====== low-level Firestore call ======
     suffix examples: '/products/p001'  '/products'  ':runQuery'  ':commit' */
  function fs(method, suffix, body, params) {
    return fresh().then(() => {
      const qs = ['key=' + CFG.KEY];
      Object.entries(params || {}).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        [].concat(v).forEach(x => qs.push(k + '=' + encodeURIComponent(x)));
      });
      const o = {
        url: 'https://firestore.googleapis.com/v1/projects/' + CFG.PROJECT + '/databases/(default)/documents' + suffix + '?' + qs.join('&'),
        type: method, dataType: 'json'
      };
      if (body !== undefined) { o.data = JSON.stringify(body); o.contentType = 'application/json'; }
      if (S) o.headers = { Authorization: 'Bearer ' + S.token };
      return $.ajax(o);
    });
  }

  /* ====== generic CRUD on any collection ====== */
  const get = (col, id) => fs('GET', '/' + col + '/' + id).then(doc);
  const add = (col, data, id) => fs('POST', '/' + col, { fields: toF(data) }, id ? { documentId: id } : undefined).then(doc);   // POST = create
  const set = (col, id, data) => fs('PATCH', '/' + col + '/' + id, { fields: toF(data) }).then(doc);                              // PATCH w/o mask = create or replace
  const patch = (col, id, data) => fs('PATCH', '/' + col + '/' + id, { fields: toF(data) },
    { 'updateMask.fieldPaths': Object.keys(data), 'currentDocument.exists': true }).then(doc);                                    // PATCH + mask = update some fields
  const del = (col, id) => fs('DELETE', '/' + col + '/' + id);
  const list = (col, params) => fs('GET', '/' + col, undefined, params)
    .then(r => ({ items: (r.documents || []).map(doc), next: r.nextPageToken || null }));
  // structured query (filters, order, limit, cursor)
  const F = (field, op, v) => ({ fieldFilter: { field: { fieldPath: field }, op, value: toV(v) } });
  function query(col, o) {
    o = o || {}; const q = { from: [{ collectionId: col }] };
    if (o.where && o.where.length) q.where = o.where.length === 1 ? o.where[0] : { compositeFilter: { op: 'AND', filters: o.where } };
    if (o.orderBy) q.orderBy = [{ field: { fieldPath: o.orderBy }, direction: o.dir || 'ASCENDING' }];
    if (o.limit) q.limit = o.limit;
    if (o.startAfter) q.startAt = { values: [o.startAfter], before: false };
    return fs('POST', ':runQuery', { structuredQuery: q }).then(r => r.filter(x => x.document).map(x => doc(x.document)));
  }

  /* ====== demo data (written by A.seed(), admin only) ====== */
  const SEED = {
    categories: { c1: { name: 'Electronics', color: '#7c3aed,#a78bfa' }, c2: { name: 'Fashion', color: '#ec4899,#f9a8d4' },
                  c3: { name: 'Home', color: '#f59e0b,#fcd34d' }, c4: { name: 'Books & Toys', color: '#10b981,#6ee7b7' } },
    products: [ // id, cat_id, title, des, qty, price, emoji
      ['p001', 'c1', 'Wireless Headphones', 'Deep bass, 30h battery', 40, 2499], ['p002', 'c1', 'Smart Watch', 'Fitness and sleep tracking', 12, 3999],
      ['p003', 'c1', 'Bluetooth Speaker', 'Waterproof party speaker', 120, 1799], ['p004', 'c2', 'Denim Jacket', 'Classic fit, all season', 60, 1999],
      ['p005', 'c2', 'Running Shoes', 'Light and bouncy', 14, 2799], ['p006', 'c2', 'Sunglasses', 'UV400 protection', 150, 899],
      ['p007', 'c3', 'Coffee Maker', 'Fresh brew in 5 minutes', 25, 3299], ['p008', 'c3', 'Table Lamp', 'Warm dimmable light', 110, 799],
      ['p009', 'c3', 'Cozy Cushion', 'Soft velvet cover', 8, 499], ['p010', 'c4', 'Novel Set', 'Three bestsellers', 70, 699],
      ['p011', 'c4', 'Building Blocks', '500 colourful pieces', 30, 1299], ['p012', 'c4', 'Teddy Bear', 'Super cuddly', 5, 599]
    ]
  };

  const A = {
    cfg: CFG, fs, enc: toF, dec: fromF, session: () => S,
    isAdmin: () => !!S && S.uid === CFG.ADMIN_UID,

    /* ====== AUTH (Firebase Authentication REST) ====== */
    signUp: (name, email, mob, pwd) => idt('signUp', { email, password: pwd, returnSecureToken: true })
      .then(r => { sess(r); return A.createProfile({ name, email, mob }); }),
    signIn: (email, pwd) => idt('signInWithPassword', { email, password: pwd, returnSecureToken: true }).then(sess),
    signOut: () => { S = null; try { sessionStorage.removeItem('hc'); } catch (x) {} },
    resetPassword: email => idt('sendOobCode', { requestType: 'PASSWORD_RESET', email }), // Firebase sends the mail
    changePassword: pwd => idt('update', { idToken: S.token, password: pwd, returnSecureToken: true }).then(sess),
    deleteAccount: () => idt('delete', { idToken: S.token }).then(A.signOut),

    /* ====== CATEGORIES ====== */
    categories: () => list('categories', { pageSize: 100 }).then(r => r.items),
    addCategory: (c, id) => add('categories', c, id),
    updateCategory: (id, c) => patch('categories', id, c),
    deleteCategory: id => del('categories', id),

    /* ====== PRODUCTS / INVENTORY ====== */
    product: id => get('products', id),
    // admin table pagination (Firestore native): page 1 -> productsPage(), next -> productsPage(result.next)
    productsPage: (token, size) => list('products', { pageSize: size || 5, pageToken: token }),
    // shop pagination for customers: only active items, optional category, cursor = last id of previous page
    shopPage: (after, size, cat) => {
      size = size || 6;
      const w = [F('active', 'EQUAL', true)]; if (cat && cat !== 'all') w.push(F('cat_id', 'EQUAL', cat));
      return query('products', { where: w, orderBy: '__name__', limit: size + 1,
        startAfter: after ? { referenceValue: docName('products', after) } : undefined })
        .then(l => ({ items: l.slice(0, size), hasMore: l.length > size, next: l.length ? l[Math.min(size, l.length) - 1].id : null }));
    },
    byCategory: cat => query('products', { where: [F('cat_id', 'EQUAL', cat)] }),
    searchProducts: t => list('products', { pageSize: 300 }).then(r => r.items.filter(p => (p.title || '').toLowerCase().includes(String(t || '').trim().toLowerCase()))), // case-insensitive catalogue search
    lowStock: () => query('products', { where: [F('qty', 'LESS_THAN', 15)], orderBy: 'qty' }),
    highStock: () => query('products', { where: [F('qty', 'GREATER_THAN', 100)], orderBy: 'qty' }),
    // IDs are generated centrally from the current highest P-number. The document ID and returned ID are identical.
    nextProductId: () => list('products', { pageSize: 1000 }).then(r => {
      const max = r.items.reduce((n, p) => { const m = /^[pP](\d+)$/.exec(p.id); return m ? Math.max(n, +m[1]) : n; }, 0);
      return 'p' + String(max + 1).padStart(3, '0');
    }),
    addProduct: p => A.nextProductId().then(id => add('products', Object.assign({ active: true }, p), id)),
    updateProduct: (id, p) => patch('products', id, p),
    setActive: (id, on) => patch('products', id, { active: !!on }),
    deleteProduct: id => del('products', id),

    /* ====== CUSTOMERS (document id = Firebase Auth uid) ====== */
    createProfile: p => set('customers', S.uid, Object.assign({ creditLimit: 0 }, p)),
    me: () => get('customers', S.uid),
    customers: () => list('customers', { pageSize: 300 }).then(r => r.items), // admin
    customer: uid => get('customers', uid),
    updateProfile: (uid, p) => patch('customers', uid, p),
    setCredit: (uid, v) => patch('customers', uid, { creditLimit: +v }),       // admin
    deleteCustomer: uid => del('customers', uid),                               // admin

    /* ====== ORDERS ====== */
    // cart = { productId: qty }, pay = 'cash' | 'credit'
    // ONE atomic :commit -> stock, credit limit and the order are all written together or not at all.
    // Each update carries the updateTime we read, so if someone else bought meanwhile Firestore rejects it (no overselling).
    
placeOrder: (cart, pay) => {
  if (!S.uid) return reject('Please sign in first.');
  if (!cart || typeof cart !== 'object' || Array.isArray(cart)) return reject('Invalid cart.');
  
  const ids = Object.keys(cart);
  if (!ids.length) return reject('Your cart is empty.');
  if (!['cash', 'credit'].includes(pay)) return reject('Invalid payment method.');

  for (const id of ids) {
    if (!Number.isSafeInteger(cart[id]) || cart[id] <= 0) {
      return reject('Invalid quantity for product: ' + id);
    }
  }

  return $.when.apply($, ids.map(id => get('products', id)).concat([get('customers', S.uid)])).then(function () {
    const a = [].slice.call(arguments);
    const me = a.pop();
    const writes = [];
    const items = {};
    let total = 0;

    if (!me) return reject('Customer profile not found.');

    for (let i = 0; i < ids.length; i++) {
      const p = a[i];
      const q = cart[ids[i]];

      if (!p || p.active === false) return reject('Item unavailable: ' + ids[i]);
      if (!Number.isSafeInteger(p.qty) || p.qty < 0) return reject('Invalid stock for ' + ids[i]);
      if (!Number.isFinite(p.price) || p.price <= 0) return reject('Invalid price for ' + ids[i]);
      if (p.qty < q) return reject('Only ' + p.qty + ' left of ' + p.title);

      total += p.price * q;
      if (!Number.isFinite(total)) return reject('Invalid order total.');

      items[ids[i]] = {
        title: p.title,
        cat: p.cat_id,
        qty: q,
        price: p.price
      };

      writes.push({
        update: {
          name: docName('products', ids[i]),
          fields: toF({ qty: p.qty - q })
        },
        updateMask: { fieldPaths: ['qty'] },
        currentDocument: { updateTime: p._ut }
      });
    }

    if (pay === 'credit') {
      if (!Number.isFinite(me.creditLimit) || me.creditLimit < 0) {
        return reject('Invalid credit limit.');
      }
      if (total > me.creditLimit) {
        return reject('Credit limit ' + me.creditLimit + ' is below order total ' + total);
      }

      writes.push({
        update: {
          name: docName('customers', S.uid),
          fields: toF({ creditLimit: me.creditLimit - total })
        },
        updateMask: { fieldPaths: ['creditLimit'] },
        currentDocument: { updateTime: me._ut }
      });
    }

    const id = 'o' + crypto.randomUUID().replace(/-/g, '');
    const order = {
      uid: S.uid,
      name: me.name,
      email: me.email,
      date: new Date().toISOString().slice(0, 10),
      pay,
      total,
      items
    };

    writes.push({
      update: {
        name: docName('orders', id),
        fields: toF(order)
      },
      currentDocument: { exists: false }
    });

    return fs('POST', ':commit', { writes }).then(() => Object.assign({ id }, order));
  });
},

    // customer: where uid == me (the rules only allow queries limited to the own uid); dates filtered here
    myOrders: (from, to) => query('orders', { where: [F('uid', 'EQUAL', S.uid)] })
      .then(l => l.filter(o => (!from || o.date >= from) && (!to || o.date <= to)).sort((a, b) => a.date < b.date ? 1 : -1)),
    // admin: all customers' orders, optional date range (strings 'YYYY-MM-DD')
    allOrders: (from, to) => {
      const w = []; if (from) w.push(F('date', 'GREATER_THAN_OR_EQUAL', from)); if (to) w.push(F('date', 'LESS_THAN_OR_EQUAL', to));
      return query('orders', { where: w, orderBy: 'date', dir: 'DESCENDING' });
    },

    /* ====== SEED demo categories + products (sign in as admin first) ====== */
    seed: () => fs('POST', ':commit', { writes: Object.entries(SEED.categories)
      .map(([id, d]) => ({ update: { name: docName('categories', id), fields: toF(d) } }))
      .concat(SEED.products.map(p => ({ update: { name: docName('products', p[0]),
        fields: toF({ cat_id: p[1], title: p[2], des: p[3], qty: p[4], price: p[5], active: true }) } }))) }),

    /* ====== EMAIL (bill) via EmailJS REST ====== */
    sendBill: o => $.ajax({
      url: 'https://api.emailjs.com/api/v1.0/email/send', type: 'POST', contentType: 'application/json',
      data: JSON.stringify({
        service_id: CFG.EMAILJS.service, template_id: CFG.EMAILJS.template, user_id: CFG.EMAILJS.key,
        template_params: { email: o.email, to_name: o.name, order_id: o.id, total: o.total,
          lines: Object.values(o.items).map(i => i.title + ' x' + i.qty + ' = ' + i.price * i.qty).join('\n') }
      })
    })
  };
  return A;
})(jQuery);
