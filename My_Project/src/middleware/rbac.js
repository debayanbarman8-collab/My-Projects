const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secure_sales_ops_jwt_secret_key_2026_xyz123';

/**
 * Production-ready JWT Authentication Middleware
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // If running in development without token, use default admin for UI exploration
    if (process.env.NODE_ENV !== 'production') {
      req.user = {
        id: 1,
        name: 'Elena Vance',
        email: 'elena.vance@revpulse.io',
        role: 'sales_ops_admin'
      };
      return next();
    }
    return res.status(401).json({ success: false, message: 'Authentication required. No bearer token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      if (process.env.NODE_ENV !== 'production') {
        req.user = {
          id: 1,
          name: 'Elena Vance',
          email: 'elena.vance@revpulse.io',
          role: 'sales_ops_admin'
        };
        return next();
      }
      return res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
    }
    req.user = decoded;
    next();
  });
}

/**
 * Role-Based Access Control (RBAC) Guard
 * Restricts access to specified roles.
 * Example: authorizeRoles('sales_ops_admin', 'sales_manager')
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized: User not authenticated.' });
    }

    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires one of [${allowedRoles.join(', ')}]. Current role: '${userRole}'.`
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
  requireRole: authorizeRoles
};
