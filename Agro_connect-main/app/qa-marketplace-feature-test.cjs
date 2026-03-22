const BASE = 'http://localhost:5055';

const results = {
  passed: [],
  failed: [],
};

function logPass(name, details = '') {
  results.passed.push({ name, details });
  console.log('PASS', name, details);
}

function logFail(name, details = '') {
  results.failed.push({ name, details });
  console.log('FAIL', name, details);
}

function check(name, condition, details = '') {
  if (condition) {
    logPass(name, details);
  } else {
    logFail(name, details);
  }
}

async function api(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, options);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (error) {
    json = { raw: text };
  }
  return { response, json };
}

async function register(prefix, role = 'farmer') {
  const stamp = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const email = `${prefix}.${stamp}@example.com`;
  const username = `${prefix}_${stamp}`;

  const { response, json } = await api('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      email,
      password: 'Pass@1234',
      phone: '9999999999',
      location: 'Pune, Maharashtra',
      farmName: 'rice farm',
      farmSize: 2,
      role,
    }),
  });

  return { response, json, email, username };
}

function authHeaders(token, withJson = false) {
  return {
    ...(withJson ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${token}`,
  };
}

async function testMarketplace() {
  const health = await api('/api/health');
  check('health.ok', health.response.status === 200, `status=${health.response.status}`);

  const sellerReg = await register('market_seller');
  const buyerReg = await register('market_buyer');
  const otherReg = await register('market_other');

  check('auth.seller.register', sellerReg.response.status === 201, `status=${sellerReg.response.status}`);
  check('auth.buyer.register', buyerReg.response.status === 201, `status=${buyerReg.response.status}`);
  check('auth.other.register', otherReg.response.status === 201, `status=${otherReg.response.status}`);

  const sellerToken = sellerReg.json?.token;
  const buyerToken = buyerReg.json?.token;
  const otherToken = otherReg.json?.token;
  const sellerId = sellerReg.json?.user?._id;

  const p1 = await api('/api/products', {
    method: 'POST',
    headers: authHeaders(sellerToken, true),
    body: JSON.stringify({
      productName: 'Tomato Premium',
      category: 'vegetable',
      price: 30,
      pricePerUnit: 30,
      quantity: 150,
      unit: 'kg',
      location: 'Pune, Maharashtra',
      description: 'Fresh red tomato harvest',
      image: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400',
      metadata: { quality: 'Grade A', isOrganic: true, minOrderQuantity: 5, rating: 4.7, reviewCount: 12 },
    }),
  });

  const p2 = await api('/api/products', {
    method: 'POST',
    headers: authHeaders(sellerToken, true),
    body: JSON.stringify({
      productName: 'Tomato Premium',
      category: 'vegetable',
      price: 22,
      pricePerUnit: 22,
      quantity: 120,
      unit: 'kg',
      location: 'Pune, Maharashtra',
      description: 'Fresh tomato lot discount',
      image: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400',
      metadata: { quality: 'Grade B', isOrganic: false, minOrderQuantity: 3, rating: 4.2, reviewCount: 8 },
    }),
  });

  check('product.create.owner.1', p1.response.status === 201, `status=${p1.response.status}`);
  check('product.create.owner.2', p2.response.status === 201, `status=${p2.response.status}`);

  const product1Id = p1.json?.listing?._id;
  const product2Id = p2.json?.listing?._id;

  const listBasic = await api('/api/products?page=1&limit=10&category=vegetable&q=tomato&sortBy=priceAsc');
  const listed = Array.isArray(listBasic.json?.listings) ? listBasic.json.listings : [];

  check('product.list.status', listBasic.response.status === 200, `status=${listBasic.response.status}`);
  check('product.list.pagination', Boolean(listBasic.json?.pagination), JSON.stringify(listBasic.json?.pagination || {}));
  check('product.list.contains.created', listed.some((x) => x._id === product1Id) && listed.some((x) => x._id === product2Id), `count=${listed.length}`);
  check('product.list.sort.priceAsc', listed.length >= 2 ? Number(listed[0].pricePerUnit) <= Number(listed[1].pricePerUnit) : true, 'sorted by price asc');

  const listPriceRange = await api('/api/products?category=vegetable&minPrice=20&maxPrice=25');
  const listPriceItems = Array.isArray(listPriceRange.json?.listings) ? listPriceRange.json.listings : [];
  check('product.filter.priceRange', listPriceRange.response.status === 200 && listPriceItems.some((x) => x._id === product2Id) && !listPriceItems.some((x) => x._id === product1Id), `count=${listPriceItems.length}`);

  const listLocationNearby = await api('/api/products?category=vegetable&userLocation=Pune, Maharashtra');
  const nearbyItems = Array.isArray(listLocationNearby.json?.listings) ? listLocationNearby.json.listings : [];
  const oneNearby = nearbyItems.find((x) => x._id === product1Id);
  check('product.nearby.flag', Boolean(oneNearby?.nearby), `nearby=${oneNearby?.nearby}`);

  const detail = await api(`/api/products/${product1Id}?userLocation=Pune, Maharashtra`);
  check('product.detail.status', detail.response.status === 200, `status=${detail.response.status}`);
  check('product.detail.recommendedPrice', typeof detail.json?.product?.recommendedPrice === 'number', `recommended=${detail.json?.product?.recommendedPrice}`);

  const updateByOwner = await api(`/api/products/${product1Id}`, {
    method: 'PUT',
    headers: authHeaders(sellerToken, true),
    body: JSON.stringify({ pricePerUnit: 26, quantity: 140, description: 'Updated tomato lot' }),
  });
  check('product.update.owner', updateByOwner.response.status === 200, `status=${updateByOwner.response.status}`);

  const updateByOther = await api(`/api/products/${product1Id}`, {
    method: 'PUT',
    headers: authHeaders(otherToken, true),
    body: JSON.stringify({ pricePerUnit: 5 }),
  });
  check('product.update.nonOwner.blocked', updateByOther.response.status === 404 || updateByOther.response.status === 403, `status=${updateByOther.response.status}`);

  const markSold = await api(`/api/products/${product1Id}/status`, {
    method: 'PATCH',
    headers: authHeaders(sellerToken, true),
    body: JSON.stringify({ status: 'sold' }),
  });
  check('product.status.markSold.owner', markSold.response.status === 200, `status=${markSold.response.status}`);

  const myListings = await api('/api/listings/me', {
    headers: authHeaders(sellerToken),
  });
  const mine = Array.isArray(myListings.json?.listings) ? myListings.json.listings : [];
  check('seller.dashboard.listings.me', myListings.response.status === 200 && mine.some((x) => x._id === product1Id), `count=${mine.length}`);

  const tinyPngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgM4XW2EAAAAASUVORK5CYII=', 'base64');
  const uploadForm = new FormData();
  uploadForm.append('image', new Blob([tinyPngBytes], { type: 'image/png' }), 'tiny.png');

  const uploadResp = await fetch(`${BASE}/api/products/upload-image`, {
    method: 'POST',
    headers: authHeaders(sellerToken),
    body: uploadForm,
  });
  const uploadJson = await uploadResp.json();
  check('product.imageUpload.status', uploadResp.status === 201, `status=${uploadResp.status}`);
  check('product.imageUpload.url', typeof uploadJson?.imageUrl === 'string' && uploadJson.imageUrl.startsWith('/uploads/products/'), `url=${uploadJson?.imageUrl}`);

  const deleteByOther = await api(`/api/products/${product2Id}`, {
    method: 'DELETE',
    headers: authHeaders(otherToken),
  });
  check('product.delete.nonOwner.blocked', deleteByOther.response.status === 404 || deleteByOther.response.status === 403, `status=${deleteByOther.response.status}`);

  const deleteByOwner = await api(`/api/products/${product2Id}`, {
    method: 'DELETE',
    headers: authHeaders(sellerToken),
  });
  check('product.delete.owner', deleteByOwner.response.status === 200, `status=${deleteByOwner.response.status}`);

  const chatBeforeFollow = await api('/api/messages', {
    method: 'POST',
    headers: authHeaders(buyerToken, true),
    body: JSON.stringify({ receiverId: sellerId, message: 'Interested in your tomato listing.' }),
  });
  check('chat.contactSeller.beforeFollow.blocked', chatBeforeFollow.response.status === 403, `status=${chatBeforeFollow.response.status}`);

  const followRequest = await api('/api/follow-request', {
    method: 'POST',
    headers: authHeaders(buyerToken, true),
    body: JSON.stringify({ receiverId: sellerId }),
  });
  check('chat.contactSeller.follow.send', followRequest.response.status === 201, `status=${followRequest.response.status}`);

  const requestId = followRequest.json?.request?._id;
  const followAccept = await api('/api/follow-request/accept', {
    method: 'POST',
    headers: authHeaders(sellerToken, true),
    body: JSON.stringify({ requestId }),
  });
  check('chat.contactSeller.follow.accept', followAccept.response.status === 200, `status=${followAccept.response.status}`);

  const chatAfterFollow = await api('/api/messages', {
    method: 'POST',
    headers: authHeaders(buyerToken, true),
    body: JSON.stringify({ receiverId: sellerId, message: 'Now chat should work after follow accepted.' }),
  });
  check('chat.contactSeller.afterFollow.allowed', chatAfterFollow.response.status === 201, `status=${chatAfterFollow.response.status}`);

  console.log('\n--- MARKETPLACE FEATURE SUMMARY ---');
  console.log('Passed:', results.passed.length);
  console.log('Failed:', results.failed.length);

  if (results.failed.length > 0) {
    console.log('Failed checks:', results.failed);
    process.exit(1);
  }

  process.exit(0);
}

testMarketplace().catch((error) => {
  console.error('Unhandled marketplace test failure:', error);
  process.exit(1);
});
