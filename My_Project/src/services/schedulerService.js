const { retrainAndEvaluate } = require('../ml/modelTrainer');
const { scanVelocitySLAs } = require('./velocityAlertService');
const { logAudit } = require('./auditService');

let retrainTimer = null;
let velocityScanTimer = null;

function startScheduler() {
  const retrainHours = parseInt(process.env.ML_RETRAIN_INTERVAL_HOURS, 10) || 24;
  const intervalMs = Math.max(1, retrainHours) * 60 * 60 * 1000;

  console.log(`[Scheduler] Initialized. Background ML Retraining interval set to ${retrainHours}h.`);

  // Periodic Model Retraining Job
  retrainTimer = setInterval(async () => {
    try {
      console.log('[Scheduler] Executing scheduled ML Model retraining on closed sales data...');
      const result = await retrainAndEvaluate();
      await logAudit({
        userId: 1,
        userEmail: 'system.scheduler@revpulse.io',
        userRole: 'system',
        action: 'ML_MODEL_RETRAINED',
        entityType: 'ml_model',
        entityId: result.version,
        details: { metrics: result.metrics, samples: result.samples_count, trigger: 'CRON_SCHEDULED' },
        ipAddress: '127.0.0.1'
      });
      console.log(`[Scheduler] Model retrained successfully to ${result.version} (AUC: ${result.metrics.roc_auc}).`);
    } catch (err) {
      console.error('[Scheduler Error] ML Retraining failed:', err.message);
    }
  }, intervalMs);

  // Periodic Velocity SLA Scan (Runs every 30 minutes in production, 1 hour default)
  const scanIntervalMs = 60 * 60 * 1000;
  velocityScanTimer = setInterval(async () => {
    try {
      await scanVelocitySLAs();
    } catch (err) {
      console.warn('[Scheduler Warning] Velocity SLA scan error:', err.message);
    }
  }, scanIntervalMs);
}

function stopScheduler() {
  if (retrainTimer) {
    clearInterval(retrainTimer);
    retrainTimer = null;
  }
  if (velocityScanTimer) {
    clearInterval(velocityScanTimer);
    velocityScanTimer = null;
  }
  console.log('[Scheduler] Stopped all background tasks.');
}

module.exports = {
  startScheduler,
  stopScheduler
};
