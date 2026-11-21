const assert = require('assert');
const { scoreLead } = require('../src/ml/leadScorer');
const { predictWinProbability } = require('../src/ml/winPredictor');
const { calculateCommissionRate } = require('../src/services/commissionService');
const { runScenarioSimulation } = require('../src/ml/simulator');

console.log('--- Running RevPulse ML & SalesOps Engine Tests ---');

// 1. Lead Scoring Test
const testLeadEnterprise = {
  first_name: 'Sophia',
  last_name: 'Sterling',
  company: 'Titan Aerospace',
  company_size: 1500,
  industry: 'Technology',
  lead_source: 'Inbound Demo',
  website_visits: 12,
  email_opens: 8,
  content_downloads: 4,
  decision_maker: true,
  budget_confirmed: true,
  urgency_level: 'Immediate'
};

const leadScoreResult = scoreLead(testLeadEnterprise);
console.log('✓ Lead Scoring Result:', {
  score: leadScoreResult.score,
  grade: leadScoreResult.grade,
  factorsCount: leadScoreResult.factors.length
});
assert(leadScoreResult.score >= 85, 'High-fit enterprise lead should score >= 85');
assert(leadScoreResult.grade === 'A', 'High-fit enterprise lead should get Grade A');
assert(leadScoreResult.factors.length > 0, 'Should output explainability factors');

// 2. Win Probability Predictor Test
const testDeal = {
  title: 'Titan Aerospace RevOps Deployment',
  amount: 250000,
  stage_id: 5, // Negotiation & Legal
  days_in_current_stage: 5,
  total_activities_count: 22,
  has_executive_sponsor: true,
  has_security_approval: true,
  discount_percent: 5,
  forecast_category: 'Commit',
  competitor: 'None'
};

const stageInfo = { target_max_days: 14, name: 'Negotiation & Legal' };
const winResult = predictWinProbability(testDeal, stageInfo);
console.log('✓ Deal Win Probability Result:', {
  win_probability: winResult.win_probability,
  risk_level: winResult.risk_level,
  positive_insights: winResult.insights.top_positive.length
});
assert(winResult.win_probability >= 80, 'Late-stage sponsored deal should have win probability >= 80%');
assert(winResult.risk_level === 'Low Risk', 'Should be Low Risk');

// 3. Stagnant Deal Penalty Test
const stagnantDeal = {
  ...testDeal,
  days_in_current_stage: 35, // Severely overdue (> 14 days)
  has_executive_sponsor: false,
  discount_percent: 25
};
const stagnantResult = predictWinProbability(stagnantDeal, stageInfo);
console.log('✓ Stagnant Deal Result:', {
  win_probability: stagnantResult.win_probability,
  risk_level: stagnantResult.risk_level
});
assert(stagnantResult.win_probability < winResult.win_probability, 'Stagnant deal with high discount must receive lower probability');

// 4. Commission Accelerator Calculation Test
const tier1 = calculateCommissionRate(80.0, 8.0);
console.log('✓ Tier 1 Commission (<100% quota):', tier1);
assert(tier1.effectiveRate === 8.0, 'Tier 1 must be base 8.0%');

const tier2 = calculateCommissionRate(110.0, 8.0);
console.log('✓ Tier 2 Commission (100-125% quota):', tier2);
assert(tier2.effectiveRate === 12.0, 'Tier 2 must be 1.5x accelerator = 12.0%');

const tier3 = calculateCommissionRate(135.0, 8.0);
console.log('✓ Tier 3 Commission (>125% quota):', tier3);
assert(tier3.effectiveRate === 15.0, 'Tier 3 must be 1.875x accelerator = 15.0%');

// 5. What-If Simulation Test
const sampleDeals = [testDeal, stagnantDeal];
const simResult = runScenarioSimulation(sampleDeals, { 5: stageInfo }, {
  activity_boost_pct: 30,
  discount_reduction_pct: 10,
  sponsor_adoption_pct: 50,
  velocity_improvement_days: 5
});
console.log('✓ What-If Revenue Simulator Result:', {
  baseline_arr: simResult.baseline_expected_arr,
  simulated_arr: simResult.simulated_expected_arr,
  delta_arr: simResult.arr_delta,
  delta_pct: simResult.arr_delta_percentage
});
assert(simResult.simulated_expected_arr >= simResult.baseline_expected_arr, 'Optimized scenario should improve expected ARR');

console.log('--- ALL REV-PULSE ML TESTS PASSED SUCCESSFULLY! ---');
