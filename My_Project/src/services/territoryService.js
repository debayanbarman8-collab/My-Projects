const { query } = require('../config/db');

/**
 * Intelligent Territory Routing & Lead Assignment Engine
 * Dynamically routes incoming leads to territories and reps based on
 * company headcount, industry, and rep workload capacity.
 */
async function routeLead(leadInput) {
  const companySize = Number(leadInput.company_size || 50);
  const region = leadInput.region || 'North America';

  const [territories] = await query('SELECT * FROM territories');
  const [users] = await query("SELECT * FROM users WHERE status = 'active' AND role IN ('account_executive', 'sales_dev_rep')");

  // Determine target territory
  let matchedTerritory = null;

  if (companySize >= 500) {
    // Enterprise tier
    matchedTerritory = territories.find(t => t.tier === 'Enterprise' && (region ? t.region === region : true)) || territories[0];
  } else if (companySize >= 100) {
    // Mid-Market tier
    matchedTerritory = territories.find(t => t.tier === 'Mid-Market' && (region ? t.region === region : true)) || territories[1];
  } else {
    // SMB tier
    matchedTerritory = territories.find(t => t.tier === 'Mid-Market') || territories[1];
  }

  // Find reps assigned to this territory
  const territoryReps = users.filter(u => u.territory_id === matchedTerritory.id);
  const candidateReps = territoryReps.length > 0 ? territoryReps : users;

  // Round-robin or lowest lead count allocation
  const [leads] = await query('SELECT assigned_to, COUNT(*) as count FROM leads WHERE status != "Converted" GROUP BY assigned_to');
  const countMap = {};
  leads.forEach(l => {
    countMap[l.assigned_to] = Number(l.count);
  });

  // Pick rep with fewest open leads
  let selectedRep = candidateReps[0];
  let minCount = Infinity;

  candidateReps.forEach(rep => {
    const currentLoad = countMap[rep.id] || 0;
    if (currentLoad < minCount) {
      minCount = currentLoad;
      selectedRep = rep;
    }
  });

  return {
    territory: matchedTerritory,
    assignedRep: selectedRep,
    rule_applied: `Routed to ${matchedTerritory.name} based on company size (${companySize} employees) and rep capacity balancing.`
  };
}

module.exports = {
  routeLead
};
