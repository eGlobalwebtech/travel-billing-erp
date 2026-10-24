import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'travel.db');

export const db = new DatabaseSync(DB_PATH);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export function initDatabase() {
  db.exec(`
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
      account_type TEXT NOT NULL, -- 'Bank', 'Cash', 'UPI'
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Suppliers (Hotels, Transports, DMCs, Flights, Activities)
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL, -- 'Hotel', 'Cab/Transport', 'DMC', 'Airline', 'Guide/Activity'
      contact_person TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      city TEXT,
      state TEXT,
      bank_details TEXT,
      upi_id TEXT,
      gstin TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
      room_types TEXT, -- JSON array of room types e.g. ["Deluxe Room", "Super Deluxe", "Suite"]
      base_rate REAL DEFAULT 0.0,
      meal_plans TEXT, -- JSON array e.g. ["EP", "CP", "MAP", "AP"]
      payment_terms TEXT,
      cancellation_policy TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
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
      inclusions TEXT, -- JSON or bullet text
      exclusions TEXT, -- JSON or bullet text
      cancellation_terms TEXT,
      day_wise_itinerary TEXT, -- JSON array of {day, title, description, hotel, meals}
      image_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
      status TEXT NOT NULL DEFAULT 'Confirmed', -- 'Enquiry', 'Quoted', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'
      selling_price REAL NOT NULL DEFAULT 0.0,
      tax_amount REAL NOT NULL DEFAULT 0.0,
      gross_total REAL NOT NULL DEFAULT 0.0,
      total_supplier_cost REAL NOT NULL DEFAULT 0.0,
      estimated_profit REAL NOT NULL DEFAULT 0.0,
      final_profit REAL DEFAULT 0.0,
      customer_notes TEXT,
      internal_notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
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
      service_type TEXT NOT NULL, -- 'Transport/Cab', 'Flight', 'Activity/Sightseeing', 'Guide', 'Insurance', 'Visa'
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
      status TEXT NOT NULL DEFAULT 'Unpaid', -- 'Unpaid', 'Partial', 'Paid', 'Cancelled'
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    -- Money In (Customer Receipts, Advances, Settlements, Supplier Refunds)
    CREATE TABLE IF NOT EXISTS money_in (
      id TEXT PRIMARY KEY,
      receipt_number TEXT UNIQUE NOT NULL,
      receipt_date TEXT NOT NULL,
      customer_id TEXT,
      supplier_id TEXT, -- For supplier refunds
      booking_id TEXT,
      invoice_id TEXT,
      receipt_type TEXT NOT NULL DEFAULT 'Customer Payment', -- 'Customer Payment', 'Customer Advance', 'Supplier Refund', 'Other Income'
      amount REAL NOT NULL,
      payment_mode TEXT NOT NULL DEFAULT 'UPI', -- 'UPI', 'Bank Transfer', 'Cash', 'Cheque', 'Card'
      account_id TEXT NOT NULL,
      reference_no TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
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
      status TEXT NOT NULL DEFAULT 'Unpaid', -- 'Unpaid', 'Partial', 'Paid'
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
    );

    -- Money Out (Supplier Payments, Supplier Advances, Customer Refunds)
    CREATE TABLE IF NOT EXISTS money_out (
      id TEXT PRIMARY KEY,
      payment_number TEXT UNIQUE NOT NULL,
      payment_date TEXT NOT NULL,
      supplier_id TEXT,
      customer_id TEXT, -- For customer refunds
      booking_id TEXT,
      bill_id TEXT,
      payment_type TEXT NOT NULL DEFAULT 'Supplier Bill Payment', -- 'Supplier Bill Payment', 'Supplier Advance', 'Customer Refund'
      amount REAL NOT NULL,
      payment_mode TEXT NOT NULL DEFAULT 'Bank Transfer', -- 'UPI', 'Bank Transfer', 'Cash', 'Cheque', 'Card'
      account_id TEXT NOT NULL,
      reference_no TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
      FOREIGN KEY (bill_id) REFERENCES supplier_bills(id) ON DELETE SET NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    -- Business Operating Expenses (Rent, Salary, Marketing, Phone, Fuel, etc.)
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      expense_number TEXT UNIQUE NOT NULL,
      expense_date TEXT NOT NULL,
      category TEXT NOT NULL, -- 'Office Rent', 'Staff Salaries', 'Marketing & Ads', 'Internet & Phone', 'Fuel & Travel', 'Software & Tech', 'Bank Charges', 'Office Tea & Misc'
      amount REAL NOT NULL,
      payment_mode TEXT NOT NULL DEFAULT 'UPI',
      account_id TEXT NOT NULL,
      vendor_name TEXT,
      reference_no TEXT,
      tax_deductible INTEGER DEFAULT 1,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    -- Payment Reminders
    CREATE TABLE IF NOT EXISTS payment_reminders (
      id TEXT PRIMARY KEY,
      reminder_type TEXT NOT NULL, -- 'Customer Payment', 'Supplier Payment'
      party_type TEXT NOT NULL, -- 'Customer', 'Supplier'
      party_id TEXT NOT NULL,
      party_name TEXT NOT NULL,
      party_phone TEXT NOT NULL,
      party_email TEXT,
      booking_id TEXT,
      booking_number TEXT,
      reference_id TEXT, -- invoice_id or bill_id
      amount_due REAL NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Sent', 'Settled'
      sent_via TEXT, -- 'WhatsApp', 'Email', 'In-App'
      sent_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default company settings if not present
  const companyCount = db.prepare('SELECT COUNT(*) as count FROM company_settings').get();
  if (companyCount.count === 0) {
    db.prepare(`
      INSERT INTO company_settings (id, agency_name, tagline, owner_name, phone, whatsapp, email, website, address, gstin, pan, bank_name, account_name, account_number, ifsc_code, upi_id)
      VALUES (1, 'Nilkanth Tourism', 'Discover India & Beyond — Premium Tour Packages', 'Nilkanth Tourism', '+91 75750 99090', '+91 75750 99090', 'info@nilkanthtourism.com', 'www.nilkanthtourism.com', 'Gujarat, India', '07AAAAA1234A1Z5', 'AAAAA1234A', 'HDFC Bank Ltd', 'Nilkanth Tourism', '50200088991122', 'HDFC0000123', 'nilkanthtourism@hdfcbank')
    `).run();
  }

  // Seed default bank/cash accounts if not present
  const accountCount = db.prepare('SELECT COUNT(*) as count FROM accounts').get();
  if (accountCount.count === 0) {
    const insertAcc = db.prepare('INSERT INTO accounts (id, account_name, account_type, account_number, bank_name, current_balance, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)');
    insertAcc.run('ACC-01', 'Cash in Hand (Office Safe)', 'Cash', '', 'Cash', 28500.0, 0);
    insertAcc.run('ACC-02', 'HDFC Bank Current A/c', 'Bank', '50200088991122', 'HDFC Bank Ltd', 342500.0, 1);
    insertAcc.run('ACC-03', 'State Bank of India Current', 'Bank', '389922110044', 'SBI Connaught Place', 187200.0, 0);
    insertAcc.run('ACC-04', 'UPI Business QR (HDFC)', 'UPI', 'namastebharat@hdfcbank', 'HDFC Bank Ltd', 45000.0, 0);
  }

  // Seed default suppliers
  const supplierCount = db.prepare('SELECT COUNT(*) as count FROM suppliers').get();
  if (supplierCount.count === 0) {
    const insertSup = db.prepare('INSERT INTO suppliers (id, name, category, contact_person, phone, email, city, state, bank_details, upi_id, gstin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    insertSup.run('SUP-101', 'Taj Lake Palace & Resorts', 'Hotel', 'Sanjay Rathore', '+91 98290 12345', 'reservations.udaipur@tajhotels.com', 'Udaipur', 'Rajasthan', 'ICICI Bank 001205001122', 'tajudaipur@icici', '08AAACT1234F1Z8');
    insertSup.run('SUP-102', 'Snow Valley Resorts & Spa', 'Hotel', 'Vikram Negi', '+91 94180 54321', 'manali@snowvalleyresorts.com', 'Manali', 'Himachal Pradesh', 'HDFC Bank 502000112233', 'snowvalley@hdfcbank', '02AAACS5432B1Z4');
    insertSup.run('SUP-103', 'Spice Village Eco Resort', 'Hotel', 'Mathew George', '+91 94470 67890', 'spicevillage@cghearth.com', 'Thekkady', 'Kerala', 'Federal Bank 100201004567', 'spicevillage@federal', '32AAACG9876C1Z2');
    insertSup.run('SUP-104', 'Lemon Tree Premier Delhi Airport', 'Hotel', 'Pooja Chawla', '+91 98100 87654', 'delhi@lemontreehotels.com', 'New Delhi', 'Delhi', 'Axis Bank 912020012345', 'lemontree@axisbank', '07AAACL3456D1Z1');
    insertSup.run('SUP-105', 'Royal Rajasthan Tourist Cabs', 'Cab/Transport', 'Bhairon Singh', '+91 98291 99887', 'royalrajasthancabs@gmail.com', 'Jaipur', 'Rajasthan', 'SBI 312233445566', 'bhairon.cabs@sbi', '08ABCDE1122K1Z9');
    insertSup.run('SUP-106', 'Kashmir Paradise Holidays DMC', 'DMC', 'Farooq Ahmed', '+91 94190 22334', 'info@kashmirparadisedmc.com', 'Srinagar', 'Jammu & Kashmir', 'J&K Bank 002101007788', 'farooq.kashmir@jkb', '01AABCK9988M1Z3');
    insertSup.run('SUP-107', 'Kerala Backwater Voyages & Houseboats', 'Cab/Transport', 'Unnikrishnan Nair', '+91 98460 33445', 'alleppeyhouseboats@yahoo.com', 'Alleppey', 'Kerala', 'Canara Bank 123410105678', 'unni.voyages@cnrb', '32AABBK7766P1Z5');
  }

  // Seed default hotels
  const hotelCount = db.prepare('SELECT COUNT(*) as count FROM hotels').get();
  if (hotelCount.count === 0) {
    const insertHtl = db.prepare('INSERT INTO hotels (id, name, destination, star_rating, address, supplier_id, phone, email, room_types, base_rate, meal_plans, payment_terms, cancellation_policy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    insertHtl.run('HTL-01', 'Taj Lake Palace', 'Udaipur', 5, 'Pichola Lake, Udaipur, Rajasthan 313001', 'SUP-101', '+91 98290 12345', 'reservations.udaipur@tajhotels.com', JSON.stringify(['Luxury Lake View Room', 'Palace Room', 'Grand Royal Suite']), 28500.0, JSON.stringify(['CP', 'MAP', 'AP']), '50% advance on confirmation, balance 7 days prior to check-in', 'Full refund if cancelled 15 days prior; 50% retention within 7-14 days');
    insertHtl.run('HTL-02', 'Snow Valley Resorts', 'Manali', 4, 'Log Huts Area, Manali, HP 175131', 'SUP-102', '+91 94180 54321', 'manali@snowvalleyresorts.com', JSON.stringify(['Standard Room', 'Luxury Room', 'Duplex Family Suite']), 4200.0, JSON.stringify(['EP', 'CP', 'MAP']), '100% payment before arrival', 'Non-refundable if cancelled within 72 hours');
    insertHtl.run('HTL-03', 'Spice Village Eco Resort', 'Thekkady', 5, 'Kumily, Thekkady, Kerala 685509', 'SUP-103', '+91 94470 67890', 'spicevillage@cghearth.com', JSON.stringify(['Standard Villa', 'Deluxe Cottage']), 8500.0, JSON.stringify(['CP', 'MAP']), '50% advance, balance on check-in', 'Refundable up to 7 days before check-in');
    insertHtl.run('HTL-04', 'Lemon Tree Premier', 'New Delhi', 4, 'Asset No 6, Aerocity, New Delhi 110037', 'SUP-104', '+91 98100 87654', 'delhi@lemontreehotels.com', JSON.stringify(['Superior Room', 'Deluxe Room', 'Executive Suite']), 6500.0, JSON.stringify(['CP', 'MAP']), 'Full advance or corporate credit 15 days', 'Free cancellation up to 24 hours prior');
    insertHtl.run('HTL-05', 'The Lalit Grand Palace', 'Srinagar', 5, 'Gupkar Road, Srinagar, J&K 190001', 'SUP-106', '+91 94190 22334', 'srinagar@thelalit.com', JSON.stringify(['Deluxe Palace Room', 'Valley View Suite']), 14500.0, JSON.stringify(['CP', 'MAP', 'AP']), '100% advance 10 days before arrival', 'Retention applies if cancelled within 10 days');
    insertHtl.run('HTL-06', 'Whispering Palms Beach Resort', 'Goa', 4, 'Candolim Beach, North Goa 403515', 'SUP-104', '+91 98221 44556', 'goa@whisperingpalms.com', JSON.stringify(['Standard Balcony Room', 'Pool Facing Deluxe']), 5800.0, JSON.stringify(['CP', 'MAP', 'All Inclusive']), '50% advance, balance at check-in', '1 night retention for cancellation within 7 days');
  }

  // Seed default customers
  const custCount = db.prepare('SELECT COUNT(*) as count FROM customers').get();
  if (custCount.count === 0) {
    const insertCust = db.prepare('INSERT INTO customers (id, name, phone, email, city, state, address, gstin, emergency_contact, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    insertCust.run('CUST-101', 'Rajesh Sharma', '+91 98112 34567', 'rajesh.sharma@tcs.com', 'Gurugram', 'Haryana', 'Flat 402, DLF Phase 5, Gurugram', '', '+91 98112 34568 (Wife - Sunita)', 'Prefers vegetarian Jain meals, upper floor rooms');
    insertCust.run('CUST-102', 'Priya Kapoor Patel', '+91 98200 45678', 'priya.patel@ril.com', 'Mumbai', 'Maharashtra', '12B, Sea Green Apts, Worli, Mumbai', '', '+91 98200 45679 (Husband - Anish)', 'Honeymoon couple, anniversary on day 3');
    insertCust.run('CUST-103', 'Vikram Malhotra', '+91 99400 56789', 'vikram@malhotratech.com', 'Bengaluru', 'Karnataka', '74 Indira Nagar 100ft Road, Bengaluru', '29AAACM8877L1Z0', '+91 99400 56790', 'Corporate B2B client, requires GST invoice');
    insertCust.run('CUST-104', 'Dr. Arvind Swaminathan', '+91 94440 67891', 'arvind.swami@apollo.org', 'Chennai', 'Tamil Nadu', 'Plot 5, Besant Nagar, Chennai', '', '+91 94440 67892', 'Senior citizens travelling, requires ground floor and wheelchair assistance');
    insertCust.run('CUST-105', 'Meenakshi Sundaram', '+91 97110 78912', 'meenakshi@gmail.com', 'Noida', 'Uttar Pradesh', 'Sector 62, Express Zenith, Noida', '', '+91 97110 78913', 'Family trip with 2 kids');
  }

  // Seed default packages
  const pkgCount = db.prepare('SELECT COUNT(*) as count FROM packages').get();
  if (pkgCount.count === 0) {
    const insertPkg = db.prepare('INSERT INTO packages (id, name, destination, country, description, duration_days, duration_nights, selling_price, estimated_cost, pricing_basis, inclusions, exclusions, cancellation_terms, day_wise_itinerary, image_url, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

    const goldenTriangleItinerary = [
      {
        day: 1,
        title: 'Arrival in Delhi & Heritage City Tour',
        morning_activity: 'Airport pickup in private AC Sedan, hotel check-in at Lemon Tree Aerocity.',
        afternoon_activity: 'Guided tour of Qutub Minar, Humayun’s Tomb and India Gate drive-past.',
        evening_activity: 'Explore Connaught Place & dinner at Connaught Clubhouse.',
        stay_hotel: 'Lemon Tree Premier Aerocity',
        meals_included: 'Dinner'
      },
      {
        day: 2,
        title: 'Delhi to Agra via Yamuna Expressway & Taj Mahal at Sunset',
        morning_activity: 'Breakfast at hotel, scenic drive to Agra (approx 3.5 hrs).',
        afternoon_activity: 'Check-in at Agra hotel, visit historical Agra Fort.',
        evening_activity: 'Breathtaking Sunset view of Taj Mahal with licensed guide.',
        stay_hotel: 'Courtyard by Marriott Agra',
        meals_included: 'Breakfast, Dinner'
      },
      {
        day: 3,
        title: 'Agra to Jaipur via Fatehpur Sikri & Chand Baori',
        morning_activity: 'Early morning sunrise glimpse of Taj Mahal, breakfast and checkout.',
        afternoon_activity: 'Enroute visit to ghost city Fatehpur Sikri and Abhaneri Stepwell.',
        evening_activity: 'Arrive in the Pink City Jaipur, traditional Rajasthani dinner at Chokhi Dhani.',
        stay_hotel: 'ITC Rajputana Jaipur',
        meals_included: 'Breakfast, Dinner'
      },
      {
        day: 4,
        title: 'Jaipur Forts, Palaces & Pink City Bazaars',
        morning_activity: 'Visit Amer Fort with elephant/jeep ride, photo stop at Jal Mahal.',
        afternoon_activity: 'Visit City Palace, Jantar Mantar and iconic Hawa Mahal.',
        evening_activity: 'Free time for handicraft and gemstone shopping in Johari Bazaar.',
        stay_hotel: 'ITC Rajputana Jaipur',
        meals_included: 'Breakfast, Dinner'
      },
      {
        day: 5,
        title: 'Jaipur to Delhi Departure',
        morning_activity: 'Leisurely breakfast, check-out from hotel.',
        afternoon_activity: 'Comfortable transfer back to New Delhi Airport (approx 4.5 hrs).',
        evening_activity: 'Drop-off at IGI Airport for your return flight home with sweet memories.',
        stay_hotel: 'None (Departure)',
        meals_included: 'Breakfast'
      }
    ];

    const kashmirItinerary = [
      {
        day: 1,
        title: 'Arrival in Srinagar & Dal Lake Shikara Ride',
        morning_activity: 'Airport pickup, transfer to luxury wooden Houseboat on Dal Lake.',
        afternoon_activity: 'Check-in, traditional welcome Kahwa tea, relax.',
        evening_activity: '1-Hour sunset Shikara ride across Floating Gardens and Char Chinar.',
        stay_hotel: 'Mascot Luxury Houseboats Dal Lake',
        meals_included: 'Dinner'
      },
      {
        day: 2,
        title: 'Srinagar to Gulmarg Meadow of Flowers & Gondola Ride',
        morning_activity: 'Scenic drive to Gulmarg (54 km / 2 hrs) through pine forests.',
        afternoon_activity: 'Board famous Gulmarg Gondola Cable Car to Phase 1 (Kongdoori) & Phase 2 (Apharwat Peak).',
        evening_activity: 'Snow activities, warm Kashmiri dinner at hotel.',
        stay_hotel: 'The Khyber Himalayan Resort / Pine Spring',
        meals_included: 'Breakfast, Dinner'
      },
      {
        day: 3,
        title: 'Gulmarg to Pahalgam Valley of Shepherds',
        morning_activity: 'Drive to Pahalgam via Pampore Saffron fields and Avantipura ruins.',
        afternoon_activity: 'Visit Betaab Valley, Chandanwari and Aru Valley in local union cab.',
        evening_activity: 'River rafting on Lidder River or riverside stroll.',
        stay_hotel: 'Pine N Peak Hotel Pahalgam',
        meals_included: 'Breakfast, Dinner'
      },
      {
        day: 4,
        title: 'Pahalgam to Srinagar & Mughal Gardens',
        morning_activity: 'Morning leisure in Pahalgam, transfer back to Srinagar city hotel.',
        afternoon_activity: 'Sightseeing of Nishat Bagh, Shalimar Bagh & Chashme Shahi.',
        evening_activity: 'Shopping for authentic Pashmina shawls, dry fruits and saffron at Lal Chowk.',
        stay_hotel: 'The Lalit Grand Palace Srinagar',
        meals_included: 'Breakfast, Dinner'
      },
      {
        day: 5,
        title: 'Day Excursion to Sonamarg Golden Meadow & Thajiwas Glacier',
        morning_activity: 'Full-day trip to Sonamarg along the Sindh River valley.',
        afternoon_activity: 'Pony trek or union cab to Thajiwas Glacier for year-round snow.',
        evening_activity: 'Return to Srinagar hotel for farewell dinner.',
        stay_hotel: 'The Lalit Grand Palace Srinagar',
        meals_included: 'Breakfast, Dinner'
      },
      {
        day: 6,
        title: 'Srinagar Airport Departure',
        morning_activity: 'Breakfast with panoramic views, check-out.',
        afternoon_activity: 'Transfer to Srinagar Airport 3 hours prior to flight.',
        evening_activity: 'Flight home.',
        stay_hotel: 'None (Departure)',
        meals_included: 'Breakfast'
      }
    ];

    const keralaItinerary = [
      {
        day: 1,
        title: 'Arrival in Cochin & Transfer to Munnar Hill Station',
        morning_activity: 'Cochin Airport/Railway station pickup by private chauffeur.',
        afternoon_activity: 'Scenic 4-hour drive to Munnar, stop at Cheeyappara and Valara Waterfalls.',
        evening_activity: 'Check-in at Munnar tea estate resort, relaxing cardamom tea.',
        stay_hotel: 'Fragrant Nature Resort Munnar',
        meals_included: 'Dinner'
      },
      {
        day: 2,
        title: 'Munnar Tea Gardens & Eravikulam National Park',
        morning_activity: 'Visit Eravikulam National Park to spot endangered Nilgiri Tahr.',
        afternoon_activity: 'Tata Tea Museum, Mattupetty Dam, Echo Point and Kundala Lake.',
        evening_activity: 'Walk through green tea estates, homemade chocolate shopping.',
        stay_hotel: 'Fragrant Nature Resort Munnar',
        meals_included: 'Breakfast, Dinner'
      },
      {
        day: 3,
        title: 'Munnar to Thekkady Spice Plantations & Periyar Wildlife',
        morning_activity: 'Drive to Thekkady (3 hrs) through lush Western Ghats.',
        afternoon_activity: 'Guided spice plantation walk (pepper, cardamom, cinnamon, cloves).',
        evening_activity: 'Boat safari on Periyar Lake and traditional Kalaripayattu martial arts show.',
        stay_hotel: 'Spice Village Eco Resort Thekkady',
        meals_included: 'Breakfast, Dinner'
      },
      {
        day: 4,
        title: 'Thekkady to Alleppey Houseboat Cruise',
        morning_activity: 'Drive to Alleppey jetty (4 hrs).',
        afternoon_activity: 'Board private Deluxe A/C Houseboat at 12:30 PM, traditional Kerala lunch on board.',
        evening_activity: 'Cruise through Vembanad Lake canals, village paddy fields, sunset tea and Kerala dinner.',
        stay_hotel: 'Private Kerala Houseboat (Alleppey)',
        meals_included: 'Breakfast, Lunch, Dinner'
      },
      {
        day: 5,
        title: 'Alleppey to Cochin Departure',
        morning_activity: 'Morning village canal cruise, traditional South Indian breakfast on board, check-out.',
        afternoon_activity: 'Drive to Fort Kochi (1.5 hrs), view Chinese Fishing Nets and Jewish Synagogue.',
        evening_activity: 'Drop at Cochin International Airport.',
        stay_hotel: 'None (Departure)',
        meals_included: 'Breakfast'
      }
    ];

    const goaItinerary = [
      {
        day: 1,
        title: 'Arrival in Goa & Candolim Beach Sunset',
        morning_activity: 'Pickup from Dabolim/Mopa Airport, transfer to Candolim Beach resort.',
        afternoon_activity: 'Welcome tropical drink, poolside relaxation.',
        evening_activity: 'Candolim beach sunset walk, live beach shack music.',
        stay_hotel: 'Whispering Palms Beach Resort',
        meals_included: 'Dinner'
      },
      {
        day: 2,
        title: 'North Goa Forts & Water Sports',
        morning_activity: 'Visit Aguada Fort and Sinquerim Beach.',
        afternoon_activity: 'Baga & Calangute beach water sports (Parasailing, Jet Ski).',
        evening_activity: 'Explore vibrant Tito’s lane or Anjuna Flea Market.',
        stay_hotel: 'Whispering Palms Beach Resort',
        meals_included: 'Breakfast'
      },
      {
        day: 3,
        title: 'South Goa Heritage Churches & Mandovi River Cruise',
        morning_activity: 'Visit Old Goa churches (Basilica of Bom Jesus & Se Cathedral).',
        afternoon_activity: 'Mangueshi Temple and Latin Quarter (Fontainhas) heritage walk.',
        evening_activity: '1-hour Mandovi River sunset cruise with Goan folk dance.',
        stay_hotel: 'Whispering Palms Beach Resort',
        meals_included: 'Breakfast, Dinner'
      },
      {
        day: 4,
        title: 'Goa Departure',
        morning_activity: 'Leisurely beach breakfast, check-out.',
        afternoon_activity: 'Souvenir and cashew shopping in Panaji.',
        evening_activity: 'Airport drop-off for flight back home.',
        stay_hotel: 'None (Departure)',
        meals_included: 'Breakfast'
      }
    ];

    insertPkg.run(
      'PKG-001',
      'Golden Triangle Heritage (Delhi - Agra - Jaipur)',
      'Delhi, Agra, Jaipur',
      'India',
      'A timeless journey through India’s imperial history, majestic forts, and the world-renowned Taj Mahal with premium chauffeur-driven transport and 4-star heritage stays.',
      5, 4,
      48500.0, 36000.0,
      'Per Couple (Twin Sharing)',
      '• 4 Nights accommodation in 4-star hotels\n• Daily buffet breakfast & dinner\n• Private air-conditioned Sedan with experienced driver for 5 days\n• All toll taxes, state permits, parking & driver allowances\n• Guided tour of Taj Mahal & Amer Fort with entrance support\n• 1 Traditional Rajasthani cultural dinner',
      '• Monument entry tickets & camera fees\n• Airfare or train tickets\n• Personal expenses, laundry, tips and alcoholic drinks\n• GST 5% on billing',
      '• Cancellation 30+ days before travel: 10% administration fee\n• Cancellation 15-29 days before travel: 25% package retention\n• Cancellation 7-14 days before travel: 50% package retention\n• Cancellation less than 7 days: 100% non-refundable',
      JSON.stringify(goldenTriangleItinerary),
      'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800',
      1
    );

    insertPkg.run(
      'PKG-002',
      'Kashmir Paradise On Earth (Srinagar, Gulmarg & Pahalgam)',
      'Srinagar, Gulmarg, Pahalgam, Sonamarg',
      'India',
      'Experience the Switzerland of India with snow-capped Himalayan peaks, enchanting Shikara rides on Dal Lake, scenic meadow walks, and stay in traditional heritage houseboats.',
      6, 5,
      64000.0, 47500.0,
      'Per Couple (Twin Sharing)',
      '• 1 Night in Luxury Dal Lake Houseboat\n• 4 Nights in premium 4-star hotels\n• Daily buffet breakfast & dinner (Kashmiri & North Indian menu)\n• Private Innova/Ertiga for all airport transfers and sightseeing\n• 1 Hour Shikara ride on Dal Lake\n• Gulmarg & Pahalgam day trips with union cab coordination\n• 24x7 local on-ground assistance',
      '• Gondola ride Phase 1 & 2 tickets (must be booked online in advance)\n• Pony / Horse rides in Gulmarg, Baisaran or Sonamarg\n• Internal Union Cabs in Aru / Chandanwari / Betaab Valley\n• GST 5%',
      '• Cancellation 21+ days before: 15% retention\n• Cancellation 10-20 days before: 40% retention\n• Cancellation within 9 days: 100% retention',
      JSON.stringify(kashmirItinerary),
      'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=800',
      1
    );

    insertPkg.run(
      'PKG-003',
      'Kerala Backwaters, Tea Gardens & Wildlife (Munnar & Alleppey)',
      'Munnar, Thekkady, Alleppey, Cochin',
      'India',
      'Relax in God’s Own Country with mist-clad rolling tea plantations, spice-scented forests, Periyar wildlife boat ride, and an unforgettable private houseboat night on tranquil backwaters.',
      5, 4,
      52000.0, 39000.0,
      'Per Couple (Twin Sharing)',
      '• 2 Nights Munnar Tea Estate Resort\n• 1 Night Thekkady Eco-Resort\n• 1 Night Exclusive Private A/C Houseboat with all meals (Lunch, Tea, Dinner, Breakfast)\n• Chauffeur-driven private AC Sedan for all transfers & sightseeing\n• Guided spice plantation walk in Thekkady\n• All highway tolls, fuel, parking & driver charges',
      '• Airfare / Train tickets to Cochin\n• Periyar boat safari tickets (direct booking at counter)\n• Personal expenses & optional ayurvedic massages\n• GST 5%',
      '• Standard cancellation policy applies with 14-day advance notice for full houseboat refund',
      JSON.stringify(keralaItinerary),
      'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800',
      1
    );

    insertPkg.run(
      'PKG-004',
      'Goa Sun, Sand & Portuguese Heritage',
      'North Goa & South Goa',
      'India',
      'The ultimate tropical getaway with sun-drenched beaches, water sports thrills, UNESCO world heritage churches, and sunset Mandovi river cruise.',
      4, 3,
      36000.0, 26000.0,
      'Per Couple (Twin Sharing)',
      '• 3 Nights in 4-Star Beach Resort in Candolim\n• Daily buffet breakfast & 2 buffet dinners\n• Airport pickup and drop in private AC car\n• Full day North Goa sightseeing & South Goa churches tour\n• Mandovi River Sunset Cruise tickets for 2 adults\n• Welcome drink on arrival',
      '• Water sports charges (Jet ski, parasailing)\n• Meals not mentioned in itinerary\n• Alcoholic beverages & club entry tickets\n• GST 5%',
      '• Non-refundable if cancelled within 7 days of arrival',
      JSON.stringify(goaItinerary),
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800',
      1
    );
  }

  // Seed default bookings, invoices, money in, supplier bills, expenses
  const bookingCount = db.prepare('SELECT COUNT(*) as count FROM bookings').get();
  if (bookingCount.count === 0) {
    // 1. Confirmed booking for Rajesh Sharma (Golden Triangle)
    const b1Id = 'TRV-2026-0001';
    db.prepare(`
      INSERT INTO bookings (id, booking_number, customer_id, package_id, destination, start_date, end_date, duration_days, duration_nights, pax_adults, pax_children, status, selling_price, tax_amount, gross_total, total_supplier_cost, estimated_profit, final_profit, customer_notes, internal_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      b1Id, 'TRV-2026-0001', 'CUST-101', 'PKG-001', 'Delhi, Agra, Jaipur',
      '2026-10-25', '2026-10-29', 5, 4, 2, 0,
      'Confirmed', 50925.0, 2546.25, 53471.25, 36000.0, 14925.0, 14925.0,
      'Vegetarian food only. Ground floor room preferred for elder parents.',
      'Sharma Travels assigned for Sedan. Advance of Rs 10,000 paid to cab.'
    );

    // Hotels for b1
    db.prepare(`
      INSERT INTO booking_hotels (id, booking_id, hotel_id, hotel_name, destination, room_type, num_rooms, meal_plan, check_in, check_out, nights, rate_per_night, total_cost, supplier_id, supplier_advance_paid, supplier_payment_due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('BH-01', b1Id, 'HTL-04', 'Lemon Tree Premier', 'New Delhi', 'Superior Room', 1, 'CP (Breakfast)', '2026-10-25', '2026-10-26', 1, 6000.0, 6000.0, 'SUP-104', 6000.0, '2026-10-24');

    db.prepare(`
      INSERT INTO booking_hotels (id, booking_id, hotel_id, hotel_name, destination, room_type, num_rooms, meal_plan, check_in, check_out, nights, rate_per_night, total_cost, supplier_id, supplier_advance_paid, supplier_payment_due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('BH-02', b1Id, 'HTL-01', 'Taj Lake Palace & Heritage Agra', 'Agra', 'Heritage Room', 1, 'MAP (Breakfast & Dinner)', '2026-10-26', '2026-10-27', 1, 8000.0, 8000.0, 'SUP-101', 4000.0, '2026-10-26');

    // Services for b1
    db.prepare(`
      INSERT INTO booking_services (id, booking_id, service_type, description, supplier_id, cost_price, selling_price, payment_due_date, supplier_advance_paid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('BS-01', b1Id, 'Transport/Cab', 'Dzire / Etios AC for 5 Days Delhi-Agra-Jaipur-Delhi with all tolls', 'SUP-105', 18000.0, 24000.0, '2026-10-29', 10000.0);

    // Invoice for b1
    const inv1Id = 'INV-2026-0001';
    db.prepare(`
      INSERT INTO invoices (id, invoice_number, booking_id, customer_id, invoice_date, due_date, subtotal, gst_rate, gst_amount, tcs_rate, tcs_amount, total_amount, paid_amount, balance_amount, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      inv1Id, 'INV-2026-0001', b1Id, 'CUST-101', '2026-10-15', '2026-10-23',
      50925.0, 5.0, 2546.25, 0.0, 0.0, 53471.25, 30000.0, 23471.25, 'Partial',
      'Advance ₹30,000 received via UPI. Balance ₹23,471.25 due 2 days before journey.'
    );

    // Money In for b1 (Customer Advance)
    db.prepare(`
      INSERT INTO money_in (id, receipt_number, receipt_date, customer_id, booking_id, invoice_id, receipt_type, amount, payment_mode, account_id, reference_no, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'REC-2026-0001', 'REC-2026-0001', '2026-10-15', 'CUST-101', b1Id, inv1Id,
      'Customer Advance', 30000.0, 'UPI', 'ACC-04', 'UPI/HDFC/99228811', 'Booking token advance received with thanks'
    );

    // Supplier Bill for b1 (Cab)
    db.prepare(`
      INSERT INTO supplier_bills (id, bill_number, supplier_id, booking_id, bill_date, due_date, category, total_amount, paid_amount, balance_due, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'SBILL-2026-0001', 'BILL-CAB-881', 'SUP-105', b1Id, '2026-10-16', '2026-10-29',
      'Cab/Transport', 18000.0, 10000.0, 8000.0, 'Partial', 'Total cab contract ₹18,000. Advance ₹10,000 paid. ₹8,000 due on trip completion.'
    );

    // Money Out for b1 (Cab advance)
    db.prepare(`
      INSERT INTO money_out (id, payment_number, payment_date, supplier_id, booking_id, bill_id, payment_type, amount, payment_mode, account_id, reference_no, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'PAY-2026-0001', 'PAY-2026-0001', '2026-10-16', 'SUP-105', b1Id, 'SBILL-2026-0001',
      'Supplier Advance', 10000.0, 'Bank Transfer', 'ACC-02', 'NEFT-HDFC-551144', 'Advance paid to Royal Rajasthan Cabs'
    );

    // Reminder for b1 remaining balance
    db.prepare(`
      INSERT INTO payment_reminders (id, reminder_type, party_type, party_id, party_name, party_phone, party_email, booking_id, booking_number, reference_id, amount_due, due_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'REM-01', 'Customer Payment', 'Customer', 'CUST-101', 'Rajesh Sharma', '+91 98112 34567', 'rajesh.sharma@tcs.com',
      b1Id, 'TRV-2026-0001', inv1Id, 23471.25, '2026-10-23', 'Pending'
    );

    // 2. Confirmed booking for Priya Patel (Kashmir Honeymoon)
    const b2Id = 'TRV-2026-0002';
    db.prepare(`
      INSERT INTO bookings (id, booking_number, customer_id, package_id, destination, start_date, end_date, duration_days, duration_nights, pax_adults, pax_children, status, selling_price, tax_amount, gross_total, total_supplier_cost, estimated_profit, final_profit, customer_notes, internal_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      b2Id, 'TRV-2026-0002', 'CUST-102', 'PKG-002', 'Srinagar, Gulmarg, Pahalgam',
      '2026-11-05', '2026-11-10', 6, 5, 2, 0,
      'Confirmed', 67200.0, 3360.0, 70560.0, 48000.0, 19200.0, 19200.0,
      'Honeymoon cake and flower bed decoration on arrival at Houseboat.',
      'Kashmir Paradise DMC handling land package.'
    );

    const inv2Id = 'INV-2026-0002';
    db.prepare(`
      INSERT INTO invoices (id, invoice_number, booking_id, customer_id, invoice_date, due_date, subtotal, gst_rate, gst_amount, tcs_rate, tcs_amount, total_amount, paid_amount, balance_amount, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      inv2Id, 'INV-2026-0002', b2Id, 'CUST-102', '2026-10-18', '2026-10-28',
      67200.0, 5.0, 3360.0, 0.0, 0.0, 70560.0, 70560.0, 0.0, 'Paid',
      'Full payment received in advance via Bank Transfer.'
    );

    db.prepare(`
      INSERT INTO money_in (id, receipt_number, receipt_date, customer_id, booking_id, invoice_id, receipt_type, amount, payment_mode, account_id, reference_no, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'REC-2026-0002', 'REC-2026-0002', '2026-10-18', 'CUST-102', b2Id, inv2Id,
      'Customer Payment', 70560.0, 'Bank Transfer', 'ACC-02', 'IMPS-HDFC-990011', '100% full package payment settled'
    );

    // 3. Enquiry / Quoted booking for Dr. Arvind Swaminathan (Kerala)
    const b3Id = 'TRV-2026-0003';
    db.prepare(`
      INSERT INTO bookings (id, booking_number, customer_id, package_id, destination, start_date, end_date, duration_days, duration_nights, pax_adults, pax_children, status, selling_price, tax_amount, gross_total, total_supplier_cost, estimated_profit, final_profit, customer_notes, internal_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      b3Id, 'TRV-2026-0003', 'CUST-104', 'PKG-003', 'Munnar & Alleppey',
      '2026-11-15', '2026-11-19', 5, 4, 2, 0,
      'Quoted', 54600.0, 2730.0, 57330.0, 39500.0, 15100.0, 0.0,
      'Senior citizens, requires comfortable Toyota Innova with courteous driver.',
      'Proposal sent on WhatsApp and Email. Follow-up scheduled for tomorrow.'
    );

    // 4. Overdue reminder sample for Vikram Malhotra
    const b4Id = 'TRV-2026-0004';
    db.prepare(`
      INSERT INTO bookings (id, booking_number, customer_id, package_id, destination, start_date, end_date, duration_days, duration_nights, pax_adults, pax_children, status, selling_price, tax_amount, gross_total, total_supplier_cost, estimated_profit, final_profit, customer_notes, internal_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      b4Id, 'TRV-2026-0004', 'CUST-103', 'PKG-004', 'Goa Beach & Culture',
      '2026-10-22', '2026-10-25', 4, 3, 4, 0,
      'In Progress', 72000.0, 3600.0, 75600.0, 52000.0, 20000.0, 20000.0,
      'Corporate reward trip for top sales engineers.',
      'Hotel Whispering Palms Candolim.'
    );

    const inv4Id = 'INV-2026-0003';
    db.prepare(`
      INSERT INTO invoices (id, invoice_number, booking_id, customer_id, invoice_date, due_date, subtotal, gst_rate, gst_amount, tcs_rate, tcs_amount, total_amount, paid_amount, balance_amount, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      inv4Id, 'INV-2026-0003', b4Id, 'CUST-103', '2026-10-05', '2026-10-17',
      72000.0, 5.0, 3600.0, 0.0, 0.0, 75600.0, 40000.0, 35600.0, 'Partial',
      'Overdue final balance payment.'
    );

    db.prepare(`
      INSERT INTO money_in (id, receipt_number, receipt_date, customer_id, booking_id, invoice_id, receipt_type, amount, payment_mode, account_id, reference_no, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'REC-2026-0003', 'REC-2026-0003', '2026-10-06', 'CUST-103', b4Id, inv4Id,
      'Customer Advance', 40000.0, 'Bank Transfer', 'ACC-03', 'NEFT-SBI-443322', '50% booking advance received'
    );

    // Overdue reminder for b4
    db.prepare(`
      INSERT INTO payment_reminders (id, reminder_type, party_type, party_id, party_name, party_phone, party_email, booking_id, booking_number, reference_id, amount_due, due_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'REM-02', 'Customer Payment', 'Customer', 'CUST-103', 'Vikram Malhotra', '+91 99400 56789', 'vikram@malhotratech.com',
      b4Id, 'TRV-2026-0004', inv4Id, 35600.0, '2026-10-17', 'Pending'
    );

    // Supplier payment due for b4 hotel
    db.prepare(`
      INSERT INTO supplier_bills (id, bill_number, supplier_id, booking_id, bill_date, due_date, category, total_amount, paid_amount, balance_due, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'SBILL-2026-0002', 'BILL-HTL-992', 'SUP-104', b4Id, '2026-10-10', '2026-10-21',
      'Hotel', 34800.0, 15000.0, 19800.0, 'Partial', 'Whispering Palms 2 Rooms x 3 Nights'
    );

    db.prepare(`
      INSERT INTO payment_reminders (id, reminder_type, party_type, party_id, party_name, party_phone, party_email, booking_id, booking_number, reference_id, amount_due, due_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'REM-03', 'Supplier Payment', 'Supplier', 'SUP-104', 'Lemon Tree Premier / Whispering Palms', '+91 98100 87654', 'delhi@lemontreehotels.com',
      b4Id, 'TRV-2026-0004', 'SBILL-2026-0002', 19800.0, '2026-10-21', 'Pending'
    );

    // Seed some business operating expenses
    const insertExp = db.prepare('INSERT INTO expenses (id, expense_number, expense_date, category, amount, payment_mode, account_id, vendor_name, reference_no, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    insertExp.run('EXP-2026-001', 'EXP-2026-001', '2026-10-01', 'Office Rent', 35000.0, 'Bank Transfer', 'ACC-02', 'Connaught Commercial Estate', 'NEFT-RENT-OCT', 'Monthly Connaught Place office lease rent');
    insertExp.run('EXP-2026-002', 'EXP-2026-002', '2026-10-05', 'Staff Salaries', 65000.0, 'Bank Transfer', 'ACC-02', 'Operations Staff & Tour Coordinators', 'NEFT-SAL-OCT', 'Staff salaries for 2 executive operations coordinators');
    insertExp.run('EXP-2026-003', 'EXP-2026-003', '2026-10-08', 'Internet & Phone', 3200.0, 'UPI', 'ACC-04', 'Airtel Broadband & Corporate CUG', 'UPI-AIRTEL-4432', 'High-speed fiber & business mobile plan');
    insertExp.run('EXP-2026-004', 'EXP-2026-004', '2026-10-12', 'Marketing & Ads', 12500.0, 'Bank Transfer', 'ACC-02', 'Google & Meta Travel Ads', 'CARD-AD-8899', 'Diwali vacation campaign ads');
    insertExp.run('EXP-2026-005', 'EXP-2026-005', '2026-10-14', 'Office Tea & Misc', 1850.0, 'Cash', 'ACC-01', 'Local Market & Pantry Vendor', 'CASH-VOUCHER-01', 'Client refreshments, tea & snacks');
  }

  console.log('Database initialized successfully with rich seed data!');
}
