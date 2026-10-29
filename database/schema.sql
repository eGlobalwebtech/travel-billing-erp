-- ============================================================================
-- Travel Billing ERP - PostgreSQL Database Schema
-- Database: travel_billing_erp
-- Target: PostgreSQL 14+ / 18+
-- ============================================================================

-- 1. Agency & Company Settings
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
    default_gst_rate NUMERIC(5, 2) DEFAULT 5.0,
    default_tcs_rate NUMERIC(5, 2) DEFAULT 5.0,
    currency TEXT DEFAULT 'INR',
    currency_symbol TEXT DEFAULT '₹',
    ai_api_key TEXT DEFAULT '',
    ai_provider TEXT DEFAULT 'gemini',
    reminder_whatsapp_template TEXT DEFAULT 'Dear {customer_name}, Greetings from {agency_name}! Friendly reminder that payment of {currency_symbol}{amount} for booking #{booking_id} ({destination}) is due on {due_date}. Kindly transfer via UPI {upi_id} or bank transfer. Contact: {phone}. Thank you!',
    reminder_supplier_template TEXT DEFAULT 'Hello {supplier_name}, payment of {currency_symbol}{amount} for booking #{booking_id} has been scheduled by {agency_name}. Thank you!'
);

-- 2. Bank, Cash & UPI Accounts
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL, -- 'Bank', 'Cash', 'UPI'
    account_number TEXT,
    bank_name TEXT,
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.0,
    is_default INTEGER DEFAULT 0
);

-- 3. Customers Directory
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

-- 4. Suppliers (Hotels, Cab/Transport, DMCs, Airlines, Guides)
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Hotel Master Catalog
CREATE TABLE IF NOT EXISTS hotels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    destination TEXT NOT NULL,
    star_rating INTEGER DEFAULT 3,
    address TEXT,
    supplier_id TEXT,
    phone TEXT,
    email TEXT,
    room_types TEXT, -- JSON array of room types
    base_rate NUMERIC(12, 2) DEFAULT 0.0,
    meal_plans TEXT, -- JSON array e.g. ["EP", "CP", "MAP", "AP"]
    payment_terms TEXT,
    cancellation_policy TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- 6. Package Master Catalog
CREATE TABLE IF NOT EXISTS packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    destination TEXT NOT NULL,
    country TEXT DEFAULT 'India',
    description TEXT,
    duration_days INTEGER NOT NULL DEFAULT 4,
    duration_nights INTEGER NOT NULL DEFAULT 3,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    estimated_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    pricing_basis TEXT DEFAULT 'Per Person (Twin Sharing)',
    inclusions TEXT,
    exclusions TEXT,
    cancellation_terms TEXT,
    day_wise_itinerary TEXT, -- JSON array of itinerary days
    image_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Bookings
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
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    gross_total NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    total_supplier_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    estimated_profit NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    final_profit NUMERIC(12, 2) DEFAULT 0.0,
    customer_notes TEXT,
    internal_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL
);

-- 8. Booking Hotel Stay Allocations
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
    rate_per_night NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    supplier_id TEXT,
    supplier_advance_paid NUMERIC(12, 2) DEFAULT 0.0,
    supplier_payment_due_date TEXT,
    notes TEXT,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE SET NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- 9. Booking Services (Cabs, Flights, Activities, Sightseeing, Guides)
CREATE TABLE IF NOT EXISTS booking_services (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    service_type TEXT NOT NULL, -- 'Transport/Cab', 'Flight', 'Activity/Sightseeing', 'Guide', 'Insurance', 'Visa'
    description TEXT NOT NULL,
    supplier_id TEXT,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    payment_due_date TEXT,
    supplier_advance_paid NUMERIC(12, 2) DEFAULT 0.0,
    notes TEXT,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- 10. Booking Itinerary Days (Day-by-Day Snapshot)
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

-- 11. Customer Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    booking_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    invoice_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    gst_rate NUMERIC(5, 2) DEFAULT 5.0,
    gst_amount NUMERIC(12, 2) DEFAULT 0.0,
    tcs_rate NUMERIC(5, 2) DEFAULT 0.0,
    tcs_amount NUMERIC(12, 2) DEFAULT 0.0,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'Unpaid', -- 'Unpaid', 'Partial', 'Paid', 'Cancelled'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- 12. Money In (Customer Receipts & Advances)
CREATE TABLE IF NOT EXISTS money_in (
    id TEXT PRIMARY KEY,
    receipt_number TEXT UNIQUE NOT NULL,
    receipt_date TEXT NOT NULL,
    customer_id TEXT,
    supplier_id TEXT, -- For refunds
    booking_id TEXT,
    invoice_id TEXT,
    receipt_type TEXT NOT NULL DEFAULT 'Customer Payment', -- 'Customer Payment', 'Customer Advance', 'Supplier Refund', 'Other Income'
    amount NUMERIC(12, 2) NOT NULL,
    payment_mode TEXT NOT NULL DEFAULT 'UPI', -- 'UPI', 'Bank Transfer', 'Cash', 'Cheque', 'Card'
    account_id TEXT NOT NULL,
    reference_no TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- 13. Supplier Bills (Hotels, Transports, DMCs)
CREATE TABLE IF NOT EXISTS supplier_bills (
    id TEXT PRIMARY KEY,
    bill_number TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    booking_id TEXT,
    bill_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Hotel',
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'Unpaid', -- 'Unpaid', 'Partial', 'Paid'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

-- 14. Money Out (Supplier Payments & Advances)
CREATE TABLE IF NOT EXISTS money_out (
    id TEXT PRIMARY KEY,
    payment_number TEXT UNIQUE NOT NULL,
    payment_date TEXT NOT NULL,
    supplier_id TEXT,
    customer_id TEXT, -- For customer refunds
    booking_id TEXT,
    bill_id TEXT,
    payment_type TEXT NOT NULL DEFAULT 'Supplier Bill Payment', -- 'Supplier Bill Payment', 'Supplier Advance', 'Customer Refund'
    amount NUMERIC(12, 2) NOT NULL,
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

-- 15. Business Operating Expenses (Rent, Salary, Ads, Tea)
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    expense_number TEXT UNIQUE NOT NULL,
    expense_date TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Office Rent', 'Staff Salaries', 'Marketing & Ads', 'Internet & Phone', 'Fuel & Travel', 'Software & Tech', 'Bank Charges', 'Office Tea & Misc'
    amount NUMERIC(12, 2) NOT NULL,
    payment_mode TEXT NOT NULL DEFAULT 'UPI',
    account_id TEXT NOT NULL,
    vendor_name TEXT,
    reference_no TEXT,
    tax_deductible INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- 16. Payment Reminders
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
    reference_id TEXT,
    amount_due NUMERIC(12, 2) NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Sent', 'Settled'
    sent_via TEXT,
    sent_at TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. Users & Role-Based Access Control (RBAC)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'sales', -- 'super_admin', 'manager', 'accountant', 'sales'
    phone TEXT,
    avatar TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_money_in_booking_id ON money_in(booking_id);
CREATE INDEX IF NOT EXISTS idx_money_out_booking_id ON money_out(booking_id);
CREATE INDEX IF NOT EXISTS idx_supplier_bills_supplier_id ON supplier_bills(supplier_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status_due ON payment_reminders(status, due_date);

