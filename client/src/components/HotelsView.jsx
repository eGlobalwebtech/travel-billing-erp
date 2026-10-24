import React, { useState, useEffect } from 'react';
import { 
  Building, Plus, Search, Star, Phone, Mail, MapPin, DollarSign, X, Check
} from 'lucide-react';
import { formatINR } from '../utils/formatters';

export default function HotelsView() {
  const [hotels, setHotels] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New hotel form state
  const [newHotel, setNewHotel] = useState({
    name: '',
    destination: '',
    starRating: 4,
    address: '',
    supplierId: '',
    phone: '',
    email: '',
    roomTypesText: 'Deluxe Room, Premium Suite',
    baseRate: 5000,
    mealPlansText: 'EP, CP, MAP',
    paymentTerms: '50% advance on confirmation, balance 7 days prior to check-in',
    cancellationPolicy: 'Free cancellation up to 72 hours before arrival'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [hRes, sRes] = await Promise.all([
        fetch('/api/hotels'),
        fetch('/api/suppliers')
      ]);
      if (hRes.ok) setHotels(await hRes.json());
      if (sRes.ok) setSuppliers(await sRes.json());
    } catch (err) {
      console.error('Failed to load hotels:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHotel = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: newHotel.name,
        destination: newHotel.destination,
        starRating: Number(newHotel.starRating),
        address: newHotel.address,
        supplierId: newHotel.supplierId || null,
        phone: newHotel.phone,
        email: newHotel.email,
        roomTypes: newHotel.roomTypesText.split(',').map(s => s.trim()).filter(Boolean),
        baseRate: Number(newHotel.baseRate),
        mealPlans: newHotel.mealPlansText.split(',').map(s => s.trim()).filter(Boolean),
        paymentTerms: newHotel.paymentTerms,
        cancellationPolicy: newHotel.cancellationPolicy
      };

      const res = await fetch('/api/hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        fetchData();
        setNewHotel({
          name: '',
          destination: '',
          starRating: 4,
          address: '',
          supplierId: '',
          phone: '',
          email: '',
          roomTypesText: 'Deluxe Room, Premium Suite',
          baseRate: 5000,
          mealPlansText: 'EP, CP, MAP',
          paymentTerms: '',
          cancellationPolicy: ''
        });
      }
    } catch (err) {
      console.error('Failed to create hotel:', err);
    }
  };

  // Get unique destinations
  const destinations = ['All', ...new Set(hotels.map(h => h.destination).filter(Boolean))];

  const filtered = hotels.filter(h => {
    const matchSearch = h.name.toLowerCase().includes(search.toLowerCase()) || 
                        h.destination.toLowerCase().includes(search.toLowerCase());
    const matchDest = destinationFilter === 'All' || h.destination === destinationFilter;
    return matchSearch && matchDest;
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>Hotel Master</h2>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            Catalog of verified properties, standard room rates, meal plans, supplier contracts &amp; cancellation policies.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={18} /> Add New Hotel
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
              placeholder="Search hotels by name or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {destinations.map(d => (
              <button
                key={d}
                className={`btn btn-sm ${destinationFilter === d ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setDestinationFilter(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hotel Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {filtered.map(hotel => (
          <div key={hotel.id} className="panel" style={{ margin: 0, padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} color="#2563eb" /> {hotel.destination}
                </span>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {hotel.name}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: '#fef3c7', padding: '3px 8px', borderRadius: '6px', color: '#b45309', fontWeight: 800, fontSize: '12px' }}>
                <Star size={13} fill="#b45309" color="#b45309" /> {hotel.star_rating}-Star
              </div>
            </div>

            <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '14px', flex: 1 }}>
              <p style={{ marginBottom: '6px' }}>{hotel.address || 'Address on file'}</p>
              {hotel.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
                  <Phone size={13} /> {hotel.phone}
                </div>
              )}
            </div>

            {/* Room Categories & Meal Plans */}
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Room Categories</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                {hotel.room_types?.map((rt, i) => (
                  <span key={i} style={{ fontSize: '11.5px', background: '#ffffff', border: '1px solid #e2e8f0', padding: '2px 7px', borderRadius: '4px' }}>
                    {rt}
                  </span>
                ))}
              </div>

              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Meal Plans Offered</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {hotel.meal_plans?.map((mp, i) => (
                  <span key={i} className="badge badge-quoted" style={{ fontSize: '10.5px' }}>
                    {mp}
                  </span>
                ))}
              </div>
            </div>

            {/* Price & Supplier */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Standard Base Rate</div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#1e3a8a' }}>
                  {formatINR(hotel.base_rate)} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>/ night</span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Contract Supplier</div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                  {hotel.supplier_name || 'Direct Hotel'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Hotel Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e3a8a' }}>Add Hotel to Master</h3>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleCreateHotel}>
              <div className="modal-body" style={{ maxHeight: '75vh' }}>
                <div className="form-row">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Hotel Name *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Radisson Blu Resort"
                      value={newHotel.name}
                      onChange={(e) => setNewHotel({ ...newHotel, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Destination City *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Goa, Udaipur"
                      value={newHotel.destination}
                      onChange={(e) => setNewHotel({ ...newHotel, destination: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Star Rating</label>
                    <select 
                      className="form-select"
                      value={newHotel.starRating}
                      onChange={(e) => setNewHotel({ ...newHotel, starRating: Number(e.target.value) })}
                    >
                      <option value="3">3-Star</option>
                      <option value="4">4-Star</option>
                      <option value="5">5-Star Luxury</option>
                      <option value="2">2-Star Economy</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Standard Base Rate (₹ / Night) *</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={newHotel.baseRate}
                      onChange={(e) => setNewHotel({ ...newHotel, baseRate: Number(e.target.value) })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Supplier Partner</label>
                    <select 
                      className="form-select"
                      value={newHotel.supplierId}
                      onChange={(e) => setNewHotel({ ...newHotel, supplierId: e.target.value })}
                    >
                      <option value="">Direct Hotel Booking</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Room Categories (comma-separated)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Standard, Deluxe, Executive Suite"
                    value={newHotel.roomTypesText}
                    onChange={(e) => setNewHotel({ ...newHotel, roomTypesText: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Contact Phone</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={newHotel.phone}
                      onChange={(e) => setNewHotel({ ...newHotel, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Reservations Email</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={newHotel.email}
                      onChange={(e) => setNewHotel({ ...newHotel, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment &amp; Cancellation Terms</label>
                  <textarea 
                    className="form-textarea"
                    rows={2}
                    value={newHotel.cancellationPolicy}
                    onChange={(e) => setNewHotel({ ...newHotel, cancellationPolicy: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Hotel Master</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
