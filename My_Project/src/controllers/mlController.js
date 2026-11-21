const { query } = require('../config/db');
const { scoreLead } = require('../ml/leadScorer');
const { predictWinProbability } = require('../ml/winPredictor');
const { runScenarioSimulation } = require('../ml/simulator');
const { retrainAndEvaluate } = require('../ml/modelTrainer');
const { logAudit } = require('../services/auditService');

async function scoreLeadPreview(req, res, next) {
  try {
    const result = scoreLead(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function predictDealWinPreview(req, res, next) {
  try {
    const deal = req.body;
    let stageInfo = null;
    if (deal.stage_id) {
      const [stages] = await query('SELECT * FROM opportunity_stages WHERE id = ?', [deal.stage_id]);
      stageInfo = stages[0] || null;
    }
    const result = predictWinProbability(deal, stageInfo);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function simulateRevenueScenario(req, res, next) {
  try {
    const params = req.body; // { activity_boost_pct, discount_reduction_pct, sponsor_adoption_pct, velocity_improvement_days }
    const [deals] = await query('SELECT * FROM opportunities');
    const [stages] = await query('SELECT * FROM opportunity_stages');

    const stageMap = {};
    stages.forEach(s => {
      stageMap[s.id] = s;
    });

    const simulation = runScenarioSimulation(deals, stageMap, params);
    res.json({ success: true, data: simulation });
  } catch (err) {
    next(err);
  }
}

async function retrainModelEndpoint(req, res, next) {
  try {
    const result = await retrainAndEvaluate();

    await logAudit({
      userId: req.user ? req.user.id : 1,
      userEmail: req.user ? req.user.email : 'sales_ops@revpulse.io',
      userRole: req.user ? req.user.role : 'sales_ops_admin',
      action: 'ML_MODEL_RETRAINED',
      entityType: 'ml_model',
      entityId: result.version,
      details: { metrics: result.metrics, samples: result.samples_count },
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true, message: 'ML model retrained and evaluated on historical sales data', data: result });
  } catch (err) {
    next(err);
  }
}

async function getModelLogs(req, res, next) {
  try {
    const [logs] = await query('SELECT * FROM ml_training_logs ORDER BY id DESC');
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  scoreLeadPreview,
  predictDealWinPreview,
  simulateRevenueScenario,
  retrainModelEndpoint,
  getModelLogs
};
