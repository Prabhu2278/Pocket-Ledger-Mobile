/**
 * Pocket Ledger Mobile - Backend Connectivity & Verification Script
 * Validates real API connectivity, database persistence, and authentication
 * between the mobile app's API client contracts and the FastAPI backend.
 */

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:9000';

async function runVerification() {
  console.log(`=======================================================`);
  console.log(`Pocket Ledger Mobile -> FastAPI Backend Verification`);
  console.log(`Target Backend Base URL: ${API_BASE}`);
  console.log(`=======================================================\n`);

  let passed = 0;
  let failed = 0;

  async function check(name, testFn) {
    process.stdout.write(`• Checking ${name}... `);
    try {
      await testFn();
      console.log(`\x1b[32m[PASSED]\x1b[0m`);
      passed++;
    } catch (err) {
      console.log(`\x1b[31m[FAILED]\x1b[0m: ${err.message}`);
      failed++;
    }
  }

  // 1. Health Probe
  await check('Health Endpoint (/health)', async () => {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== 'healthy' && data.status !== 'ok') {
      throw new Error(`Unexpected health payload: ${JSON.stringify(data)}`);
    }
  });

  // 2. Auth Flow (Register or Login)
  let authToken = null;
  const testEmail = 'mobile_qa@pocketledger.app';
  const testPassword = 'MobileTestPassword123!';

  await check('User Authentication (/api/v1/auth/login or register)', async () => {
    // Attempt login first
    let res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });

    if (res.status === 401 || res.status === 400 || res.status === 404) {
      // Attempt registration
      res = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Mobile QA User', email: testEmail, password: testPassword }),
      });
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.access_token) throw new Error('Missing access_token in response');
    authToken = data.access_token;
  });

  // 3. User Profile with Bearer Token
  await check('Authenticated Profile (/api/v1/auth/me)', async () => {
    if (!authToken) throw new Error('No auth token available');
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const user = await res.json();
    if (!user.email) throw new Error('User email not returned');
  });

  // 4. Wallets Retrieval
  let testWalletId = null;
  await check('Wallets & Accounts (/api/v1/wallets)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/wallets`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const wallets = await res.json();
    if (!Array.isArray(wallets)) throw new Error('Expected array of wallets');
    if (wallets.length > 0) {
      testWalletId = wallets[0].id;
    } else {
      // Create a test wallet
      const createRes = await fetch(`${API_BASE}/api/v1/wallets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'Mobile Test Bank',
          wallet_type: 'BANK',
          initial_balance: 50000,
          color: '#10b981',
        }),
      });
      if (!createRes.ok) throw new Error(`Failed to create test wallet: HTTP ${createRes.status}`);
      const newWallet = await createRes.json();
      testWalletId = newWallet.id;
    }
  });

  // 5. Transactions Ledger
  await check('Transactions Retrieval (/api/v1/transactions)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/transactions`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const txs = await res.json();
    if (!Array.isArray(txs)) throw new Error('Expected array of transactions');
  });

  // 6. Financial Insights
  await check('Financial Insights & Budgets (/api/v1/insights)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/insights`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const insights = await res.json();
    if (typeof insights.total_spent !== 'number') {
      throw new Error('Expected total_spent in insights summary');
    }
  });

  // 7. Categories
  await check('Categories (/api/v1/categories)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/categories`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const categories = await res.json();
    if (!Array.isArray(categories)) throw new Error('Expected array of categories');
  });

  // 8. Settings & Currency
  await check('Settings & Currency Preference (/api/v1/settings/currency)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/settings/currency`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const curr = await res.json();
    if (!curr.currency_code && !curr.currency) {
      throw new Error('Currency code missing from response');
    }
  });

  console.log(`\n=======================================================`);
  console.log(`Verification Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`=======================================================`);

  if (failed > 0) process.exit(1);
}

runVerification();
