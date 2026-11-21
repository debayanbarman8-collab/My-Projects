const { query } = require('../config/db');

/**
 * Enterprise Tiered Commission & Accelerator Calculation Engine
 * 
 * Rules:
 * - Base Commission Rate: 8.0%
 * - Tier 1: Quota Attainment < 100% => 1.0x Multiplier (Effective: 8.0%)
 * - Tier 2 (Target Hit): Quota Attainment 100% - 125% => 1.5x Accelerator (Effective: 12.0%)
 * - Tier 3 (President's Club): Quota Attainment > 125% => 1.875x Super-Accelerator (Effective: 15.0%)
 * - Multi-rep Deal Split: AE primary split + optional SE secondary split
 */

function calculateCommissionRate(attainmentPct, baseRate = 8.0) {
  let multiplier = 1.0;
  if (attainmentPct >= 125) {
    multiplier = 1.875; // Tier 3
  } else if (attainmentPct >= 100) {
    multiplier = 1.5;   // Tier 2
  }

  const effectiveRate = Math.round(baseRate * multiplier * 100) / 100;
  return { multiplier, effectiveRate };
}

async function processDealCommission(opportunityId) {
  const [oppRows] = await query('SELECT * FROM opportunities WHERE id = ?', [opportunityId]);
  if (!oppRows || oppRows.length === 0) return null;
  const opp = oppRows[0];

  const primaryRepId = opp.assigned_rep_id;
  const secondaryRepId = opp.secondary_rep_id;
  const totalAmount = Number(opp.amount || 0);
  const primarySplitPct = Number(opp.split_percentage || 100);
  const secondarySplitPct = 100 - primarySplitPct;

  // 1. Fetch Primary Rep Quota Attainment
  const [primaryQuotaRows] = await query('SELECT * FROM quotas WHERE rep_id = ? ORDER BY id DESC LIMIT 1', [primaryRepId]);
  let primaryAttainment = 75.0;
  if (primaryQuotaRows && primaryQuotaRows.length > 0) {
    const q = primaryQuotaRows[0];
    const target = Number(q.target_amount) || 1;
    const attained = Number(q.attained_amount) || 0;
    primaryAttainment = Math.round((attained / target) * 1000) / 10;
  }

  const primaryCalc = calculateCommissionRate(primaryAttainment, 8.0);
  const primaryDealShare = totalAmount * (primarySplitPct / 100);
  const primaryPayout = Math.round(primaryDealShare * (primaryCalc.effectiveRate / 100));

  // Insert primary rep commission
  await query(
    `INSERT INTO commissions (opportunity_id, rep_id, deal_amount, quota_attainment_pct_at_close, base_rate_pct, accelerator_multiplier, effective_commission_pct, total_payout, payout_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Approved')`,
    [
      opportunityId,
      primaryRepId,
      primaryDealShare,
      primaryAttainment,
      8.0,
      primaryCalc.multiplier,
      primaryCalc.effectiveRate,
      primaryPayout
    ]
  );

  // Update rep quota attained amount
  if (primaryQuotaRows && primaryQuotaRows.length > 0) {
    const newAttained = Number(primaryQuotaRows[0].attained_amount) + primaryDealShare;
    const target = Number(primaryQuotaRows[0].target_amount) || 1;
    const status = newAttained >= target ? 'Exceeded' : 'On Track';
    await query('UPDATE quotas SET attained_amount = ?, status = ? WHERE id = ?', [newAttained, status, primaryQuotaRows[0].id]);
  }

  // 2. If secondary rep exists (e.g. Sales Engineer)
  let secondaryPayout = 0;
  if (secondaryRepId && secondarySplitPct > 0) {
    const secondaryDealShare = totalAmount * (secondarySplitPct / 100);
    const seEffectiveRate = 4.0; // SE standard overlay rate
    secondaryPayout = Math.round(secondaryDealShare * (seEffectiveRate / 100));

    await query(
      `INSERT INTO commissions (opportunity_id, rep_id, deal_amount, quota_attainment_pct_at_close, base_rate_pct, accelerator_multiplier, effective_commission_pct, total_payout, payout_status)
       VALUES (?, ?, ?, 100.0, 4.0, 1.0, 4.0, ?, 'Approved')`,
      [opportunityId, secondaryRepId, secondaryDealShare, secondaryPayout]
    );
  }

  return {
    primaryRep: {
      rep_id: primaryRepId,
      split_pct: primarySplitPct,
      attainment_pct: primaryAttainment,
      effective_rate_pct: primaryCalc.effectiveRate,
      payout: primaryPayout
    },
    secondaryRep: secondaryRepId ? {
      rep_id: secondaryRepId,
      split_pct: secondarySplitPct,
      payout: secondaryPayout
    } : null
  };
}

module.exports = {
  calculateCommissionRate,
  processDealCommission
};
