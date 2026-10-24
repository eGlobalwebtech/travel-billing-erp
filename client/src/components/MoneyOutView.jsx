import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Search, Calendar, ArrowUpRight, 
  X, Check, DollarSign, CreditCard
} from 'lucide-react';
import { formatINR, formatDate } from '../utils/formatters';
import FilterBar, { exportToCSV } from './FilterBar';

export default function MoneyOutView({ isModalOpen, onOpenModal, onCloseModal, prefillSupplierId, onRefreshSummary }) {
  const [payments, setPayments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierBills, setSupplierBills] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', dateFrom: '', dateTo: '', supplier: '', paymentMode: 'All', minAmount: '', maxAmount: '' });
  const handleFilterChange = (key, value) => setFilters(f => ({ ...f, [key]: value }));
  const handleFilterReset = () => setFilters({ search: '', dateFrom: '', dateTo: '', supplier: '', paymentMode: 'All', minAmount: '', maxAmount: '' });
  const search = filters.search; // legacy alias

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [billId, setBillId] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState('Supplier Bill Payment');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [accountId, setAccountId] = useState('ACC-02');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPayments();
    loadDependencies();
  }, []);

  useEffect(() => {
    if (prefillSupplierId) {
      setSupplierId(prefillSupplierId);
      const bills = supplierBills.filter(b => b.supplier_id === prefillSupplierId && b.balance_due > 0);
      if (bills.length > 0) {
        setBillId(bills[0].id);
        setAmount(bills[0].balance_due);
      }
    }
  }, [prefillSupplierId, supplierBills]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/money-out');
      if (res.ok) setPayments(await res.json());
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDependencies = async () => {
    try {
      const [sRes, bRes, aRes] = await Promise.all([
        fetch('/api/suppliers'),
        fetch('/api/supplier-bills'),
        fetch('/api/accounts')
      ]);
      if (sRes.ok) setSuppliers(await sRes.json());
      if (bRes.ok) setSupplierBills(await bRes.json());
      if (aRes.ok) {
        const accs = await aRes.json();
        setAccounts(accs);
        const def = accs.find(a => a.is_default);
        if (def) setAccountId(def.id);
      }
    } catch (err) {
      console.error('Failed to load payment dependencies:', err);
    }
  };

  const handleBillSelect = (bId) => {
    setBillId(bId);
    if (!bId) return;
    const bill = supplierBills.find(b => b.id === bId);
    if (bill) {
      setSupplierId(bill.supplier_id);
      setAmount(bill.balance_due > 0 ? bill.balance_due : '');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        supplierId: supplierId || null,
        billId: billId || null,
        paymentDate,
        paymentType,
        amount: Number(amount),
        paymentMode,
        accountId,
        referenceNo,
        notes
      };

      const res = await fetch('/api/money-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Supplier payment recorded successfully!');
        onCloseModal();
        fetchPayments();
        loadDependencies();
        if (onRefreshSummary) onRefreshSummary();
        setAmount('');
        setReferenceNo('');
        setNotes('');
      } else {
        alert(data.error || 'Failed to record supplier payment');
      }
    } catch (err) {
      console.error('Error submitting payment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = payments.filter(p => {
    const s = filters.search.toLowerCase();
    const matchSearch = !s || p.payment_number.toLowerCase().includes(s) || (p.supplier_name && p.supplier_name.toLowerCase().includes(s)) || (p.booking_number && p.booking_number.toLowerCase().includes(s));
    const matchDateFrom = !filters.dateFrom || p.payment_date >= filters.dateFrom;
    const matchDateTo = !filters.dateTo || p.payment_date <= filters.dateTo;
    const matchSupplier = !filters.supplier || (p.supplier_name && p.supplier_name.toLowerCase().includes(filters.supplier.toLowerCase()));
    const matchMode = !filters.paymentMode || filters.paymentMode === 'All' || p.payment_mode === filters.paymentMode;
    const matchMin = !filters.minAmount || Number(p.amount) >= Number(filters.minAmount);
    const matchMax = !filters.maxAmount || Number(p.amount) <= Number(filters.maxAmount);
    return matchSearch && matchDateFrom && matchDateTo && matchSupplier && matchMode && matchMin && matchMax;
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>Money Out (Supplier Payments)</h2>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            Record payments to hotels, transport cabs, DMCs, airlines, and customer refunds.
          </p>
        </div>

        <button className="btn btn-primary" onClick={onOpenModal}>
          <Plus size={18} /> Make Supplier Payment
        </button>
      </div>

      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleFilterReset}
        resultCount={filtered.length}
        onExport={() => exportToCSV(filtered.map(p => ({ 'Payment#': p.payment_number, 'Date': p.payment_date, 'Supplier': p.supplier_name || '', 'Bill#': p.booking_number || '', 'Type': p.payment_type, 'Mode': p.payment_mode, 'Ref#': p.reference_no || '', 'Amount': p.amount })), 'money-out.csv')}
        config={[
          { key: 'search', type: 'text', primary: true, label: 'Search', placeholder: 'Search payment#, supplier, booking...' },
          { key: 'dateFrom', type: 'date', label: 'Date From' },
          { key: 'dateTo', type: 'date', label: 'Date To' },
          { key: 'supplier', type: 'text', label: 'Supplier Name', placeholder: 'e.g. Hotel, Cab...' },
          { key: 'paymentMode', type: 'select', label: 'Payment Mode', options: ['Cash','UPI','Bank Transfer','Cheque','Card'] },
          { key: 'minAmount', type: 'amount', label: 'Min Amount (₹)', placeholder: '0' },
          { key: 'maxAmount', type: 'amount', label: 'Max Amount (₹)', placeholder: '999999' },
        ]}
      />

      {/* Table */}
      <div className="panel">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Payment #</th>
                <th>Date</th>
                <th>Supplier Partner</th>
                <th>Bill / Booking #</th>
                <th>Payment Type</th>
                <th>Payment Mode</th>
                <th>Deducted Account</th>
                <th>Ref / UTR #</th>
                <th style={{ textAlign: 'right' }}>Amount Paid (₹)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 800, fontFamily: 'monospace', color: '#1e3a8a' }}>{p.payment_number}</td>
                  <td>{formatDate(p.payment_date)}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{p.supplier_name || 'Supplier'}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>{p.supplier_phone || ''}</div>
                  </td>
                  <td>
                    <div>{p.bill_number || 'Direct Payment'}</div>
                    {p.booking_number && <div style={{ fontSize: '11px', color: '#64748b' }}>Booking #{p.booking_number}</div>}
                  </td>
                  <td><span className="badge badge-partial">{p.payment_type}</span></td>
                  <td>
                    <span style={{ fontSize: '12px', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      {p.payment_mode}
                    </span>
                  </td>
                  <td style={{ fontSize: '12.5px', color: '#475569' }}>{p.account_name}</td>
                  <td style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{p.reference_no || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: '#dc2626', fontSize: '15px' }}>
                    - {formatINR(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Make Payment Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={onCloseModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e3a8a' }}>
                Make Supplier Payment
              </h3>
              <button onClick={onCloseModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Link to Supplier Bill */}
                <div className="form-group">
                  <label className="form-label">Link to Supplier Bill (Auto Settlement)</label>
                  <select 
                    className="form-select"
                    value={billId}
                    onChange={(e) => handleBillSelect(e.target.value)}
                  >
                    <option value="">-- Direct Advance / Payment (No specific bill) --</option>
                    {supplierBills.filter(b => b.balance_due > 0).map(b => (
                      <option key={b.id} value={b.id}>
                        {b.supplier_name} ({b.category}) - Bill #{b.bill_number} [Due: ₹{b.balance_due}]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Supplier *</label>
                    <select 
                      className="form-select"
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      required
                    >
                      <option value="">-- Select Supplier --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Date *</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Amount Paid (₹) *</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      style={{ fontSize: '16px', fontWeight: 700, color: '#dc2626' }}
                      placeholder="e.g. 15000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select 
                      className="form-select"
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                    >
                      <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                      <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                      <option value="Cash">Cash from Office Safe</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Deduct From Account *</label>
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
                    <label className="form-label">UTR / Transaction Reference #</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. NEFT-HDFC-991122"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes &amp; Particulars</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Hotel advance for booking TRV-2026-0001"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={onCloseModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Recording...' : 'Disburse Payment & Settle Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
