const { query } = require('../config/db');
const { routeLead } = require('../services/territoryService');

async function getTerritories(req, res, next) {
  try {
    const [territories] = await query('SELECT * FROM territories');
    const [users] = await query('SELECT id, name, email, role, territory_id, avatar_url FROM users');

    const enriched = territories.map(t => {
      const assignedReps = users.filter(u => u.territory_id === t.id);
      return {
        ...t,
        reps_count: assignedReps.length,
        reps: assignedReps
      };
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
}

async function previewRouting(req, res, next) {
  try {
    const routingResult = await routeLead(req.body);
    res.json({ success: true, data: routingResult });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTerritories,
  previewRouting
};
