const { query } = require('../config/db');
const { logAudit } = require('../services/auditService');

async function getCommissions(req, res, next) {
  try {
    const { status, rep_id } = req.query;
    let [commissions] = await query('SELECT * FROM commissions ORDER BY id DESC');

    if (status) {
      commissions = commissions.filter(c => c.payout_status === status);
    }
    if (rep_id) {
      commissions = commissions.filter(c => Number(c.rep_id) === Number(rep_id));
    }

    const totalPaid = commissions.filter(c => c.payout_status === 'Paid').reduce((acc, c) => acc + Number(c.total_payout), 0);
    const totalPending = commissions.filter(c => c.payout_status === 'Pending Review' || c.payout_status === 'Approved').reduce((acc, c) => acc + Number(c.total_payout), 0);

    res.json({
      success: true,
      summary: {
        total_payout_amount: Math.round(totalPaid + totalPending),
        total_paid: Math.round(totalPaid),
        total_pending: Math.round(totalPending)
      },
      count: commissions.length,
      data: commissions
    });
  } catch (err) {
    next(err);
  }
}

async function updateCommissionStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { payout_status, payment_date } = req.body;

    if (!payout_status) {
      return res.status(400).json({ success: false, message: 'payout_status is required' });
    }

    const dateVal = payout_status === 'Paid' ? (payment_date || new Date().toISOString().split('T')[0]) : null;
    await query('UPDATE commissions SET payout_status = ?, payment_date = ? WHERE id = ?', [payout_status, dateVal, id]);

    await logAudit({
      userId: req.user ? req.user.id : 1,
      userEmail: req.user ? req.user.email : 'sales_ops@revpulse.io',
      userRole: req.user ? req.user.role : 'sales_ops_admin',
      action: 'COMMISSION_STATUS_UPDATED',
      entityType: 'commission',
      entityId: id,
      details: { payout_status, payment_date: dateVal },
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true, message: `Commission #${id} status updated to "${payout_status}"` });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCommissions,
  updateCommissionStatus
};
