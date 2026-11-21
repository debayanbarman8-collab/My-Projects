require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const { initDB, closePool } = require('./config/db');
const { validateEnv, getCorsOptions, configureApp } = require('./config/prodConfig');
const { startScheduler, stopScheduler } = require('./services/schedulerService');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');

const prodConfig = validateEnv();

const app = express();
const PORT = prodConfig.port || 5000;

// Apply proxy configuration for reverse proxies & load balancers
configureApp(app);

// Security and middleware setup
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://api.dicebear.com"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors(getCorsOptions(prodConfig)));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Basic rate limiting for API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '../public')));

// Mount API routes
app.use('/api', apiRoutes);

// Page routing
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/customer', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/customer.html'));
});

// SPA fallback: any other GET request returns index.html
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, '../public/index.html'));
  }
  next();
});

// Centralized error handler
app.use(errorHandler);

let server = null;

// Start server after DB initialization
async function startServer() {
  await initDB();

  // Start background schedulers (periodic ML retraining and velocity SLA scanner)
  if (process.env.NODE_ENV !== 'test') {
    startScheduler();
  }

  server = app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  🚀 RevPulse - Enterprise Sales Operations SaaS`);
    console.log(`  🌐 Server running at: http://localhost:${PORT}`);
    console.log(`  📊 Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  🔒 Healthcheck: http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
  });

  return server;
}

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
  stopScheduler();

  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP listener closed. Draining connections.');
      try {
        await closePool();
        console.log('[Server] Database pool closed successfully.');
      } catch (err) {
        console.error('[Server Error] Error closing DB pool:', err.message);
      }
      process.exit(0);
    });

    // Force exit if not drained within 10s
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout.');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
module.exports.gracefulShutdown = gracefulShutdown;
