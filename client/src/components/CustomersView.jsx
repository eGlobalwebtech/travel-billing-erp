import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, Phone, Mail, MapPin, FileText, CreditCard, 
  X, Check, AlertCircle, Eye, Printer, Calendar
} from 'lucide-react';
import { formatINR, formatDate } from '../utils/formatters';
import FilterBar, { exportToCSV } from './FilterBar';

export default function CustomersView({ onSelectBooking }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', city: '' });
  const handleFilterChange = (key, value) => setFilters(f => ({ ...f, [key]: value }));
  const handleFilterReset = () => setFilters({ search: '', city: '' });
  const search = filters.search; // legacy alias
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [statement, setStatement] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New customer form
  const [newCust, setNewCust] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    state: '',
    address: '',
    gstin: '',
    emergencyContact: '',
    notes: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/customers');
      if (res.ok) setCustomers(await res.json());
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStatement = async (id) => {
    setSelectedCustomerId(id);
    try {
      const res = await fetch(`/api/customers/${id}/statement`);
      if (res.ok) {
        setStatement(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch customer statement:', err);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCust)
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        fetchCustomers();
        setNewCust({
          name: '',
          phone: '',
          email: '',
          city: '',
          state: '',
          address: '',
          gstin: '',
          emergencyContact: '',
          notes: ''
        });
      }
    } catch (err) {
      console.error('Failed to add customer:', err);
    }
  };

  const filtered = customers.filter(c =>
    (!filters.search || c.name.toLowerCase().includes(filters.search.toLowerCase()) || c.phone.includes(filters.search) || (c.city && c.city.toLowerCase().includes(filters.search.toLowerCase()))) &&
    (!filters.city || (c.city && c.city.toLowerCase().includes(filters.city.toLowerCase())))
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>Customer Master</h2>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            Client contacts, booking records, payment history, invoices &amp; printable account statements.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={18} /> Add New Customer
        </button>
      </div>

      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleFilterReset}
        resultCount={filtered.length}
        onExport={() => exportToCSV(filtered.map(c => ({ 'ID': c.id, 'Name': c.name, 'Phone': c.phone, 'Email': c.email || '', 'City': c.city || '', 'Bookings': c.total_bookings || 0, 'Invoiced': c.total_invoiced || 0, 'Outstanding': c.outstanding_balance || 0 })), 'customers.csv')}
        config={[
          { key: 'search', type: 'text', primary: true, label: 'Search', placeholder: 'Search by name, mobile or city...' },
          { key: 'city', type: 'text', label: 'City / Location', placeholder: 'e.g. Ahmedabad, Surat' },
        ]}
      />

      {/* Table */}
      <div className="panel">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Client Name</th>
                <th>Mobile &amp; Email</th>
                <th>City &amp; Address</th>
                <th>Total Bookings</th>
                <th style={{ textAlign: 'right' }}>Total Invoiced (₹)</th>
                <th style={{ textAlign: 'right' }}>Outstanding Balance (₹)</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#1e3a8a' }}>{c.id}</td>
                  <td>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{c.name}</div>
                    {c.gstin && <div style={{ fontSize: '11px', color: '#059669' }}>GSTIN: {c.gstin}</div>}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.phone}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{c.email || '—'}</div>
                  </td>
                  <td>
                    <div>{c.city || '—'}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>{c.address?.slice(0, 30)}</div>
                  </td>
                  <td>
                    <span className="badge badge-confirmed">{c.total_bookings} Trips</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatINR(c.total_invoiced)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: c.total_outstanding > 0 ? '#dc2626' : '#059669' }}>
                    {c.total_outstanding > 0 ? formatINR(c.total_outstanding) : 'Settled'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className="btn btn-outline btn-sm"
                      onClick={() => handleOpenStatement(c.id)}
                    >
                      <FileText size={14} /> Statement
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Statement Drawer / Modal */}
      {selectedCustomerId && statement && (
        <div className="modal-overlay" onClick={() => setSelectedCustomerId(null)}>
          <div className="modal-card modal-card-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e3a8a' }}>
                  Customer Account Statement: {statement.customer?.name}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  Phone: {statement.customer?.phone} • Email: {statement.customer?.email || '—'} • City: {statement.customer?.city || 'India'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
                  <Printer size={14} /> Print Statement
                </button>
                <button onClick={() => setSelectedCustomerId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} color="#64748b" />
                </button>
              </div>
            </div>

            <div className="modal-body" style={{ maxHeight: '75vh' }}>
              {/* Invoices List */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                  Billed Invoices ({statement.invoices?.length || 0})
                </h4>
                <table>
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Date</th>
                      <th>Due Date</th>
                      <th style={{ textAlign: 'right' }}>Total (₹)</th>
                      <th style={{ textAlign: 'right' }}>Paid (₹)</th>
                      <th style={{ textAlign: 'right' }}>Balance (₹)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.invoices?.map(inv => (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{inv.invoice_number}</td>
                        <td>{formatDate(inv.invoice_date)}</td>
                        <td>{formatDate(inv.due_date)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatINR(inv.total_amount)}</td>
                        <td style={{ textAlign: 'right', color: '#059669' }}>{formatINR(inv.paid_amount)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: inv.balance_amount > 0 ? '#dc2626' : '#059669' }}>
                          {formatINR(inv.balance_amount)}
                        </td>
                        <td><span className={`badge badge-${inv.status.toLowerCase()}`}>{inv.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Receipts List */}
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                  Payments &amp; Receipts Received ({statement.receipts?.length || 0})
                </h4>
                <table>
                  <thead>
                    <tr>
                      <th>Receipt #</th>
                      <th>Date</th>
                      <th>Payment Mode</th>
                      <th>Reference #</th>
                      <th style={{ textAlign: 'right' }}>Amount Paid (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.receipts?.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#059669' }}>{r.receipt_number}</td>
                        <td>{formatDate(r.receipt_date)}</td>
                        <td><span className="badge badge-paid">{r.payment_mode}</span></td>
                        <td style={{ fontSize: '12px', color: '#64748b' }}>{r.reference_no || '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>{formatINR(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setSelectedCustomerId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e3a8a' }}>Add New Customer</h3>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Customer Name *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Ramesh Chandra Sharma"
                      value={newCust.name}
                      onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="+91 98110 23456"
                      value={newCust.phone}
                      onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={newCust.email}
                      onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={newCust.city}
                      onChange={(e) => setNewCust({ ...newCust, city: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GSTIN (Optional B2B)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={newCust.gstin}
                      onChange={(e) => setNewCust({ ...newCust, gstin: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={newCust.address}
                    onChange={(e) => setNewCust({ ...newCust, address: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Emergency Contact &amp; Notes</label>
                  <textarea 
                    className="form-textarea"
                    rows={2}
                    value={newCust.notes}
                    onChange={(e) => setNewCust({ ...newCust, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
