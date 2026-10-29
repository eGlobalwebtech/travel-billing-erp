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

export const pool = new pg.Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'travel_billing_erp',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
});

// Convert SQLite '?' parameter placeholders to PostgreSQL '$1, $2, $3...'
export function formatSql(sql) {
  let paramIdx = 1;
  return sql.replace(/\?/g, () => `$${paramIdx++}`);
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
  await pool.query(`
    -- Company / Agency Settings
    CREATE TABLE IF NOT EXISTS company_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      agency_name TEXT NOT NULL DEFAULT 'Nilkanth Tourism',
      tagline TEXT DEFAULT 'Curating Unforgettable Journeys Across India & Beyond',
      owner_name TEXT DEFAULT 'Ramesh Chandra Verma',
      phone TEXT DEFAULT '+91 98110 24680',
      whatsapp TEXT DEFAULT '+91 98110 24680',
      email TEXT DEFAULT 'contact@namastebharatholidays.com',
      website TEXT DEFAULT 'www.namastebharatholidays.com',
      address TEXT DEFAULT 'Shop 14, Commercial Complex, Connaught Place, New Delhi - 110001',
      gstin TEXT DEFAULT '07AAAAA1234A1Z5',
      pan TEXT DEFAULT 'AAAAA1234A',
      bank_name TEXT DEFAULT 'HDFC Bank Ltd',
      account_name TEXT DEFAULT 'Namaste Bharat Holidays Pvt Ltd',
      account_number TEXT DEFAULT '50200088991122',
      ifsc_code TEXT DEFAULT 'HDFC0000123',
      upi_id TEXT DEFAULT 'namastebharat@hdfcbank',
      default_gst_rate REAL DEFAULT 5.0,
      default_tcs_rate REAL DEFAULT 5.0,
      currency TEXT DEFAULT 'INR',
      currency_symbol TEXT DEFAULT '₹',
      ai_api_key TEXT DEFAULT '',
      ai_provider TEXT DEFAULT 'gemini',
      reminder_whatsapp_template TEXT DEFAULT 'Dear {customer_name}, Greetings from {agency_name}! Friendly reminder that payment of {currency_symbol}{amount} for booking #{booking_id} ({destination}) is due on {due_date}. Kindly transfer via UPI {upi_id} or bank transfer. Contact: {phone}. Thank you!',
      reminder_supplier_template TEXT DEFAULT 'Hello {supplier_name}, payment of {currency_symbol}{amount} for booking #{booking_id} has been scheduled by {agency_name}. Thank you!'
    );

    -- Accounts (Cash, Bank, UPI)
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      account_name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      account_number TEXT,
      bank_name TEXT,
      current_balance REAL NOT NULL DEFAULT 0.0,
      is_default INTEGER DEFAULT 0
    );

    -- Customers
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      city TEXT,
      state TEXT,
      address TEXT,
      gstin TEXT,
      emergency_contact TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Suppliers (Hotels, Transports, DMCs, Flights, Activities)
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      city TEXT,
      state TEXT,
      bank_details TEXT,
      upi_id TEXT,
      gstin TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Hotel Master
    CREATE TABLE IF NOT EXISTS hotels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      destination TEXT NOT NULL,
      star_rating INTEGER DEFAULT 3,
      address TEXT,
      supplier_id TEXT,
      phone TEXT,
      email TEXT,
      room_types TEXT,
      base_rate REAL DEFAULT 0.0,
      meal_plans TEXT,
      payment_terms TEXT,
      cancellation_policy TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
    );

    -- Package Master
    CREATE TABLE IF NOT EXISTS packages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      destination TEXT NOT NULL,
      country TEXT DEFAULT 'India',
      description TEXT,
      duration_days INTEGER NOT NULL DEFAULT 4,
      duration_nights INTEGER NOT NULL DEFAULT 3,
      selling_price REAL NOT NULL DEFAULT 0.0,
      estimated_cost REAL NOT NULL DEFAULT 0.0,
      pricing_basis TEXT DEFAULT 'Per Person (Twin Sharing)',
      inclusions TEXT,
      exclusions TEXT,
      cancellation_terms TEXT,
      day_wise_itinerary TEXT,
      image_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Bookings
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      booking_number TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL,
      package_id TEXT,
      destination TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      duration_nights INTEGER NOT NULL,
      pax_adults INTEGER DEFAULT 2,
      pax_children INTEGER DEFAULT 0,
      pax_infants INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Confirmed',
      selling_price REAL NOT NULL DEFAULT 0.0,
      tax_amount REAL NOT NULL DEFAULT 0.0,
      gross_total REAL NOT NULL DEFAULT 0.0,
      total_supplier_cost REAL NOT NULL DEFAULT 0.0,
      estimated_profit REAL NOT NULL DEFAULT 0.0,
      final_profit REAL DEFAULT 0.0,
      customer_notes TEXT,
      internal_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL
    );

    -- Booking Hotel Stays
    CREATE TABLE IF NOT EXISTS booking_hotels (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      hotel_id TEXT,
      hotel_name TEXT NOT NULL,
      destination TEXT NOT NULL,
      room_type TEXT DEFAULT 'Deluxe Room',
      num_rooms INTEGER DEFAULT 1,
      meal_plan TEXT DEFAULT 'CP (Breakfast)',
      check_in TEXT NOT NULL,
      check_out TEXT NOT NULL,
      nights INTEGER NOT NULL DEFAULT 1,
      rate_per_night REAL NOT NULL DEFAULT 0.0,
      total_cost REAL NOT NULL DEFAULT 0.0,
      supplier_id TEXT,
      supplier_advance_paid REAL DEFAULT 0.0,
      supplier_payment_due_date TEXT,
      notes TEXT,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE SET NULL,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
    );

    -- Booking Services (Cabs, Flights, Activities, Guides, Transfers)
    CREATE TABLE IF NOT EXISTS booking_services (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      service_type TEXT NOT NULL,
      description TEXT NOT NULL,
      supplier_id TEXT,
      cost_price REAL NOT NULL DEFAULT 0.0,
      selling_price REAL NOT NULL DEFAULT 0.0,
      payment_due_date TEXT,
      supplier_advance_paid REAL DEFAULT 0.0,
      notes TEXT,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
    );

    -- Booking Itinerary Days (Snapshot)
    CREATE TABLE IF NOT EXISTS booking_itinerary (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      day_number INTEGER NOT NULL,
      date TEXT,
      title TEXT NOT NULL,
      morning_activity TEXT,
      afternoon_activity TEXT,
      evening_activity TEXT,
      stay_hotel TEXT,
      meals_included TEXT,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    );

    -- Invoices
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      booking_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      invoice_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0.0,
      gst_rate REAL DEFAULT 5.0,
      gst_amount REAL DEFAULT 0.0,
      tcs_rate REAL DEFAULT 0.0,
      tcs_amount REAL DEFAULT 0.0,
      total_amount REAL NOT NULL DEFAULT 0.0,
      paid_amount REAL NOT NULL DEFAULT 0.0,
      balance_amount REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'Unpaid',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    -- Money In (Customer Receipts, Advances, Settlements, Supplier Refunds)
    CREATE TABLE IF NOT EXISTS money_in (
      id TEXT PRIMARY KEY,
      receipt_number TEXT UNIQUE NOT NULL,
      receipt_date TEXT NOT NULL,
      customer_id TEXT,
      supplier_id TEXT,
      booking_id TEXT,
      invoice_id TEXT,
      receipt_type TEXT NOT NULL DEFAULT 'Customer Payment',
      amount REAL NOT NULL,
      payment_mode TEXT NOT NULL DEFAULT 'UPI',
      account_id TEXT NOT NULL,
      reference_no TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    -- Supplier Bills
    CREATE TABLE IF NOT EXISTS supplier_bills (
      id TEXT PRIMARY KEY,
      bill_number TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      booking_id TEXT,
      bill_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Hotel',
      total_amount REAL NOT NULL DEFAULT 0.0,
      paid_amount REAL NOT NULL DEFAULT 0.0,
      balance_due REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'Unpaid',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
    );

    -- Money Out (Supplier Payments, Supplier Advances, Customer Refunds)
    CREATE TABLE IF NOT EXISTS money_out (
      id TEXT PRIMARY KEY,
      payment_number TEXT UNIQUE NOT NULL,
      payment_date TEXT NOT NULL,
      supplier_id TEXT,
      customer_id TEXT,
      booking_id TEXT,
      bill_id TEXT,
      payment_type TEXT NOT NULL DEFAULT 'Supplier Bill Payment',
      amount REAL NOT NULL,
      payment_mode TEXT NOT NULL DEFAULT 'Bank Transfer',
      account_id TEXT NOT NULL,
      reference_no TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
      FOREIGN KEY (bill_id) REFERENCES supplier_bills(id) ON DELETE SET NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    -- Business Operating Expenses
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      expense_number TEXT UNIQUE NOT NULL,
      expense_date TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_mode TEXT NOT NULL DEFAULT 'UPI',
      account_id TEXT NOT NULL,
      vendor_name TEXT,
      reference_no TEXT,
      tax_deductible INTEGER DEFAULT 1,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    -- Payment Reminders
    CREATE TABLE IF NOT EXISTS payment_reminders (
      id TEXT PRIMARY KEY,
      reminder_type TEXT NOT NULL,
      party_type TEXT NOT NULL,
      party_id TEXT NOT NULL,
      party_name TEXT NOT NULL,
      party_phone TEXT NOT NULL,
      party_email TEXT,
      booking_id TEXT,
      booking_number TEXT,
      reference_id TEXT,
      amount_due REAL NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      sent_via TEXT,
      sent_at TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

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
        console.log('[SERVER] Successfully migrated all existing data from SQLite travel.db into PostgreSQL!');
      } catch (err) {
        console.warn('[SERVER] SQLite migration skipped, seeding defaults:', err.message);
      }
    }

    if (!migratedFromSqlite) {
      // Seed default settings and masters if no sqlite db was found
      await seedDefaults();
    }
  }

  console.log('[SERVER] PostgreSQL Travel ERP Database initialized and ready!');
}

async function seedDefaults() {
  await pool.query(`
    INSERT INTO company_settings (id, agency_name, tagline, owner_name, phone, whatsapp, email, website, address, gstin, pan, bank_name, account_name, account_number, ifsc_code, upi_id)
    VALUES (1, 'Nilkanth Tourism', 'Discover India & Beyond — Premium Tour Packages', 'Nilkanth Tourism', '+91 75750 99090', '+91 75750 99090', 'info@nilkanthtourism.com', 'www.nilkanthtourism.com', 'Gujarat, India', '07AAAAA1234A1Z5', 'AAAAA1234A', 'HDFC Bank Ltd', 'Nilkanth Tourism', '50200088991122', 'HDFC0000123', 'nilkanthtourism@hdfcbank')
    ON CONFLICT (id) DO NOTHING;
  `);

  await pool.query(`
    INSERT INTO accounts (id, account_name, account_type, account_number, bank_name, current_balance, is_default) VALUES
    ('ACC-01', 'Cash in Hand (Office Safe)', 'Cash', '', 'Cash', 28500.0, 0),
    ('ACC-02', 'HDFC Bank Current A/c', 'Bank', '50200088991122', 'HDFC Bank Ltd', 342500.0, 1),
    ('ACC-03', 'State Bank of India Current', 'Bank', '389922110044', 'SBI Connaught Place', 187200.0, 0),
    ('ACC-04', 'UPI Business QR (HDFC)', 'UPI', 'namastebharat@hdfcbank', 'HDFC Bank Ltd', 45000.0, 0)
    ON CONFLICT (id) DO NOTHING;
  `);

  await pool.query(`
    INSERT INTO suppliers (id, name, category, contact_person, phone, email, city, state, bank_details, upi_id, gstin) VALUES
    ('SUP-101', 'Taj Lake Palace & Resorts', 'Hotel', 'Sanjay Rathore', '+91 98290 12345', 'reservations.udaipur@tajhotels.com', 'Udaipur', 'Rajasthan', 'ICICI Bank 001205001122', 'tajudaipur@icici', '08AAACT1234F1Z8'),
    ('SUP-102', 'Snow Valley Resorts & Spa', 'Hotel', 'Vikram Negi', '+91 94180 54321', 'manali@snowvalleyresorts.com', 'Manali', 'Himachal Pradesh', 'HDFC Bank 502000112233', 'snowvalley@hdfcbank', '02AAACS5432B1Z4'),
    ('SUP-103', 'Spice Village Eco Resort', 'Hotel', 'Mathew George', '+91 94470 67890', 'spicevillage@cghearth.com', 'Thekkady', 'Kerala', 'Federal Bank 100201004567', 'spicevillage@federal', '32AAACG9876C1Z2'),
    ('SUP-104', 'Lemon Tree Premier Delhi Airport', 'Hotel', 'Pooja Chawla', '+91 98100 87654', 'delhi@lemontreehotels.com', 'New Delhi', 'Delhi', 'Axis Bank 912020012345', 'lemontree@axisbank', '07AAACL3456D1Z1'),
    ('SUP-105', 'Royal Rajasthan Tourist Cabs', 'Cab/Transport', 'Bhairon Singh', '+91 98291 99887', 'royalrajasthancabs@gmail.com', 'Jaipur', 'Rajasthan', 'SBI 312233445566', 'bhairon.cabs@sbi', '08ABCDE1122K1Z9'),
    ('SUP-106', 'Kashmir Paradise Holidays DMC', 'DMC', 'Farooq Ahmed', '+91 94190 22334', 'info@kashmirparadisedmc.com', 'Srinagar', 'Jammu & Kashmir', 'J&K Bank 002101007788', 'farooq.kashmir@jkb', '01AABCK9988M1Z3'),
    ('SUP-107', 'Kerala Backwater Voyages & Houseboats', 'Cab/Transport', 'Unnikrishnan Nair', '+91 98460 33445', 'alleppeyhouseboats@yahoo.com', 'Alleppey', 'Kerala', 'Canara Bank 123410105678', 'unni.voyages@cnrb', '32AABBK7766P1Z5')
    ON CONFLICT (id) DO NOTHING;
  `);

  await pool.query(`
    INSERT INTO customers (id, name, phone, email, city, state, address, gstin, emergency_contact, notes) VALUES
    ('CUST-101', 'Rajesh Sharma', '+91 98112 34567', 'rajesh.sharma@tcs.com', 'Gurugram', 'Haryana', 'Flat 402, DLF Phase 5, Gurugram', '', '+91 98112 34568 (Wife - Sunita)', 'Prefers vegetarian Jain meals, upper floor rooms'),
    ('CUST-102', 'Priya Kapoor Patel', '+91 98200 45678', 'priya.patel@ril.com', 'Mumbai', 'Maharashtra', '12B, Sea Green Apts, Worli, Mumbai', '', '+91 98200 45679 (Husband - Anish)', 'Honeymoon couple, anniversary on day 3'),
    ('CUST-103', 'Vikram Malhotra', '+91 99400 56789', 'vikram@malhotratech.com', 'Bengaluru', 'Karnataka', '74 Indira Nagar 100ft Road, Bengaluru', '29AAACM8877L1Z0', '+91 99400 56790', 'Corporate B2B client, requires GST invoice'),
    ('CUST-104', 'Dr. Arvind Swaminathan', '+91 94440 67891', 'arvind.swami@apollo.org', 'Chennai', 'Tamil Nadu', 'Plot 5, Besant Nagar, Chennai', '', '+91 94440 67892', 'Senior citizens travelling, requires ground floor and wheelchair assistance'),
    ('CUST-105', 'Meenakshi Sundaram', '+91 97110 78912', 'meenakshi@gmail.com', 'Noida', 'Uttar Pradesh', 'Sector 62, Express Zenith, Noida', '', '+91 97110 78913', 'Family trip with 2 kids')
    ON CONFLICT (id) DO NOTHING;
  `);
}
