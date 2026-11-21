/**
 * Interactive Drag-and-Drop Pipeline Kanban Board
 */
const KanbanBoard = (() => {
  let draggedDealId = null;

  function render(stagesData, containerElement) {
    if (!containerElement) return;

    containerElement.innerHTML = '';

    const boardWrapper = document.createElement('div');
    boardWrapper.className = 'flex gap-5 overflow-x-auto pb-6 pt-1 select-none min-h-[640px]';

    stagesData.forEach(stage => {
      const col = document.createElement('div');
      col.className = 'kanban-col flex flex-col bg-slate-900/80 rounded-xl border border-slate-800/80 p-3 shadow-xl backdrop-blur-md';
      col.dataset.stageId = stage.id;

      // Stage Header
      const header = document.createElement('div');
      header.className = 'mb-3 pb-3 border-b border-slate-800 flex flex-col gap-1';
      
      let badgeColor = 'bg-slate-700/60 text-slate-300';
      if (stage.id === 6) badgeColor = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      else if (stage.id === 7) badgeColor = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      else if (stage.id >= 4) badgeColor = 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';

      header.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold px-2 py-0.5 rounded ${badgeColor}">
            ${stage.name}
          </span>
          <span class="text-xs font-mono font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
            ${stage.deals_count}
          </span>
        </div>
        <div class="flex justify-between items-center text-xs mt-1 text-slate-400">
          <span class="font-mono text-slate-200 font-semibold">$${(stage.total_value || 0).toLocaleString()}</span>
          <span class="text-[11px] text-slate-400">ML Exp: <strong class="text-emerald-400 font-mono">$${(stage.weighted_value || 0).toLocaleString()}</strong></span>
        </div>
      `;

      // Cards dropzone
      const dropzone = document.createElement('div');
      dropzone.className = 'kanban-dropzone flex-1 flex flex-col gap-3 min-h-[220px] p-1 rounded-lg transition-all';
      dropzone.dataset.stageId = stage.id;

      // Bind dragover / drop
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
      });

      dropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (!draggedDealId) return;

        const targetStageId = Number(stage.id);
        await handleStageDrop(draggedDealId, targetStageId);
        draggedDealId = null;
      });

      // Render cards
      (stage.deals || []).forEach(deal => {
        const card = createDealCard(deal, stage);
        dropzone.appendChild(card);
      });

      col.appendChild(header);
      col.appendChild(dropzone);
      boardWrapper.appendChild(col);
    });

    containerElement.appendChild(boardWrapper);
  }

  function createDealCard(deal, stage) {
    const card = document.createElement('div');
    card.className = 'deal-card glass-card rounded-lg p-3.5 cursor-grab active:cursor-grabbing hover:translate-y-[-2px] transition-all flex flex-col gap-2 relative';
    card.draggable = true;
    card.dataset.dealId = deal.id;

    const prob = Number(deal.ml_win_probability || 0);
    let probBadge = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (prob < 40) probBadge = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    else if (prob < 70) probBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/30';

    const daysInStage = Number(deal.days_in_current_stage || 1);
    const targetDays = stage.target_max_days || 14;
    const isOverdue = daysInStage > targetDays && stage.id < 6;

    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <h4 class="text-xs font-semibold text-slate-100 hover:text-indigo-400 line-clamp-2 cursor-pointer deal-title-btn" data-deal-id="${deal.id}">
          ${deal.title}
        </h4>
        <span class="text-[11px] font-mono px-1.5 py-0.5 rounded border ${probBadge} shrink-0">
          ${prob}% Win
        </span>
      </div>

      <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-700/60">
        <span class="font-mono font-bold text-slate-100 text-sm">
          $${Number(deal.amount || 0).toLocaleString()}
        </span>
        <span class="text-[11px] ${isOverdue ? 'text-rose-400 font-semibold' : 'text-slate-400'} flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          ${daysInStage}d ${isOverdue ? '⚠️ Overdue' : ''}
        </span>
      </div>

      <div class="flex items-center justify-between text-[11px] text-slate-400 mt-1">
        <span class="truncate max-w-[170px] text-slate-300 font-medium">${deal.account_name || 'Account'}</span>
        <button class="text-indigo-400 hover:text-indigo-300 font-medium view-deal-btn" data-deal-id="${deal.id}">
          Inspect &rarr;
        </button>
      </div>
    `;

    // Drag handlers
    card.addEventListener('dragstart', (e) => {
      draggedDealId = deal.id;
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', deal.id);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedDealId = null;
    });

    // Inspect buttons
    card.querySelector('.deal-title-btn').addEventListener('click', () => {
      window.App.openDealDrawer(deal.id);
    });
    card.querySelector('.view-deal-btn').addEventListener('click', () => {
      window.App.openDealDrawer(deal.id);
    });

    return card;
  }

  async function handleStageDrop(dealId, newStageId) {
    try {
      window.App.showToast('Recalculating ML Win Probability & Updating Pipeline...', 'info');
      const response = await API.updateDealStage(dealId, newStageId);
      
      if (response.success) {
        if (newStageId === 6) {
          window.App.showToast(`🎉 Deal Won! Stage updated. Automated commission engine processed.`, 'success');
        } else {
          window.App.showToast(`Stage updated to ${response.data.newStageName}. ML Win Prob: ${response.data.ml_win_probability}% (${response.data.ml_risk_level})`, 'success');
        }
        // Refresh kanban board
        window.App.loadKanban();
        // Refresh dashboard metrics
        window.App.loadDashboardMetrics();
      }
    } catch (err) {
      window.App.showToast(`Failed to update stage: ${err.message}`, 'error');
    }
  }

  return {
    render
  };
})();
