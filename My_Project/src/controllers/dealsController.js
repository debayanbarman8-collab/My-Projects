const { query } = require('../config/db');
const { getKanbanPipeline, updateDealStage } = require('../services/pipelineService');
const { predictWinProbability } = require('../ml/winPredictor');
const { logAudit } = require('../services/auditService');

async function getDeals(req, res, next) {
  try {
    const { stage_id, rep_id, risk_level, forecast_category, search } = req.query;
    let [deals] = await query('SELECT * FROM opportunities ORDER BY amount DESC, id DESC');

    if (stage_id) {
      deals = deals.filter(d => Number(d.stage_id) === Number(stage_id));
    }
    if (rep_id) {
      deals = deals.filter(d => Number(d.assigned_rep_id) === Number(rep_id));
    }
    if (risk_level) {
      deals = deals.filter(d => d.ml_risk_level === risk_level);
    }
    if (forecast_category) {
      deals = deals.filter(d => d.forecast_category === forecast_category);
    }
    if (search) {
      const q = search.toLowerCase();
      deals = deals.filter(d =>
        (d.title || '').toLowerCase().includes(q) ||
        (d.competitor || '').toLowerCase().includes(q)
      );
    }

    res.json({ success: true, count: deals.length, data: deals });
  } catch (err) {
    next(err);
  }
}

async function getDealById(req, res, next) {
  try {
    const { id } = req.params;
    const [deals] = await query('SELECT * FROM opportunities WHERE id = ?', [id]);
    if (!deals || deals.length === 0) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    const deal = deals[0];
    const [activities] = await query('SELECT * FROM activities WHERE opportunity_id = ? ORDER BY id DESC', [id]);
    const [history] = await query('SELECT * FROM stage_history WHERE opportunity_id = ? ORDER BY id DESC', [id]);

    let parsedInsights = deal.ml_insights;
    if (typeof parsedInsights === 'string') {
      try {
        parsedInsights = JSON.parse(parsedInsights);
      } catch (e) {
        parsedInsights = { top_positive: [], top_risks: [] };
      }
    }

    res.json({
      success: true,
      data: {
        ...deal,
        ml_insights: parsedInsights,
        activities,
        stage_history: history
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getKanban(req, res, next) {
  try {
    const kanbanData = await getKanbanPipeline();
    res.json({ success: true, data: kanbanData });
  } catch (err) {
    next(err);
  }
}

async function createDeal(req, res, next) {
  try {
    const body = req.body;
    const stageId = Number(body.stage_id) || 1;

    // Fetch stage info for ML prediction
    const [stages] = await query('SELECT * FROM opportunity_stages WHERE id = ?', [stageId]);
    const stageInfo = stages[0] || null;

    const ml = predictWinProbability({
      ...body,
      stage_id: stageId,
      days_in_current_stage: 1,
      total_activities_count: 1
    }, stageInfo);

    const [result] = await query(
      `INSERT INTO opportunities (
        title, account_id, lead_id, stage_id, amount, expected_close_date, assigned_rep_id,
        secondary_rep_id, split_percentage, forecast_category, discount_percent, competitor,
        has_executive_sponsor, has_security_approval, days_in_current_stage, total_activities_count,
        ml_win_probability, ml_risk_level, ml_insights
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)`,
      [
        body.title,
        Number(body.account_id) || 1,
        body.lead_id ? Number(body.lead_id) : null,
        stageId,
        Number(body.amount) || 50000,
        body.expected_close_date || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
        Number(body.assigned_rep_id) || 3,
        body.secondary_rep_id ? Number(body.secondary_rep_id) : null,
        Number(body.split_percentage) || 100,
        body.forecast_category || 'Pipeline',
        Number(body.discount_percent) || 0,
        body.competitor || 'None',
        body.has_executive_sponsor ? 1 : 0,
        body.has_security_approval ? 1 : 0,
        ml.win_probability,
        ml.risk_level,
        JSON.stringify(ml.insights)
      ]
    );

    const newDealId = result.insertId;

    // Log audit trail
    await logAudit({
      userId: req.user ? req.user.id : 1,
      userEmail: req.user ? req.user.email : 'elena.vance@revpulse.io',
      userRole: req.user ? req.user.role : 'sales_ops_admin',
      action: 'DEAL_CREATED',
      entityType: 'opportunity',
      entityId: newDealId,
      details: { title: body.title, amount: body.amount, stage_id: stageId },
      ipAddress: req.ip || '127.0.0.1'
    });

    // Add initial activity
    await query(
      `INSERT INTO activities (type, title, description, opportunity_id, rep_id, sentiment)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'Note',
        `Deal Created: ${body.title}`,
        `Opportunity initialized in stage ${stageInfo ? stageInfo.name : stageId} with amount $${Number(body.amount).toLocaleString()}. ML Win Probability: ${ml.win_probability}%.`,
        newDealId,
        Number(body.assigned_rep_id) || 3,
        'Positive'
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        id: newDealId,
        ...body,
        stage_id: stageId,
        ml_win_probability: ml.win_probability,
        ml_risk_level: ml.risk_level,
        ml_insights: ml.insights
      }
    });
  } catch (err) {
    next(err);
  }
}

async function changeStage(req, res, next) {
  try {
    const { id } = req.params;
    const { stage_id, notes, user_id = 1 } = req.body;

    if (!stage_id) {
      return res.status(400).json({ success: false, message: 'stage_id is required' });
    }

    const result = await updateDealStage(Number(id), Number(stage_id), Number(user_id), notes);

    // Audit log
    await logAudit({
      userId: req.user ? req.user.id : user_id,
      userEmail: req.user ? req.user.email : 'user@revpulse.io',
      userRole: req.user ? req.user.role : 'sales_manager',
      action: 'DEAL_STAGE_CHANGE',
      entityType: 'opportunity',
      entityId: id,
      details: { oldStageId: result.oldStageId, newStageId: result.newStageId, newStageName: result.newStageName, winProbability: result.ml_win_probability },
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function addDealActivity(req, res, next) {
  try {
    const { id } = req.params;
    const { type, title, description, sentiment = 'Neutral', rep_id = 3 } = req.body;

    const [result] = await query(
      `INSERT INTO activities (type, title, description, opportunity_id, rep_id, sentiment)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [type || 'Call', title, description || '', Number(id), Number(rep_id), sentiment]
    );

    // Increment activity count on deal
    const [deals] = await query('SELECT * FROM opportunities WHERE id = ?', [id]);
    if (deals && deals.length > 0) {
      const deal = deals[0];
      const newCount = (deal.total_activities_count || 0) + 1;
      const [stages] = await query('SELECT * FROM opportunity_stages WHERE id = ?', [deal.stage_id]);
      const stageInfo = stages[0] || null;
      
      const ml = predictWinProbability({
        ...deal,
        total_activities_count: newCount
      }, stageInfo);

      await query(
        `UPDATE opportunities
         SET total_activities_count = ?, ml_win_probability = ?, ml_risk_level = ?, ml_insights = ?
         WHERE id = ?`,
        [newCount, ml.win_probability, ml.risk_level, JSON.stringify(ml.insights), id]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Activity recorded and ML win probability recalculated.',
      data: { id: result.insertId, type, title, opportunity_id: id }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDeals,
  getDealById,
  getKanban,
  createDeal,
  changeStage,
  addDealActivity
};
