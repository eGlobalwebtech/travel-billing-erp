import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Search, Phone, Mail, MapPin, DollarSign, 
  X, Check, AlertCircle, FileText, CreditCard, ChevronRight
} from 'lucide-react';
import { formatINR, formatDate } from '../utils/formatters';

export default function SuppliersView({ onOpenMoneyOut }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Supplier form state
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    category: 'Hotel',
    contactPerson: '',
    phone: '',
    email: '',
    city: '',
    state: '',
    bankDetails: '',
    upiId: '',
    gstin: '',
    notes: ''
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/suppliers');
      if (res.ok) setSuppliers(await res.json());
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSupplier)
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        fetchSuppliers();
        setNewSupplier({
          name: '',
          category: 'Hotel',
          contactPerson: '',
          phone: '',
          email: '',
          city: '',
          state: '',
          bankDetails: '',
          upiId: '',
          gstin: '',
          notes: ''
        });
      }
    } catch (err) {
      console.error('Failed to add supplier:', err);
    }
  };

  const categories = ['All', 'Hotel', 'Cab/Transport', 'DMC', 'Airline', 'Guide/Activity'];

  const filtered = suppliers.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                        s.phone.includes(search) || 
                        (s.city && s.city.toLowerCase().includes(search.toLowerCase()));
    const matchCat = categoryFilter === 'All' || s.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>Supplier Master</h2>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            Hotels, transport operators, DMCs, airlines, bills, payment schedules &amp; outstanding payables.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={18} /> Add New Supplier
        </button>
      </div>

      {/* Filter and Search */}
      <div className="panel" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
            <input 
              type="text" 
              className="form-input" 
              style={{ paddingLeft: '36px' }}
              placeholder="Search suppliers by name, phone or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button
                key={cat}
                className={`btn btn-sm ${categoryFilter === cat ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="panel">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Supplier ID</th>
                <th>Supplier Name</th>
                <th>Category</th>
                <th>Contact Person</th>
                <th>Phone &amp; Bank Details</th>
                <th style={{ textAlign: 'right' }}>Total Billed (₹)</th>
                <th style={{ textAlign: 'right' }}>Total Paid (₹)</th>
                <th style={{ textAlign: 'right' }}>Balance Due (₹)</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#1e3a8a' }}>{s.id}</td>
                  <td>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{s.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{s.city || 'India'} {s.gstin ? `• GST: ${s.gstin}` : ''}</div>
                  </td>
                  <td>
                    <span className="badge badge-quoted">{s.category}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{s.contact_person || '—'}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.phone}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>{s.bank_details || s.upi_id || '—'}</div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatINR(s.total_billed)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>{formatINR(s.total_paid)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: s.total_due > 0 ? '#d97706' : '#059669' }}>
                    {s.total_due > 0 ? formatINR(s.total_due) : 'Settled'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {s.total_due > 0 && (
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => onOpenMoneyOut(s.id)}
                      >
                        <CreditCard size={13} /> Pay Supplier
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Supplier Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e3a8a' }}>Add New Supplier</h3>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Supplier / Business Name *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Royal Rajasthan Cabs"
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select 
                      className="form-select"
                      value={newSupplier.category}
                      onChange={(e) => setNewSupplier({ ...newSupplier, category: e.target.value })}
                    >
                      <option value="Hotel">Hotel / Resort</option>
                      <option value="Cab/Transport">Cab / Transport</option>
                      <option value="DMC">Destination DMC</option>
                      <option value="Airline">Airline Consolidator</option>
                      <option value="Guide/Activity">Tour Guide / Activity</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Contact Person</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={newSupplier.contactPerson}
                      onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={newSupplier.phone}
                      onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={newSupplier.city}
                      onChange={(e) => setNewSupplier({ ...newSupplier, city: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Bank Account / IFSC</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Bank name & A/c number"
                      value={newSupplier.bankDetails}
                      onChange={(e) => setNewSupplier({ ...newSupplier, bankDetails: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">UPI ID</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="supplier@upi"
                      value={newSupplier.upiId}
                      onChange={(e) => setNewSupplier({ ...newSupplier, upiId: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GSTIN (Optional)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={newSupplier.gstin}
                      onChange={(e) => setNewSupplier({ ...newSupplier, gstin: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
