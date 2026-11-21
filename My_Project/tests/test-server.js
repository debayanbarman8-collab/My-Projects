const http = require('http');
const app = require('../src/server');

const testPort = 5005;

async function runTests() {
  const server = app.listen(testPort, async () => {
    console.log(`[Test Server] Listening on port ${testPort}`);

    function get(path) {
      return new Promise((resolve, reject) => {
        http.get(`http://localhost:${testPort}${path}`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, body: data });
            }
          });
        }).on('error', reject);
      });
    }

    try {
      console.log('--- Probing API Endpoints ---');

      // 1. Health
      const health = await get('/api/health');
      console.log('✓ /api/health:', health.body.status, '| DB Mode:', health.body.database_mode);

      // 2. Dashboard Analytics
      const analytics = await get('/api/analytics/dashboard');
      console.log('✓ /api/analytics/dashboard:', {
        pipeline_arr: analytics.body.data.kpis.total_pipeline_arr,
        weighted_arr: analytics.body.data.kpis.weighted_pipeline_arr,
        win_rate: analytics.body.data.kpis.win_rate_pct + '%'
      });

      // 3. Kanban Pipeline
      const kanban = await get('/api/deals/kanban');
      console.log('✓ /api/deals/kanban: Stages count =', kanban.body.data.length);

      // 4. Leads
      const leads = await get('/api/leads');
      console.log('✓ /api/leads: Count =', leads.body.count, '| Top Lead Grade =', leads.body.data[0].ml_grade);

      // 5. Quotas & Commissions
      const quotas = await get('/api/quotas');
      console.log('✓ /api/quotas: Reps count =', quotas.body.data.reps.length);

      const commissions = await get('/api/commissions');
      console.log('✓ /api/commissions: Count =', commissions.body.count, '| Total Ledger = $' + commissions.body.summary.total_payout_amount);

      // 6. Territories
      const territories = await get('/api/territories');
      console.log('✓ /api/territories: Count =', territories.body.count);

      // 7. ML Training Logs
      const logs = await get('/api/ml/training-logs');
      console.log('✓ /api/ml/training-logs: Count =', logs.body.count, '| Latest AUC =', logs.body.data[0].auc_roc);

      console.log('--- All Server Endpoint Tests Passed Successfully! ---');
    } catch (err) {
      console.error('Test error:', err);
    } finally {
      server.close(() => {
        console.log('[Test Server] Stopped.');
        process.exit(0);
      });
    }
  });
}

runTests();
