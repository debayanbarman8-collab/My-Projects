const { query } = require('../config/db');

/**
 * Deal Velocity SLA Scanner & Webhook Dispatcher
 * Flags stagnant pipeline deals and generates in-app notifications & external webhooks.
 */
async function scanVelocitySLAs() {
  const [deals] = await query('SELECT * FROM opportunities WHERE stage_id < 6');
  const [stages] = await query('SELECT * FROM opportunity_stages');

  const stageMap = {};
  stages.forEach(s => {
    stageMap[s.id] = s;
  });

  const alertsCreated = [];

  for (const deal of deals) {
    const stage = stageMap[deal.stage_id];
    if (!stage) continue;

    const days = parseInt(deal.days_in_current_stage, 10) || 1;
    const maxAllowed = parseInt(stage.target_max_days, 10) || 14;

    if (days > maxAllowed) {
      const overdueDays = days - maxAllowed;
      const isCritical = days >= maxAllowed * 1.5;
      const alertType = isCritical ? 'CRITICAL' : 'WARNING';
      const title = `Velocity Bottleneck: ${deal.title}`;
      const message = `Deal has been stalled in "${stage.name}" for ${days} days (Target SLA: ${maxAllowed}d; ${overdueDays}d overdue). ML win probability adjusted.`;

      // Check if duplicate unread notification exists
      const [existing] = await query(
        'SELECT id FROM system_notifications WHERE entity_type = "opportunity" AND entity_id = ? AND is_read = false',
        [deal.id]
      );

      if (!existing || existing.length === 0) {
        const [insertRes] = await query(
          `INSERT INTO system_notifications (title, message, type, entity_type, entity_id, is_read)
           VALUES (?, ?, ?, 'opportunity', ?, false)`,
          [title, message, alertType, deal.id]
        );

        alertsCreated.push({
          id: insertRes.insertId,
          dealId: deal.id,
          title,
          daysInStage: days,
          overdueDays,
          type: alertType
        });

        // Dispatch optional Slack/Teams webhook
        if (process.env.ALERT_WEBHOOK_URL) {
          dispatchWebhook(process.env.ALERT_WEBHOOK_URL, {
            title,
            dealTitle: deal.title,
            amount: deal.amount,
            stage: stage.name,
            daysInStage: days,
            overdueDays,
            severity: alertType
          }).catch(e => console.warn('[Webhook Warning]', e.message));
        }
      }
    }
  }

  return {
    scannedDealsCount: deals.length,
    scanned: deals.length,
    newAlertsCreated: alertsCreated.length,
    created: alertsCreated.length,
    detected: alertsCreated.length,
    alerts: alertsCreated
  };
}

async function dispatchWebhook(url, payload) {
  try {
    const body = JSON.stringify({
      text: `🚨 *RevPulse Velocity Alert*: ${payload.title}`,
      attachments: [
        {
          color: payload.severity === 'CRITICAL' ? '#f43f5e' : '#f59e0b',
          fields: [
            { title: 'Deal', value: payload.dealTitle, short: true },
            { title: 'Amount', value: `$${Number(payload.amount).toLocaleString()}`, short: true },
            { title: 'Stage', value: payload.stage, short: true },
            { title: 'Dwell Time', value: `${payload.daysInStage} days (+${payload.overdueDays}d overdue)`, short: true }
          ]
        }
      ]
    });

    // Use native fetch
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
  } catch (err) {
    console.warn(`[Webhook Dispatch Error] ${err.message}`);
  }
}

async function getNotifications({ unreadOnly = false, limit = 20 } = {}) {
  let [notifications] = await query('SELECT * FROM system_notifications ORDER BY id DESC LIMIT 50');

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (unreadOnly) {
    notifications = notifications.filter(n => !n.is_read);
  }

  return {
    unreadCount,
    unread_count: unreadCount,
    count: notifications.slice(0, Number(limit)).length,
    notifications: notifications.slice(0, Number(limit)),
    data: notifications.slice(0, Number(limit))
  };
}

async function markNotificationAsRead(id) {
  await query('UPDATE system_notifications SET is_read = true WHERE id = ?', [id]);
  return { success: true, id };
}

async function markAllNotificationsAsRead() {
  await query('UPDATE system_notifications SET is_read = true');
  return { success: true };
}

module.exports = {
  scanVelocitySLAs,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
