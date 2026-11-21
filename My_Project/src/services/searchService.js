const { query } = require('../config/db');

/**
 * High-Performance Global Indexed Search Service
 * Powers the enterprise command palette (Ctrl+K)
 */
async function globalSearch(queryString) {
  const q = (queryString || '').trim().toLowerCase();
  if (!q) {
    return {
      query: '',
      total: 0,
      deals: [],
      opportunities: [],
      leads: [],
      accounts: [],
      reps: [],
      users: []
    };
  }

  const [deals] = await query('SELECT * FROM opportunities');
  const [leads] = await query('SELECT * FROM leads');
  const [accounts] = await query('SELECT * FROM accounts');
  const [users] = await query('SELECT id, name, email, role, avatar_url FROM users');

  // Filter deals
  const matchedDeals = deals.filter(d =>
    (d.title || '').toLowerCase().includes(q) ||
    (d.competitor || '').toLowerCase().includes(q) ||
    (d.account_name || '').toLowerCase().includes(q)
  ).slice(0, 8).map(d => ({
    id: d.id,
    title: d.title,
    subtitle: `${d.account_name || 'Account'} • $${Number(d.amount).toLocaleString()} ARR • ${d.ml_win_probability}% Win Prob`,
    type: 'deal',
    stage_id: d.stage_id,
    stage_name: d.stage_name,
    amount: d.amount,
    ml_win_probability: d.ml_win_probability
  }));

  // Filter leads
  const matchedLeads = leads.filter(l =>
    (l.first_name || '').toLowerCase().includes(q) ||
    (l.last_name || '').toLowerCase().includes(q) ||
    (l.company || '').toLowerCase().includes(q) ||
    (l.email || '').toLowerCase().includes(q) ||
    (l.industry || '').toLowerCase().includes(q)
  ).slice(0, 8).map(l => ({
    id: l.id,
    first_name: l.first_name,
    last_name: l.last_name,
    title: `${l.first_name} ${l.last_name}`,
    subtitle: `${l.company} • ${l.title || 'Lead'} • Score: ${l.ml_score}/100 (Grade ${l.ml_grade})`,
    type: 'lead',
    status: l.status,
    company: l.company,
    ml_score: l.ml_score,
    ml_grade: l.ml_grade
  }));

  // Filter accounts
  const matchedAccounts = accounts.filter(a =>
    (a.name || '').toLowerCase().includes(q) ||
    (a.industry || '').toLowerCase().includes(q)
  ).slice(0, 5).map(a => ({
    id: a.id,
    name: a.name,
    title: a.name,
    subtitle: `${a.industry} • ${a.tier || 'Enterprise'} • ${a.employees || 0} employees`,
    type: 'account',
    industry: a.industry,
    tier: a.tier,
    region: a.region
  }));

  // Filter sales reps / team members
  const matchedReps = users.filter(u =>
    (u.name || '').toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q) ||
    (u.role || '').toLowerCase().includes(q)
  ).slice(0, 5).map(u => ({
    id: u.id,
    name: u.name,
    title: u.name,
    email: u.email,
    role: u.role,
    subtitle: `${u.role.replace(/_/g, ' ')} • ${u.email}`,
    type: 'rep',
    avatar: u.avatar_url
  }));

  const total = matchedDeals.length + matchedLeads.length + matchedAccounts.length + matchedReps.length;

  return {
    query: queryString,
    total,
    deals: matchedDeals,
    opportunities: matchedDeals,
    leads: matchedLeads,
    accounts: matchedAccounts,
    reps: matchedReps,
    users: matchedReps
  };
}

module.exports = {
  globalSearch
};
