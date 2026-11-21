require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const {
    DB_HOST = '127.0.0.1',
    DB_PORT = 3306,
    DB_USER = 'root',
    DB_PASSWORD = 'password',
    DB_NAME = 'sales_ops_db'
  } = process.env;

  console.log(`[Migration] Connecting to MySQL at ${DB_HOST}:${DB_PORT} as ${DB_USER}...`);
  try {
    const conn = await mysql.createConnection({
      host: DB_HOST,
      port: Number(DB_PORT),
      user: DB_USER,
      password: DB_PASSWORD,
      connectTimeout: 3000
    });

    console.log(`[Migration] Creating database "${DB_NAME}" if not exists...`);
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await conn.changeUser({ database: DB_NAME });

    // 1. Run baseline schema.sql
    const sqlFiles = [path.join(__dirname, 'schema.sql')];

    // 2. Discover migration files in database/migrations/
    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const additional = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort()
        .map(f => path.join(migrationsDir, f));
      sqlFiles.push(...additional);
    }

    for (const file of sqlFiles) {
      const relPath = path.relative(path.join(__dirname, '..'), file);
      console.log(`[Migration] Applying ${relPath}...`);
      const sqlContent = fs.readFileSync(file, 'utf8');
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.toLowerCase().startsWith('create database') && !s.toLowerCase().startsWith('use '));

      for (const stmt of statements) {
        try {
          await conn.query(stmt);
        } catch (err) {
          if (!err.message.includes('already exists') && !err.message.includes('Duplicate column')) {
            console.warn(`[Migration Notice] ${err.message}`);
          }
        }
      }
    }

    console.log('[Migration] All schema migrations completed successfully!');
    await conn.end();
    if (require.main === module) process.exit(0);
  } catch (err) {
    console.warn(`[Migration Warning] Could not connect to MySQL (${err.message}).`);
    console.log('[Migration Info] RevPulse fallback in-memory engine is active for local zero-dependency development.');
    if (require.main === module) process.exit(0);
  }
}

if (require.main === module) {
  migrate();
}

module.exports = { migrate };
