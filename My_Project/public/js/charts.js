/**
 * Interactive Chart.js Visualizations for RevPulse
 */
const AppCharts = (() => {
  let forecastChartInstance = null;
  let funnelChartInstance = null;
  let leaderboardChartInstance = null;
  let simBandsChartInstance = null;

  function formatCurrency(val) {
    if (val >= 1000000) return '$' + (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return '$' + Math.round(val / 1000) + 'k';
    return '$' + val;
  }

  function renderForecastChart(canvasId, kpis, forecastCategories) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (forecastChartInstance) forecastChartInstance.destroy();

    const categories = ['Closed Won', 'Commit', 'Best Case', 'Open Pipeline'];
    const values = [
      kpis.closed_won_arr || 0,
      forecastCategories.Commit || 0,
      forecastCategories['Best Case'] || 0,
      forecastCategories.Pipeline || 0
    ];

    forecastChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: categories,
        datasets: [
          {
            label: 'Total Category ARR',
            data: values,
            backgroundColor: [
              'rgba(16, 185, 129, 0.85)', // Emerald for Closed Won
              'rgba(99, 102, 241, 0.85)', // Indigo for Commit
              'rgba(56, 189, 248, 0.85)', // Sky for Best Case
              'rgba(148, 163, 184, 0.65)' // Slate for Pipeline
            ],
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` ARR: ${formatCurrency(context.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 12 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: {
              color: '#94a3b8',
              font: { family: 'JetBrains Mono', size: 11 },
              callback: (value) => formatCurrency(value)
            }
          }
        }
      }
    });
  }

  function renderFunnelChart(canvasId, stages) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (funnelChartInstance) funnelChartInstance.destroy();

    // Exclude Closed Lost
    const activeStages = stages.filter(s => s.id !== 7);
    const labels = activeStages.map(s => s.name);
    const totalValues = activeStages.map(s => s.total_amount);
    const weightedValues = activeStages.map(s => s.weighted_amount);

    funnelChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Face Value ARR',
            data: totalValues,
            backgroundColor: 'rgba(99, 102, 241, 0.35)',
            borderColor: '#6366f1',
            borderWidth: 1.5,
            borderRadius: 6
          },
          {
            label: 'ML-Weighted Expected ARR',
            data: weightedValues,
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#cbd5e1', font: { family: 'Plus Jakarta Sans', size: 12 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
              callback: function(val, index) {
                const label = this.getLabelForValue(val);
                return label.length > 16 ? label.substr(0, 14) + '...' : label;
              }
            }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: {
              color: '#94a3b8',
              font: { family: 'JetBrains Mono', size: 11 },
              callback: (value) => formatCurrency(value)
            }
          }
        }
      }
    });
  }

  function renderLeaderboardChart(canvasId, reps) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (leaderboardChartInstance) leaderboardChartInstance.destroy();

    const labels = reps.map(r => r.rep_name.split(' ')[0]);
    const attainments = reps.map(r => r.attainment_pct);
    const colors = attainments.map(pct => {
      if (pct >= 100) return 'rgba(16, 185, 129, 0.85)';
      if (pct >= 75) return 'rgba(99, 102, 241, 0.85)';
      return 'rgba(245, 158, 11, 0.85)';
    });

    leaderboardChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Quota Attainment %',
            data: attainments,
            backgroundColor: colors,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Attainment: ${ctx.raw}%`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 12 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: {
              color: '#94a3b8',
              font: { family: 'JetBrains Mono', size: 11 },
              callback: (value) => value + '%'
            }
          }
        }
      }
    });
  }

  function renderSimulationBands(canvasId, confidenceBands, baselineExpected) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (simBandsChartInstance) simBandsChartInstance.destroy();

    simBandsChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Baseline Current', 'P10 (Pessimistic)', 'P50 (Expected ML)', 'P90 (Optimistic)'],
        datasets: [
          {
            label: 'Projected ARR',
            data: [
              baselineExpected,
              confidenceBands.p10_pessimistic,
              confidenceBands.p50_expected,
              confidenceBands.p90_optimistic
            ],
            backgroundColor: [
              'rgba(148, 163, 184, 0.5)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(99, 102, 241, 0.9)',
              'rgba(16, 185, 129, 0.9)'
            ],
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Projected ARR: ${formatCurrency(ctx.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: {
              color: '#94a3b8',
              font: { family: 'JetBrains Mono', size: 11 },
              callback: (val) => formatCurrency(val)
            }
          }
        }
      }
    });
  }

  return {
    renderForecastChart,
    renderFunnelChart,
    renderLeaderboardChart,
    renderSimulationBands
  };
})();
