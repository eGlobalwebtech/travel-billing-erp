import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Plus, Search, Calendar, Tag, Landmark, 
  X, Check, Building, Smartphone, Megaphone, Coffee, Users
} from 'lucide-react';
import { formatINR, formatDate } from '../utils/formatters';
import FilterBar, { exportToCSV } from './FilterBar';

export default function ExpensesView({ isModalOpen, onOpenModal, onCloseModal, onRefreshSummary }) {
  const [expenses, setExpenses] = useState([]);
  const [categorySummary, setCategorySummary] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', dateFrom: '', dateTo: '', category: 'All', vendor: '', paymentMode: 'All', minAmount: '', maxAmount: '' });
  const handleFilterChange = (key, value) => setFilters(f => ({ ...f, [key]: value }));
  const handleFilterReset = () => setFilters({ search: '', dateFrom: '', dateTo: '', category: 'All', vendor: '', paymentMode: 'All', minAmount: '', maxAmount: '' });
  const selectedCategory = filters.category; // legacy alias
  const setSelectedCategory = (v) => handleFilterChange('category', v); // legacy alias

  // New Expense Form State
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Office Rent');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [accountId, setAccountId] = useState('ACC-02');
  const [vendorName, setVendorName] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [taxDeductible, setTaxDeductible] = useState(true);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchExpenses();
    fetchAccounts();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/expenses');
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        setCategorySummary(data.categorySummary || []);
      }
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const accs = await res.json();
        setAccounts(accs);
        const def = accs.find(a => a.is_default);
        if (def) setAccountId(def.id);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      alert('Please enter valid expense amount');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        expenseDate,
        category,
        amount: Number(amount),
        paymentMode,
        accountId,
        vendorName,
        referenceNo,
        taxDeductible,
        notes
      };

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Expense recorded successfully!');
        onCloseModal();
        fetchExpenses();
        if (onRefreshSummary) onRefreshSummary();
        setAmount('');
        setVendorName('');
        setReferenceNo('');
        setNotes('');
      } else {
        alert(data.error || 'Failed to record expense');
      }
    } catch (err) {
      console.error('Error submitting expense:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    'Office Rent', 'Staff Salaries', 'Marketing & Ads', 'Internet & Phone', 
    'Fuel & Travel', 'Software & Tech', 'Bank Charges', 'Office Tea & Misc'
  ];

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const filtered = expenses.filter(e => {
    const s = (filters.search || '').toLowerCase();
    const matchSearch = !s || e.expense_number.toLowerCase().includes(s) || (e.vendor_name && e.vendor_name.toLowerCase().includes(s)) || (e.notes && e.notes.toLowerCase().includes(s));
    const matchCat = !filters.category || filters.category === 'All' || e.category === filters.category;
    const matchDateFrom = !filters.dateFrom || e.expense_date >= filters.dateFrom;
    const matchDateTo = !filters.dateTo || e.expense_date <= filters.dateTo;
    const matchVendor = !filters.vendor || (e.vendor_name && e.vendor_name.toLowerCase().includes(filters.vendor.toLowerCase()));
    const matchMode = !filters.paymentMode || filters.paymentMode === 'All' || e.payment_mode === filters.paymentMode;
    const matchMin = !filters.minAmount || Number(e.amount) >= Number(filters.minAmount);
    const matchMax = !filters.maxAmount || Number(e.amount) <= Number(filters.maxAmount);
    return matchSearch && matchCat && matchDateFrom && matchDateTo && matchVendor && matchMode && matchMin && matchMax;
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>Business Operating Expenses</h2>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            Track overhead costs: office rent, staff salaries, internet, marketing, and tea. Total logged: {formatINR(totalExpenseAmount)}.
          </p>
        </div>

        <button className="btn btn-primary" onClick={onOpenModal}>
          <Plus size={18} /> Add New Expense
        </button>
      </div>

      {/* Category Breakdown Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {categorySummary.map((c, i) => (
          <div 
            key={i} 
            className="panel" 
            style={{ 
              margin: 0, 
              padding: '14px 18px', 
              cursor: 'pointer',
              border: selectedCategory === c.category ? '2px solid #2563eb' : '1px solid #e2e8f0' 
            }}
            onClick={() => setSelectedCategory(selectedCategory === c.category ? 'All' : c.category)}
          >
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{c.category}</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
              {formatINR(c.total)}
            </div>
          </div>
        ))}
      </div>

      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleFilterReset}
        resultCount={filtered.length}
        onExport={() => exportToCSV(filtered.map(e => ({ 'Expense#': e.expense_number, 'Date': e.expense_date, 'Category': e.category, 'Vendor': e.vendor_name || '', 'Mode': e.payment_mode, 'Ref#': e.reference_no || '', 'Amount': e.amount, 'Tax Deductible': e.tax_deductible ? 'Yes' : 'No' })), 'expenses.csv')}
        config={[
          { key: 'search', type: 'text', primary: true, label: 'Search', placeholder: 'Search expense#, vendor, notes...' },
          { key: 'category', type: 'select', label: 'Category', options: ['Office Rent','Staff Salaries','Marketing & Ads','Internet & Phone','Fuel & Travel','Software & Tech','Bank Charges','Office Tea & Misc'] },
          { key: 'dateFrom', type: 'date', label: 'Date From' },
          { key: 'dateTo', type: 'date', label: 'Date To' },
          { key: 'vendor', type: 'text', label: 'Vendor / Paid To', placeholder: 'e.g. Reliance Jio...' },
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
                <th>Expense #</th>
                <th>Date</th>
                <th>Category</th>
                <th>Paid To / Vendor</th>
                <th>Payment Mode</th>
                <th>Account Deducted</th>
                <th>Ref / Voucher #</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 800, fontFamily: 'monospace', color: '#475569' }}>{e.expense_number}</td>
                  <td>{formatDate(e.expense_date)}</td>
                  <td><span className="badge badge-unpaid">{e.category}</span></td>
                  <td style={{ fontWeight: 700 }}>{e.vendor_name || 'Vendor'}</td>
                  <td>
                    <span style={{ fontSize: '12px', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      {e.payment_mode}
                    </span>
                  </td>
                  <td style={{ fontSize: '12.5px', color: '#475569' }}>{e.account_name}</td>
                  <td style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{e.reference_no || '—'}</td>
                  <td style={{ fontSize: '12.5px', color: '#334155', maxWidth: '240px' }}>{e.notes || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: '#dc2626', fontSize: '15px' }}>
                    - {formatINR(e.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={onCloseModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#991b1b' }}>
                Add Business Expense
              </h3>
              <button onClick={onCloseModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Expense Date *</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Expense Category *</label>
                    <select 
                      className="form-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Expense Amount (₹) *</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      style={{ fontSize: '16px', fontWeight: 700, color: '#dc2626' }}
                      placeholder="e.g. 5000"
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
                      <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                      <option value="Bank Transfer">Bank Transfer (NEFT / NetBanking)</option>
                      <option value="Cash">Cash in Hand</option>
                      <option value="Card">Debit / Credit Card</option>
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
                    <label className="form-label">Paid To / Vendor Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Airtel Broadband / Landlord"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Bill / Receipt / Reference #</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. BILL-4412"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '24px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                      <input 
                        type="checkbox"
                        checked={taxDeductible}
                        onChange={(e) => setTaxDeductible(e.target.checked)}
                      />
                      Tax Deductible Business Expense
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Remarks</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Monthly office internet & mobile SIM recharge"
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
                  {submitting ? 'Recording...' : 'Record Expense & Deduct Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
