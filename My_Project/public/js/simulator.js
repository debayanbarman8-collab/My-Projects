/**
 * What-If Revenue Scenario Simulator Controller
 */
const RevenueSimulator = (() => {
  let debounceTimer = null;

  function init() {
    const activitySlider = document.getElementById('sim-activity');
    const discountSlider = document.getElementById('sim-discount');
    const sponsorSlider = document.getElementById('sim-sponsor');
    const velocitySlider = document.getElementById('sim-velocity');

    const activityVal = document.getElementById('sim-activity-val');
    const discountVal = document.getElementById('sim-discount-val');
    const sponsorVal = document.getElementById('sim-sponsor-val');
    const velocityVal = document.getElementById('sim-velocity-val');

    function onSliderChange() {
      if (activityVal) activityVal.textContent = (activitySlider.value >= 0 ? '+' : '') + activitySlider.value + '%';
      if (discountVal) discountVal.textContent = '-' + discountSlider.value + '%';
      if (sponsorVal) sponsorVal.textContent = sponsorSlider.value + '%';
      if (velocityVal) velocityVal.textContent = '-' + velocitySlider.value + ' days';

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runSimulation, 250);
    }

    [activitySlider, discountSlider, sponsorSlider, velocitySlider].forEach(slider => {
      if (slider) slider.addEventListener('input', onSliderChange);
    });

    const resetBtn = document.getElementById('sim-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (activitySlider) activitySlider.value = 0;
        if (discountSlider) discountSlider.value = 0;
        if (sponsorSlider) sponsorSlider.value = 0;
        if (velocitySlider) velocitySlider.value = 0;
        onSliderChange();
      });
    }

    // Initial run
    runSimulation();
  }

  async function runSimulation() {
    const activitySlider = document.getElementById('sim-activity');
    const discountSlider = document.getElementById('sim-discount');
    const sponsorSlider = document.getElementById('sim-sponsor');
    const velocitySlider = document.getElementById('sim-velocity');

    const params = {
      activity_boost_pct: Number(activitySlider ? activitySlider.value : 0),
      discount_reduction_pct: Number(discountSlider ? discountSlider.value : 0),
      sponsor_adoption_pct: Number(sponsorSlider ? sponsorSlider.value : 0),
      velocity_improvement_days: Number(velocitySlider ? velocitySlider.value : 0)
    };

    try {
      const res = await API.simulateRevenue(params);
      if (res.success) {
        updateSimulationUI(res.data);
      }
    } catch (err) {
      console.error('Simulation failed:', err);
    }
  }

  function updateSimulationUI(data) {
    const baselineArrEl = document.getElementById('sim-baseline-arr');
    const simulatedArrEl = document.getElementById('sim-simulated-arr');
    const deltaArrEl = document.getElementById('sim-delta-arr');
    const deltaPctEl = document.getElementById('sim-delta-pct');
    const winRateBaseEl = document.getElementById('sim-winrate-base');
    const winRateSimEl = document.getElementById('sim-winrate-sim');

    if (baselineArrEl) baselineArrEl.textContent = '$' + data.baseline_expected_arr.toLocaleString();
    if (simulatedArrEl) simulatedArrEl.textContent = '$' + data.simulated_expected_arr.toLocaleString();
    
    if (deltaArrEl) {
      const isPositive = data.arr_delta >= 0;
      deltaArrEl.textContent = (isPositive ? '+$' : '-$') + Math.abs(data.arr_delta).toLocaleString();
      deltaArrEl.className = isPositive ? 'text-emerald-400 font-bold font-mono text-2xl' : 'text-rose-400 font-bold font-mono text-2xl';
    }

    if (deltaPctEl) {
      const isPositive = data.arr_delta_percentage >= 0;
      deltaPctEl.textContent = (isPositive ? '+' : '') + data.arr_delta_percentage + '% Projected ARR';
      deltaPctEl.className = isPositive ? 'text-emerald-400 text-xs font-semibold' : 'text-rose-400 text-xs font-semibold';
    }

    if (winRateBaseEl) winRateBaseEl.textContent = data.projected_win_rate_baseline + '%';
    if (winRateSimEl) winRateSimEl.textContent = data.projected_win_rate_simulated + '%';

    // Render Confidence Bands Chart
    AppCharts.renderSimulationBands('chart-sim-bands', data.confidence_bands, data.baseline_expected_arr);

    // Render Top Impacted Deals Table
    const tableBody = document.getElementById('sim-impacted-deals-body');
    if (tableBody) {
      tableBody.innerHTML = '';
      (data.top_impacted_deals || []).forEach(deal => {
        const row = document.createElement('tr');
        row.className = 'border-b border-slate-800 text-xs hover:bg-slate-800/40';
        row.innerHTML = `
          <td class="py-2.5 px-3 font-medium text-slate-200">${deal.title}</td>
          <td class="py-2.5 px-3 font-mono text-slate-300">$${deal.amount.toLocaleString()}</td>
          <td class="py-2.5 px-3 font-mono text-slate-400">${deal.base_prob}%</td>
          <td class="py-2.5 px-3 font-mono text-emerald-400 font-bold">${deal.sim_prob}%</td>
          <td class="py-2.5 px-3 font-mono ${deal.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-semibold">
            ${deal.diff >= 0 ? '+' : ''}${deal.diff}%
          </td>
        `;
        tableBody.appendChild(row);
      });
    }
  }

  return {
    init,
    runSimulation
  };
})();
