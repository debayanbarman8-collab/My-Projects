const { getExecutiveAnalytics } = require('../services/analyticsService');

async function getDashboardAnalytics(req, res, next) {
  try {
    const analytics = await getExecutiveAnalytics();
    res.json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardAnalytics
};
