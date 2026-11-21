const { getAuditLogs, logAudit } = require('../services/auditService');
const { generateEntityCSV, processBulkLeadsImport } = require('../services/exportService');
const { globalSearch } = require('../services/searchService');
const {
  scanVelocitySLAs,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} = require('../services/velocityAlertService');

// 1. Audit Logs
async function fetchAuditLogs(req, res, next) {
  try {
    const { action, entity_type, limit, offset } = req.query;
    const result = await getAuditLogs({
      action,
      entityType: entity_type,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// 2. CSV Data Export
async function exportEntityCSV(req, res, next) {
  try {
    const { entity } = req.params;
    const { filename, csv } = await generateEntityCSV(entity);

    // Audit log
    await logAudit({
      userId: req.user ? req.user.id : 1,
      userEmail: req.user ? req.user.email : 'user@revpulse.io',
      userRole: req.user ? req.user.role : 'sales_ops_admin',
      action: 'DATA_EXPORTED',
      entityType: entity,
      entityId: filename,
      details: { format: 'CSV', entity },
      ipAddress: req.ip || '127.0.0.1'
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
}

// 3. Bulk Lead Ingestion
async function bulkImportLeads(req, res, next) {
  try {
    const { leads } = req.body;
    if (!leads || !Array.isArray(leads)) {
      return res.status(400).json({ success: false, message: 'Invalid payload: "leads" array is required.' });
    }

    const summary = await processBulkLeadsImport(leads, req.user || {}, req.ip || '127.0.0.1');
    res.status(200).json({ success: true, message: `Successfully imported ${summary.importedCount} leads.`, data: summary });
  } catch (err) {
    next(err);
  }
}

// 4. Global Command Palette Search
async function executeSearch(req, res, next) {
  try {
    const { q } = req.query;
    const results = await globalSearch(q);
    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}

// 5. Deal Velocity Alerts Scan
async function triggerVelocityScan(req, res, next) {
  try {
    const scanResults = await scanVelocitySLAs();
    res.json({ success: true, message: 'Velocity SLA scan complete.', data: scanResults });
  } catch (err) {
    next(err);
  }
}

// 6. Notifications
async function fetchNotifications(req, res, next) {
  try {
    const { unread_only, limit } = req.query;
    const notifs = await getNotifications({
      unreadOnly: unread_only === 'true' || unread_only === true,
      limit: limit ? parseInt(limit, 10) : 20
    });
    res.json({ success: true, data: notifs });
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const { id } = req.params;
    await markNotificationAsRead(id);
    res.json({ success: true, message: `Notification #${id} marked as read.` });
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    await markAllNotificationsAsRead();
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  fetchAuditLogs,
  exportEntityCSV,
  bulkImportLeads,
  executeSearch,
  triggerVelocityScan,
  fetchNotifications,
  markRead,
  markAllRead
};
