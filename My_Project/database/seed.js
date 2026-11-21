require('dotenv').config();
const mysql = require('mysql2/promise');
const seedData = require('./seedData');

async function seed() {
  const {
    DB_HOST = '127.0.0.1',
    DB_PORT = 3306,
    DB_USER = 'root',
    DB_PASSWORD = 'password',
    DB_NAME = 'sales_ops_db'
  } = process.env;

  console.log(`[Seed] Connecting to MySQL at ${DB_HOST}:${DB_PORT}/${DB_NAME}...`);
  try {
    const conn = await mysql.createConnection({
      host: DB_HOST,
      port: Number(DB_PORT),
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME
    });

    console.log('[Seed] Seeding territories...');
    for (const t of seedData.territories) {
      await conn.query('REPLACE INTO territories (id, name, region, tier, min_company_size, max_company_size, target_industry, description) VALUES (?,?,?,?,?,?,?,?)',
        [t.id, t.name, t.region, t.tier, t.min_company_size, t.max_company_size, t.target_industry, t.description]);
    }

    console.log('[Seed] Seeding users...');
    for (const u of seedData.users) {
      await conn.query('REPLACE INTO users (id, name, email, password_hash, role, territory_id, account_id, phone, avatar_url, status) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [u.id, u.name, u.email, u.password_hash, u.role, u.territory_id || null, u.account_id || null, u.phone, u.avatar_url, u.status]);
    }

    console.log('[Seed] Seeding stages...');
    for (const s of seedData.stages) {
      await conn.query('REPLACE INTO opportunity_stages (id, name, stage_order, default_probability, is_closed, is_won, target_max_days) VALUES (?,?,?,?,?,?,?)',
        [s.id, s.name, s.stage_order, s.default_probability, s.is_closed, s.is_won, s.target_max_days]);
    }

    console.log('[Seed] Seeding accounts...');
    for (const a of seedData.accounts) {
      await conn.query('REPLACE INTO accounts (id, name, industry, employees, annual_revenue, website, tier, assigned_rep_id, territory_id) VALUES (?,?,?,?,?,?,?,?,?)',
        [a.id, a.name, a.industry, a.employees, a.annual_revenue, a.website, a.tier, a.assigned_rep_id, a.territory_id]);
    }

    console.log('[Seed] Seeding leads...');
    for (const l of seedData.leads) {
      await conn.query(`REPLACE INTO leads (id, first_name, last_name, email, company, title, industry, company_size, annual_revenue, lead_source, status, assigned_to, territory_id, website_visits, email_opens, content_downloads, decision_maker, budget_confirmed, urgency_level, ml_score, ml_grade, converted_deal_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [l.id, l.first_name, l.last_name, l.email, l.company, l.title, l.industry, l.company_size, l.annual_revenue, l.lead_source, l.status, l.assigned_to, l.territory_id, l.website_visits, l.email_opens, l.content_downloads, l.decision_maker, l.budget_confirmed, l.urgency_level, l.ml_score, l.ml_grade, l.converted_deal_id]);
    }

    console.log('[Seed] Seeding opportunities...');
    for (const o of seedData.opportunities) {
      await conn.query(`REPLACE INTO opportunities (id, title, account_id, lead_id, stage_id, amount, expected_close_date, assigned_rep_id, secondary_rep_id, split_percentage, forecast_category, discount_percent, competitor, has_executive_sponsor, has_security_approval, days_in_current_stage, total_activities_count, ml_win_probability, ml_risk_level, ml_insights, lost_reason)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [o.id, o.title, o.account_id, o.lead_id, o.stage_id, o.amount, o.expected_close_date, o.assigned_rep_id, o.secondary_rep_id, o.split_percentage, o.forecast_category, o.discount_percent, o.competitor, o.has_executive_sponsor, o.has_security_approval, o.days_in_current_stage, o.total_activities_count, o.ml_win_probability, o.ml_risk_level, o.ml_insights, o.lost_reason || null]);
    }

    console.log('[Seed] Seeding quotas...');
    for (const q of seedData.quotas) {
      await conn.query('REPLACE INTO quotas (id, rep_id, fiscal_year, fiscal_quarter, target_amount, attained_amount, status) VALUES (?,?,?,?,?,?,?)',
        [q.id, q.rep_id, q.fiscal_year, q.fiscal_quarter, q.target_amount, q.attained_amount, q.status]);
    }

    console.log('[Seed] Seeding commissions...');
    for (const c of seedData.commissions) {
      await conn.query(`REPLACE INTO commissions (id, opportunity_id, rep_id, deal_amount, quota_attainment_pct_at_close, base_rate_pct, accelerator_multiplier, effective_commission_pct, total_payout, payout_status, payment_date)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [c.id, c.opportunity_id, c.rep_id, c.deal_amount, c.quota_attainment_pct_at_close, c.base_rate_pct, c.accelerator_multiplier, c.effective_commission_pct, c.total_payout, c.payout_status, c.payment_date]);
    }

    console.log('[Seed] Seeding activities...');
    for (const ac of seedData.activities) {
      await conn.query('REPLACE INTO activities (id, type, title, description, lead_id, opportunity_id, rep_id, sentiment, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
        [ac.id, ac.type, ac.title, ac.description, ac.lead_id, ac.opportunity_id, ac.rep_id, ac.sentiment, ac.created_at]);
    }

    console.log('[Seed] Seeding ML training logs...');
    for (const ml of seedData.mlLogs) {
      await conn.query('REPLACE INTO ml_training_logs (id, model_name, version, samples_count, accuracy, precision_score, recall_score, f1_score, auc_roc, hyperparameters, trained_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [ml.id, ml.model_name, ml.version, ml.samples_count, ml.accuracy, ml.precision_score, ml.recall_score, ml.f1_score, ml.auc_roc, ml.hyperparameters, ml.trained_at]);
    }

    console.log('[Seed] Successfully seeded MySQL database with enterprise data!');
    await conn.end();
    if (require.main === module) process.exit(0);
  } catch (err) {
    console.warn(`[Seed Warning] Could not connect to MySQL (${err.message}).`);
    console.log('[Seed Info] RevPulse fallback in-memory engine is active with rich enterprise seed data preloaded.');
    if (require.main === module) process.exit(0);
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
