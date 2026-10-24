import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Plus, Search, Calendar, CheckCircle, ArrowDownRight, 
  X, Check, DollarSign, User, AlertCircle
} from 'lucide-react';
import { formatINR, formatDate } from '../utils/formatters';
import FilterBar, { exportToCSV } from './FilterBar';

export default function MoneyInView({ isModalOpen, onOpenModal, onCloseModal, prefillBookingId, onRefreshSummary }) {
  const [receipts, setReceipts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', dateFrom: '', dateTo: '', paymentMode: 'All', minAmount: '', maxAmount: '' });
  const handleFilterChange = (key, value) => setFilters(f => ({ ...f, [key]: value }));
  const handleFilterReset = () => setFilters({ search: '', dateFrom: '', dateTo: '', paymentMode: 'All', minAmount: '', maxAmount: '' });
  const search = filters.search; // legacy alias

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptType, setReceiptType] = useState('Customer Payment');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [accountId, setAccountId] = useState('ACC-02');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReceipts();
    loadDependencies();
  }, []);

  useEffect(() => {
    if (prefillBookingId && invoices.length > 0) {
      const inv = invoices.find(i => i.booking_id === prefillBookingId);
      if (inv) {
        setInvoiceId(inv.id);
        setBookingId(inv.booking_id);
        setCustomerId(inv.customer_id);
        setAmount(inv.balance_amount > 0 ? inv.balance_amount : '');
      }
    }
  }, [prefillBookingId, invoices]);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/money-in');
      if (res.ok) setReceipts(await res.json());
    } catch (err) {
      console.error('Failed to load receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDependencies = async () => {
    try {
      const [cRes, iRes, aRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/invoices'),
        fetch('/api/accounts')
      ]);
      if (cRes.ok) setCustomers(await cRes.json());
      if (iRes.ok) setInvoices(await iRes.json());
      if (aRes.ok) {
        const accs = await aRes.json();
        setAccounts(accs);
        const def = accs.find(a => a.is_default);
        if (def) setAccountId(def.id);
      }
    } catch (err) {
      console.error('Failed to load form dependencies:', err);
    }
  };

  const handleInvoiceSelect = (invId) => {
    setInvoiceId(invId);
    if (!invId) return;
    const inv = invoices.find(i => i.id === invId);
    if (inv) {
      setBookingId(inv.booking_id);
      setCustomerId(inv.customer_id);
      setAmount(inv.balance_amount > 0 ? inv.balance_amount : '');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      alert('Please enter valid payment amount');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        customerId: customerId || null,
        invoiceId: invoiceId || null,
        bookingId: bookingId || null,
        receiptDate,
        receiptType,
        amount: Number(amount),
        paymentMode,
        accountId,
        referenceNo,
        notes
      };

      const res = await fetch('/api/money-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Payment recorded successfully!');
        onCloseModal();
        fetchReceipts();
        loadDependencies();
        if (onRefreshSummary) onRefreshSummary();
        // Reset form
        setAmount('');
        setReferenceNo('');
        setNotes('');
      } else {
        alert(data.error || 'Failed to record payment');
      }
    } catch (err) {
      console.error('Error recording payment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = receipts.filter(r => {
    const s = filters.search.toLowerCase();
    const matchSearch = !s || r.receipt_number.toLowerCase().includes(s) || (r.customer_name && r.customer_name.toLowerCase().includes(s)) || (r.booking_number && r.booking_number.toLowerCase().includes(s)) || (r.reference_no && r.reference_no.toLowerCase().includes(s));
    const matchDateFrom = !filters.dateFrom || r.receipt_date >= filters.dateFrom;
    const matchDateTo = !filters.dateTo || r.receipt_date <= filters.dateTo;
    const matchMode = !filters.paymentMode || filters.paymentMode === 'All' || r.payment_mode === filters.paymentMode;
    const matchMin = !filters.minAmount || Number(r.amount) >= Number(filters.minAmount);
    const matchMax = !filters.maxAmount || Number(r.amount) <= Number(filters.maxAmount);
    return matchSearch && matchDateFrom && matchDateTo && matchMode && matchMin && matchMax;
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>Money In (Customer Receipts)</h2>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            Record customer advances, partial payments, final settlements, and supplier refunds. Liquid bank accounts update automatically.
          </p>
        </div>

        <button className="btn btn-success" onClick={onOpenModal}>
          <Plus size={18} /> Receive Customer Payment
        </button>
      </div>

      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleFilterReset}
        resultCount={filtered.length}
        onExport={() => exportToCSV(filtered.map(r => ({ 'Receipt#': r.receipt_number, 'Date': r.receipt_date, 'Customer': r.customer_name || '', 'Booking#': r.booking_number || '', 'Type': r.receipt_type, 'Mode': r.payment_mode, 'Ref#': r.reference_no || '', 'Amount': r.amount })), 'money-in.csv')}
        config={[
          { key: 'search', type: 'text', primary: true, label: 'Search', placeholder: 'Search receipt#, customer, booking, reference...' },
          { key: 'dateFrom', type: 'date', label: 'Date From' },
          { key: 'dateTo', type: 'date', label: 'Date To' },
          { key: 'paymentMode', type: 'select', label: 'Payment Mode', options: ['Cash','UPI','Bank Transfer','Cheque','Card'] },
          { key: 'minAmount', type: 'amount', label: 'Min Amount (₹)', placeholder: '0' },
          { key: 'maxAmount', type: 'amount', label: 'Max Amount (₹)', placeholder: '999999' },
        ]}
      />

      {/* Receipts Table */}
      <div className="panel">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Booking #</th>
                <th>Receipt Type</th>
                <th>Payment Mode</th>
                <th>Deposited Account</th>
                <th>Reference #</th>
                <th style={{ textAlign: 'right' }}>Amount Received (₹)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 800, fontFamily: 'monospace', color: '#059669' }}>{r.receipt_number}</td>
                  <td>{formatDate(r.receipt_date)}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{r.customer_name || 'Customer'}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>{r.customer_phone || ''}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.booking_number || '—'}</td>
                  <td><span className="badge badge-paid">{r.receipt_type}</span></td>
                  <td>
                    <span style={{ fontSize: '12px', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      {r.payment_mode}
                    </span>
                  </td>
                  <td style={{ fontSize: '12.5px', color: '#475569' }}>{r.account_name}</td>
                  <td style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{r.reference_no || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669', fontSize: '15px' }}>
                    + {formatINR(r.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receive Payment Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={onCloseModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>
                Receive Customer Payment
              </h3>
              <button onClick={onCloseModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Select Invoice to Allocate */}
                <div className="form-group">
                  <label className="form-label">Link to Customer Invoice (Auto Allocation)</label>
                  <select 
                    className="form-select"
                    value={invoiceId}
                    onChange={(e) => handleInvoiceSelect(e.target.value)}
                  >
                    <option value="">-- Direct Receipt (No specific invoice) --</option>
                    {invoices.filter(i => i.balance_amount > 0).map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} ({inv.customer_name}) - Booking #{inv.booking_number} [Due: ₹{inv.balance_amount}]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Receipt Date *</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={receiptDate}
                      onChange={(e) => setReceiptDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Receipt Type</label>
                    <select 
                      className="form-select"
                      value={receiptType}
                      onChange={(e) => setReceiptType(e.target.value)}
                    >
                      <option value="Customer Payment">Customer Payment</option>
                      <option value="Customer Advance">Customer Advance</option>
                      <option value="Supplier Refund">Supplier Refund</option>
                      <option value="Other Income">Other Income</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Amount Received (₹) *</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      style={{ fontSize: '16px', fontWeight: 700, color: '#059669' }}
                      placeholder="e.g. 25000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Mode *</label>
                    <select 
                      className="form-select"
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                    >
                      <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                      <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                      <option value="Cash">Cash in Hand</option>
                      <option value="Cheque">Bank Cheque</option>
                      <option value="Card">Debit / Credit Card</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Deposit To Account *</label>
                    <select 
                      className="form-select"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      required
                    >
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.account_name} (Bal: {formatINR(a.current_balance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Transaction Ref / UTR / Cheque #</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. UPI/123456789 or NEFT-8899"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes &amp; Remarks</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. 50% advance for Kashmir family tour"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={onCloseModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" disabled={submitting}>
                  {submitting ? 'Recording...' : 'Record Payment & Settle Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
