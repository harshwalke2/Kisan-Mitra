const { io } = require('socket.io-client');

const BASE = 'http://localhost:5055';

const state = {
  passed: [],
  failed: [],
};

function ok(name, condition, details = '') {
  if (condition) {
    state.passed.push({ name, details });
    console.log('PASS', name, details || '');
  } else {
    state.failed.push({ name, details });
    console.log('FAIL', name, details || '');
  }
}

async function request(path, options = {}) {
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

async function registerUser(prefix, role = 'farmer') {
  const stamp = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const username = `${prefix}_${stamp}`;
  const email = `${prefix}.${stamp}@example.com`;
  const body = {
    username,
    email,
    password: 'Pass@1234',
    phone: '9999999999',
    location: 'Pune',
    farmName: 'rice farm',
    farmSize: 3,
    preferredLanguage: 'en',
    role,
  };

  const { response, json } = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return { response, json, body };
}

async function run() {
  const health = await request('/api/health');
  ok('health.status', health.response.status === 200, `status=${health.response.status}`);
  ok('health.database', health.json && health.json.database === 'connected', `database=${health.json?.database}`);

  const protectedNoToken = await request('/api/auth/me');
  ok('auth.protected.noToken', protectedNoToken.response.status === 401, `status=${protectedNoToken.response.status}`);

  const userAReg = await registerUser('qa_userA');
  ok('auth.register.userA', userAReg.response.status === 201, `status=${userAReg.response.status}`);
  const tokenA = userAReg.json?.token;
  const userAId = userAReg.json?.user?._id;

  const userBReg = await registerUser('qa_userB');
  ok('auth.register.userB', userBReg.response.status === 201, `status=${userBReg.response.status}`);
  const tokenB = userBReg.json?.token;
  const userBId = userBReg.json?.user?._id;

  const userCReg = await registerUser('qa_userC');
  ok('auth.register.userC', userCReg.response.status === 201, `status=${userCReg.response.status}`);
  const tokenC = userCReg.json?.token;
  const userCId = userCReg.json?.user?._id;

  const loginA = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userAReg.body.email, password: userAReg.body.password }),
  });
  ok('auth.login.userA', loginA.response.status === 200, `status=${loginA.response.status}`);

  const meA = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  ok('auth.me.userA', meA.response.status === 200 && meA.json?.user?._id === userAId, `status=${meA.response.status}`);

  const crop = await request('/api/crop-recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nitrogen: 90,
      phosphorus: 40,
      potassium: 40,
      temperature: 25,
      humidity: 80,
      ph: 6.5,
      rainfall: 200,
    }),
  });

  const hasCropPayload = crop.json && (crop.json.recommended_crop || crop.json.best_crop) && typeof crop.json.confidence !== 'undefined';
  ok('crop.recommendation.response', crop.response.status === 200 && hasCropPayload, `status=${crop.response.status}`);

  const notifGenerate = await request('/api/notifications/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      location: 'Pune',
      crop: 'rice',
      temperature: 34,
      humidity: 79,
      rainExpected: true,
      marketChangePercent: 16,
    }),
  });
  ok('notification.generate', notifGenerate.response.status === 200, `status=${notifGenerate.response.status}`);

  const notifList = await request('/api/notifications', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const notifCount = Array.isArray(notifList.json?.notifications) ? notifList.json.notifications.length : 0;
  ok('notification.list', notifList.response.status === 200 && notifCount > 0, `count=${notifCount}`);

  const chatBlocked = await request('/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ receiverId: userBId, message: 'Hello before follow' }),
  });
  ok('chat.blocked.before.follow', chatBlocked.response.status === 403, `status=${chatBlocked.response.status}`);

  const followReq = await request('/api/follow-request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ receiverId: userBId }),
  });
  ok('follow.send', followReq.response.status === 201, `status=${followReq.response.status}`);
  const requestId = followReq.json?.request?._id;

  const pendingB = await request('/api/follow-requests', {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const pendingCount = Array.isArray(pendingB.json?.requests) ? pendingB.json.requests.length : 0;
  ok('follow.pending.list', pendingB.response.status === 200 && pendingCount > 0, `count=${pendingCount}`);

  const acceptReq = await request('/api/follow-request/accept', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`,
    },
    body: JSON.stringify({ requestId }),
  });
  ok('follow.accept', acceptReq.response.status === 200, `status=${acceptReq.response.status}`);

  const chatAllowed = await request('/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ receiverId: userBId, message: 'Hello after follow accept' }),
  });
  ok('chat.allowed.after.follow', chatAllowed.response.status === 201, `status=${chatAllowed.response.status}`);

  const messagesAB = await request(`/api/messages/${userBId}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const msgCount = Array.isArray(messagesAB.json?.messages) ? messagesAB.json.messages.length : 0;
  ok('chat.messages.list', messagesAB.response.status === 200 && msgCount > 0, `count=${msgCount}`);

  const followReqReject = await request('/api/follow-request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ receiverId: userCId }),
  });

  const rejectRequestId = followReqReject.json?.request?._id;
  const rejectReq = await request('/api/follow-request/reject', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenC}`,
    },
    body: JSON.stringify({ requestId: rejectRequestId }),
  });
  ok('follow.reject', rejectReq.response.status === 200, `status=${rejectReq.response.status}`);

  const chatBlockedRejected = await request('/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ receiverId: userCId, message: 'Hello after reject' }),
  });
  ok('chat.blocked.after.reject', chatBlockedRejected.response.status === 403, `status=${chatBlockedRejected.response.status}`);

  const adminReg = await registerUser('qa_admin', 'admin');
  ok('auth.register.admin', adminReg.response.status === 201, `status=${adminReg.response.status}`);
  const adminToken = adminReg.json?.token;

  const adminInsights = await request('/api/admin/insights', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  ok('dashboard.admin.insights', adminInsights.response.status === 200 && Boolean(adminInsights.json?.insights), `status=${adminInsights.response.status}`);

  const nonAdminInsights = await request('/api/admin/insights', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  ok('dashboard.admin.protected', nonAdminInsights.response.status === 403, `status=${nonAdminInsights.response.status}`);

  // Realtime notification via socket.io
  const realtimeResult = await new Promise((resolve) => {
    let done = false;
    const socket = io(BASE, { transports: ['websocket', 'polling'] });

    const finish = (success, message) => {
      if (done) return;
      done = true;
      try {
        socket.disconnect();
      } catch (error) {
        // ignore
      }
      resolve({ success, message });
    };

    socket.on('connect', async () => {
      socket.emit('joinUser', { userId: userAId });
      setTimeout(async () => {
        try {
          await request('/api/notifications/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${tokenA}`,
            },
            body: JSON.stringify({
              location: 'Pune',
              crop: 'rice',
              temperature: 35,
              humidity: 80,
              rainExpected: true,
              marketChangePercent: 18,
              force: true,
            }),
          });
        } catch (error) {
          finish(false, 'generation error during realtime test');
        }
      }, 250);
    });

    socket.on('newNotification', (payload) => {
      finish(Boolean(payload), `title=${payload?.title || 'unknown'}`);
    });

    socket.on('connect_error', (error) => {
      finish(false, `socket error: ${error.message}`);
    });

    setTimeout(() => {
      finish(false, 'timeout waiting for newNotification');
    }, 9000);
  });

  ok('notification.realtime.socket', realtimeResult.success, realtimeResult.message);

  console.log('\n--- QA SUMMARY ---');
  console.log('Passed:', state.passed.length);
  console.log('Failed:', state.failed.length);

  if (state.failed.length > 0) {
    console.log('Failed checks:', state.failed);
    process.exit(1);
  }

  process.exit(0);
}

run().catch((error) => {
  console.error('Unhandled qa test error:', error);
  process.exit(1);
});
