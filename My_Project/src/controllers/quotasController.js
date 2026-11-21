const { getQuotaPerformance } = require('../services/quotaService');
const { query } = require('../config/db');

async function getQuotas(req, res, next) {
  try {
    const performance = await getQuotaPerformance();
    res.json({ success: true, data: performance });
  } catch (err) {
    next(err);
  }
}

async function updateQuotaTarget(req, res, next) {
  try {
    const { id } = req.params;
    const { target_amount } = req.body;

    if (!target_amount) {
      return res.status(400).json({ success: false, message: 'target_amount is required' });
    }

    await query('UPDATE quotas SET target_amount = ? WHERE id = ?', [Number(target_amount), id]);
    res.json({ success: true, message: 'Quota target updated successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getQuotas,
  updateQuotaTarget
};
