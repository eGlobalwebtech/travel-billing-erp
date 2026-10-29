import pg from 'pg';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure NUMERIC, DECIMAL, and BIGINT/COUNT are parsed to JS numbers for compatibility
pg.types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));
pg.types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));

const rawDbUrl = (process.env.DATABASE_URL || '').trim();
const hasValidUrl = rawDbUrl.startsWith('postgresql://') || rawDbUrl.startsWith('postgres://');

const poolConfig = hasValidUrl
  ? {
      connectionString: rawDbUrl,
      ssl: rawDbUrl.includes('localhost') || rawDbUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      database: process.env.PGDATABASE || 'travel_billing_erp',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD,
    };

const displayTarget = hasValidUrl
  ? rawDbUrl.replace(/:([^@/]+)@/, ':****@')
  : `${poolConfig.host}:${poolConfig.port}/${poolConfig.database}`;
console.log(`[SERVER] Connecting to PostgreSQL at: ${displayTarget}`);

export const pool = new pg.Pool(poolConfig);

// Convert SQLite '?' parameter placeholders to PostgreSQL '$1, $2, $3...'
export function formatSql(sql) {
  let paramIdx = 1;
  let formatted = sql.replace(/\?/g, () => `$${paramIdx++}`);
  formatted = formatted.replace(/INSERT\s+OR\s+IGNORE\s+INTO\s+([^\s(]+)/gi, 'INSERT INTO $1');
  if (/INSERT\s+OR\s+IGNORE/i.test(sql) && !/ON\s+CONFLICT/i.test(formatted)) {
    formatted += ' ON CONFLICT DO NOTHING';
  }
  return formatted;
}

export const db = {
  pool,
  async query(sql, params = []) {
    const formatted = formatSql(sql);
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    return pool.query(formatted, flatParams);
  },
  async get(sql, ...args) {
    const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    const formatted = formatSql(sql);
    const res = await pool.query(formatted, flatArgs);
    return res.rows[0];
  },
  async all(sql, ...args) {
    const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    const formatted = formatSql(sql);
    const res = await pool.query(formatted, flatArgs);
    return res.rows;
  },
  async run(sql, ...args) {
    const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    const formatted = formatSql(sql);
    const res = await pool.query(formatted, flatArgs);
    return { rowCount: res.rowCount };
  },
  prepare(sql) {
    const formatted = formatSql(sql);
    return {
      async get(...args) {
        const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const res = await pool.query(formatted, flatArgs);
        return res.rows[0];
      },
      async all(...args) {
        const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const res = await pool.query(formatted, flatArgs);
        return res.rows;
      },
      async run(...args) {
        const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const res = await pool.query(formatted, flatArgs);
        return { rowCount: res.rowCount };
      }
    };
  },
  async exec(sql) {
    return pool.query(sql);
  }
};

export async function initDatabase() {
  // Load and apply SQL schema from database/schema.sql
  const schemaPath = path.join(__dirname, '../database/schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await pool.query(schemaSql);
  }

  // Check if data is already populated
  const checkRes = await pool.query('SELECT COUNT(*) as count FROM company_settings');
  const count = parseInt(checkRes.rows[0].count, 10);

  if (count === 0) {
    // If local travel.db exists, migrate all tables from it
    const localDbPath = path.join(__dirname, 'travel.db');
    let migratedFromSqlite = false;

    if (fs.existsSync(localDbPath)) {
      try {
        const { DatabaseSync } = await import('node:sqlite');
        const sqliteDb = new DatabaseSync(localDbPath);

        const tablesToCopy = [
          'company_settings',
          'accounts',
          'suppliers',
          'customers',
          'hotels',
          'packages',
          'bookings',
          'booking_hotels',
          'booking_services',
          'booking_itinerary',
          'invoices',
          'money_in',
          'supplier_bills',
          'money_out',
          'expenses',
          'payment_reminders',
          'audit_logs'
        ];

        for (const tableName of tablesToCopy) {
          try {
            const rows = sqliteDb.prepare(`SELECT * FROM ${tableName}`).all();
            if (rows && rows.length > 0) {
              const cols = Object.keys(rows[0]);
              const colNames = cols.join(', ');
              const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
              const insertQuery = `INSERT INTO ${tableName} (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

              for (const row of rows) {
                const values = cols.map(c => row[c]);
                await pool.query(insertQuery, values);
              }
            }
          } catch (tableErr) {
            console.warn(`Note: Could not copy table ${tableName}:`, tableErr.message);
          }
        }
        migratedFromSqlite = true;
        console.log('[SERVER] Successfully migrated existing data from SQLite into PostgreSQL!');
      } catch (err) {
        console.warn('[SERVER] SQLite migration skipped, seeding defaults:', err.message);
      }
    }

    if (!migratedFromSqlite) {
      await seedDefaults();
    }
  }

  console.log('[SERVER] PostgreSQL Travel ERP Database initialized and ready!');
}

async function seedDefaults() {
  const seedPath = path.join(__dirname, '../database/seed.sql');
  if (fs.existsSync(seedPath)) {
    const seedSql = fs.readFileSync(seedPath, 'utf-8');
    await pool.query(seedSql);
  }
}
