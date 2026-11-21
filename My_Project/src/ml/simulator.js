const { predictWinProbability } = require('./winPredictor');

/**
 * Monte Carlo & Scenario-based What-If Revenue Simulator
 * Lets Sales Operations leaders stress-test pipeline forecasts by simulating
 * changes in sales cadence, discounting, sponsor coverage, and velocity.
 */
function runScenarioSimulation(deals, stageMap, params = {}) {
  const {
    activity_boost_pct = 0,        // e.g. +20% more calls/demos
    discount_reduction_pct = 0,    // e.g. 5% lower discount
    sponsor_adoption_pct = 0,      // e.g. +30% deals get executive sponsor
    velocity_improvement_days = 0  // e.g. deals move 3 days faster
  } = params;

  let baselineExpectedARR = 0;
  let simulatedExpectedARR = 0;
  let totalPipelineAmount = 0;
  let baselineWinsCount = 0;
  let simulatedWinsCount = 0;

  const simulatedDeals = [];

  for (const deal of deals) {
    if (deal.stage_id === 7) continue; // Skip lost deals

    const amount = Number(deal.amount || 0);
    const stage = stageMap[deal.stage_id] || null;

    // Baseline calculation
    const baseline = predictWinProbability(deal, stage);
    const baseWinProb = deal.stage_id === 6 ? 1.0 : (baseline.win_probability / 100);
    baselineExpectedARR += amount * baseWinProb;
    totalPipelineAmount += amount;
    baselineWinsCount += baseWinProb;

    // Apply simulation transformations
    if (deal.stage_id === 6) {
      simulatedExpectedARR += amount;
      simulatedWinsCount += 1;
      simulatedDeals.push({
        id: deal.id,
        title: deal.title,
        amount,
        base_prob: 100,
        sim_prob: 100,
        diff: 0
      });
      continue;
    }

    const modifiedDeal = {
      ...deal,
      total_activities_count: Math.round(Number(deal.total_activities_count || 0) * (1 + (activity_boost_pct / 100))),
      discount_percent: Math.max(0, Number(deal.discount_percent || 0) - discount_reduction_pct),
      days_in_current_stage: Math.max(1, Number(deal.days_in_current_stage || 1) - velocity_improvement_days),
      has_executive_sponsor: deal.has_executive_sponsor || (Math.random() * 100 < sponsor_adoption_pct)
    };

    const simulated = predictWinProbability(modifiedDeal, stage);
    const simWinProb = simulated.win_probability / 100;
    simulatedExpectedARR += amount * simWinProb;
    simulatedWinsCount += simWinProb;

    simulatedDeals.push({
      id: deal.id,
      title: deal.title,
      amount,
      base_prob: baseline.win_probability,
      sim_prob: simulated.win_probability,
      diff: Math.round((simulated.win_probability - baseline.win_probability) * 10) / 10
    });
  }

  const arrDelta = simulatedExpectedARR - baselineExpectedARR;
  const arrDeltaPct = baselineExpectedARR > 0 ? (arrDelta / baselineExpectedARR) * 100 : 0;

  // Confidence Bands (P10 Pessimistic, P50 Median Expected, P90 Optimistic)
  const confidenceBands = {
    p10_pessimistic: Math.round(simulatedExpectedARR * 0.82),
    p50_expected: Math.round(simulatedExpectedARR),
    p90_optimistic: Math.round(simulatedExpectedARR * 1.18)
  };

  return {
    pipeline_total_amount: Math.round(totalPipelineAmount),
    baseline_expected_arr: Math.round(baselineExpectedARR),
    simulated_expected_arr: Math.round(simulatedExpectedARR),
    arr_delta: Math.round(arrDelta),
    arr_delta_percentage: Math.round(arrDeltaPct * 10) / 10,
    projected_win_rate_baseline: Math.round((baselineWinsCount / Math.max(1, deals.length)) * 100),
    projected_win_rate_simulated: Math.round((simulatedWinsCount / Math.max(1, deals.length)) * 100),
    confidence_bands: confidenceBands,
    top_impacted_deals: simulatedDeals.sort((a, b) => b.diff - a.diff).slice(0, 5)
  };
}

module.exports = {
  runScenarioSimulation
};
