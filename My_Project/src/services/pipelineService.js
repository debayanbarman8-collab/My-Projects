const { query } = require('../config/db');
const { predictWinProbability } = require('../ml/winPredictor');
const { processDealCommission } = require('./commissionService');

async function getKanbanPipeline() {
  const [stages] = await query('SELECT * FROM opportunity_stages ORDER BY stage_order ASC');
  const [deals] = await query('SELECT * FROM opportunities ORDER BY amount DESC');

  const stageMap = {};
  stages.forEach(s => {
    stageMap[s.id] = {
      ...s,
      total_value: 0,
      weighted_value: 0,
      deals_count: 0,
      deals: []
    };
  });

  deals.forEach(deal => {
    const sId = deal.stage_id;
    if (stageMap[sId]) {
      const amount = Number(deal.amount || 0);
      const prob = Number(deal.ml_win_probability || 0) / 100;
      stageMap[sId].total_value += amount;
      stageMap[sId].weighted_value += Math.round(amount * prob);
      stageMap[sId].deals_count += 1;
      stageMap[sId].deals.push(deal);
    }
  });

  return Object.values(stageMap);
}

async function updateDealStage(opportunityId, targetStageId, userId = 1, notes = '') {
  // 1. Fetch current deal and stage info
  const [dealRows] = await query('SELECT * FROM opportunities WHERE id = ?', [opportunityId]);
  if (!dealRows || dealRows.length === 0) {
    throw new Error('Opportunity not found');
  }
  const deal = dealRows[0];
  const oldStageId = deal.stage_id;

  const [stages] = await query('SELECT * FROM opportunity_stages ORDER BY stage_order ASC');
  const targetStage = stages.find(s => s.id === Number(targetStageId));
  if (!targetStage) {
    throw new Error('Target stage invalid');
  }

  // 2. Insert into stage_history for bottleneck tracking
  await query(
    `INSERT INTO stage_history (opportunity_id, from_stage_id, to_stage_id, changed_by_user_id, duration_days, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [opportunityId, oldStageId, targetStageId, userId, deal.days_in_current_stage || 1, notes || `Moved to ${targetStage.name}`]
  );

  // 3. Recalculate ML Win Probability and Risk Level for the new stage
  const updatedDealDraft = {
    ...deal,
    stage_id: Number(targetStageId),
    days_in_current_stage: 1
  };
  const mlResult = predictWinProbability(updatedDealDraft, targetStage);

  // Forecast category update if closed
  let forecastCategory = deal.forecast_category;
  if (targetStage.id === 6) forecastCategory = 'Closed';
  else if (targetStage.id === 7) forecastCategory = 'Omitted';
  else if (targetStage.id === 5) forecastCategory = 'Commit';
  else if (targetStage.id >= 3) forecastCategory = 'Best Case';

  // 4. Update Opportunity in DB
  await query(
    `UPDATE opportunities
     SET stage_id = ?, days_in_current_stage = 1, forecast_category = ?, ml_win_probability = ?, ml_risk_level = ?, ml_insights = ?
     WHERE id = ?`,
    [
      Number(targetStageId),
      forecastCategory,
      mlResult.win_probability,
      mlResult.risk_level,
      JSON.stringify(mlResult.insights),
      opportunityId
    ]
  );

  // 5. If deal won, trigger commission automation!
  let commissionResult = null;
  if (Number(targetStageId) === 6 && oldStageId !== 6) {
    commissionResult = await processDealCommission(opportunityId);
  }

  // 6. Record activity in timeline
  await query(
    `INSERT INTO activities (type, title, description, opportunity_id, rep_id, sentiment)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      'Note',
      `Pipeline Progression: ${targetStage.name}`,
      `Deal transitioned from stage ${oldStageId} to ${targetStage.name}. Recalculated ML Win Probability: ${mlResult.win_probability}% (${mlResult.risk_level}).`,
      opportunityId,
      userId,
      Number(targetStageId) === 6 ? 'Positive' : Number(targetStageId) === 7 ? 'Negative' : 'Neutral'
    ]
  );

  return {
    opportunityId,
    oldStageId,
    newStageId: Number(targetStageId),
    newStageName: targetStage.name,
    ml_win_probability: mlResult.win_probability,
    ml_risk_level: mlResult.risk_level,
    insights: mlResult.insights,
    commissionResult
  };
}

module.exports = {
  getKanbanPipeline,
  updateDealStage
};
