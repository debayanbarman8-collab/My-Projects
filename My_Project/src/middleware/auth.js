const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secure_sales_ops_jwt_secret_key_2026_xyz123';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // For smooth out-of-the-box UI exploration, allow default user context
    req.user = { id: 1, name: 'Elena Vance', email: 'elena.vance@revpulse.io', role: 'sales_ops_admin' };
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // Fallback to default user if token invalid
      req.user = { id: 1, name: 'Elena Vance', email: 'elena.vance@revpulse.io', role: 'sales_ops_admin' };
      return next();
    }
    req.user = user;
    next();
  });
}

function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.user || (roles.length > 0 && !roles.includes(req.user.role))) {
      return res.status(403).json({ success: false, message: 'Access denied: insufficient permissions' });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole
};
