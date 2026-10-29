# Travel Billing ERP - PostgreSQL Database

This folder contains all the SQL table structures, schema definitions, and seed data for the **PostgreSQL** database.

---

## Files in this Directory

| File | Purpose |
| :--- | :--- |
| [`schema.sql`](./schema.sql) | Complete DDL script for all 17 tables, foreign key constraints, default values, and performance indexes. |
| [`seed.sql`](./seed.sql) | Master seed data (Agency company settings, bank & UPI accounts, hotels, suppliers, packages, sample customers, and operating expenses). |

---

## 17 Database Tables Included

1. `company_settings` - Agency profile, GSTIN, PAN, bank details, and notification templates
2. `accounts` - Bank, Cash, and UPI financial accounts with balances
3. `customers` - Client database, addresses, and emergency contacts
4. `suppliers` - Hotels, Cab/Transport, DMCs, and Airline vendors
5. `hotels` - Hotel master directory with ratings and room types
6. `packages` - Tour package catalog with day-wise itinerary snapshots
7. `bookings` - Tour bookings, Pax counts, selling price, supplier costs, and margins
8. `booking_hotels` - Hotel stay line-items per booking
9. `booking_services` - Transportation, flights, guides, and activity line-items
10. `booking_itinerary` - Day-by-day travel itinerary schedule
11. `invoices` - GST and TCS invoices with paid & balance tracking
12. `money_in` - Customer receipts and advances
13. `supplier_bills` - Accounts payable bills from suppliers
14. `money_out` - Payments issued to suppliers and vendors
15. `expenses` - Operating business expenses (rent, salaries, marketing, etc.)
16. `payment_reminders` - Payment collection and supplier payout reminders
17. `audit_logs` - Financial and booking activity logs

---

## How to Run or Import into PostgreSQL

### Option A: Using pgAdmin 4 Query Tool
1. In **pgAdmin 4**, open **PostgreSQL 18** → **Databases** → **`travel_billing_erp`**.
2. Click **Tools** in the top menu → **Query Tool**.
3. Open or copy the contents of [`schema.sql`](./schema.sql) and click the **Execute / Run (F5)** button.
4. Open [`seed.sql`](./seed.sql) and click **Execute / Run (F5)**.

### Option B: Using Command Line (psql)
Run the following PowerShell command from the project root:
```powershell
$env:PGPASSWORD="your_password"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h localhost -p 5500 -U postgres -d travel_billing_erp -f database/schema.sql
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h localhost -p 5500 -U postgres -d travel_billing_erp -f database/seed.sql
```

