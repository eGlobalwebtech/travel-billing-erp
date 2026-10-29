import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db, initDatabase } from './db.js';
import { generateAItinerary } from './ai_service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Initialize DB schema & seeds
try {
  await initDatabase();
} catch (dbErr) {
  console.error('[SERVER] Database connection error:', dbErr.message);
  console.error('[SERVER] Troubleshooting: Ensure your DATABASE_URL in Render is set to a valid PostgreSQL connection string:');
  console.error('         postgresql://<user>:<password>@<host>:<port>/<database>');
  throw dbErr;
}

// -------------------------------------------------------------
// HELPER FUNCTIONS
// -------------------------------------------------------------
async function generateId(prefix, table, idCol = 'id') {
  const row = await db.prepare(`SELECT count(*) as cnt FROM ${table}`).get();
  const nextNum = parseInt(row?.cnt || 0, 10) + 1;
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;
}

// Decimal safe round to 2 decimals
function round2(val) {
  return Math.round((Number(val) || 0) * 100) / 100;
}

// Inclusive date calculation helper
// e.g. start 2026-10-25 with 5 days -> 2026-10-29
function calculateEndDate(startDateStr, durationDays) {
  if (!startDateStr || !durationDays || durationDays < 1) return startDateStr;
  const d = new Date(startDateStr);
  d.setDate(d.getDate() + (Number(durationDays) - 1));
  return d.toISOString().split('T')[0];
}

// -------------------------------------------------------------
// 1. DASHBOARD SUMMARY
// -------------------------------------------------------------
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    // 1. Total bookings
    const bookingsStat = await db.prepare(`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'Confirmed' THEN 1 END) as confirmed_bookings,
        COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as ongoing_bookings,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_bookings,
        COUNT(CASE WHEN status = 'Quoted' OR status = 'Enquiry' THEN 1 END) as pipeline_bookings,
        COALESCE(SUM(estimated_profit), 0) as total_estimated_profit,
        COALESCE(SUM(final_profit), 0) as total_final_profit
      FROM bookings WHERE status != 'Cancelled'
    `).get();

    // 2. Total Invoiced Sales & Balances
    const invoiceStat = await db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_invoiced,
        COALESCE(SUM(paid_amount), 0) as total_customer_paid,
        COALESCE(SUM(balance_amount), 0) as customer_outstanding
      FROM invoices WHERE status != 'Cancelled'
    `).get();

    // 3. Customer Payments Received (from money_in)
    const moneyInStat = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_receipts
      FROM money_in WHERE receipt_type IN ('Customer Payment', 'Customer Advance')
    `).get();

    // 4. Supplier Bills & Due
    const supplierStat = await db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_supplier_bills,
        COALESCE(SUM(paid_amount), 0) as supplier_paid,
        COALESCE(SUM(balance_due), 0) as supplier_due
      FROM supplier_bills
    `).get();

    // 5. Total Business Operating Expenses
    const expenseStat = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses
    `).get();

    // 6. Cash and Bank Balances
    const accounts = await db.prepare(`SELECT * FROM accounts`).all();
    const totalLiquidCash = accounts.reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0);

    // 7. Reminders (Overdue & Due Soon)
    const todayStr = new Date().toISOString().split('T')[0];
    const overdueReminders = await db.prepare(`
      SELECT * FROM payment_reminders 
      WHERE status = 'Pending' AND due_date < ?
      ORDER BY due_date ASC LIMIT 5
    `).all(todayStr);

    const upcomingReminders = await db.prepare(`
      SELECT * FROM payment_reminders 
      WHERE status = 'Pending' AND due_date >= ?
      ORDER BY due_date ASC LIMIT 5
    `).all(todayStr);

    const overdueCountRow = await db.prepare(`
      SELECT COUNT(*) as count FROM payment_reminders WHERE status = 'Pending' AND due_date < ?
    `).get(todayStr);
    const overdueCount = parseInt(overdueCountRow?.count || 0, 10);

    const upcomingCountRow = await db.prepare(`
      SELECT COUNT(*) as count FROM payment_reminders WHERE status = 'Pending' AND due_date >= ?
    `).get(todayStr);
    const upcomingCount = parseInt(upcomingCountRow?.count || 0, 10);

    // 8. Upcoming Trips
    const upcomingTrips = await db.prepare(`
      SELECT b.*, c.name as customer_name, c.phone as customer_phone
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      WHERE b.start_date >= ? AND b.status IN ('Confirmed', 'In Progress')
      ORDER BY b.start_date ASC LIMIT 6
    `).all(todayStr);

    // 9. Recent Transactions
    const recentMoneyIn = await db.prepare(`
      SELECT 'Money In' as tx_type, receipt_number as ref, receipt_date as date, amount, payment_mode, 
             COALESCE(c.name, 'Customer') as party, m.notes as notes
      FROM money_in m
      LEFT JOIN customers c ON m.customer_id = c.id
      ORDER BY receipt_date DESC LIMIT 5
    `).all();

    const recentMoneyOut = await db.prepare(`
      SELECT 'Money Out' as tx_type, payment_number as ref, payment_date as date, -amount as amount, payment_mode, 
             COALESCE(s.name, 'Supplier') as party, mo.notes as notes
      FROM money_out mo
      LEFT JOIN suppliers s ON mo.supplier_id = s.id
      ORDER BY payment_date DESC LIMIT 5
    `).all();

    const recentExpenses = await db.prepare(`
      SELECT 'Expense' as tx_type, expense_number as ref, expense_date as date, -amount as amount, payment_mode, 
             category as party, notes
      FROM expenses
      ORDER BY expense_date DESC LIMIT 5
    `).all();

    const allTx = [...recentMoneyIn, ...recentMoneyOut, ...recentExpenses]
      .sort((a, b) => (b.date > a.date ? 1 : -1))
      .slice(0, 8);

    // Settings
    const settings = (await db.prepare('SELECT * FROM company_settings WHERE id = 1').get()) || {};

    res.json({
      agency: settings,
      kpis: {
        totalBookings: Number(bookingsStat.total_bookings),
        confirmedBookings: Number(bookingsStat.confirmed_bookings),
        ongoingBookings: Number(bookingsStat.ongoing_bookings),
        totalInvoicedSales: round2(invoiceStat.total_invoiced),
        customerPaymentsReceived: round2(moneyInStat.total_receipts),
        customerOutstanding: round2(invoiceStat.customer_outstanding),
        supplierBills: round2(supplierStat.total_supplier_bills),
        supplierDue: round2(supplierStat.supplier_due),
        totalExpenses: round2(expenseStat.total_expenses),
        cashAndBankBalance: round2(totalLiquidCash),
        estimatedProfit: round2(bookingsStat.total_estimated_profit),
        finalProfit: round2(bookingsStat.total_final_profit),
        netEstimatedGain: round2(Number(bookingsStat.total_estimated_profit) - Number(expenseStat.total_expenses))
      },
      accounts,
      reminders: {
        overdueCount,
        upcomingCount,
        overdueList: overdueReminders,
        upcomingList: upcomingReminders
      },
      upcomingTrips,
      recentTransactions: allTx
    });
  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 2. BOOKINGS API
// -------------------------------------------------------------
app.get('/api/bookings', async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = `
      SELECT b.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
             p.name as package_name,
             inv.invoice_number, inv.total_amount as invoice_amount, inv.paid_amount as customer_paid, inv.balance_amount as customer_due
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN packages p ON b.package_id = p.id
      LEFT JOIN invoices inv ON inv.booking_id = b.id
      WHERE 1=1
    `;
    const params = [];
    if (status && status !== 'All') {
      query += ` AND b.status = ?`;
      params.push(status);
    }
    if (search) {
      query += ` AND (b.booking_number LIKE ? OR c.name LIKE ? OR b.destination LIKE ? OR c.phone LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    query += ` ORDER BY b.created_at DESC`;
    const bookings = await db.prepare(query).all(...params);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await db.prepare(`
      SELECT b.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.city as customer_city, c.address as customer_address, c.gstin as customer_gstin,
             p.name as package_name, p.inclusions as package_inclusions, p.exclusions as package_exclusions
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN packages p ON b.package_id = p.id
      WHERE b.id = ?
    `).get(id);

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const hotels = await db.prepare(`
      SELECT bh.*, s.name as supplier_name, s.phone as supplier_phone
      FROM booking_hotels bh
      LEFT JOIN suppliers s ON bh.supplier_id = s.id
      WHERE bh.booking_id = ?
    `).all(id);

    const services = await db.prepare(`
      SELECT bs.*, s.name as supplier_name, s.phone as supplier_phone
      FROM booking_services bs
      LEFT JOIN suppliers s ON bs.supplier_id = s.id
      WHERE bs.booking_id = ?
    `).all(id);

    const itinerary = await db.prepare(`
      SELECT * FROM booking_itinerary WHERE booking_id = ? ORDER BY day_number ASC
    `).all(id);

    const invoices = await db.prepare(`SELECT * FROM invoices WHERE booking_id = ?`).all(id);
    const supplierBills = await db.prepare(`
      SELECT sb.*, s.name as supplier_name FROM supplier_bills sb
      LEFT JOIN suppliers s ON sb.supplier_id = s.id
      WHERE sb.booking_id = ?
    `).all(id);
    const receipts = await db.prepare(`SELECT * FROM money_in WHERE booking_id = ? ORDER BY receipt_date DESC`).all(id);
    const payments = await db.prepare(`SELECT * FROM money_out WHERE booking_id = ? ORDER BY payment_date DESC`).all(id);

    res.json({
      booking,
      hotels,
      services,
      itinerary,
      invoices,
      supplierBills,
      receipts,
      payments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const {
      customerId,
      newCustomer,
      packageId,
      destination,
      startDate,
      durationDays = 5,
      paxAdults = 2,
      paxChildren = 0,
      paxInfants = 0,
      sellingPrice = 0,
      taxRate = 5.0,
      customerNotes = '',
      internalNotes = '',
      hotels = [],
      services = [],
      itineraryDays = []
    } = req.body;

    // Resolve or create customer (optional - uses walk-in if not provided)
    let finalCustId = customerId;
    if (!finalCustId && newCustomer && newCustomer.name) {
      // Auto-create new customer and save for next time
      finalCustId = `CUST-${Date.now().toString().slice(-6)}`;
      await db.prepare(`
        INSERT INTO customers (id, name, phone, email, city, state, address, gstin, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        finalCustId,
        newCustomer.name,
        newCustomer.phone || '',
        newCustomer.email || '',
        newCustomer.city || '',
        newCustomer.state || '',
        newCustomer.address || '',
        newCustomer.gstin || '',
        'Auto-saved during booking'
      );
    }

    // If no customer at all, use/create a generic "Walk-in Guest" entry
    if (!finalCustId) {
      let walkIn = await db.prepare(`SELECT id FROM customers WHERE name = 'Walk-in Guest' LIMIT 1`).get();
      if (!walkIn) {
        const wid = `CUST-WALKIN`;
        await db.prepare(`INSERT INTO customers (id, name, phone, email, city, notes) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`)
          .run(wid, 'Walk-in Guest', '', '', '', 'Default walk-in guest');
        finalCustId = wid;
      } else {
        finalCustId = walkIn.id;
      }
    }

    const durationNights = Math.max(1, Number(durationDays) - 1);
    const endDate = calculateEndDate(startDate, durationDays);

    // Calculate totals
    const numDays = Number(durationDays) || 1;
    const baseSelling = Number(sellingPrice) || 0;
    const taxAmount = round2((baseSelling * Number(taxRate)) / 100);
    const grossTotal = round2(baseSelling + taxAmount);

    // Calculate hotel costs
    let totalHotelsCost = 0;
    for (const h of hotels) {
      const nights = Number(h.nights) || 1;
      const rooms = Number(h.numRooms) || 1;
      const rate = Number(h.ratePerNight) || 0;
      totalHotelsCost += nights * rooms * rate;
    }

    // Calculate services cost
    let totalServicesCost = 0;
    for (const s of services) {
      totalServicesCost += Number(s.costPrice) || 0;
    }

    const totalSupplierCost = round2(totalHotelsCost + totalServicesCost);
    const estimatedProfit = round2(baseSelling - totalSupplierCost);

    const bookingId = await generateId('TRV', 'bookings');
    const bookingNumber = bookingId;

    // Insert booking
    await db.prepare(`
      INSERT INTO bookings (
        id, booking_number, customer_id, package_id, destination, start_date, end_date,
        duration_days, duration_nights, pax_adults, pax_children, pax_infants, status,
        selling_price, tax_amount, gross_total, total_supplier_cost, estimated_profit, final_profit,
        customer_notes, internal_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      bookingId, bookingNumber, finalCustId, packageId || null, destination, startDate, endDate,
      numDays, durationNights, Number(paxAdults), Number(paxChildren), Number(paxInfants), 'Confirmed',
      baseSelling, taxAmount, grossTotal, totalSupplierCost, estimatedProfit, estimatedProfit,
      customerNotes, internalNotes
    );

    // Insert hotels & check if need to save to hotel master
    for (let idx = 0; idx < hotels.length; idx++) {
      const h = hotels[idx];
      let hotelId = h.hotelId;
      // If user checked saveToMaster and no existing hotelId
      if (h.saveToMaster && !hotelId && h.hotelName) {
        hotelId = `HTL-${Date.now().toString().slice(-4)}${idx}`;
        await db.prepare(`
          INSERT INTO hotels (id, name, destination, star_rating, address, supplier_id, room_types, base_rate, meal_plans)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          hotelId, h.hotelName, destination, 4, h.address || '', h.supplierId || null,
          JSON.stringify([h.roomType || 'Standard']), Number(h.ratePerNight) || 0,
          JSON.stringify([h.mealPlan || 'CP'])
        );
      }

      const hCost = (Number(h.nights) || 1) * (Number(h.numRooms) || 1) * (Number(h.ratePerNight) || 0);
      await db.prepare(`
        INSERT INTO booking_hotels (
          id, booking_id, hotel_id, hotel_name, destination, room_type, num_rooms, meal_plan,
          check_in, check_out, nights, rate_per_night, total_cost, supplier_id, supplier_advance_paid, supplier_payment_due_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `BH-${Date.now().toString().slice(-6)}-${idx}`, bookingId, hotelId || null, h.hotelName, destination,
        h.roomType || 'Deluxe Room', Number(h.numRooms) || 1, h.mealPlan || 'CP (Breakfast)',
        h.checkIn || startDate, h.checkOut || endDate, Number(h.nights) || 1, Number(h.ratePerNight) || 0,
        round2(hCost), h.supplierId || null, Number(h.advancePaid) || 0, h.paymentDueDate || startDate, h.notes || ''
      );

      // Create supplier bill if supplier attached
      if (h.supplierId && hCost > 0) {
        const sBillId = `SBILL-${Date.now().toString().slice(-6)}-${idx}`;
        const adv = Number(h.advancePaid) || 0;
        const bal = round2(hCost - adv);
        await db.prepare(`
          INSERT INTO supplier_bills (id, bill_number, supplier_id, booking_id, bill_date, due_date, category, total_amount, paid_amount, balance_due, status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          sBillId, `BILL-HTL-${bookingId.slice(-4)}`, h.supplierId, bookingId,
          startDate, h.paymentDueDate || startDate, 'Hotel', round2(hCost), adv, bal,
          bal <= 0 ? 'Paid' : adv > 0 ? 'Partial' : 'Unpaid', `Hotel stay for booking ${bookingNumber}`
        );

        if (bal > 0) {
          const sup = await db.prepare('SELECT name, phone, email FROM suppliers WHERE id = ?').get(h.supplierId);
          await db.prepare(`
            INSERT INTO payment_reminders (id, reminder_type, party_type, party_id, party_name, party_phone, party_email, booking_id, booking_number, reference_id, amount_due, due_date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            `REM-SUP-${Date.now().toString().slice(-6)}-${idx}`, 'Supplier Payment', 'Supplier', h.supplierId,
            sup?.name || 'Hotel Supplier', sup?.phone || '', sup?.email || '', bookingId, bookingNumber,
            sBillId, bal, h.paymentDueDate || startDate, 'Pending'
          );
        }
      }
    }

    // Insert Services
    for (let idx = 0; idx < services.length; idx++) {
      const s = services[idx];
      const sCost = Number(s.costPrice) || 0;
      const sSell = Number(s.sellingPrice) || 0;
      await db.prepare(`
        INSERT INTO booking_services (id, booking_id, service_type, description, supplier_id, cost_price, selling_price, payment_due_date, supplier_advance_paid, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `BS-${Date.now().toString().slice(-6)}-${idx}`, bookingId, s.serviceType || 'Transport/Cab',
        s.description || 'Sightseeing / Transfer', s.supplierId || null, sCost, sSell,
        s.paymentDueDate || startDate, Number(s.advancePaid) || 0, s.notes || ''
      );

      // Create supplier bill for service if supplier exists
      if (s.supplierId && sCost > 0) {
        const sBillId = `SBILL-SVC-${Date.now().toString().slice(-6)}-${idx}`;
        const adv = Number(s.advancePaid) || 0;
        const bal = round2(sCost - adv);
        await db.prepare(`
          INSERT INTO supplier_bills (id, bill_number, supplier_id, booking_id, bill_date, due_date, category, total_amount, paid_amount, balance_due, status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          sBillId, `BILL-SVC-${bookingId.slice(-4)}`, s.supplierId, bookingId,
          startDate, s.paymentDueDate || startDate, s.serviceType || 'Transport/Cab', round2(sCost), adv, bal,
          bal <= 0 ? 'Paid' : adv > 0 ? 'Partial' : 'Unpaid', `Service bill for booking ${bookingNumber}`
        );

        if (bal > 0) {
          const sup = await db.prepare('SELECT name, phone, email FROM suppliers WHERE id = ?').get(s.supplierId);
          await db.prepare(`
            INSERT INTO payment_reminders (id, reminder_type, party_type, party_id, party_name, party_phone, party_email, booking_id, booking_number, reference_id, amount_due, due_date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            `REM-SVC-${Date.now().toString().slice(-6)}-${idx}`, 'Supplier Payment', 'Supplier', s.supplierId,
            sup?.name || 'Service Supplier', sup?.phone || '', sup?.email || '', bookingId, bookingNumber,
            sBillId, bal, s.paymentDueDate || startDate, 'Pending'
          );
        }
      }
    }

    // Insert booking itinerary snapshot
    for (let idx = 0; idx < itineraryDays.length; idx++) {
      const d = itineraryDays[idx];
      await db.prepare(`
        INSERT INTO booking_itinerary (id, booking_id, day_number, date, title, morning_activity, afternoon_activity, evening_activity, stay_hotel, meals_included)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `BITIN-${Date.now().toString().slice(-6)}-${idx}`, bookingId, d.day || (idx + 1), d.date || '',
        d.title || `Day ${idx + 1}`, d.morningActivity || '', d.afternoonActivity || '', d.eveningActivity || '',
        d.stayHotel || '', d.mealsIncluded || ''
      );
    }

    // Auto-generate Customer Invoice
    const invoiceId = await generateId('INV', 'invoices');
    const invoiceDueDate = calculateEndDate(startDate, Math.max(1, numDays - 2)); // 2 days before trip
    await db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, booking_id, customer_id, invoice_date, due_date, subtotal,
        gst_rate, gst_amount, total_amount, paid_amount, balance_amount, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceId, invoiceId, bookingId, finalCustId, new Date().toISOString().split('T')[0], invoiceDueDate,
      baseSelling, Number(taxRate), taxAmount, grossTotal, 0.0, grossTotal, 'Unpaid',
      `Tax invoice for tour to ${destination}`
    );

    // Auto-create Payment Reminder for customer
    const cust = await db.prepare('SELECT name, phone, email FROM customers WHERE id = ?').get(finalCustId);
    await db.prepare(`
      INSERT INTO payment_reminders (
        id, reminder_type, party_type, party_id, party_name, party_phone, party_email,
        booking_id, booking_number, reference_id, amount_due, due_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `REM-CUST-${Date.now().toString().slice(-6)}`, 'Customer Payment', 'Customer', finalCustId,
      cust?.name || 'Customer', cust?.phone || '', cust?.email || '', bookingId, bookingNumber,
      invoiceId, grossTotal, invoiceDueDate, 'Pending'
    );

    // Log audit
    await db.prepare(`
      INSERT INTO audit_logs (action, entity, entity_id, details)
      VALUES (?, ?, ?, ?)
    `).run('CREATE_BOOKING', 'bookings', bookingId, `Created booking #${bookingNumber} for ${cust?.name} (${grossTotal})`);

    res.json({
      success: true,
      bookingId,
      bookingNumber,
      grossTotal,
      message: `Booking #${bookingNumber} created successfully with invoice #${invoiceId}!`
    });
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/bookings/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 3. PACKAGES API
// -------------------------------------------------------------
app.get('/api/packages', async (req, res) => {
  try {
    const packages = await db.prepare('SELECT * FROM packages ORDER BY created_at DESC').all();
    res.json(packages.map(p => ({
      ...p,
      day_wise_itinerary: p.day_wise_itinerary ? (typeof p.day_wise_itinerary === 'string' ? JSON.parse(p.day_wise_itinerary) : p.day_wise_itinerary) : []
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/packages/:id', async (req, res) => {
  try {
    const p = await db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);
    if (!p) return res.status(404).json({ error: 'Package not found' });
    res.json({
      ...p,
      day_wise_itinerary: p.day_wise_itinerary ? (typeof p.day_wise_itinerary === 'string' ? JSON.parse(p.day_wise_itinerary) : p.day_wise_itinerary) : []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/packages', async (req, res) => {
  try {
    const {
      name,
      destination,
      country = 'India',
      description = '',
      durationDays = 5,
      durationNights = 4,
      sellingPrice = 0,
      estimatedCost = 0,
      pricingBasis = 'Per Person (Twin Sharing)',
      inclusions = '',
      exclusions = '',
      cancellationTerms = '',
      dayWiseItinerary = [],
      imageUrl = ''
    } = req.body;

    const pkgId = await generateId('PKG', 'packages');
    await db.prepare(`
      INSERT INTO packages (
        id, name, destination, country, description, duration_days, duration_nights,
        selling_price, estimated_cost, pricing_basis, inclusions, exclusions, cancellation_terms,
        day_wise_itinerary, image_url, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pkgId, name, destination, country, description, Number(durationDays), Number(durationNights),
      Number(sellingPrice), Number(estimatedCost), pricingBasis,
      typeof inclusions === 'string' ? inclusions : inclusions.join('\n'),
      typeof exclusions === 'string' ? exclusions : exclusions.join('\n'),
      typeof cancellationTerms === 'string' ? cancellationTerms : cancellationTerms.join('\n'),
      JSON.stringify(dayWiseItinerary || []), imageUrl, 1
    );

    res.json({ success: true, packageId: pkgId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/packages/:id', async (req, res) => {
  try {
    const {
      name,
      destination,
      country,
      description,
      durationDays,
      durationNights,
      sellingPrice,
      estimatedCost,
      pricingBasis,
      inclusions,
      exclusions,
      cancellationTerms,
      dayWiseItinerary,
      imageUrl,
      isActive
    } = req.body;

    await db.prepare(`
      UPDATE packages SET
        name = ?, destination = ?, country = ?, description = ?, duration_days = ?, duration_nights = ?,
        selling_price = ?, estimated_cost = ?, pricing_basis = ?, inclusions = ?, exclusions = ?,
        cancellation_terms = ?, day_wise_itinerary = ?, image_url = ?, is_active = ?
      WHERE id = ?
    `).run(
      name, destination, country, description, Number(durationDays), Number(durationNights),
      Number(sellingPrice), Number(estimatedCost), pricingBasis,
      typeof inclusions === 'string' ? inclusions : inclusions?.join('\n') || '',
      typeof exclusions === 'string' ? exclusions : exclusions?.join('\n') || '',
      typeof cancellationTerms === 'string' ? cancellationTerms : cancellationTerms?.join('\n') || '',
      JSON.stringify(dayWiseItinerary || []), imageUrl, isActive ? 1 : 0, req.params.id
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/packages/:id/duplicate', async (req, res) => {
  try {
    const original = await db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);
    if (!original) return res.status(404).json({ error: 'Package not found' });

    const newId = await generateId('PKG', 'packages');
    await db.prepare(`
      INSERT INTO packages (
        id, name, destination, country, description, duration_days, duration_nights,
        selling_price, estimated_cost, pricing_basis, inclusions, exclusions, cancellation_terms,
        day_wise_itinerary, image_url, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId, `${original.name} (Copy)`, original.destination, original.country, original.description,
      original.duration_days, original.duration_nights, original.selling_price, original.estimated_cost,
      original.pricing_basis, original.inclusions, original.exclusions, original.cancellation_terms,
      original.day_wise_itinerary, original.image_url, 1
    );

    res.json({ success: true, newId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/packages/:id', async (req, res) => {
  try {
    await db.prepare('DELETE FROM packages WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 4. HOTELS API
// -------------------------------------------------------------
app.get('/api/hotels', async (req, res) => {
  try {
    const hotels = await db.prepare(`
      SELECT h.*, s.name as supplier_name
      FROM hotels h
      LEFT JOIN suppliers s ON h.supplier_id = s.id
      ORDER BY h.destination ASC, h.name ASC
    `).all();
    res.json(hotels.map(h => ({
      ...h,
      room_types: h.room_types ? (typeof h.room_types === 'string' ? JSON.parse(h.room_types) : h.room_types) : [],
      meal_plans: h.meal_plans ? (typeof h.meal_plans === 'string' ? JSON.parse(h.meal_plans) : h.meal_plans) : []
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/hotels', async (req, res) => {
  try {
    const { name, destination, starRating = 3, address = '', supplierId, phone = '', email = '', roomTypes = ['Deluxe'], baseRate = 0, mealPlans = ['CP'], paymentTerms = '', cancellationPolicy = '' } = req.body;
    const hotelId = `HTL-${Date.now().toString().slice(-4)}`;
    await db.prepare(`
      INSERT INTO hotels (id, name, destination, star_rating, address, supplier_id, phone, email, room_types, base_rate, meal_plans, payment_terms, cancellation_policy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      hotelId, name, destination, Number(starRating), address, supplierId || null, phone, email,
      JSON.stringify(roomTypes), Number(baseRate), JSON.stringify(mealPlans), paymentTerms, cancellationPolicy
    );
    res.json({ success: true, hotelId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 5. CUSTOMERS & SUPPLIERS
// -------------------------------------------------------------
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await db.prepare(`
      SELECT c.*,
             COUNT(DISTINCT b.id) as total_bookings,
             COALESCE(SUM(inv.total_amount), 0) as total_invoiced,
             COALESCE(SUM(inv.balance_amount), 0) as total_outstanding
      FROM customers c
      LEFT JOIN bookings b ON b.customer_id = c.id
      LEFT JOIN invoices inv ON inv.customer_id = c.id AND inv.status != 'Cancelled'
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { name, phone, email = '', city = '', state = '', address = '', gstin = '', emergencyContact = '', notes = '' } = req.body;
    const id = `CUST-${Date.now().toString().slice(-4)}`;
    await db.prepare(`
      INSERT INTO customers (id, name, phone, email, city, state, address, gstin, emergency_contact, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, phone, email, city, state, address, gstin, emergencyContact, notes);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customers/:id/statement', async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    const bookings = await db.prepare('SELECT * FROM bookings WHERE customer_id = ? ORDER BY start_date DESC').all(id);
    const invoices = await db.prepare('SELECT * FROM invoices WHERE customer_id = ? ORDER BY invoice_date DESC').all(id);
    const receipts = await db.prepare('SELECT * FROM money_in WHERE customer_id = ? ORDER BY receipt_date DESC').all(id);

    res.json({
      customer,
      bookings,
      invoices,
      receipts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/suppliers', async (req, res) => {
  try {
    const suppliers = await db.prepare(`
      SELECT s.*,
             COALESCE(SUM(sb.total_amount), 0) as total_billed,
             COALESCE(SUM(sb.paid_amount), 0) as total_paid,
             COALESCE(SUM(sb.balance_due), 0) as total_due
      FROM suppliers s
      LEFT JOIN supplier_bills sb ON sb.supplier_id = s.id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `).all();
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/suppliers', async (req, res) => {
  try {
    const { name, category = 'Hotel', contactPerson = '', phone, email = '', city = '', state = '', bankDetails = '', upiId = '', gstin = '', notes = '' } = req.body;
    const id = `SUP-${Date.now().toString().slice(-4)}`;
    await db.prepare(`
      INSERT INTO suppliers (id, name, category, contact_person, phone, email, city, state, bank_details, upi_id, gstin, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, category, contactPerson, phone, email, city, state, bankDetails, upiId, gstin, notes);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 6. MONEY IN (CUSTOMER PAYMENTS & ALLOCATIONS)
// -------------------------------------------------------------
app.get('/api/money-in', async (req, res) => {
  try {
    const receipts = await db.prepare(`
      SELECT m.*, c.name as customer_name, c.phone as customer_phone,
             b.booking_number, a.account_name
      FROM money_in m
      LEFT JOIN customers c ON m.customer_id = c.id
      LEFT JOIN bookings b ON m.booking_id = b.id
      LEFT JOIN accounts a ON m.account_id = a.id
      ORDER BY m.receipt_date DESC, m.created_at DESC
    `).all();
    res.json(receipts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/money-in', async (req, res) => {
  try {
    const {
      customerId,
      bookingId,
      invoiceId,
      receiptDate = new Date().toISOString().split('T')[0],
      receiptType = 'Customer Payment',
      amount,
      paymentMode = 'UPI',
      accountId = 'ACC-02',
      referenceNo = '',
      notes = ''
    } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    const receiptId = await generateId('REC', 'money_in');

    // 1. Insert receipt
    await db.prepare(`
      INSERT INTO money_in (id, receipt_number, receipt_date, customer_id, booking_id, invoice_id, receipt_type, amount, payment_mode, account_id, reference_no, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      receiptId, receiptId, receiptDate, customerId || null, bookingId || null, invoiceId || null,
      receiptType, numAmount, paymentMode, accountId, referenceNo, notes
    );

    // 2. Increase account liquid balance
    await db.prepare(`
      UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?
    `).run(numAmount, accountId);

    // 3. Allocate to invoice if invoiceId provided
    if (invoiceId) {
      const inv = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
      if (inv) {
        const newPaid = round2((Number(inv.paid_amount) || 0) + numAmount);
        const newBal = round2(Math.max(0, (Number(inv.total_amount) || 0) - newPaid));
        const newStatus = newBal <= 0 ? 'Paid' : newPaid > 0 ? 'Partial' : 'Unpaid';

        await db.prepare(`
          UPDATE invoices SET paid_amount = ?, balance_amount = ?, status = ? WHERE id = ?
        `).run(newPaid, newBal, newStatus, invoiceId);

        // Auto settle or update payment reminder
        if (newBal <= 0) {
          await db.prepare(`
            UPDATE payment_reminders SET status = 'Settled' WHERE reference_id = ?
          `).run(invoiceId);
        } else {
          await db.prepare(`
            UPDATE payment_reminders SET amount_due = ? WHERE reference_id = ?
          `).run(newBal, invoiceId);
        }
      }
    }

    // 4. Audit Log
    await db.prepare(`
      INSERT INTO audit_logs (action, entity, entity_id, details)
      VALUES (?, ?, ?, ?)
    `).run('RECEIVE_PAYMENT', 'money_in', receiptId, `Received ₹${numAmount} via ${paymentMode} from customer ${customerId}`);

    res.json({ success: true, receiptId, message: `Receipt ${receiptId} recorded successfully!` });
  } catch (err) {
    console.error('Error recording money in:', err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 7. MONEY OUT (SUPPLIER PAYMENTS & ALLOCATIONS)
// -------------------------------------------------------------
app.get('/api/money-out', async (req, res) => {
  try {
    const payments = await db.prepare(`
      SELECT mo.*, s.name as supplier_name, s.phone as supplier_phone,
             b.booking_number, a.account_name, sb.bill_number
      FROM money_out mo
      LEFT JOIN suppliers s ON mo.supplier_id = s.id
      LEFT JOIN bookings b ON mo.booking_id = b.id
      LEFT JOIN supplier_bills sb ON mo.bill_id = sb.id
      LEFT JOIN accounts a ON mo.account_id = a.id
      ORDER BY mo.payment_date DESC, mo.created_at DESC
    `).all();
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/money-out', async (req, res) => {
  try {
    const {
      supplierId,
      bookingId,
      billId,
      paymentDate = new Date().toISOString().split('T')[0],
      paymentType = 'Supplier Bill Payment',
      amount,
      paymentMode = 'Bank Transfer',
      accountId = 'ACC-02',
      referenceNo = '',
      notes = ''
    } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    const paymentId = await generateId('PAY', 'money_out');

    // 1. Insert payment record
    await db.prepare(`
      INSERT INTO money_out (id, payment_number, payment_date, supplier_id, booking_id, bill_id, payment_type, amount, payment_mode, account_id, reference_no, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      paymentId, paymentId, paymentDate, supplierId || null, bookingId || null, billId || null,
      paymentType, numAmount, paymentMode, accountId, referenceNo, notes
    );

    // 2. Deduct from account balance
    await db.prepare(`
      UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?
    `).run(numAmount, accountId);

    // 3. Allocate to supplier bill
    if (billId) {
      const bill = await db.prepare('SELECT * FROM supplier_bills WHERE id = ?').get(billId);
      if (bill) {
        const newPaid = round2((Number(bill.paid_amount) || 0) + numAmount);
        const newBal = round2(Math.max(0, (Number(bill.total_amount) || 0) - newPaid));
        const newStatus = newBal <= 0 ? 'Paid' : newPaid > 0 ? 'Partial' : 'Unpaid';

        await db.prepare(`
          UPDATE supplier_bills SET paid_amount = ?, balance_due = ?, status = ? WHERE id = ?
        `).run(newPaid, newBal, newStatus, billId);

        // Auto settle or update reminder
        if (newBal <= 0) {
          await db.prepare(`
            UPDATE payment_reminders SET status = 'Settled' WHERE reference_id = ?
          `).run(billId);
        } else {
          await db.prepare(`
            UPDATE payment_reminders SET amount_due = ? WHERE reference_id = ?
          `).run(newBal, billId);
        }
      }
    }

    // 4. Audit Log
    await db.prepare(`
      INSERT INTO audit_logs (action, entity, entity_id, details)
      VALUES (?, ?, ?, ?)
    `).run('SUPPLIER_PAYMENT', 'money_out', paymentId, `Paid ₹${numAmount} via ${paymentMode} to supplier ${supplierId}`);

    res.json({ success: true, paymentId, message: `Payment ${paymentId} recorded successfully!` });
  } catch (err) {
    console.error('Error recording money out:', err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 8. EXPENSES API
// -------------------------------------------------------------
app.get('/api/expenses', async (req, res) => {
  try {
    const expenses = await db.prepare(`
      SELECT e.*, a.account_name
      FROM expenses e
      LEFT JOIN accounts a ON e.account_id = a.id
      ORDER BY e.expense_date DESC, e.created_at DESC
    `).all();

    const categorySummary = await db.prepare(`
      SELECT category, SUM(amount) as total
      FROM expenses
      GROUP BY category
      ORDER BY total DESC
    `).all();

    res.json({ expenses, categorySummary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const {
      expenseDate = new Date().toISOString().split('T')[0],
      category,
      amount,
      paymentMode = 'UPI',
      accountId = 'ACC-02',
      vendorName = '',
      referenceNo = '',
      taxDeductible = true,
      notes = ''
    } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid expense amount is required' });
    }

    const expenseId = await generateId('EXP', 'expenses');

    await db.prepare(`
      INSERT INTO expenses (id, expense_number, expense_date, category, amount, payment_mode, account_id, vendor_name, reference_no, tax_deductible, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      expenseId, expenseId, expenseDate, category, numAmount, paymentMode, accountId,
      vendorName, referenceNo, taxDeductible ? 1 : 0, notes
    );

    // Deduct from bank/cash account
    await db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(numAmount, accountId);

    // Audit log
    await db.prepare(`
      INSERT INTO audit_logs (action, entity, entity_id, details)
      VALUES (?, ?, ?, ?)
    `).run('ADD_EXPENSE', 'expenses', expenseId, `Recorded expense ₹${numAmount} under ${category}`);

    res.json({ success: true, expenseId, message: `Expense recorded successfully!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 9. REMINDERS & AUTOMATION
// -------------------------------------------------------------
app.get('/api/reminders', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM payment_reminders';
    const params = [];
    if (status && status !== 'All') {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY due_date ASC';
    const reminders = await db.prepare(query).all(...params);

    const settings = (await db.prepare('SELECT * FROM company_settings WHERE id = 1').get()) || {};

    // Generate WhatsApp and Email prefilled links for each reminder
    const enriched = reminders.map(r => {
      const cleanPhone = (r.party_phone || '').replace(/[^0-9]/g, '');
      const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      
      let text = settings.reminder_whatsapp_template || 'Dear {customer_name}, reminder for payment of ₹{amount} for booking #{booking_id}.';
      text = text
        .replace('{customer_name}', r.party_name)
        .replace('{supplier_name}', r.party_name)
        .replace('{agency_name}', settings.agency_name || 'Travel Agency')
        .replace('{currency_symbol}', '₹')
        .replace('{amount}', r.amount_due)
        .replace('{booking_id}', r.booking_number || '')
        .replace('{destination}', '')
        .replace('{due_date}', r.due_date)
        .replace('{upi_id}', settings.upi_id || '')
        .replace('{phone}', settings.phone || '');

      const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
      const mailtoUrl = `mailto:${r.party_email || ''}?subject=${encodeURIComponent(`Payment Due Reminder: Booking #${r.booking_number}`)}&body=${encodeURIComponent(text)}`;

      return {
        ...r,
        whatsappUrl,
        mailtoUrl,
        reminderMessage: text
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reminders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, sentVia } = req.body;
    await db.prepare(`
      UPDATE payment_reminders 
      SET status = ?, sent_via = COALESCE(?, sent_via), sent_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, sentVia || null, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 10. FINANCIAL REPORTS & ANALYTICS
// -------------------------------------------------------------
app.get('/api/reports', async (req, res) => {
  try {
    const { type = 'pnl', startDate, endDate } = req.query;

    if (type === 'pnl') {
      // Profit & Loss
      const rev = await db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total_sales,
               COALESCE(SUM(subtotal), 0) as net_sales,
               COALESCE(SUM(gst_amount), 0) as gst_collected
        FROM invoices WHERE status != 'Cancelled'
      `).get();

      const cost = await db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as direct_supplier_costs
        FROM supplier_bills
      `).get();

      const exp = await db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as operating_expenses
        FROM expenses
      `).get();

      const expByCategory = await db.prepare(`
        SELECT category, SUM(amount) as amount FROM expenses GROUP BY category ORDER BY amount DESC
      `).all();

      const grossProfit = round2(Number(rev.net_sales) - Number(cost.direct_supplier_costs));
      const netProfit = round2(grossProfit - Number(exp.operating_expenses));

      return res.json({
        totalRevenue: Number(rev.net_sales),
        gstCollected: Number(rev.gst_collected),
        totalSalesGross: Number(rev.total_sales),
        directSupplierCosts: Number(cost.direct_supplier_costs),
        grossProfit,
        grossProfitMargin: Number(rev.net_sales) > 0 ? round2((grossProfit / Number(rev.net_sales)) * 100) : 0,
        operatingExpenses: Number(exp.operating_expenses),
        netProfit,
        netProfitMargin: Number(rev.net_sales) > 0 ? round2((netProfit / Number(rev.net_sales)) * 100) : 0,
        expenseBreakdown: expByCategory
      });
    }

    if (type === 'ageing') {
      // Customer Outstanding Ageing (0-30, 31-60, 61-90, 90+)
      const invoices = await db.prepare(`
        SELECT inv.*, c.name as customer_name, c.phone as customer_phone, b.destination
        FROM invoices inv
        JOIN customers c ON inv.customer_id = c.id
        LEFT JOIN bookings b ON inv.booking_id = b.id
        WHERE inv.balance_amount > 0 AND inv.status != 'Cancelled'
        ORDER BY inv.due_date ASC
      `).all();

      const today = new Date();
      const buckets = {
        current: [],    // Not overdue yet
        days0_30: [],   // Overdue 1-30 days
        days31_60: [],  // Overdue 31-60 days
        days61_90: [],  // Overdue 61-90 days
        days90Plus: []  // Overdue > 90 days
      };

      for (const inv of invoices) {
        const dueDate = new Date(inv.due_date);
        const diffTime = today - dueDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          buckets.current.push({ ...inv, overdueDays: 0 });
        } else if (diffDays <= 30) {
          buckets.days0_30.push({ ...inv, overdueDays: diffDays });
        } else if (diffDays <= 60) {
          buckets.days31_60.push({ ...inv, overdueDays: diffDays });
        } else if (diffDays <= 90) {
          buckets.days61_90.push({ ...inv, overdueDays: diffDays });
        } else {
          buckets.days90Plus.push({ ...inv, overdueDays: diffDays });
        }
      }

      return res.json({
        summary: {
          currentTotal: round2(buckets.current.reduce((s, i) => s + (Number(i.balance_amount) || 0), 0)),
          days0_30Total: round2(buckets.days0_30.reduce((s, i) => s + (Number(i.balance_amount) || 0), 0)),
          days31_60Total: round2(buckets.days31_60.reduce((s, i) => s + (Number(i.balance_amount) || 0), 0)),
          days61_90Total: round2(buckets.days61_90.reduce((s, i) => s + (Number(i.balance_amount) || 0), 0)),
          days90PlusTotal: round2(buckets.days90Plus.reduce((s, i) => s + (Number(i.balance_amount) || 0), 0)),
          grandTotal: round2(invoices.reduce((s, i) => s + (Number(i.balance_amount) || 0), 0))
        },
        buckets
      });
    }

    if (type === 'profitability') {
      // Booking-wise Estimated vs Final Profitability
      const list = await db.prepare(`
        SELECT b.id, b.booking_number, b.destination, b.start_date, b.end_date, b.status,
               c.name as customer_name,
               b.selling_price, b.total_supplier_cost, b.estimated_profit, b.final_profit,
               (b.selling_price - b.total_supplier_cost) as calculated_margin,
               ROUND(CAST(((b.selling_price - b.total_supplier_cost) / NULLIF(b.selling_price, 0)) * 100 AS numeric), 1) as margin_percentage
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        WHERE b.status != 'Cancelled'
        ORDER BY b.start_date DESC
      `).all();

      return res.json(list);
    }

    if (type === 'cashbook') {
      // Cash & Bank Book
      const moneyIn = await db.prepare(`
        SELECT receipt_date as tx_date, 'Money In' as type, receipt_number as ref, 
               amount as debit, 0 as credit, payment_mode, a.account_name, notes
        FROM money_in m
        JOIN accounts a ON m.account_id = a.id
      `).all();

      const moneyOut = await db.prepare(`
        SELECT payment_date as tx_date, 'Money Out' as type, payment_number as ref, 
               0 as debit, amount as credit, payment_mode, a.account_name, notes
        FROM money_out mo
        JOIN accounts a ON mo.account_id = a.id
      `).all();

      const expenses = await db.prepare(`
        SELECT expense_date as tx_date, 'Expense' as type, expense_number as ref, 
               0 as debit, amount as credit, payment_mode, a.account_name, category || ' - ' || notes as notes
        FROM expenses e
        JOIN accounts a ON e.account_id = a.id
      `).all();

      const combined = [...moneyIn, ...moneyOut, ...expenses]
        .sort((a, b) => (b.tx_date > a.tx_date ? 1 : -1));

      return res.json(combined);
    }

    res.status(400).json({ error: 'Unknown report type' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 11. AI ITINERARY GENERATOR API
// -------------------------------------------------------------
app.post('/api/ai/generate-itinerary', async (req, res) => {
  try {
    const result = await generateAItinerary(req.body);
    res.json(result);
  } catch (err) {
    console.error('Error in AI itinerary generator:', err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 12. SETTINGS API
// -------------------------------------------------------------
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.prepare('SELECT * FROM company_settings WHERE id = 1').get();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const fields = req.body;
    const keys = Object.keys(fields);
    if (keys.length === 0) return res.json({ success: true });

    const setClauses = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => fields[k]);
    values.push(1); // id = 1

    await db.prepare(`UPDATE company_settings SET ${setClauses} WHERE id = ?`).run(...values);
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 13. ACCOUNTS API
// -------------------------------------------------------------
app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await db.prepare('SELECT * FROM accounts').all();
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await db.prepare(`
      SELECT inv.*, c.name as customer_name, c.phone as customer_phone, b.booking_number, b.destination
      FROM invoices inv
      JOIN customers c ON inv.customer_id = c.id
      JOIN bookings b ON inv.booking_id = b.id
      ORDER BY inv.invoice_date DESC
    `).all();
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/supplier-bills', async (req, res) => {
  try {
    const bills = await db.prepare(`
      SELECT sb.*, s.name as supplier_name, s.phone as supplier_phone, b.booking_number
      FROM supplier_bills sb
      JOIN suppliers s ON sb.supplier_id = s.id
      LEFT JOIN bookings b ON sb.booking_id = b.id
      ORDER BY sb.bill_date DESC
    `).all();
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 14. AUTHENTICATION & RBAC (USER MANAGEMENT)
// -------------------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await db.prepare(
      'SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND is_active = 1'
    ).get(email.trim());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or user account is disabled' });
    }

    if (user.password !== password.trim()) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Return safe user payload (omit password)
    const { password: _, ...safeUser } = user;
    res.json({
      success: true,
      user: safeUser,
      message: `Welcome back, ${safeUser.name}!`
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await db.prepare(
      'SELECT id, name, email, role, phone, avatar, is_active, created_at FROM users ORDER BY created_at ASC'
    ).all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, email, password, role = 'sales', phone = '', avatar = '' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = await db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
    if (existing) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const userId = await generateId('USR', 'users');
    await db.prepare(`
      INSERT INTO users (id, name, email, password, role, phone, avatar, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(userId, name.trim(), email.trim().toLowerCase(), password.trim(), role, phone, avatar);

    res.json({
      success: true,
      userId,
      message: `User ${name} created successfully with role ${role}!`
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, phone, password, is_active } = req.body;

    const existing = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    let updateQuery = 'UPDATE users SET name = ?, email = ?, role = ?, phone = ?, is_active = ?';
    const params = [
      name || existing.name,
      email ? email.trim().toLowerCase() : existing.email,
      role || existing.role,
      phone !== undefined ? phone : existing.phone,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active
    ];

    if (password && password.trim()) {
      updateQuery += ', password = ?';
      params.push(password.trim());
    }

    updateQuery += ' WHERE id = ?';
    params.push(id);

    await db.prepare(updateQuery).run(...params);
    res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Don't delete Super Admin with id USR-001
    if (id === 'USR-001') {
      return res.status(400).json({ error: 'Default Super Admin account cannot be deleted' });
    }
    await db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(id);
    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static client bundle if built
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Travel Billing ERP Server running on port ${PORT}`);
});
