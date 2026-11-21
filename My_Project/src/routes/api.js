const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const leadsController = require('../controllers/leadsController');
const dealsController = require('../controllers/dealsController');
const quotasController = require('../controllers/quotasController');
const commissionsController = require('../controllers/commissionsController');
const territoriesController = require('../controllers/territoriesController');
const analyticsController = require('../controllers/analyticsController');
const mlController = require('../controllers/mlController');
const customerController = require('../controllers/customerController');
const enterpriseController = require('../controllers/enterpriseController');

const { authenticateToken, authorizeRoles } = require('../middleware/rbac');
const { getIsMySQL, query } = require('../config/db');

// ====================================================================
// PUBLIC UNPROTECTED ENDPOINTS
// ====================================================================

// 1. Health & Readiness Probe (matches Dockerfile HEALTHCHECK)
router.get('/health', async (req, res) => {
  const isMySQL = getIsMySQL();
  const uptime = Math.round(process.uptime() * 10) / 10;
  const version = '1.0.0';

  if (isMySQL) {
    try {
      await query('SELECT 1 as ping');
      return res.status(200).json({
        status: 'healthy',
        db: 'connected',
        mode: 'mysql_production',
        uptime,
        version,
        timestamp: new Date().toISOString()
      });
    } catch (dbErr) {
      return res.status(503).json({
        status: 'unhealthy',
        db: 'disconnected',
        error: dbErr.message,
        uptime,
        version,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Fallback engine active
  return res.status(200).json({
    status: 'healthy',
    db: 'connected',
    mode: 'fallback_mode',
    notice: 'Operating on zero-dependency in-memory persistence store.',
    uptime,
    version,
    timestamp: new Date().toISOString()
  });
});

// 2. Public Auth Endpoints
router.post('/auth/login', authController.login);
router.get('/auth/demo-accounts', authController.getDemoAccounts);

// ====================================================================
// AUTHENTICATED ENDPOINTS (Requires valid JWT or development session)
// ====================================================================
router.use(authenticateToken);

// --- Auth & Users ---
router.get('/auth/me', authController.getCurrentUser);
router.get('/auth/reps', authController.getReps);

// --- Enterprise Command Palette & Global Search ---
router.get('/enterprise/search', enterpriseController.executeSearch);

// --- System Notifications & Velocity Alerts ---
router.get('/enterprise/notifications', enterpriseController.fetchNotifications);
router.patch('/enterprise/notifications/:id/read', enterpriseController.markRead);
router.post('/enterprise/notifications/mark-all-read', enterpriseController.markAllRead);
router.post('/enterprise/alerts/scan', enterpriseController.triggerVelocityScan);

// --- CSV Export & Ingestion ---
router.get('/enterprise/export/:entity', enterpriseController.exportEntityCSV);
router.post('/enterprise/leads/bulk-import', enterpriseController.bulkImportLeads);

// --- Immutable Audit Logs (RBAC: Admin & Sales Manager) ---
router.get('/enterprise/audit-logs', authorizeRoles('sales_ops_admin', 'sales_manager'), enterpriseController.fetchAuditLogs);

// --- Customer Portal Endpoints ---
router.get('/customer/overview', customerController.getCustomerOverview);
router.post('/customer/messages', customerController.sendCustomerMessage);
router.post('/customer/calculate-roi', customerController.calculateCustomerROI);

// --- Leads Management & ML Scoring ---
router.get('/leads', leadsController.getLeads);
router.post('/leads', leadsController.createLead);
router.get('/leads/:id', leadsController.getLeadById);
router.post('/leads/:id/convert', leadsController.convertLeadToDeal);

// --- Opportunity / Deals & Kanban ---
router.get('/deals', dealsController.getDeals);
router.post('/deals', dealsController.createDeal);
router.get('/deals/kanban', dealsController.getKanban);
router.get('/deals/:id', dealsController.getDealById);
router.patch('/deals/:id/stage', dealsController.changeStage);
router.post('/deals/:id/activities', dealsController.addDealActivity);

// --- Quota & Performance ---
router.get('/quotas', quotasController.getQuotas);
router.patch('/quotas/:id', quotasController.updateQuotaTarget);

// --- Commissions Engine (Status update protected by RBAC) ---
router.get('/commissions', commissionsController.getCommissions);
router.patch('/commissions/:id', authorizeRoles('sales_ops_admin', 'sales_manager'), commissionsController.updateCommissionStatus);

// --- Territory Management & Smart Routing ---
router.get('/territories', territoriesController.getTerritories);
router.post('/territories/preview-routing', territoriesController.previewRouting);

// --- Executive Analytics & Forecast ---
router.get('/analytics/dashboard', analyticsController.getDashboardAnalytics);

// --- Machine Learning Engine & Simulation ---
router.post('/ml/score-lead', mlController.scoreLeadPreview);
router.post('/ml/predict-win', mlController.predictDealWinPreview);
router.post('/ml/simulate-revenue', mlController.simulateRevenueScenario);
router.post('/ml/retrain', authorizeRoles('sales_ops_admin', 'sales_manager'), mlController.retrainModelEndpoint);
router.get('/ml/training-logs', mlController.getModelLogs);

module.exports = router;
