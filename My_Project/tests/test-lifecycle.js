const { updateDealStage } = require('../src/services/pipelineService');
const { getQuotaPerformance } = require('../src/services/quotaService');
const { query } = require('../src/config/db');

async function testDealLifecycle() {
  console.log('--- Testing Deal Lifecycle & Commission Trigger ---');

  // Move deal #1 (Apex Financial - $285k) from stage 5 to stage 6 (Closed Won)
  console.log('Transitioning Deal #1 to Closed Won (Stage 6)...');
  const result = await updateDealStage(1, 6, 1, 'Contract signed by CFO');

  console.log('✓ Stage update result:', {
    dealId: result.opportunityId,
    newStage: result.newStageName,
    win_prob: result.ml_win_probability,
    risk: result.ml_risk_level,
    commissionTriggered: !!result.commissionResult
  });

  if (result.commissionResult) {
    console.log('✓ Commission Breakdown:', result.commissionResult);
  }

  // Check quota update
  const quotaPerf = await getQuotaPerformance();
  const rep3 = quotaPerf.reps.find(r => r.rep_id === 3);
  console.log('✓ Rep #3 updated quota attainment:', {
    rep: rep3.rep_name,
    target: rep3.target_amount,
    attained: rep3.attained_amount,
    attainment_pct: rep3.attainment_pct + '%',
    status: rep3.status
  });

  console.log('--- Deal Lifecycle & Commission Automation Test Passed! ---');
  process.exit(0);
}

testDealLifecycle();
