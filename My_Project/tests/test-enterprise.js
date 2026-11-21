/**
 * RevPulse Enterprise SaaS Integration Test Suite
 * Validates Production Health, RBAC Enforcement, Multi-Entity Search,
 * CSV Streaming Exports, Bulk Lead Ingestion, Velocity SLAs, and Audit Trail.
 */

const jwt = require('jsonwebtoken');
const app = require('../src/server');
const { initDB } = require('../src/config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secure_sales_ops_jwt_secret_key_2026_xyz123';

function mockRequest(method, url, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const { EventEmitter } = require('events');
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.headers = { 'content-type': 'application/json', ...headers };
    req.body = body || {};
    req.socket = { remoteAddress: '127.0.0.1' };
    req.connection = req.socket;

    const res = new EventEmitter();
    res.statusCode = 200;
    res.headers = {};
    let responseData = '';

    res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
    res.getHeader = (k) => res.headers[k.toLowerCase()];
    res.removeHeader = (k) => { delete res.headers[k.toLowerCase()]; };
    res.status = (code) => { res.statusCode = code; return res; };
    res.write = (chunk) => {
      if (chunk) responseData += chunk;
      return true;
    };
    res.json = (data) => {
      resolve({ status: res.statusCode, data, headers: res.headers });
    };
    res.send = (data) => {
      resolve({ status: res.statusCode, data, headers: res.headers });
    };
    res.end = (data) => {
      if (data) responseData += data;
      resolve({ status: res.statusCode, data: responseData, headers: res.headers });
    };

    app.handle(req, res, (err) => {
      if (err) reject(err);
      else resolve({ status: 404, data: 'Not Found', headers: res.headers });
    });
  });
}

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function runEnterpriseTests() {
  console.log('===============================================================');
  console.log('   🧪 Starting RevPulse Enterprise Production Integration Tests');
  console.log('===============================================================');

  await initDB();

  const adminToken = createToken({
    id: 1,
    name: 'Elena Vance',
    email: 'elena.vance@revpulse.io',
    role: 'sales_ops_admin'
  });

  const repToken = createToken({
    id: 2,
    name: 'Marcus Sterling',
    email: 'marcus.sterling@revpulse.io',
    role: 'sales_dev_rep'
  });

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✕ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Health Probe
  console.log('\n--- 1. Testing Health & Readiness Probes ---');
  const healthRes = await mockRequest('GET', '/api/health');
  assert(healthRes.status === 200, `Healthcheck returns HTTP 200 (Got ${healthRes.status})`);
  assert(healthRes.data.status === 'healthy', `Status reports 'healthy' (Got ${healthRes.data.status})`);
  assert(healthRes.data.uptime !== undefined, 'Uptime metric is present');
  assert(healthRes.data.db === 'connected' || healthRes.data.db === 'fallback_mode', `DB reports valid connection mode (${healthRes.data.db})`);

  // 2. RBAC Enforcement
  console.log('\n--- 2. Testing Role-Based Access Control (RBAC) ---');
  
  // Rep token should be forbidden (403) from approving commissions
  const repCommRes = await mockRequest('PATCH', '/api/commissions/1', { payout_status: 'Paid' }, {
    authorization: `Bearer ${repToken}`
  });
  assert(repCommRes.status === 403, `Rep role forbidden (403) from updating commission status (Got ${repCommRes.status})`);

  // Admin token should succeed (200)
  const adminCommRes = await mockRequest('PATCH', '/api/commissions/1', { payout_status: 'Paid' }, {
    authorization: `Bearer ${adminToken}`
  });
  assert(adminCommRes.status === 200, `Admin role authorized (200) to update commission status (Got ${adminCommRes.status})`);

  // Rep token should be forbidden (403) from retraining ML models
  const repRetrainRes = await mockRequest('POST', '/api/ml/retrain', {}, {
    authorization: `Bearer ${repToken}`
  });
  assert(repRetrainRes.status === 403, `Rep role forbidden (403) from retraining ML model (Got ${repRetrainRes.status})`);

  // Admin token should succeed (200) retraining ML models
  const adminRetrainRes = await mockRequest('POST', '/api/ml/retrain', {}, {
    authorization: `Bearer ${adminToken}`
  });
  assert(adminRetrainRes.status === 200, `Admin role authorized (200) to retrain ML model (Got ${adminRetrainRes.status})`);
  assert(adminRetrainRes.data.success === true, 'ML retrain returns success payload');

  // Rep token forbidden from viewing audit logs
  const repAuditRes = await mockRequest('GET', '/api/enterprise/audit-logs', null, {
    authorization: `Bearer ${repToken}`
  });
  assert(repAuditRes.status === 403, `Rep role forbidden (403) from accessing audit logs (Got ${repAuditRes.status})`);

  // Admin token authorized to view audit logs
  const adminAuditRes = await mockRequest('GET', '/api/enterprise/audit-logs', null, {
    authorization: `Bearer ${adminToken}`
  });
  assert(adminAuditRes.status === 200, `Admin role authorized (200) to access audit logs (Got ${adminAuditRes.status})`);

  // 3. Global Multi-Entity Search (Command Palette)
  console.log('\n--- 3. Testing Global Multi-Entity Search (Command Palette) ---');
  const searchApex = await mockRequest('GET', '/api/enterprise/search?q=Apex', null, {
    authorization: `Bearer ${adminToken}`
  });
  assert(searchApex.status === 200, 'Search endpoint returns HTTP 200');
  assert(searchApex.data.success === true, 'Search response indicates success');
  assert(Array.isArray(searchApex.data.data.opportunities), 'Search returns opportunities array');
  assert(Array.isArray(searchApex.data.data.accounts), 'Search returns accounts array');

  const searchRep = await mockRequest('GET', '/api/enterprise/search?q=Elena', null, {
    authorization: `Bearer ${adminToken}`
  });
  assert(searchRep.data.data.users.length > 0, `Search for 'Elena' returns matching users (Found ${searchRep.data.data.users.length})`);

  // 4. RFC-4180 Streaming CSV Data Exports
  console.log('\n--- 4. Testing RFC-4180 CSV Data Exports ---');
  const exportEntities = ['leads', 'deals', 'commissions', 'quotas'];
  for (const entity of exportEntities) {
    const exportRes = await mockRequest('GET', `/api/enterprise/export/${entity}`, null, {
      authorization: `Bearer ${adminToken}`
    });
    assert(exportRes.status === 200, `Export '${entity}' returns HTTP 200`);
    assert(typeof exportRes.data === 'string', `Export '${entity}' returns string content`);
    assert(exportRes.data.includes('\n') || exportRes.data.includes('\r\n'), `Export '${entity}' contains multi-line CSV data`);
    assert(exportRes.headers['content-type'].includes('text/csv'), `Export '${entity}' Content-Type is text/csv`);
  }

  // 5. Bulk Lead Ingestion with ML Scoring & Routing
  console.log('\n--- 5. Testing Bulk Lead Ingestion & ML Pipeline ---');
  const testLeads = [
    {
      first_name: 'Damon',
      last_name: 'Salvatore',
      email: 'damon@mystictech.io',
      company: 'Mystic Tech',
      title: 'VP Engineering',
      industry: 'Technology',
      company_size: 420,
      annual_revenue: 35000000,
      lead_source: 'Inbound Demo',
      urgency_level: 'Immediate',
      website_visits: 12,
      email_opens: 5,
      content_downloads: 3,
      decision_maker: true,
      budget_confirmed: true
    },
    {
      first_name: 'Genevieve',
      last_name: 'Dupont',
      email: 'g.dupont@hexacapital.fr',
      company: 'Hexa Capital',
      title: 'Chief Investment Officer',
      industry: 'Financial Services',
      company_size: 1500,
      annual_revenue: 120000000,
      lead_source: 'Partner Referral',
      urgency_level: 'High',
      website_visits: 18,
      email_opens: 7,
      content_downloads: 4,
      decision_maker: true,
      budget_confirmed: true
    }
  ];

  const bulkImportRes = await mockRequest('POST', '/api/enterprise/leads/bulk-import', { leads: testLeads }, {
    authorization: `Bearer ${adminToken}`
  });
  assert(bulkImportRes.status === 200, `Bulk import returns HTTP 200 (Got ${bulkImportRes.status})`);
  assert(bulkImportRes.data.data.imported_count === 2, `Bulk import created 2 leads (Got ${bulkImportRes.data.data.imported_count})`);
  assert(bulkImportRes.data.data.leads[0].ml_score > 0, `First lead has ML score assigned (${bulkImportRes.data.data.leads[0].ml_score})`);
  assert(['A', 'B', 'C', 'D'].includes(bulkImportRes.data.data.leads[0].ml_grade), `First lead has ML grade (${bulkImportRes.data.data.leads[0].ml_grade})`);
  assert(bulkImportRes.data.data.leads[0].assigned_rep_id !== null, 'Lead auto-routed to sales representative');

  // 6. Velocity SLA Scanner & System Notifications
  console.log('\n--- 6. Testing Deal Velocity SLA Scanner & In-App Alerts ---');
  const scanRes = await mockRequest('POST', '/api/enterprise/alerts/scan', {}, {
    authorization: `Bearer ${adminToken}`
  });
  assert(scanRes.status === 200, `Velocity SLA scan returns HTTP 200 (Got ${scanRes.status})`);
  assert(scanRes.data.data.detected !== undefined, `Scan reports detected count (${scanRes.data.data.detected})`);

  const notifsRes = await mockRequest('GET', '/api/enterprise/notifications', null, {
    authorization: `Bearer ${adminToken}`
  });
  assert(notifsRes.status === 200, 'Notifications endpoint returns HTTP 200');
  assert(Array.isArray(notifsRes.data.data.notifications), 'Notifications returns array');
  assert(notifsRes.data.data.unread_count !== undefined, `Unread count reported (${notifsRes.data.data.unread_count})`);

  const markAllRes = await mockRequest('POST', '/api/enterprise/notifications/mark-all-read', {}, {
    authorization: `Bearer ${adminToken}`
  });
  assert(markAllRes.status === 200, 'Mark-all-read returns HTTP 200');
  assert(markAllRes.data.success === true, 'Mark-all-read reports success');

  // 7. System Audit Trail Verification
  console.log('\n--- 7. Testing Immutable Audit Trail Logging ---');
  const auditRes = await mockRequest('GET', '/api/enterprise/audit-logs?limit=50', null, {
    authorization: `Bearer ${adminToken}`
  });
  assert(auditRes.status === 200, 'Audit logs endpoint returns HTTP 200');
  const logs = auditRes.data.data;
  assert(Array.isArray(logs) && logs.length > 0, `Audit logs feed has entries (Count: ${logs.length})`);
  
  const actions = logs.map(l => l.action);
  console.log('  Recorded Audit Actions:', [...new Set(actions)].join(', '));
  assert(actions.includes('COMMISSION_STATUS_UPDATED'), 'Audit trail recorded COMMISSION_STATUS_UPDATED');
  assert(actions.includes('ML_MODEL_RETRAINED'), 'Audit trail recorded ML_MODEL_RETRAINED');
  assert(actions.includes('DATA_EXPORTED'), 'Audit trail recorded DATA_EXPORTED');
  assert(actions.includes('LEADS_BULK_IMPORTED'), 'Audit trail recorded LEADS_BULK_IMPORTED');

  console.log('\n===============================================================');
  console.log(`  🎉 ALL ENTERPRISE QUALITY GATES PASSED! (${passed}/${total})`);
  console.log('===============================================================');
}

if (require.main === module) {
  runEnterpriseTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ Enterprise integration test suite failed:', err);
      process.exit(1);
    });
}

module.exports = runEnterpriseTests;
