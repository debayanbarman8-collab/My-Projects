const { query } = require('../config/db');

async function getQuotaPerformance() {
  const [quotas] = await query('SELECT * FROM quotas');
  const [users] = await query('SELECT id, name, email, role, avatar_url, territory_id FROM users');
  const [openDeals] = await query('SELECT assigned_rep_id, SUM(amount) as open_pipeline FROM opportunities WHERE stage_id < 6 GROUP BY assigned_rep_id');

  const repPipelineMap = {};
  openDeals.forEach(d => {
    repPipelineMap[d.assigned_rep_id] = Number(d.open_pipeline) || 0;
  });

  let totalTarget = 0;
  let totalAttained = 0;
  let totalOpenPipeline = 0;

  const repPerformance = quotas.map(q => {
    const user = users.find(u => u.id === q.rep_id) || {};
    const target = Number(q.target_amount) || 1;
    const attained = Number(q.attained_amount) || 0;
    const openPipeline = repPipelineMap[q.rep_id] || 0;
    const attainmentPct = Math.round((attained / target) * 1000) / 10;
    const remainingGap = Math.max(0, target - attained);
    const coverageRatio = remainingGap > 0 ? Math.round((openPipeline / remainingGap) * 10) / 10 : 9.9;

    totalTarget += target;
    totalAttained += attained;
    totalOpenPipeline += openPipeline;

    return {
      quota_id: q.id,
      rep_id: q.rep_id,
      rep_name: user.name || 'Sales Rep',
      rep_email: user.email || '',
      avatar_url: user.avatar_url || '',
      fiscal_quarter: q.fiscal_quarter,
      target_amount: target,
      attained_amount: attained,
      attainment_pct: attainmentPct,
      open_pipeline: openPipeline,
      coverage_ratio: coverageRatio,
      status: attainmentPct >= 100 ? 'Exceeded' : attainmentPct >= 75 ? 'On Track' : 'Behind'
    };
  });

  const teamAttainmentPct = Math.round((totalAttained / Math.max(1, totalTarget)) * 1000) / 10;
  const teamGap = Math.max(0, totalTarget - totalAttained);
  const teamCoverage = teamGap > 0 ? Math.round((totalOpenPipeline / teamGap) * 10) / 10 : 9.9;

  return {
    summary: {
      total_target: totalTarget,
      total_attained: totalAttained,
      team_attainment_pct: teamAttainmentPct,
      total_open_pipeline: totalOpenPipeline,
      team_coverage_ratio: teamCoverage
    },
    reps: repPerformance.sort((a, b) => b.attainment_pct - a.attainment_pct)
  };
}

module.exports = {
  getQuotaPerformance
};
