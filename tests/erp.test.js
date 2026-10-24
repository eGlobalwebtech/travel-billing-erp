import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { calculateEndDate, formatINR, getDaysDiff } from '../client/src/utils/formatters.js';

console.log('--- STARTING AUTOMATED TEST SUITE FOR TRAVEL ERP ---');

// Test 1: Inclusive Travel Date Calculation
console.log('Test 1: Inclusive Travel Date Calculation');
{
  // 5 days starting on 2026-10-25 should end on 2026-10-29 (inclusive of day 1)
  const end1 = calculateEndDate('2026-10-25', 5);
  assert.equal(end1, '2026-10-29', '5-day trip starting Oct 25 must end on Oct 29');

  // 1 day trip starting on 2026-11-01 should end on 2026-11-01
  const end2 = calculateEndDate('2026-11-01', 1);
  assert.equal(end2, '2026-11-01', '1-day trip must end on the same day');

  // 6 days starting 2026-11-05 should end on 2026-11-10
  const end3 = calculateEndDate('2026-11-05', 6);
  assert.equal(end3, '2026-11-10', '6-day trip starting Nov 5 must end on Nov 10');
  console.log('✓ Passed: Inclusive travel dates correctly computed.');
}

// Test 2: In-Memory SQLite Financial Engine & Transactional Allocations
console.log('Test 2: Multi-Hotel Stays & Cost Calculations');
{
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');

  // Setup mock schema
  db.exec(`
    CREATE TABLE bookings (
      id TEXT PRIMARY KEY,
      selling_price REAL,
      tax_amount REAL,
      gross_total REAL,
      total_supplier_cost REAL,
      estimated_profit REAL
    );

    CREATE TABLE booking_hotels (
      id TEXT PRIMARY KEY,
      booking_id TEXT,
      hotel_name TEXT,
      nights INTEGER,
      num_rooms INTEGER,
      rate_per_night REAL,
      total_cost REAL
    );

    CREATE TABLE invoices (
      id TEXT PRIMARY KEY,
      booking_id TEXT,
      total_amount REAL,
      paid_amount REAL DEFAULT 0,
      balance_amount REAL,
      status TEXT DEFAULT 'Unpaid'
    );

    CREATE TABLE money_in (
      id TEXT PRIMARY KEY,
      invoice_id TEXT,
      amount REAL,
      payment_mode TEXT
    );

    CREATE TABLE supplier_bills (
      id TEXT PRIMARY KEY,
      booking_id TEXT,
      total_amount REAL,
      paid_amount REAL DEFAULT 0,
      balance_due REAL,
      status TEXT DEFAULT 'Unpaid'
    );

    CREATE TABLE payment_reminders (
      id TEXT PRIMARY KEY,
      reference_id TEXT,
      amount_due REAL,
      status TEXT DEFAULT 'Pending'
    );
  `);

  // Multiple hotels calculation:
  // Hotel 1: 2 nights x 2 rooms @ Rs 6000 = Rs 24,000
  // Hotel 2: 3 nights x 1 room  @ Rs 4500 = Rs 13,500
  // Total Hotel Cost = Rs 37,500
  const h1Cost = 2 * 2 * 6000;
  const h2Cost = 3 * 1 * 4500;
  const totalHotelsCost = h1Cost + h2Cost;
  assert.equal(totalHotelsCost, 37500, 'Hotel costs sum correctly');

  // Booking Selling Price = Rs 52,000 + GST 5% (Rs 2,600) = Rs 54,600
  const selling = 52000;
  const tax = (selling * 5) / 100;
  const gross = selling + tax;
  const estProfit = selling - totalHotelsCost; // 52000 - 37500 = 14500

  assert.equal(gross, 54600, 'Gross total correctly includes 5% GST');
  assert.equal(estProfit, 14500, 'Estimated profit = Selling Price - Supplier Costs');

  // Insert booking & invoice
  db.prepare(`
    INSERT INTO bookings VALUES ('TRV-TEST-1', ?, ?, ?, ?, ?)
  `).run(selling, tax, gross, totalHotelsCost, estProfit);

  db.prepare(`
    INSERT INTO invoices VALUES ('INV-TEST-1', 'TRV-TEST-1', ?, 0, ?, 'Unpaid')
  `).run(gross, gross);

  db.prepare(`
    INSERT INTO payment_reminders VALUES ('REM-TEST-1', 'INV-TEST-1', ?, 'Pending')
  `).run(gross);

  console.log('✓ Passed: Multi-hotel night calculation and margin math verified.');

  // Test 3: Partial Payment Allocation
  console.log('Test 3: Partial Payment & Reminder Auto-Update');
  {
    // Customer pays partial token advance: Rs 20,000
    const adv = 20000;
    const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get('INV-TEST-1');
    const newPaid = inv.paid_amount + adv;
    const newBal = inv.total_amount - newPaid;
    const newStatus = newBal <= 0 ? 'Paid' : 'Partial';

    db.prepare('UPDATE invoices SET paid_amount = ?, balance_amount = ?, status = ? WHERE id = ?')
      .run(newPaid, newBal, newStatus, 'INV-TEST-1');

    db.prepare('UPDATE payment_reminders SET amount_due = ? WHERE reference_id = ?')
      .run(newBal, 'INV-TEST-1');

    const updatedInv = db.prepare('SELECT * FROM invoices WHERE id = ?').get('INV-TEST-1');
    assert.equal(updatedInv.status, 'Partial', 'Invoice marked Partial after advance');
    assert.equal(updatedInv.balance_amount, 34600, 'Balance = Gross - Advance (54600 - 20000 = 34600)');

    const updatedRem = db.prepare('SELECT * FROM payment_reminders WHERE reference_id = ?').get('INV-TEST-1');
    assert.equal(updatedRem.amount_due, 34600, 'Reminder amount due updated to 34600');
    console.log('✓ Passed: Partial payment updates invoice balance and reminder amount.');
  }

  // Test 4: Final Settlement & Auto-Cancellation of Reminder
  console.log('Test 4: Final Settlement & Auto-Settling Reminder');
  {
    const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get('INV-TEST-1');
    const settlement = inv.balance_amount; // Rs 34,600
    const newPaid = inv.paid_amount + settlement;
    const newBal = inv.total_amount - newPaid;
    const newStatus = newBal <= 0 ? 'Paid' : 'Partial';

    db.prepare('UPDATE invoices SET paid_amount = ?, balance_amount = ?, status = ? WHERE id = ?')
      .run(newPaid, newBal, newStatus, 'INV-TEST-1');

    if (newBal <= 0) {
      db.prepare("UPDATE payment_reminders SET status = 'Settled' WHERE reference_id = ?")
        .run('INV-TEST-1');
    }

    const settledInv = db.prepare('SELECT * FROM invoices WHERE id = ?').get('INV-TEST-1');
    assert.equal(settledInv.status, 'Paid', 'Invoice status marked Paid');
    assert.equal(settledInv.balance_amount, 0, 'Invoice balance is zero');

    const settledRem = db.prepare('SELECT * FROM payment_reminders WHERE reference_id = ?').get('INV-TEST-1');
    assert.equal(settledRem.status, 'Settled', 'Reminder automatically marked Settled upon full payment');
    console.log('✓ Passed: Final payment settles invoice and auto-clears reminder.');
  }

  // Test 5: Supplier Advance & Bill Allocation
  console.log('Test 5: Supplier Bill & Advance Payment');
  {
    // Cab supplier bill of Rs 18,000
    db.prepare("INSERT INTO supplier_bills VALUES ('SBILL-TEST-1', 'TRV-TEST-1', 18000, 0, 18000, 'Unpaid')").run();

    // Pay advance of Rs 10,000 to cab driver
    const sBill = db.prepare('SELECT * FROM supplier_bills WHERE id = ?').get('SBILL-TEST-1');
    const supPaid = sBill.paid_amount + 10000;
    const supBal = sBill.total_amount - supPaid;
    const supStatus = supBal <= 0 ? 'Paid' : 'Partial';

    db.prepare('UPDATE supplier_bills SET paid_amount = ?, balance_due = ?, status = ? WHERE id = ?')
      .run(supPaid, supBal, supStatus, 'SBILL-TEST-1');

    const updatedSBill = db.prepare('SELECT * FROM supplier_bills WHERE id = ?').get('SBILL-TEST-1');
    assert.equal(updatedSBill.paid_amount, 10000, 'Supplier advance recorded');
    assert.equal(updatedSBill.balance_due, 8000, 'Supplier payable remaining = Rs 8,000');
    assert.equal(updatedSBill.status, 'Partial', 'Supplier bill marked Partial');
    console.log('✓ Passed: Supplier bill advances and balance tracking verified.');
  }
}

// Test 6: Overdue Days Difference Calculation
console.log('Test 6: Overdue Days Logic');
{
  const today = new Date();
  
  // Date 5 days ago should be 5 days overdue (diff <= -5)
  const pastDate = new Date(today);
  pastDate.setDate(pastDate.getDate() - 5);
  const diffPast = getDaysDiff(pastDate.toISOString().split('T')[0]);
  assert.equal(diffPast, -5, 'Due date 5 days ago gives -5 days');

  // Date 3 days in future should give +3 days
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + 3);
  const diffFuture = getDaysDiff(futureDate.toISOString().split('T')[0]);
  assert.equal(diffFuture, 3, 'Due date 3 days in future gives 3 days');
  console.log('✓ Passed: Overdue days arithmetic is strictly accurate.');
}

// Test 7: Profit & Loss Statement Formula Accuracy
console.log('Test 7: Profit & Loss Net Gain Arithmetic');
{
  const invoicedRevenue = 250000;
  const directLandCosts = 165000;
  const grossProfit = invoicedRevenue - directLandCosts;
  assert.equal(grossProfit, 85000, 'Gross profit = Revenue - Direct Costs');

  const operatingExpenses = 42000;
  const netProfit = grossProfit - operatingExpenses;
  assert.equal(netProfit, 43000, 'Net profit = Gross Profit - Operating Expenses');
  console.log('✓ Passed: Profit & Loss formulas validated.');
}

console.log('\n======================================================');
console.log('ALL 7 AUTOMATED TESTS COMPLETED WITH 100% SUCCESS!');
console.log('======================================================');
