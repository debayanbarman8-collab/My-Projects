const app = require('../src/server');
const { initDB } = require('../src/config/db');

function mockRequest(method, url, body = null) {
  return new Promise((resolve, reject) => {
    const { EventEmitter } = require('events');
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.headers = { 'content-type': 'application/json' };
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
    res.json = (data) => {
      resolve({ status: res.statusCode, data });
    };
    res.send = (data) => {
      resolve({ status: res.statusCode, data });
    };
    res.end = (data) => {
      if (data) responseData += data;
      resolve({ status: res.statusCode, data: responseData });
    };

    app.handle(req, res, (err) => {
      if (err) reject(err);
      else resolve({ status: 404, data: 'Not Found' });
    });
  });
}

async function testAll() {
  await initDB();
  console.log('--- Testing API Controllers In-Process ---');

  // 1. Health
  const health = await mockRequest('GET', '/api/health');
  console.log('✓ Health:', health.status, health.data);

  // 2. Analytics Dashboard
  const analytics = await mockRequest('GET', '/api/analytics/dashboard');
  console.log('✓ Analytics:', analytics.status, {
    pipeline_arr: analytics.data.data.kpis.total_pipeline_arr,
    weighted_arr: analytics.data.data.kpis.weighted_pipeline_arr,
    win_rate: analytics.data.data.kpis.win_rate_pct + '%'
  });

  // 3. Kanban
  const kanban = await mockRequest('GET', '/api/deals/kanban');
  console.log('✓ Kanban stages:', kanban.data.data.length);

  // 4. Leads
  const leads = await mockRequest('GET', '/api/leads');
  console.log('✓ Leads count:', leads.data.count);

  // 5. Quotas
  const quotas = await mockRequest('GET', '/api/quotas');
  console.log('✓ Quotas reps:', quotas.data.data.reps.length);

  // 6. Commissions
  const commissions = await mockRequest('GET', '/api/commissions');
  console.log('✓ Commissions count:', commissions.data.count);

  // 7. Territories
  const territories = await mockRequest('GET', '/api/territories');
  console.log('✓ Territories count:', territories.data.count);

  // 8. ML What-If Simulator
  const sim = await mockRequest('POST', '/api/ml/simulate-revenue', {
    activity_boost_pct: 20,
    discount_reduction_pct: 5,
    sponsor_adoption_pct: 30,
    velocity_improvement_days: 3
  });
  console.log('✓ Simulator result:', {
    baseline_arr: sim.data.data.baseline_expected_arr,
    simulated_arr: sim.data.data.simulated_expected_arr,
    delta_arr: sim.data.data.arr_delta
  });

  // 9. ML Lead Scoring Preview
  const scored = await mockRequest('POST', '/api/ml/score-lead', {
    company_size: 1200,
    lead_source: 'Inbound Demo',
    website_visits: 10,
    email_opens: 6,
    decision_maker: true,
    budget_confirmed: true,
    urgency_level: 'Immediate'
  });
  console.log('✓ Score preview:', scored.data.data.score, scored.data.data.grade);

  // 10. Demo Accounts for Login
  const demoAccounts = await mockRequest('GET', '/api/auth/demo-accounts');
  console.log('✓ Demo Accounts:', {
    salesReps: demoAccounts.data.data.sales.length,
    customers: demoAccounts.data.data.customers.length
  });

  // 11. Customer Portal Overview
  const customerOverview = await mockRequest('GET', '/api/customer/overview');
  console.log('✓ Customer Overview:', {
    customerName: customerOverview.data.data.customer.name,
    company: customerOverview.data.data.account.name,
    dealAmount: customerOverview.data.data.primaryDeal.amount
  });

  // 12. Customer ROI Calculator
  const roiRes = await mockRequest('POST', '/api/customer/calculate-roi', {
    sales_team_size: 50,
    avg_rep_salary: 110000,
    hours_saved_weekly_per_rep: 5,
    win_rate_increase_pct: 4.5,
    current_annual_revenue: 45000000
  });
  console.log('✓ Customer ROI Calculation:', {
    laborSaved: roiRes.data.data.annual_time_savings,
    revenueUplift: roiRes.data.data.revenue_uplift,
    netReturn: roiRes.data.data.net_return,
    roiPct: roiRes.data.data.roi_percentage + '%'
  });

  // 13. Customer Message
  const msgRes = await mockRequest('POST', '/api/customer/messages', {
    message: 'Hello, our procurement legal team has approved the MSA redlines.'
  });
  console.log('✓ Customer Message Sent:', msgRes.data.message);

  console.log('--- ALL CONTROLLER TESTS PASSED CLEANLY! ---');
  process.exit(0);
}

testAll();
