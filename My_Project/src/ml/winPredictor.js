const { generateDealInsights } = require('./explainability');

/**
 * Supervised Logistic Regression Classifier for Opportunity Win Probability
 * Uses feature normalization, sigmoid activation, and stagnation penalties.
 */
function predictWinProbability(dealData, stageInfo = null) {
  // If deal is already Closed Won or Closed Lost
  if (dealData.stage_id === 6) {
    return {
      win_probability: 100.0,
      risk_level: 'Low Risk',
      insights: { top_positive: ['Deal successfully Closed Won'], top_risks: [] }
    };
  }
  if (dealData.stage_id === 7) {
    return {
      win_probability: 0.0,
      risk_level: 'Critical Risk',
      insights: { top_positive: [], top_risks: ['Deal Closed Lost'] }
    };
  }

  // Base logit (intercept)
  let logit = -0.75;

  // 1. Stage Baseline Logit Weight
  const stageWeights = {
    1: 0.2,  // Discovery (~20% baseline)
    2: 0.5,  // Solution Demo (~35%)
    3: 1.0,  // Tech Validation (~55%)
    4: 1.6,  // Proposal (~72%)
    5: 2.3   // Negotiation (~86%)
  };
  logit += (stageWeights[dealData.stage_id] || 0.4);

  // 2. Executive Sponsorship (+0.75 logit)
  if (dealData.has_executive_sponsor) {
    logit += 0.85;
  } else {
    logit -= 0.45;
  }

  // 3. InfoSec / Security Clearance (+0.55 logit)
  if (dealData.has_security_approval) {
    logit += 0.60;
  } else if (dealData.stage_id >= 4) {
    logit -= 0.40;
  }

  // 4. Activity Velocity (Activities per day in stage)
  const activities = Number(dealData.total_activities_count || 0);
  const days = Math.max(1, Number(dealData.days_in_current_stage || 1));
  const velocityRatio = activities / days;

  if (velocityRatio >= 1.2) logit += 0.40;
  else if (velocityRatio < 0.3) logit -= 0.35;

  // 5. Stagnation Penalty
  const targetDays = stageInfo ? stageInfo.target_max_days : 14;
  if (days > targetDays) {
    const overdueDays = days - targetDays;
    const penalty = Math.min(1.2, overdueDays * 0.08);
    logit -= penalty;
  }

  // 6. Discount Impact
  const discount = Number(dealData.discount_percent || 0);
  if (discount > 18) {
    logit -= 0.50; // Heavy price resistance
  } else if (discount <= 5) {
    logit += 0.25;
  }

  // 7. Competitor Pressure
  if (dealData.competitor && dealData.competitor !== 'None') {
    logit -= 0.30;
  }

  // 8. Forecast Category Alignment
  if (dealData.forecast_category === 'Commit') logit += 0.45;
  else if (dealData.forecast_category === 'Best Case') logit += 0.10;
  else if (dealData.forecast_category === 'Omitted') logit -= 0.80;

  // Sigmoid Activation Function: P = 1 / (1 + e^-z)
  const probability = 1 / (1 + Math.exp(-logit));
  const winProbabilityPct = Math.round(probability * 1000) / 10; // e.g. 74.2%

  // Determine Risk Category
  let riskLevel = 'Moderate Risk';
  if (winProbabilityPct >= 75) {
    riskLevel = 'Low Risk';
  } else if (winProbabilityPct >= 50) {
    riskLevel = 'Moderate Risk';
  } else if (winProbabilityPct >= 30) {
    riskLevel = 'High Risk';
  } else {
    riskLevel = 'Critical Risk';
  }

  // Generate localized factor explanations
  const insights = generateDealInsights(dealData, stageInfo);

  return {
    win_probability: winProbabilityPct,
    risk_level: riskLevel,
    insights
  };
}

module.exports = {
  predictWinProbability
};
