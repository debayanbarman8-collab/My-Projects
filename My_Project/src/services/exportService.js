const { query } = require('../config/db');
const { scoreLead } = require('../ml/leadScorer');
const { routeLead } = require('./territoryService');
const { logAudit } = require('./auditService');

/**
 * Format a value to adhere strictly to RFC-4180 CSV specification
 */
function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function arrayToCSV(headers, rows) {
  const headerLine = headers.map(h => escapeCSV(h.label)).join(',');
  const rowLines = rows.map(row => headers.map(h => escapeCSV(row[h.key])).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

/**
 * Export core RevOps entities to RFC-4180 CSV
 */
async function generateEntityCSV(entity) {
  const cleanEntity = (entity || '').toLowerCase().trim();

  if (cleanEntity === 'leads') {
    const [leads] = await query('SELECT * FROM leads ORDER BY id DESC');
    const headers = [
      { key: 'id', label: 'Lead ID' },
      { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'company', label: 'Company' },
      { key: 'title', label: 'Title' },
      { key: 'industry', label: 'Industry' },
      { key: 'company_size', label: 'Company Size' },
      { key: 'annual_revenue', label: 'Annual Revenue' },
      { key: 'lead_source', label: 'Lead Source' },
      { key: 'status', label: 'Status' },
      { key: 'ml_score', label: 'ML Score (0-100)' },
      { key: 'ml_grade', label: 'ML Grade' },
      { key: 'decision_maker', label: 'Decision Maker' },
      { key: 'budget_confirmed', label: 'Budget Confirmed' },
      { key: 'urgency_level', label: 'Urgency' },
      { key: 'created_at', label: 'Created At' }
    ];
    return { filename: `revpulse-leads-${Date.now()}.csv`, csv: arrayToCSV(headers, leads) };
  }

  if (cleanEntity === 'deals' || cleanEntity === 'opportunities') {
    const [deals] = await query('SELECT * FROM opportunities ORDER BY id DESC');
    const headers = [
      { key: 'id', label: 'Deal ID' },
      { key: 'title', label: 'Opportunity Title' },
      { key: 'account_name', label: 'Account' },
      { key: 'stage_name', label: 'Stage' },
      { key: 'amount', label: 'ARR ($)' },
      { key: 'ml_win_probability', label: 'ML Win Probability (%)' },
      { key: 'ml_risk_level', label: 'Risk Level' },
      { key: 'forecast_category', label: 'Forecast Category' },
      { key: 'discount_percent', label: 'Discount %' },
      { key: 'has_executive_sponsor', label: 'Executive Sponsor' },
      { key: 'has_security_approval', label: 'Security Clearance' },
      { key: 'days_in_current_stage', label: 'Days in Stage' },
      { key: 'expected_close_date', label: 'Expected Close Date' }
    ];
    return { filename: `revpulse-opportunities-${Date.now()}.csv`, csv: arrayToCSV(headers, deals) };
  }

  if (cleanEntity === 'commissions') {
    const [commissions] = await query('SELECT * FROM commissions ORDER BY id DESC');
    const headers = [
      { key: 'id', label: 'Commission ID' },
      { key: 'rep_name', label: 'Sales Rep' },
      { key: 'opportunity_id', label: 'Opportunity ID' },
      { key: 'deal_amount', label: 'Deal Amount ($)' },
      { key: 'quota_attainment_pct_at_close', label: 'Attainment at Close (%)' },
      { key: 'base_rate_pct', label: 'Base Rate (%)' },
      { key: 'accelerator_multiplier', label: 'Accelerator Multiplier' },
      { key: 'effective_commission_pct', label: 'Effective Commission (%)' },
      { key: 'total_payout', label: 'Total Payout ($)' },
      { key: 'payout_status', label: 'Payout Status' },
      { key: 'payment_date', label: 'Payment Date' }
    ];
    return { filename: `revpulse-commissions-${Date.now()}.csv`, csv: arrayToCSV(headers, commissions) };
  }

  if (cleanEntity === 'quotas') {
    const [quotas] = await query('SELECT * FROM quotas ORDER BY id DESC');
    const headers = [
      { key: 'id', label: 'Quota ID' },
      { key: 'rep_name', label: 'Sales Rep' },
      { key: 'fiscal_quarter', label: 'Fiscal Quarter' },
      { key: 'target_amount', label: 'Target Amount ($)' },
      { key: 'attained_amount', label: 'Attained Amount ($)' },
      { key: 'status', label: 'Quota Status' }
    ];
    return { filename: `revpulse-quotas-${Date.now()}.csv`, csv: arrayToCSV(headers, quotas) };
  }

  throw new Error(`Unsupported export entity: '${entity}'. Choose from leads, deals, commissions, quotas.`);
}

/**
 * Bulk Import Leads with validation, ML Scoring, and Territory Auto-Routing
 */
async function processBulkLeadsImport(leadsList, user = {}, ipAddress = '127.0.0.1') {
  if (!Array.isArray(leadsList)) {
    throw new Error('Expected JSON array of lead objects for bulk import.');
  }

  if (leadsList.length === 0) {
    throw new Error('Leads list is empty.');
  }

  if (leadsList.length > 500) {
    throw new Error('Bulk ingestion limit is 500 leads per batch.');
  }

  const results = [];
  const errors = [];

  for (let idx = 0; idx < leadsList.length; idx++) {
    const item = leadsList[idx];
    const rowNum = idx + 1;

    if (!item.email || !item.company) {
      errors.push({ row: rowNum, error: 'Missing mandatory email or company name.' });
      continue;
    }

    try {
      const sanitized = {
        first_name: item.first_name || 'Prospect',
        last_name: item.last_name || 'Contact',
        email: item.email.trim().toLowerCase(),
        company: item.company.trim(),
        title: item.title || 'Decision Maker',
        industry: item.industry || 'Technology',
        company_size: parseInt(item.company_size, 10) || 150,
        annual_revenue: parseFloat(item.annual_revenue) || 10000000,
        lead_source: item.lead_source || 'Inbound Demo',
        status: item.status || 'New',
        website_visits: parseInt(item.website_visits, 10) || 3,
        email_opens: parseInt(item.email_opens, 10) || 2,
        content_downloads: parseInt(item.content_downloads, 10) || 1,
        decision_maker: item.decision_maker === true || item.decision_maker === 'true' || item.decision_maker === 1,
        budget_confirmed: item.budget_confirmed === true || item.budget_confirmed === 'true' || item.budget_confirmed === 1,
        urgency_level: item.urgency_level || 'Medium'
      };

      // 1. ML Scoring
      const scoring = scoreLead(sanitized);

      // 2. Territory & Rep Routing
      const routing = await routeLead(sanitized);
      const assignedRepId = routing.assignedRep ? routing.assignedRep.id : 3;
      const territoryId = routing.territory ? routing.territory.id : 1;

      // 3. Insert into Database
      const [insertRes] = await query(
        `INSERT INTO leads (
          first_name, last_name, email, company, title, industry, company_size, annual_revenue,
          lead_source, status, assigned_to, territory_id, website_visits, email_opens,
          content_downloads, decision_maker, budget_confirmed, urgency_level, ml_score, ml_grade, ml_factors
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sanitized.first_name,
          sanitized.last_name,
          sanitized.email,
          sanitized.company,
          sanitized.title,
          sanitized.industry,
          sanitized.company_size,
          sanitized.annual_revenue,
          sanitized.lead_source,
          sanitized.status,
          assignedRepId,
          territoryId,
          sanitized.website_visits,
          sanitized.email_opens,
          sanitized.content_downloads,
          sanitized.decision_maker ? 1 : 0,
          sanitized.budget_confirmed ? 1 : 0,
          sanitized.urgency_level,
          scoring.score,
          scoring.grade,
          JSON.stringify(scoring.factors)
        ]
      );

      results.push({
        id: insertRes.insertId,
        company: sanitized.company,
        email: sanitized.email,
        ml_score: scoring.score,
        ml_grade: scoring.grade,
        assigned_to: assignedRepId,
        assigned_rep_id: assignedRepId,
        territory_id: territoryId
      });
    } catch (rowErr) {
      errors.push({ row: rowNum, email: item.email, error: rowErr.message });
    }
  }

  // Record Audit Trail
  await logAudit({
    userId: user.id || 1,
    userEmail: user.email || 'sales_ops@revpulse.io',
    userRole: user.role || 'sales_ops_admin',
    action: 'LEADS_BULK_IMPORTED',
    entityType: 'lead',
    entityId: `batch-${Date.now()}`,
    details: {
      totalSubmitted: leadsList.length,
      importedCount: results.length,
      failedCount: errors.length
    },
    ipAddress
  });

  return {
    totalSubmitted: leadsList.length,
    importedCount: results.length,
    imported_count: results.length,
    failedCount: errors.length,
    importedLeads: results,
    leads: results,
    errors
  };
}

module.exports = {
  generateEntityCSV,
  processBulkLeadsImport
};
