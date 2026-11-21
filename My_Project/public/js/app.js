/**
 * RevPulse Main Application Orchestrator
 */
window.App = (() => {
  let activeTab = 'dashboard';
  let cachedReps = [];

  async function init() {
    setupNavigation();
    setupModals();
    setupLiveLeadScoring();
    setupDealDrawer();
    setupEnterpriseFeatures();

    // Fetch initial data
    try {
      const repsRes = await API.getReps();
      if (repsRes.success) {
        cachedReps = repsRes.data;
        populateRepSelects(cachedReps);
      }
    } catch (e) {
      console.warn('Failed loading reps list:', e);
    }

    // Check stored user profile
    const storedUser = localStorage.getItem('revpulse_user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        const nameEl = document.querySelector('.truncate.text-slate-100');
        const roleEl = document.querySelector('.truncate.text-indigo-400');
        const avatarEl = document.querySelector('.w-8.h-8.rounded-full');
        if (nameEl) nameEl.textContent = u.name;
        if (roleEl) roleEl.textContent = (u.role || '').replace(/_/g, ' ').toUpperCase();
        if (avatarEl && u.avatar_url) avatarEl.src = u.avatar_url;
      } catch (err) {}
    }

    // Load initial dashboard tab
    switchTab('dashboard');
  }

  // --- TAB NAVIGATION ---
  function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-item');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        switchTab(targetTab);
      });
    });
  }

  function switchTab(tabName) {
    activeTab = tabName;

    // Update active nav button state
    document.querySelectorAll('.nav-item').forEach(btn => {
      const isCurrent = btn.dataset.tab === tabName;
      btn.classList.toggle('bg-indigo-600/20', isCurrent);
      btn.classList.toggle('text-indigo-400', isCurrent);
      btn.classList.toggle('border-indigo-500/30', isCurrent);
      btn.classList.toggle('text-slate-400', !isCurrent);
    });

    // Hide all tab content panes
    document.querySelectorAll('.tab-content').forEach(pane => {
      pane.classList.add('hidden');
    });

    // Show target pane
    const targetPane = document.getElementById(`tab-${tabName}`);
    if (targetPane) {
      targetPane.classList.remove('hidden');
    }

    // Trigger tab-specific loader
    if (tabName === 'dashboard') loadDashboardMetrics();
    else if (tabName === 'pipeline') loadKanban();
    else if (tabName === 'leads') loadLeads();
    else if (tabName === 'simulator') RevenueSimulator.init();
    else if (tabName === 'commissions') loadQuotasAndCommissions();
    else if (tabName === 'territories') loadTerritories();
    else if (tabName === 'governance') loadModelGovernance();
  }

  // --- DASHBOARD LOADER ---
  async function loadDashboardMetrics() {
    try {
      const res = await API.getDashboardAnalytics();
      if (!res.success) return;

      const { kpis, funnel, forecast_categories, bottlenecks } = res.data;

      // Update KPI Stat cards
      document.getElementById('kpi-pipeline-arr').textContent = '$' + (kpis.total_pipeline_arr || 0).toLocaleString();
      document.getElementById('kpi-weighted-arr').textContent = '$' + (kpis.weighted_pipeline_arr || 0).toLocaleString();
      document.getElementById('kpi-closed-arr').textContent = '$' + (kpis.closed_won_arr || 0).toLocaleString();
      document.getElementById('kpi-win-rate').textContent = (kpis.win_rate_pct || 0) + '%';
      document.getElementById('kpi-avg-cycle').textContent = (kpis.avg_sales_cycle_days || 0) + ' Days';
      document.getElementById('kpi-conversion-rate').textContent = (kpis.lead_conversion_rate || 0) + '%';

      // Render Charts
      AppCharts.renderForecastChart('chart-forecast-categories', kpis, forecast_categories);
      AppCharts.renderFunnelChart('chart-pipeline-funnel', funnel);

      // Render Bottlenecks list
      const bottleneckContainer = document.getElementById('bottlenecks-list');
      if (bottleneckContainer) {
        bottleneckContainer.innerHTML = '';
        if (bottlenecks.length === 0) {
          bottleneckContainer.innerHTML = '<div class="text-xs text-slate-400 py-3">No stalled deals detected. High velocity!</div>';
        } else {
          bottlenecks.slice(0, 4).forEach(b => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs';
            item.innerHTML = `
              <div>
                <div class="font-semibold text-slate-200 cursor-pointer hover:text-indigo-400" onclick="window.App.openDealDrawer(${b.id})">
                  ${b.title}
                </div>
                <div class="text-[11px] text-slate-400">
                  In <span class="text-rose-300 font-medium">${b.stage_name}</span>: <strong>${b.days_in_stage} days</strong> (Target: ${b.max_target}d)
                </div>
              </div>
              <div class="text-right">
                <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 font-bold">
                  +${b.overdue_days}d Stagnant
                </span>
              </div>
            `;
            bottleneckContainer.appendChild(item);
          });
        }
      }

      // Fetch Quota leaderboard for dashboard
      const quotaRes = await API.getQuotas();
      if (quotaRes.success) {
        AppCharts.renderLeaderboardChart('chart-rep-leaderboard', quotaRes.data.reps || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    }
  }

  // --- KANBAN LOADER ---
  async function loadKanban() {
    try {
      const res = await API.getKanban();
      if (res.success) {
        const boardContainer = document.getElementById('kanban-board-container');
        KanbanBoard.render(res.data, boardContainer);
      }
    } catch (err) {
      showToast('Failed to load pipeline: ' + err.message, 'error');
    }
  }

  // --- LEADS LOADER ---
  async function loadLeads() {
    try {
      const res = await API.getLeads();
      if (!res.success) return;

      const leads = res.data;
      const tbody = document.getElementById('leads-table-body');
      if (!tbody) return;

      tbody.innerHTML = '';
      leads.forEach(lead => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-800 text-xs hover:bg-slate-800/40 transition-colors';

        let gradeBadge = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
        if (lead.ml_grade === 'B') gradeBadge = 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';
        else if (lead.ml_grade === 'C') gradeBadge = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
        else if (lead.ml_grade === 'D') gradeBadge = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';

        const isConverted = lead.status === 'Converted';

        tr.innerHTML = `
          <td class="py-3 px-4 font-semibold text-slate-100">
            ${lead.first_name} ${lead.last_name}
            <div class="text-[11px] font-normal text-slate-400">${lead.email}</div>
          </td>
          <td class="py-3 px-4 font-medium text-slate-200">
            ${lead.company}
            <div class="text-[11px] text-slate-400">${lead.title || 'Executive'}</div>
          </td>
          <td class="py-3 px-4 text-slate-300">
            ${lead.company_size} Empl.
            <div class="text-[11px] text-slate-500">${lead.industry}</div>
          </td>
          <td class="py-3 px-4 text-slate-300">
            <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
              ${lead.lead_source}
            </span>
          </td>
          <td class="py-3 px-4">
            <div class="flex items-center gap-2">
              <span class="font-mono font-bold text-sm ${lead.ml_score >= 80 ? 'text-emerald-400' : lead.ml_score >= 60 ? 'text-indigo-400' : 'text-amber-400'}">
                ${lead.ml_score}
              </span>
              <span class="px-1.5 py-0.2 rounded font-bold text-[10px] ${gradeBadge}">
                Grade ${lead.ml_grade}
              </span>
            </div>
          </td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded text-[11px] ${isConverted ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}">
              ${lead.status}
            </span>
          </td>
          <td class="py-3 px-4 text-right">
            ${isConverted ?
              '<span class="text-xs text-slate-500">Converted</span>' :
              `<button class="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] transition-all convert-lead-btn" data-lead-id="${lead.id}" data-lead-name="${lead.first_name} ${lead.last_name}" data-company="${lead.company}">
                Convert to Deal &rarr;
              </button>`
            }
          </td>
        `;

        tbody.appendChild(tr);
      });

      // Bind convert buttons
      document.querySelectorAll('.convert-lead-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          openConvertModal(btn.dataset.leadId, btn.dataset.leadName, btn.dataset.company);
        });
      });
    } catch (err) {
      showToast('Failed to load leads: ' + err.message, 'error');
    }
  }

  // --- LIVE LEAD SCORING PREVIEW ---
  function setupLiveLeadScoring() {
    const inputs = ['nl-visits', 'nl-opens', 'nl-downloads', 'nl-size', 'nl-industry', 'nl-source', 'nl-decision-maker', 'nl-budget', 'nl-urgency'];
    
    function triggerPreview() {
      const data = {
        website_visits: document.getElementById('nl-visits').value,
        email_opens: document.getElementById('nl-opens').value,
        content_downloads: document.getElementById('nl-downloads').value,
        company_size: document.getElementById('nl-size').value,
        industry: document.getElementById('nl-industry').value,
        lead_source: document.getElementById('nl-source').value,
        decision_maker: document.getElementById('nl-decision-maker').checked,
        budget_confirmed: document.getElementById('nl-budget').checked,
        urgency_level: document.getElementById('nl-urgency').value
      };

      API.scoreLeadPreview(data).then(res => {
        if (res.success) {
          const { score, grade, factors } = res.data;
          const scoreEl = document.getElementById('preview-lead-score');
          const gradeEl = document.getElementById('preview-lead-grade');
          const factorsEl = document.getElementById('preview-lead-factors');

          if (scoreEl) scoreEl.textContent = score + '/100';
          if (gradeEl) {
            gradeEl.textContent = 'Grade ' + grade;
            gradeEl.className = 'font-bold text-xs px-2 py-0.5 rounded ' + (
              grade === 'A' ? 'bg-emerald-500/20 text-emerald-400' :
              grade === 'B' ? 'bg-indigo-500/20 text-indigo-400' :
              grade === 'C' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
            );
          }

          if (factorsEl) {
            factorsEl.innerHTML = '';
            factors.slice(0, 4).forEach(f => {
              const tag = document.createElement('span');
              const isPos = f.direction === 'positive';
              tag.className = `px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 ${isPos ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'}`;
              tag.innerHTML = `<span>${isPos ? '↑' : '↓'}</span> ${f.name} (<strong>${f.impact}</strong>)`;
              factorsEl.appendChild(tag);
            });
          }
        }
      }).catch(e => console.error(e));
    }

    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', triggerPreview);
        el.addEventListener('change', triggerPreview);
      }
    });
  }

  // --- COMMISSIONS & QUOTAS LOADER ---
  async function loadQuotasAndCommissions() {
    try {
      const [quotasRes, commsRes] = await Promise.all([
        API.getQuotas(),
        API.getCommissions()
      ]);

      if (quotasRes.success) {
        const { summary, reps } = quotasRes.data;
        document.getElementById('quota-team-target').textContent = '$' + summary.total_target.toLocaleString();
        document.getElementById('quota-team-attained').textContent = '$' + summary.total_attained.toLocaleString();
        document.getElementById('quota-team-pct').textContent = summary.team_attainment_pct + '%';
        document.getElementById('quota-team-coverage').textContent = summary.team_coverage_ratio + 'x Pipeline Coverage';

        const repCardsContainer = document.getElementById('reps-quota-cards');
        if (repCardsContainer) {
          repCardsContainer.innerHTML = '';
          reps.forEach(rep => {
            const card = document.createElement('div');
            card.className = 'glass-card rounded-xl p-4 flex flex-col gap-3';
            
            let statusBadge = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
            if (rep.status === 'Behind') statusBadge = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
            else if (rep.status === 'On Track') statusBadge = 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';

            card.innerHTML = `
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <img src="${rep.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" class="w-10 h-10 rounded-full object-cover border border-slate-700" />
                  <div>
                    <h4 class="font-bold text-slate-100 text-sm">${rep.rep_name}</h4>
                    <p class="text-xs text-slate-400">${rep.fiscal_quarter}</p>
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded text-xs font-semibold ${statusBadge}">
                  ${rep.status}
                </span>
              </div>

              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-slate-400">Attainment: <strong class="text-slate-200 font-mono">${rep.attainment_pct}%</strong></span>
                  <span class="font-mono text-slate-300">$${rep.attained_amount.toLocaleString()} / $${rep.target_amount.toLocaleString()}</span>
                </div>
                <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div class="h-2 rounded-full ${rep.attainment_pct >= 100 ? 'bg-emerald-400' : 'bg-indigo-500'}" style="width: ${Math.min(100, rep.attainment_pct)}%"></div>
                </div>
              </div>

              <div class="flex justify-between items-center text-xs pt-2 border-t border-slate-800/80 text-slate-400">
                <span>Open Pipeline: <strong class="text-slate-200 font-mono">$${rep.open_pipeline.toLocaleString()}</strong></span>
                <span class="font-mono text-indigo-400 font-semibold">${rep.coverage_ratio}x Coverage</span>
              </div>
            `;
            repCardsContainer.appendChild(card);
          });
        }
      }

      if (commsRes.success) {
        const { summary, data: commissions } = commsRes.data;
        document.getElementById('comm-total-payout').textContent = '$' + summary.total_payout_amount.toLocaleString();
        document.getElementById('comm-paid').textContent = '$' + summary.total_paid.toLocaleString();
        document.getElementById('comm-pending').textContent = '$' + summary.total_pending.toLocaleString();

        const commTableBody = document.getElementById('commissions-table-body');
        if (commTableBody) {
          commTableBody.innerHTML = '';
          commissions.forEach(c => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-slate-800 text-xs hover:bg-slate-800/40';

            let statusBadge = 'bg-amber-500/20 text-amber-300';
            if (c.payout_status === 'Approved') statusBadge = 'bg-indigo-500/20 text-indigo-300';
            else if (c.payout_status === 'Paid') statusBadge = 'bg-emerald-500/20 text-emerald-300';

            tr.innerHTML = `
              <td class="py-3 px-4 font-mono text-slate-400">#${c.id}</td>
              <td class="py-3 px-4 font-semibold text-slate-200">${c.rep_name || 'Sales Rep'}</td>
              <td class="py-3 px-4 font-mono text-slate-300">$${Number(c.deal_amount).toLocaleString()}</td>
              <td class="py-3 px-4 font-mono text-slate-300">${c.quota_attainment_pct_at_close}%</td>
              <td class="py-3 px-4 font-mono font-semibold text-indigo-400">${c.effective_commission_pct}% (${c.accelerator_multiplier}x)</td>
              <td class="py-3 px-4 font-mono font-bold text-emerald-400">$${Number(c.total_payout).toLocaleString()}</td>
              <td class="py-3 px-4">
                <span class="px-2 py-0.5 rounded text-[11px] font-semibold ${statusBadge}">
                  ${c.payout_status}
                </span>
              </td>
              <td class="py-3 px-4 text-right">
                ${c.payout_status !== 'Paid' ? `
                  <button class="px-2 py-1 rounded bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-[10px] font-semibold transition-all mark-paid-btn" data-comm-id="${c.id}">
                    Mark Paid
                  </button>
                ` : '<span class="text-slate-500 text-[11px]">Completed</span>'}
              </td>
            `;
            commTableBody.appendChild(tr);
          });

          document.querySelectorAll('.mark-paid-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
              try {
                await API.updateCommissionStatus(btn.dataset.commId, 'Paid');
                showToast(`Commission #${btn.dataset.commId} marked as Paid`, 'success');
                loadQuotasAndCommissions();
              } catch (e) {
                showToast(e.message, 'error');
              }
            });
          });
        }
      }
    } catch (err) {
      showToast('Failed to load commissions: ' + err.message, 'error');
    }
  }

  // --- TERRITORIES LOADER ---
  async function loadTerritories() {
    try {
      const res = await API.getTerritories();
      if (!res.success) return;

      const container = document.getElementById('territories-cards-container');
      if (container) {
        container.innerHTML = '';
        res.data.forEach(t => {
          const card = document.createElement('div');
          card.className = 'glass-card rounded-xl p-4 flex flex-col justify-between gap-3';
          card.innerHTML = `
            <div>
              <div class="flex items-center justify-between mb-1">
                <h4 class="font-bold text-slate-100 text-sm">${t.name}</h4>
                <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300">
                  ${t.tier}
                </span>
              </div>
              <p class="text-xs text-slate-400 mb-2">${t.description}</p>
              <div class="text-[11px] text-slate-400 space-y-1">
                <div>Region: <strong class="text-slate-300">${t.region}</strong></div>
                <div>Company Size: <strong class="text-slate-300">${t.min_company_size} - ${t.max_company_size >= 1000000 ? '1M+' : t.max_company_size}</strong></div>
              </div>
            </div>

            <div class="pt-2 border-t border-slate-800 text-xs">
              <span class="text-slate-400">Assigned Reps (${t.reps_count}):</span>
              <div class="flex -space-x-2 mt-1.5 overflow-hidden">
                ${t.reps.map(r => `
                  <img src="${r.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}" title="${r.name} (${r.role})" class="inline-block h-7 w-7 rounded-full ring-2 ring-slate-900 object-cover" />
                `).join('')}
              </div>
            </div>
          `;
          container.appendChild(card);
        });
      }

      // Territory simulator test button
      const simBtn = document.getElementById('btn-test-routing');
      if (simBtn) {
        simBtn.onclick = async () => {
          const size = document.getElementById('routing-sim-size').value;
          const region = document.getElementById('routing-sim-region').value;

          const testRes = await API.previewRouting({ company_size: size, region });
          if (testRes.success) {
            const outEl = document.getElementById('routing-sim-result');
            outEl.classList.remove('hidden');
            outEl.innerHTML = `
              <div class="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs space-y-1">
                <div class="text-indigo-300 font-bold">Rule Engine Match:</div>
                <div>Territory: <strong class="text-slate-100">${testRes.data.territory.name} (${testRes.data.territory.tier})</strong></div>
                <div>Assigned Rep: <strong class="text-emerald-400">${testRes.data.assignedRep.name} (${testRes.data.assignedRep.email})</strong></div>
                <div class="text-[11px] text-slate-400 italic">${testRes.data.rule_applied}</div>
              </div>
            `;
          }
        };
      }
    } catch (err) {
      showToast('Failed to load territories: ' + err.message, 'error');
    }
  }

  // --- MODEL GOVERNANCE & RETRAINING LOADER ---
  async function loadModelGovernance() {
    try {
      const res = await API.getModelLogs();
      if (!res.success) return;

      const latestLog = res.data[0] || {};
      
      // Update displayed metrics
      document.getElementById('ml-metric-accuracy').textContent = ((latestLog.accuracy || 0.912) * 100).toFixed(1) + '%';
      document.getElementById('ml-metric-precision').textContent = ((latestLog.precision_score || 0.894) * 100).toFixed(1) + '%';
      document.getElementById('ml-metric-recall').textContent = ((latestLog.recall_score || 0.887) * 100).toFixed(1) + '%';
      document.getElementById('ml-metric-f1').textContent = ((latestLog.f1_score || 0.890) * 100).toFixed(1) + '%';
      document.getElementById('ml-metric-auc').textContent = Number(latestLog.auc_roc || 0.941).toFixed(4);
      document.getElementById('ml-model-version').textContent = latestLog.version || 'v3.1.0';

      // Render logs table
      const tbody = document.getElementById('ml-logs-table-body');
      if (tbody) {
        tbody.innerHTML = '';
        res.data.forEach(log => {
          const tr = document.createElement('tr');
          tr.className = 'border-b border-slate-800 text-xs hover:bg-slate-800/40';
          tr.innerHTML = `
            <td class="py-2.5 px-3 font-semibold text-slate-200">${log.model_name}</td>
            <td class="py-2.5 px-3 font-mono text-indigo-400">${log.version}</td>
            <td class="py-2.5 px-3 font-mono text-slate-300">${log.samples_count}</td>
            <td class="py-2.5 px-3 font-mono text-emerald-400">${(Number(log.accuracy) * 100).toFixed(1)}%</td>
            <td class="py-2.5 px-3 font-mono text-slate-300">${(Number(log.f1_score) * 100).toFixed(1)}%</td>
            <td class="py-2.5 px-3 font-mono text-amber-400 font-bold">${Number(log.auc_roc).toFixed(4)}</td>
            <td class="py-2.5 px-3 text-slate-400">${new Date(log.trained_at).toLocaleDateString()}</td>
          `;
          tbody.appendChild(tr);
        });
      }

      // Retrain trigger button
      const retrainBtn = document.getElementById('btn-retrain-model');
      if (retrainBtn) {
        retrainBtn.onclick = async () => {
          retrainBtn.disabled = true;
          retrainBtn.innerHTML = '<span class="inline-block animate-spin mr-1">↻</span> Retraining & Evaluating...';
          try {
            const retrainRes = await API.retrainMLModel();
            if (retrainRes.success) {
              showToast(`🎯 Model Retrained! Version: ${retrainRes.data.version} | ROC-AUC: ${retrainRes.data.metrics.roc_auc}`, 'success');
              loadModelGovernance();
            }
          } catch (e) {
            showToast(e.message, 'error');
          } finally {
            retrainBtn.disabled = false;
            retrainBtn.innerHTML = '⚡ Retrain Model on Latest Historical Data';
          }
        };
      }
    } catch (err) {
      showToast('Failed to load ML logs: ' + err.message, 'error');
    }

    // Also refresh system audit trail
    loadAuditLogs();
  }

  // --- DEAL DRAWER & XAI INSPECTOR ---
  function setupDealDrawer() {
    const closeBtn = document.getElementById('close-deal-drawer');
    const drawer = document.getElementById('deal-drawer');
    const overlay = document.getElementById('deal-drawer-overlay');

    if (closeBtn) closeBtn.onclick = closeDealDrawer;
    if (overlay) overlay.onclick = closeDealDrawer;
  }

  async function openDealDrawer(dealId) {
    try {
      const res = await API.getDeal(dealId);
      if (!res.success) return;

      const deal = res.data;
      const drawer = document.getElementById('deal-drawer');
      const overlay = document.getElementById('deal-drawer-overlay');

      document.getElementById('drawer-deal-title').textContent = deal.title;
      document.getElementById('drawer-deal-amount').textContent = '$' + Number(deal.amount).toLocaleString();
      document.getElementById('drawer-deal-account').textContent = deal.account_name || 'Account';
      document.getElementById('drawer-deal-rep').textContent = deal.rep_name || 'Rep';
      document.getElementById('drawer-deal-stage').textContent = deal.stage_name || 'Stage';
      document.getElementById('drawer-deal-prob').textContent = deal.ml_win_probability + '% Win Probability';
      document.getElementById('drawer-deal-risk').textContent = deal.ml_risk_level;

      // XAI Drivers
      const posContainer = document.getElementById('drawer-positive-drivers');
      const riskContainer = document.getElementById('drawer-risk-factors');

      posContainer.innerHTML = '';
      riskContainer.innerHTML = '';

      const insights = deal.ml_insights || {};
      const positives = insights.top_positive || [];
      const risks = insights.top_risks || [];

      if (positives.length === 0) posContainer.innerHTML = '<div class="text-xs text-slate-500 italic">No strong positive signals recorded.</div>';
      else {
        positives.forEach(p => {
          const el = document.createElement('li');
          el.className = 'text-xs text-slate-200 flex items-start gap-1.5';
          el.innerHTML = '<span class="text-emerald-400 font-bold">✓</span> <span>' + p + '</span>';
          posContainer.appendChild(el);
        });
      }

      if (risks.length === 0) riskContainer.innerHTML = '<div class="text-xs text-slate-500 italic">No critical risks identified.</div>';
      else {
        risks.forEach(r => {
          const el = document.createElement('li');
          el.className = 'text-xs text-slate-200 flex items-start gap-1.5';
          el.innerHTML = '<span class="text-rose-400 font-bold">⚠️</span> <span>' + r + '</span>';
          riskContainer.appendChild(el);
        });
      }

      // Activities Timeline
      const actContainer = document.getElementById('drawer-activities-timeline');
      actContainer.innerHTML = '';
      (deal.activities || []).forEach(act => {
        const item = document.createElement('div');
        item.className = 'relative pl-5 border-l-2 border-slate-700 pb-3 text-xs';
        item.innerHTML = `
          <div class="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ${act.sentiment === 'Positive' ? 'bg-emerald-400' : 'bg-indigo-400'}"></div>
          <div class="flex justify-between items-center text-slate-400 text-[10px]">
            <span class="font-semibold text-slate-300 uppercase">${act.type}</span>
            <span>${new Date(act.created_at).toLocaleDateString()}</span>
          </div>
          <div class="font-medium text-slate-200 mt-0.5">${act.title}</div>
          <p class="text-slate-400 mt-0.5">${act.description || ''}</p>
        `;
        actContainer.appendChild(item);
      });

      // Bind Log Activity button in drawer
      const logBtn = document.getElementById('btn-drawer-log-activity');
      if (logBtn) {
        logBtn.onclick = () => {
          openActivityModal(deal.id);
        };
      }

      // Show drawer
      overlay.classList.remove('hidden');
      drawer.classList.remove('translate-x-full');
    } catch (e) {
      showToast('Error opening deal details: ' + e.message, 'error');
    }
  }

  function closeDealDrawer() {
    const drawer = document.getElementById('deal-drawer');
    const overlay = document.getElementById('deal-drawer-overlay');
    if (drawer) drawer.classList.add('translate-x-full');
    if (overlay) overlay.classList.add('hidden');
  }

  // --- MODAL HANDLERS ---
  function setupModals() {
    // New Lead Modal
    const newLeadBtn = document.getElementById('btn-new-lead');
    const newLeadModal = document.getElementById('modal-new-lead');
    const closeLeadBtn = document.getElementById('close-new-lead-modal');

    if (newLeadBtn) newLeadBtn.onclick = () => newLeadModal.classList.remove('hidden');
    if (closeLeadBtn) closeLeadBtn.onclick = () => newLeadModal.classList.add('hidden');

    const formLead = document.getElementById('form-new-lead');
    if (formLead) {
      formLead.onsubmit = async (e) => {
        e.preventDefault();
        const leadData = {
          first_name: document.getElementById('nl-fname').value,
          last_name: document.getElementById('nl-lname').value,
          email: document.getElementById('nl-email').value,
          company: document.getElementById('nl-company').value,
          title: document.getElementById('nl-title').value,
          industry: document.getElementById('nl-industry').value,
          company_size: Number(document.getElementById('nl-size').value),
          annual_revenue: Number(document.getElementById('nl-revenue').value),
          lead_source: document.getElementById('nl-source').value,
          website_visits: Number(document.getElementById('nl-visits').value),
          email_opens: Number(document.getElementById('nl-opens').value),
          content_downloads: Number(document.getElementById('nl-downloads').value),
          decision_maker: document.getElementById('nl-decision-maker').checked,
          budget_confirmed: document.getElementById('nl-budget').checked,
          urgency_level: document.getElementById('nl-urgency').value
        };

        try {
          const res = await API.createLead(leadData);
          if (res.success) {
            showToast(`Lead captured! ML Score: ${res.data.ml_score}/100 (${res.data.ml_grade}). Auto-routed.`, 'success');
            newLeadModal.classList.add('hidden');
            formLead.reset();
            loadLeads();
            loadDashboardMetrics();
          }
        } catch (err) {
          showToast(err.message, 'error');
        }
      };
    }

    // New Deal Modal
    const newDealBtn = document.getElementById('btn-new-deal');
    const newDealModal = document.getElementById('modal-new-deal');
    const closeDealBtn = document.getElementById('close-new-deal-modal');

    if (newDealBtn) newDealBtn.onclick = () => newDealModal.classList.remove('hidden');
    if (closeDealBtn) closeDealBtn.onclick = () => newDealModal.classList.add('hidden');

    const formDeal = document.getElementById('form-new-deal');
    if (formDeal) {
      formDeal.onsubmit = async (e) => {
        e.preventDefault();
        const dealData = {
          title: document.getElementById('nd-title').value,
          amount: Number(document.getElementById('nd-amount').value),
          stage_id: Number(document.getElementById('nd-stage').value),
          assigned_rep_id: Number(document.getElementById('nd-rep').value),
          expected_close_date: document.getElementById('nd-close-date').value,
          discount_percent: Number(document.getElementById('nd-discount').value || 0),
          competitor: document.getElementById('nd-competitor').value || 'None',
          has_executive_sponsor: document.getElementById('nd-sponsor').checked,
          has_security_approval: document.getElementById('nd-security').checked,
          forecast_category: document.getElementById('nd-forecast').value
        };

        try {
          const res = await API.createDeal(dealData);
          if (res.success) {
            showToast(`Deal created! Predicted Win Probability: ${res.data.ml_win_probability}%`, 'success');
            newDealModal.classList.add('hidden');
            formDeal.reset();
            loadKanban();
            loadDashboardMetrics();
          }
        } catch (err) {
          showToast(err.message, 'error');
        }
      };
    }

    // Activity Modal
    const closeActBtn = document.getElementById('close-activity-modal');
    if (closeActBtn) closeActBtn.onclick = () => document.getElementById('modal-activity').classList.add('hidden');

    const formAct = document.getElementById('form-activity');
    if (formAct) {
      formAct.onsubmit = async (e) => {
        e.preventDefault();
        const dealId = document.getElementById('act-deal-id').value;
        const actData = {
          type: document.getElementById('act-type').value,
          title: document.getElementById('act-title').value,
          description: document.getElementById('act-desc').value,
          sentiment: document.getElementById('act-sentiment').value
        };

        try {
          const res = await API.addDealActivity(dealId, actData);
          if (res.success) {
            showToast('Activity logged. ML probability updated!', 'success');
            document.getElementById('modal-activity').classList.add('hidden');
            formAct.reset();
            openDealDrawer(dealId); // refresh drawer
            loadKanban();
          }
        } catch (err) {
          showToast(err.message, 'error');
        }
      };
    }

    // Convert Lead Modal
    const closeConvertBtn = document.getElementById('close-convert-modal');
    if (closeConvertBtn) closeConvertBtn.onclick = () => document.getElementById('modal-convert-lead').classList.add('hidden');

    const formConvert = document.getElementById('form-convert-lead');
    if (formConvert) {
      formConvert.onsubmit = async (e) => {
        e.preventDefault();
        const leadId = document.getElementById('convert-lead-id').value;
        const convertData = {
          deal_title: document.getElementById('convert-deal-title').value,
          amount: Number(document.getElementById('convert-deal-amount').value),
          expected_close_date: document.getElementById('convert-close-date').value
        };

        try {
          const res = await API.convertLead(leadId, convertData);
          if (res.success) {
            showToast(`🎉 Lead converted to Opportunity #${res.data.deal_id}!`, 'success');
            document.getElementById('modal-convert-lead').classList.add('hidden');
            loadLeads();
            loadDashboardMetrics();
          }
        } catch (err) {
          showToast(err.message, 'error');
        }
      };
    }
  }

  function openActivityModal(dealId) {
    document.getElementById('act-deal-id').value = dealId;
    document.getElementById('modal-activity').classList.remove('hidden');
  }

  function openConvertModal(leadId, leadName, company) {
    document.getElementById('convert-lead-id').value = leadId;
    document.getElementById('convert-deal-title').value = `${company} - Enterprise Expansion`;
    document.getElementById('modal-convert-lead').classList.remove('hidden');
  }

  function populateRepSelects(reps) {
    const selects = ['nd-rep'];
    selects.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = '';
        reps.forEach(r => {
          const opt = document.createElement('option');
          opt.value = r.id;
          opt.textContent = `${r.name} (${r.role.replace('_', ' ')})`;
          el.appendChild(opt);
        });
      }
    });
  }

  // --- ENTERPRISE SUITE: SEARCH, NOTIFICATIONS, EXPORTS, BULK IMPORT, AUDIT TRAIL ---
  function setupEnterpriseFeatures() {
    setupCommandPalette();
    setupNotifications();
    setupExports();
    setupBulkImport();
    setupAuditLogs();
  }

  // 1. Global Command Palette (Ctrl+K / Cmd+K)
  function setupCommandPalette() {
    const modal = document.getElementById('modal-cmd-palette');
    const input = document.getElementById('cmd-search-input');
    const triggerBtn = document.getElementById('btn-cmd-palette');
    const container = document.getElementById('cmd-results-container');
    if (!modal || !input) return;

    function openPalette() {
      modal.classList.remove('hidden');
      input.value = '';
      input.focus();
      container.innerHTML = '<div class="text-xs text-slate-500 py-6 text-center">Type at least 2 characters to search across deals, leads, accounts, and reps...</div>';
    }

    function closePalette() {
      modal.classList.add('hidden');
    }

    if (triggerBtn) triggerBtn.onclick = openPalette;
    modal.onclick = (e) => {
      if (e.target === modal) closePalette();
    };

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (modal.classList.contains('hidden')) openPalette();
        else closePalette();
      } else if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        closePalette();
      }
    });

    document.querySelectorAll('.cmd-jump-pill').forEach(btn => {
      btn.onclick = () => {
        closePalette();
        switchTab(btn.dataset.tab);
      };
    });

    let debounceTimer = null;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const query = input.value.trim();
      if (query.length < 2) {
        container.innerHTML = '<div class="text-xs text-slate-500 py-6 text-center">Type at least 2 characters to search across deals, leads, accounts, and reps...</div>';
        return;
      }

      debounceTimer = setTimeout(async () => {
        container.innerHTML = '<div class="text-xs text-slate-400 py-6 text-center animate-pulse">Searching enterprise workspace...</div>';
        try {
          const res = await API.search(query);
          if (!res.success) throw new Error(res.message);

          const { opportunities, leads, accounts, users } = res.data;
          const totalFound = opportunities.length + leads.length + accounts.length + users.length;

          if (totalFound === 0) {
            container.innerHTML = `<div class="text-xs text-slate-500 py-6 text-center">No results found for "${query}".</div>`;
            return;
          }

          container.innerHTML = '';

          if (opportunities.length > 0) {
            renderSearchGroup('Opportunities / Deals', '💼', opportunities, (opp) => {
              closePalette();
              openDealDrawer(opp.id);
            }, (opp) => `${opp.title} — <strong class="text-emerald-400 font-mono">$${Number(opp.amount).toLocaleString()}</strong> (${opp.stage_name || 'Stage'}, Win: ${opp.ml_win_probability}%)`);
          }

          if (leads.length > 0) {
            renderSearchGroup('Leads & Prospects', '🎯', leads, (lead) => {
              closePalette();
              switchTab('leads');
            }, (lead) => `${lead.first_name} ${lead.last_name} — ${lead.company} (${lead.title || 'Lead'}, ML Grade: <strong>${lead.ml_grade}</strong>)`);
          }

          if (accounts.length > 0) {
            renderSearchGroup('Accounts & Organizations', '🏢', accounts, (acc) => {
              closePalette();
              switchTab('pipeline');
            }, (acc) => `${acc.name} — ${acc.industry} (${acc.tier}) [${acc.region}]`);
          }

          if (users.length > 0) {
            renderSearchGroup('Sales Representatives & Team', '👤', users, (u) => {
              closePalette();
              switchTab('commissions');
            }, (u) => `${u.name} (${u.email}) — ${(u.role || '').replace(/_/g, ' ').toUpperCase()}`);
          }
        } catch (err) {
          container.innerHTML = `<div class="text-xs text-rose-400 py-4 text-center">Search error: ${err.message}</div>`;
        }
      }, 200);
    });

    function renderSearchGroup(title, icon, items, onClick, formatter) {
      const groupEl = document.createElement('div');
      groupEl.className = 'flex flex-col gap-1';
      groupEl.innerHTML = `<div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-2 pt-2 border-t border-slate-800">
        <span>${icon}</span> ${title} (${items.length})
      </div>`;

      items.forEach(item => {
        const itemBtn = document.createElement('button');
        itemBtn.type = 'button';
        itemBtn.className = 'w-full text-left px-3 py-2 rounded-lg bg-slate-900/60 hover:bg-indigo-600/20 hover:border-indigo-500/30 border border-slate-800 text-xs text-slate-200 transition-all flex items-center justify-between group';
        itemBtn.innerHTML = `
          <div class="truncate mr-2">${formatter(item)}</div>
          <span class="text-[10px] text-slate-500 group-hover:text-indigo-300 font-mono shrink-0">Open &rarr;</span>
        `;
        itemBtn.onclick = () => onClick(item);
        groupEl.appendChild(itemBtn);
      });

      container.appendChild(groupEl);
    }
  }

  // 2. Velocity SLA Notifications & Scanner
  function setupNotifications() {
    const btn = document.getElementById('btn-notifications');
    const dropdown = document.getElementById('notif-dropdown');
    const scanBtn = document.getElementById('btn-scan-alerts');
    const markAllBtn = document.getElementById('btn-mark-all-read');

    if (!btn || !dropdown) return;

    btn.onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
      if (!dropdown.classList.contains('hidden')) {
        loadNotifications();
      }
    };

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== btn) {
        dropdown.classList.add('hidden');
      }
    });

    if (scanBtn) {
      scanBtn.onclick = async () => {
        scanBtn.disabled = true;
        scanBtn.textContent = 'Scanning...';
        try {
          const res = await API.scanVelocityAlerts();
          if (res.success) {
            showToast(`SLA Scanner: Detected ${res.data.detected} stalled deals (${res.data.created} alerts triggered)`, 'info');
            loadNotifications();
            loadDashboardMetrics();
          }
        } catch (e) {
          showToast('Scan failed: ' + e.message, 'error');
        } finally {
          scanBtn.disabled = false;
          scanBtn.textContent = 'Scan Now';
        }
      };
    }

    if (markAllBtn) {
      markAllBtn.onclick = async () => {
        try {
          await API.markAllNotificationsRead();
          loadNotifications();
        } catch (e) {
          showToast(e.message, 'error');
        }
      };
    }

    loadNotifications();
    setInterval(loadNotifications, 60000);
  }

  async function loadNotifications() {
    try {
      const res = await API.getNotifications();
      if (!res.success) return;

      const { unread_count, notifications } = res.data;
      const badge = document.getElementById('notif-badge');
      const list = document.getElementById('notif-list');

      if (badge) {
        if (unread_count > 0) {
          badge.textContent = unread_count > 99 ? '99+' : unread_count;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }

      if (list) {
        list.innerHTML = '';
        if (!notifications || notifications.length === 0) {
          list.innerHTML = '<div class="text-slate-500 py-4 text-center text-xs">No active SLA or velocity alerts.</div>';
          return;
        }

        notifications.forEach(n => {
          const item = document.createElement('div');
          const isUnread = !n.is_read;
          const isCritical = n.severity === 'critical';
          item.className = `p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${isCritical ? 'bg-rose-950/40 border-rose-500/30' : 'bg-slate-800/60 border-slate-700/60'} ${isUnread ? 'ring-1 ring-indigo-500/40' : 'opacity-70'}`;
          
          item.innerHTML = `
            <div class="flex items-start justify-between gap-2">
              <span class="font-bold text-slate-100">${n.title}</span>
              <span class="text-[10px] text-slate-500 shrink-0">${new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p class="text-slate-300 text-[11px] mt-1">${n.message}</p>
          `;

          item.onclick = async () => {
            if (isUnread) {
              await API.markNotificationRead(n.id).catch(() => {});
            }
            if (n.entity_type === 'opportunity' && n.entity_id) {
              openDealDrawer(n.entity_id);
            }
            loadNotifications();
          };

          list.appendChild(item);
        });
      }
    } catch (e) {
      console.warn('Failed to load notifications:', e.message);
    }
  }

  // 3. RFC-4180 CSV Export Downloads
  function setupExports() {
    const bindExport = (btnId, entity, label) => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.onclick = async () => {
          btn.disabled = true;
          const origText = btn.innerHTML;
          btn.innerHTML = `<span class="inline-block animate-spin mr-1">↻</span> Exporting...`;
          try {
            await API.downloadExport(entity);
            showToast(`${label} exported successfully as RFC-4180 CSV!`, 'success');
          } catch (err) {
            showToast(`Export failed: ${err.message}`, 'error');
          } finally {
            btn.disabled = false;
            btn.innerHTML = origText;
          }
        };
      }
    };

    bindExport('btn-export-deals', 'deals', 'Opportunities Pipeline');
    bindExport('btn-export-leads', 'leads', 'Leads Database');
    bindExport('btn-export-commissions', 'commissions', 'Commissions Ledger');
  }

  // 4. Bulk CSV/JSON Lead Ingestion
  function setupBulkImport() {
    const modal = document.getElementById('modal-bulk-import');
    const openBtn = document.getElementById('btn-bulk-import-lead');
    const closeBtn = document.getElementById('close-bulk-import-modal');
    const cancelBtn = document.getElementById('btn-cancel-bulk-import');
    const sampleBtn = document.getElementById('btn-load-sample-csv');
    const submitBtn = document.getElementById('btn-submit-bulk-import');
    const textarea = document.getElementById('bulk-import-textarea');
    const fileInput = document.getElementById('bulk-import-file');

    if (!modal) return;

    const closeModal = () => modal.classList.add('hidden');
    if (openBtn) openBtn.onclick = () => modal.classList.remove('hidden');
    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;

    const sampleCSV = `first_name,last_name,email,company,title,industry,company_size,annual_revenue,lead_source,urgency_level,website_visits,email_opens,content_downloads,decision_maker,budget_confirmed
Marcus,Vance,marcus.vance@solarsystems.io,SolarSystems,VP Operations,Technology,480,45000000,Inbound Demo,Immediate,14,6,3,true,true
Seraphina,Kovacs,s.kovacs@aegisquantum.com,Aegis Quantum,CISO,Cybersecurity,950,85000000,Partner Referral,High,10,5,2,true,true
Darius,Sterling,darius@apexfintech.com,Apex FinTech,Head of Trading,Financial Services,2200,180000000,Inbound Demo,Immediate,20,8,5,true,true
Elena,Rostova,e.rostova@healthvanguard.org,Health Vanguard,VP Digital Health,Healthcare,620,50000000,Webinar,Medium,6,3,1,true,false`;

    if (sampleBtn) {
      sampleBtn.onclick = () => {
        textarea.value = sampleCSV;
      };
    }

    if (fileInput) {
      fileInput.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            textarea.value = event.target.result;
          };
          reader.readAsText(file);
        }
      };
    }

    if (submitBtn) {
      submitBtn.onclick = async () => {
        const rawContent = textarea.value.trim();
        if (!rawContent) {
          showToast('Please paste CSV/JSON or select a file to import.', 'error');
          return;
        }

        let leadsToImport = [];

        if (rawContent.startsWith('[') && rawContent.endsWith(']')) {
          try {
            leadsToImport = JSON.parse(rawContent);
          } catch (e) {
            showToast('Invalid JSON array format: ' + e.message, 'error');
            return;
          }
        } else {
          const lines = rawContent.split(/\r?\n/).filter(line => line.trim().length > 0);
          if (lines.length < 2) {
            showToast('CSV must contain a header line and at least one lead row.', 'error');
            return;
          }

          const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
            const lead = {};
            header.forEach((key, idx) => {
              let val = values[idx];
              if (val === 'true') val = true;
              else if (val === 'false') val = false;
              else if (['company_size', 'annual_revenue', 'website_visits', 'email_opens', 'content_downloads'].includes(key) && val !== undefined) {
                val = Number(val) || 0;
              }
              lead[key] = val;
            });
            leadsToImport.push(lead);
          }
        }

        if (leadsToImport.length === 0) {
          showToast('No valid leads detected in input.', 'error');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="inline-block animate-spin mr-1">↻</span> Ingesting & Scoring...';

        try {
          const res = await API.bulkImportLeads(leadsToImport);
          if (res.success) {
            showToast(`🚀 Ingested ${res.data.imported_count} leads with automated ML scoring & territory routing!`, 'success');
            closeModal();
            textarea.value = '';
            loadLeads();
            loadDashboardMetrics();
          }
        } catch (err) {
          showToast(`Bulk Import failed: ${err.message}`, 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>⚡</span> Ingest & Auto-Route Leads';
        }
      };
    }
  }

  // 5. System Audit Trail Feed
  function setupAuditLogs() {
    const refreshBtn = document.getElementById('btn-refresh-audit');
    if (refreshBtn) {
      refreshBtn.onclick = () => loadAuditLogs();
    }
  }

  async function loadAuditLogs() {
    try {
      const res = await API.getAuditLogs('limit=25');
      if (!res.success) return;

      const tbody = document.getElementById('audit-logs-table-body');
      if (!tbody) return;

      tbody.innerHTML = '';
      if (!res.data || res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-slate-500 text-xs">No audit logs recorded yet.</td></tr>';
        return;
      }

      res.data.forEach(log => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-800 text-xs hover:bg-slate-800/40 transition-colors';

        let actionBadge = 'bg-slate-800 text-slate-300';
        if (log.action.includes('CREATED') || log.action.includes('CONVERTED')) actionBadge = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
        else if (log.action.includes('STAGE_CHANGED')) actionBadge = 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
        else if (log.action.includes('RETRAINED')) actionBadge = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
        else if (log.action.includes('IMPORT') || log.action.includes('EXPORT')) actionBadge = 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30';

        const detailsStr = typeof log.details === 'object' && log.details !== null
          ? JSON.stringify(log.details).replace(/"/g, '')
          : (log.details || '-');

        tr.innerHTML = `
          <td class="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">${new Date(log.created_at).toLocaleString()}</td>
          <td class="py-2.5 px-3 font-semibold text-slate-200">${log.user_email || log.user_name || 'System User'}</td>
          <td class="py-2.5 px-3 font-mono text-[11px] text-slate-400 uppercase">${(log.user_role || 'user').replace(/_/g, ' ')}</td>
          <td class="py-2.5 px-3">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono ${actionBadge}">
              ${log.action}
            </span>
          </td>
          <td class="py-2.5 px-3 font-mono text-[11px] text-slate-300">
            ${log.entity_type} <span class="text-slate-500">#${log.entity_id || ''}</span>
          </td>
          <td class="py-2.5 px-3 text-slate-400 text-[11px] max-w-xs truncate" title="${detailsStr}">
            ${detailsStr}
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (e) {
      console.warn('Failed loading audit logs:', e.message);
    }
  }

  // --- TOAST NOTIFICATIONS ---
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    let bg = 'bg-slate-800 text-slate-100 border-slate-700';
    if (type === 'success') bg = 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40 glow-emerald';
    else if (type === 'error') bg = 'bg-rose-950/90 text-rose-200 border-rose-500/40 glow-rose';

    toast.className = `flex items-center gap-2 px-4 py-3 rounded-xl border text-xs shadow-2xl backdrop-blur-md transition-all duration-300 transform translate-y-2 opacity-0 ${bg}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span class="font-medium">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  return {
    init,
    switchTab,
    openDealDrawer,
    closeDealDrawer,
    loadKanban,
    loadDashboardMetrics,
    loadLeads,
    showToast
  };
})();

// Bootstrap on DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  window.App.init();
});
