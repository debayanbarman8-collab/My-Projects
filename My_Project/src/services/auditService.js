const { query } = require('../config/db');

/**
 * Immutable Enterprise Audit Trail Service
 * Records administrative and operational transactions for regulatory and RevOps compliance.
 */
async function logAudit({
  userId = null,
  userEmail = 'system@revpulse.io',
  userRole = 'system',
  action,
  entityType,
  entityId = null,
  details = {},
  ipAddress = '127.0.0.1'
}) {
  try {
    const detailsJson = typeof details === 'object' ? JSON.stringify(details) : String(details || '{}');
    
    await query(
      `INSERT INTO audit_logs (user_id, user_email, user_role, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        userEmail,
        userRole,
        action,
        entityType,
        entityId ? String(entityId) : null,
        detailsJson,
        ipAddress
      ]
    );
  } catch (err) {
    // Non-blocking error handling for audit trail resilience
    console.error('[Audit Service Error] Failed to write audit log:', err.message);
  }
}

async function getAuditLogs({ action, entityType, limit = 50, offset = 0 } = {}) {
  let [logs] = await query('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100');

  if (action) {
    logs = logs.filter(l => l.action.toLowerCase() === action.toLowerCase());
  }
  if (entityType) {
    logs = logs.filter(l => l.entity_type.toLowerCase() === entityType.toLowerCase());
  }

  // Parse details json
  logs = logs.map(l => {
    let parsedDetails = l.details;
    if (typeof parsedDetails === 'string') {
      try {
        parsedDetails = JSON.parse(parsedDetails);
      } catch (e) {
        parsedDetails = { raw: l.details };
      }
    }
    return {
      ...l,
      details: parsedDetails
    };
  });

  const paginated = logs.slice(Number(offset), Number(offset) + Number(limit));

  return {
    total: logs.length,
    count: paginated.length,
    data: paginated
  };
}

module.exports = {
  logAudit,
  getAuditLogs
};
