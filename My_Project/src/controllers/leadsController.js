const { query } = require('../config/db');
const { scoreLead } = require('../ml/leadScorer');
const { routeLead } = require('../services/territoryService');
const { logAudit } = require('../services/auditService');

async function getLeads(req, res, next) {
  try {
    const { status, grade, rep_id, search } = req.query;
    let [leads] = await query('SELECT * FROM leads ORDER BY ml_score DESC, id DESC');

    if (status) {
      leads = leads.filter(l => l.status === status);
    }
    if (grade) {
      leads = leads.filter(l => l.ml_grade === grade);
    }
    if (rep_id) {
      leads = leads.filter(l => Number(l.assigned_to) === Number(rep_id));
    }
    if (search) {
      const q = search.toLowerCase();
      leads = leads.filter(l =>
        (l.first_name || '').toLowerCase().includes(q) ||
        (l.last_name || '').toLowerCase().includes(q) ||
        (l.company || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q)
      );
    }

    res.json({ success: true, count: leads.length, data: leads });
  } catch (err) {
    next(err);
  }
}

async function getLeadById(req, res, next) {
  try {
    const { id } = req.params;
    const [leads] = await query('SELECT * FROM leads WHERE id = ?', [id]);
    if (!leads || leads.length === 0) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    res.json({ success: true, data: leads[0] });
  } catch (err) {
    next(err);
  }
}

async function createLead(req, res, next) {
  try {
    const body = req.body;

    // 1. Run Machine Learning Scoring Model
    const mlScoring = scoreLead(body);

    // 2. Run Intelligent Territory & Rep Routing Engine
    let assignedRepId = body.assigned_to;
    let territoryId = body.territory_id;
    let routingNote = null;

    if (!assignedRepId || !territoryId) {
      const routing = await routeLead(body);
      assignedRepId = assignedRepId || (routing.assignedRep ? routing.assignedRep.id : 1);
      territoryId = territoryId || (routing.territory ? routing.territory.id : 1);
      routingNote = routing.rule_applied;
    }

    // 3. Persist Lead to Database
    const [result] = await query(
      `INSERT INTO leads (
        first_name, last_name, email, company, title, industry, company_size, annual_revenue,
        lead_source, status, assigned_to, territory_id, website_visits, email_opens,
        content_downloads, decision_maker, budget_confirmed, urgency_level, ml_score, ml_grade, ml_factors
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.first_name,
        body.last_name,
        body.email,
        body.company,
        body.title || 'Director',
        body.industry || 'Technology',
        Number(body.company_size) || 100,
        Number(body.annual_revenue) || 5000000,
        body.lead_source || 'Inbound Demo',
        body.status || 'New',
        assignedRepId,
        territoryId,
        Number(body.website_visits) || 1,
        Number(body.email_opens) || 0,
        Number(body.content_downloads) || 0,
        body.decision_maker ? 1 : 0,
        body.budget_confirmed ? 1 : 0,
        body.urgency_level || 'Medium',
        mlScoring.score,
        mlScoring.grade,
        JSON.stringify(mlScoring.factors)
      ]
    );

    const newLeadId = result.insertId;

    // 4. Log creation activity
    await query(
      `INSERT INTO activities (type, title, description, lead_id, rep_id, sentiment)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'Note',
        `Lead Captured: ${body.first_name} ${body.last_name} (${body.company})`,
        `ML Lead Score: ${mlScoring.score}/100 [Grade ${mlScoring.grade}]. ${routingNote || 'Assigned to rep.'}`,
        newLeadId,
        assignedRepId,
        mlScoring.score >= 70 ? 'Positive' : 'Neutral'
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        id: newLeadId,
        ...body,
        assigned_to: assignedRepId,
        territory_id: territoryId,
        ml_score: mlScoring.score,
        ml_grade: mlScoring.grade,
        ml_factors: mlScoring.factors,
        routing_info: routingNote
      }
    });
  } catch (err) {
    next(err);
  }
}

async function convertLeadToDeal(req, res, next) {
  try {
    const { id } = req.params;
    const { deal_title, amount, expected_close_date } = req.body;

    const [leadRows] = await query('SELECT * FROM leads WHERE id = ?', [id]);
    if (!leadRows || leadRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    const lead = leadRows[0];

    // Find or create account
    const [accounts] = await query('SELECT * FROM accounts WHERE name = ?', [lead.company]);
    let accountId;
    if (accounts.length > 0) {
      accountId = accounts[0].id;
    } else {
      const [accResult] = await query(
        `INSERT INTO accounts (name, industry, employees, annual_revenue, tier, assigned_rep_id, territory_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          lead.company,
          lead.industry,
          lead.company_size,
          lead.annual_revenue,
          lead.company_size >= 500 ? 'Tier-1 Enterprise' : lead.company_size >= 100 ? 'Tier-2 Mid-Market' : 'Tier-3 SMB',
          lead.assigned_to,
          lead.territory_id
        ]
      );
      accountId = accResult.insertId;
    }

    // Create Opportunity
    const title = deal_title || `${lead.company} - Platform Modernization`;
    const dealAmount = Number(amount) || 120000;
    const closeDate = expected_close_date || new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString().split('T')[0];

    const [oppResult] = await query(
      `INSERT INTO opportunities (
        title, account_id, lead_id, stage_id, amount, expected_close_date, assigned_rep_id,
        forecast_category, has_executive_sponsor, has_security_approval, ml_win_probability, ml_risk_level
      ) VALUES (?, ?, ?, 2, ?, ?, ?, 'Pipeline', ?, 0, 45.0, 'Moderate Risk')`,
      [
        title,
        accountId,
        lead.id,
        dealAmount,
        closeDate,
        lead.assigned_to,
        lead.decision_maker ? 1 : 0
      ]
    );

    const newDealId = oppResult.insertId;

    // Update lead status to Converted
    await query('UPDATE leads SET status = "Converted", converted_deal_id = ? WHERE id = ?', [newDealId, lead.id]);

    // Record audit log
    await logAudit({
      userId: req.user ? req.user.id : lead.assigned_to,
      userEmail: req.user ? req.user.email : 'sales@revpulse.io',
      userRole: req.user ? req.user.role : 'account_executive',
      action: 'LEAD_CONVERTED',
      entityType: 'lead',
      entityId: lead.id,
      details: { dealId: newDealId, dealTitle: title, amount: dealAmount, company: lead.company },
      ipAddress: req.ip || '127.0.0.1'
    });

    // Record activity
    await query(
      `INSERT INTO activities (type, title, description, lead_id, opportunity_id, rep_id, sentiment)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'Meeting',
        `Lead Converted to Deal: ${title}`,
        `Lead successfully qualified and converted into a $${dealAmount.toLocaleString()} active opportunity.`,
        lead.id,
        newDealId,
        lead.assigned_to,
        'Positive'
      ]
    );

    res.json({
      success: true,
      message: 'Lead successfully converted to opportunity',
      data: {
        deal_id: newDealId,
        title,
        amount: dealAmount,
        account_id: accountId
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLeads,
  getLeadById,
  createLead,
  convertLeadToDeal
};
