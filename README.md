# YatraBilling - AI-Powered Travel Booking, Billing & Finance ERP

A modern, high-performance, easy-to-use travel agency management ERP designed specifically for Indian travel agencies and tour operators. Built with a clean, light-themed, single-screen dashboard, automatic calculations, payment reminders with 1-click WhatsApp integration, multi-hotel booking management, AI-generated itineraries, and full financial accounting.

---

## 🌟 Key Features

### 1. Single-Screen Owner Dashboard
- **4 Large Quick-Action Buttons:**
  - `New Booking`: Opens the comprehensive travel booking wizard.
  - `Receive Payment`: Records customer token advances and settlements with automatic invoice allocation.
  - `Add Expense`: Records overhead costs (office rent, staff salaries, marketing, internet).
  - `View Reports`: Instant access to P&L, ageing, and profitability analysis.
- **8 Dynamic KPI Cards (Click to Drill-Down):**
  - Total Bookings (Confirmed, Ongoing, Pipeline).
  - Total Invoiced Sales (GST-compliant billed value).
  - Customer Payments Received (Liquid cash/bank inflows).
  - Customer Outstanding Balances (Pending receivables).
  - Supplier Due (Payables to hotels, transport cabs, DMCs).
  - Business Operating Expenses (Overhead cost tracking).
  - Current Cash & Bank Balances (HDFC Current, SBI, UPI QR, Cash safe).
  - Estimated & Finalized Tour Profit Margin.
- **Payment Reminders Widget:** 1-Click WhatsApp click-to-chat (`https://wa.me/...`) and Email drafts pre-filled with polite Indian travel payment templates.
- **Upcoming Trips & Recent Transactions Ledger.**

### 2. Package Master
- Reusable holiday packages with duration in days and nights.
- Complete day-by-day itineraries (Morning, Afternoon, Evening activities).
- Inclusions, exclusions, cancellation terms, selling prices, and supplier cost benchmarks.
- Duplicate packages with 1 click, search, and edit.
- Selecting a package during booking creation automatically populates duration, itinerary, destination, default services, inclusions, and pricing.

### 3. Hotel Master & Inline Booking Accommodations
- Catalog of verified hotel properties, star ratings, destination cities, contact details, room categories, meal plans (`EP`, `CP`, `MAP`, `AP`), and base rates.
- **Inline Hotel Creation:** Add new hotels during booking creation with an optional checkbox to save directly to Hotel Master without leaving the screen.
- Supports multiple hotels across different cities with individual check-in/out dates, nights, room counts, and supplier advances.

### 4. Booking Management
- Unique booking numbers (`TRV-YYYY-XXXX`).
- Automatic inclusive travel date calculation (`start_date + (duration_days - 1)`).
- Multi-hotel stays and custom supplier services (Cabs, Flights, Activities, Guides, Visas).
- Automatic real-time financial math: Selling price + GST 5% = Gross Total; Supplier Costs = Hotel costs + Services cost; Estimated Margin = Selling Price - Supplier Costs.
- **Printable Branded Documents:**
  - GST-Compliant Tax Invoice with SAC codes and bank transfer/UPI details.
  - Tour Proposal & Day-Wise Itinerary.
  - Hotel & Transport Service Confirmation Vouchers.

### 5. AI Itinerary Builder & Proposal Designer
- Input destination, travel dates, duration, travelers, budget, travel style, interests, and hotel category.
- Server-side AI generator with **Google Gemini API** support and built-in **intelligent generative fallback engine** for all Indian and international destinations (Kashmir, Kerala, Rajasthan, Goa, Himachal, Dubai, Thailand, Bali, etc.).
- Clearly labeled unverified estimates (`[UNVERIFIED ESTIMATE]`).
- Interactive day-by-day editor: edit activities, add/remove days, and adjust cost estimates.
- 1-Click "Save as Reusable Package Master" and "Print Proposal".

### 6. Customer & Supplier Management
- Searchable Customer directory with booking history, invoice logs, receipts, and printable Account Statements.
- Searchable Supplier directory (Hotels, Transports, DMCs, Airlines) with payables, bank details, and ledger statements.

### 7. Money In, Money Out & Operating Expenses
- **Money In:** Customer advances, partial milestone payments, settlements, and supplier refunds. Automatically reduces invoice balances and updates cash/bank liquid balances.
- **Money Out:** Supplier bill payments, cab advances, and customer refunds. Automatically reduces supplier bills.
- **Expenses:** Categorized overheads (Office Rent, Staff Salaries, Marketing & Ads, Internet & Phone, Office Tea & Misc).

### 8. Financial Reports & Excel Export
- **Profit & Loss Statement (P&L):** Invoiced Sales - Direct Supplier Costs = Gross Margin; Gross Margin - Operating Expenses = Net Business Profit.
- **Customer Overdue Ageing:** Automatic ageing buckets (`Current`, `1-30 Days`, `31-60 Days`, `61-90 Days`, `90+ Days Critical`).
- **Trip Profitability:** Booking-by-booking margin and percentage breakdown.
- **Combined Cash Book & Bank Ledger:** Chronological debit/credit transaction history.
- **1-Click Export to Excel / CSV** and Print-ready views.

### 9. Payment Reminders & WhatsApp Automation
- Automated tracking of overdue customer instalments and upcoming supplier due dates.
- 1-Click WhatsApp reminder button that opens WhatsApp Web / App with pre-filled, friendly, professional Indian business messages with payment amounts, due dates, bank accounts, and UPI IDs.
- Automatic cancellation of reminders when invoices or supplier bills are settled in full.

---

## 🛠️ Technology Stack & Architecture

- **Backend:** Node.js (v24) + Express with built-in synchronous/transactional SQLite (`node:sqlite`). Zero native build compilation required.
- **Frontend:** React 19 + Vite + Lucide Icons + Canvas Confetti.
- **Database:** Persistent SQLite at `server/travel.db` with ACID foreign keys, transaction safety, and comprehensive Indian travel seed data.
- **Ports:**
  - Backend API & Production App: `http://localhost:4000`
  - Vite Client Dev Server (optional): `http://localhost:3001`

---

## 🚀 Quick Start Guide

### 1. Start the Application
Run the backend server:
```powershell
node server/index.js
```
The application will start immediately at:
👉 **`http://localhost:4000`**

### 2. Run in Concurrent Development Mode
To run both the Express backend and the Vite HMR dev server concurrently:
```powershell
npm.cmd run dev
```

### 3. Run Automated Tests
Execute the 7-stage automated financial and calculation test suite:
```powershell
node tests/erp.test.js
```

---

## 📋 Database Schema Summary

| Table | Purpose |
|---|---|
| `company_settings` | Agency name, GSTIN, PAN, bank details, UPI ID, default tax rates, WhatsApp reminder template, AI key |
| `accounts` | Liquid accounts: Cash in Hand, HDFC Current, SBI Current, UPI Business QR |
| `customers` | Client directory, GSTIN for B2B, contact info, emergency contacts |
| `suppliers` | Hotels, Cab vendors, DMCs, Airlines, Guides with bank details and UPI IDs |
| `packages` | Reusable travel package templates, day-wise itineraries, inclusions/exclusions, pricing |
| `hotels` | Hotel Master with room categories, star ratings, meal plans, base rates per night |
| `bookings` | Core booking records with travel dates, passenger counts, statuses, and profit margins |
| `booking_hotels` | Multi-hotel stays with check-in/out dates, nights, rooms, rate per night, and supplier bills |
| `booking_services`| Cabs, transports, flight tickets, guides, and sightseeing activities |
| `booking_itinerary`| Snapshot of day-by-day morning/afternoon/evening schedule for each booking |
| `invoices` | GST-compliant tax invoices with subtotal, GST 5%, total, paid, and balance due |
| `money_in` | Customer receipts, advances, and settlements allocated to invoices and accounts |
| `supplier_bills` | Bills from hotels and cab transporters with due dates and balance tracking |
| `money_out` | Supplier payments and advances allocated to bills and bank accounts |
| `expenses` | Operating overheads: rent, salaries, marketing, phone, fuel, tea |
| `payment_reminders`| Customer and supplier payment reminders with WhatsApp links and settled tracking |
| `audit_logs` | Tamper-evident log of financial actions, bookings, and receipts |
