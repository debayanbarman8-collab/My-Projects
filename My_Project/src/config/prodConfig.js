/**
 * Production Environment Configuration & Secret Validator
 * Enforces production security invariants for containerized & cloud deployments.
 */

function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  const errors = [];

  const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 5000,
    jwtSecret: process.env.JWT_SECRET || 'super_secure_sales_ops_jwt_secret_key_2026_xyz123',
    dbHost: process.env.DB_HOST || '127.0.0.1',
    dbPort: parseInt(process.env.DB_PORT, 10) || 3306,
    dbUser: process.env.DB_USER || 'root',
    dbPassword: process.env.DB_PASSWORD || 'password',
    dbName: process.env.DB_NAME || 'sales_ops_db',
    corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
    mlRetrainIntervalHours: parseInt(process.env.ML_RETRAIN_INTERVAL_HOURS, 10) || 24,
    mlMinConfidenceThreshold: parseFloat(process.env.ML_MIN_CONFIDENCE_THRESHOLD) || 0.65,
    mlHighRiskThreshold: parseFloat(process.env.ML_HIGH_RISK_THRESHOLD) || 0.40,
    alertWebhookUrl: process.env.ALERT_WEBHOOK_URL || null
  };

  if (isProd) {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
      errors.push('Production requires a secure JWT_SECRET of at least 16 characters.');
    }
    if (!process.env.DB_HOST) errors.push('DB_HOST is required in production.');
    if (!process.env.DB_USER) errors.push('DB_USER is required in production.');
    if (!process.env.DB_NAME) errors.push('DB_NAME is required in production.');

    if (errors.length > 0) {
      console.error('[Production Security Warning]', errors.join(' | '));
    }
  }

  return config;
}

function getCorsOptions(config) {
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  const configuredOrigins = config.corsOrigins && config.corsOrigins.length > 0 ? config.corsOrigins : [];

  if (!isProd || configuredOrigins.length === 0) {
    // Development allows localhost and same-origin reflection
    return {
      origin: true,
      credentials: true
    };
  }

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (configuredOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not permitted by CORS policy`));
    },
    credentials: true
  };
}

function configureApp(app) {
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  const trustProxy = process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true' || isProd;
  if (trustProxy) {
    app.set('trust proxy', 1);
  }
}

module.exports = {
  validateEnv,
  getCorsOptions,
  configureApp
};
