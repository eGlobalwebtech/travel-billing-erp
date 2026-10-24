import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, Save } from 'lucide-react';
import { calculateEndDate, formatINR } from '../utils/formatters';

// ── Quick Package Adder ──────────────────────────────────────────────────────
function QuickPackageAdder({ onSaved, onCancel }) {
  const [name, setName] = React.useState('');
  const [destination, setDestination] = React.useState('');
  const [days, setDays] = React.useState(5);
  const [price, setPrice] = React.useState('');
  const [inclusions, setInclusions] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    if (!name || !destination || !price) { alert('Please fill name, destination and price'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/packages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, destination,
          durationDays: Number(days),
          durationNights: Math.max(1, Number(days) - 1),
          sellingPrice: Number(price),
          inclusions, exclusions: '', dayWiseItinerary: []
        })
      });
      const data = await res.json();
      if (res.ok) {
        const newPkg = {
          id: data.id || data.packageId, name, destination,
          duration_days: Number(days), duration_nights: Math.max(1, Number(days) - 1),
          selling_price: Number(price), inclusions
        };
        onSaved(newPkg.id, newPkg);
      } else { alert(data.error || 'Failed to save package'); }
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ background: '#fefce8', border: '2px solid #fbbf24', borderRadius: '12px', padding: '16px', marginTop: '12px' }}>
      <div style={{ fontWeight: 700, fontSize: '13px', color: '#92400e', marginBottom: '12px' }}>
        Add New Package (auto-saved for future use)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 110px', gap: '8px', marginBottom: '8px' }}>
        <input className="form-input" placeholder="Package name *" value={name} onChange={e => setName(e.target.value)} />
        <input className="form-input" placeholder="Destination *" value={destination} onChange={e => setDestination(e.target.value)} />
        <input className="form-input" type="number" placeholder="Days" value={days} onChange={e => setDays(e.target.value)} />
        <input className="form-input" type="number" placeholder="Selling Price *" value={price} onChange={e => setPrice(e.target.value)} />
      </div>
      <input className="form-input" style={{ marginBottom: '10px' }} placeholder="Inclusions (Hotel, Breakfast, Transport...)" value={inclusions} onChange={e => setInclusions(e.target.value)} />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Package'}
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Main NewBookingModal ─────────────────────────────────────────────────────
export default function NewBookingModal({ isOpen, onClose, onSuccess }) {
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [hotelsMaster, setHotelsMaster] = useState([]);

  // Customer mode: 'skip' | 'existing' | 'new'
  const [custMode, setCustMode] = useState('skip');
  const [customerId, setCustomerId] = useState('');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custCity, setCustCity] = useState('');

  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [showAddPackage, setShowAddPackage] = useState(false);

  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationDays, setDurationDays] = useState(5);
  const [durationNights, setDurationNights] = useState(4);
  const [endDate, setEndDate] = useState(calculateEndDate(new Date().toISOString().split('T')[0], 5));
  const [paxAdults, setPaxAdults] = useState(2);
  const [paxChildren, setPaxChildren] = useState(0);

  const [hotels, setHotels] = useState([{
    hotelId: '', hotelName: '', roomType: 'Deluxe Room', numRooms: 1,
    mealPlan: 'CP (Breakfast)', nights: 4, ratePerNight: 4500, saveToMaster: false
  }]);

  const [services, setServices] = useState([{
    serviceType: 'Transport/Cab', description: 'Private AC vehicle for all transfers', costPrice: 5000, sellingPrice: 7000
  }]);

  const [sellingPrice, setSellingPrice] = useState(45000);
  const [showGst, setShowGst] = useState(false);
  const [taxRate, setTaxRate] = useState(5.0);
  const [customerNotes, setCustomerNotes] = useState('');
  const [itineraryDays, setItineraryDays] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (isOpen) { loadMasterData(); resetForm(); } }, [isOpen]);

  useEffect(() => {
    const end = calculateEndDate(startDate, durationDays);
    setEndDate(end);
    setDurationNights(Math.max(1, Number(durationDays) - 1));
    setHotels(prev => prev.map(h => ({ ...h, nights: Math.max(1, Number(durationDays) - 1) })));
  }, [startDate, durationDays]);

  const resetForm = () => {
    setCustMode('skip'); setCustomerId(''); setCustName(''); setCustPhone(''); setCustEmail(''); setCustCity('');
    setSelectedPackageId(''); setShowAddPackage(false); setDestination('');
    setStartDate(new Date().toISOString().split('T')[0]); setDurationDays(5); setDurationNights(4);
    setPaxAdults(2); setPaxChildren(0);
    setHotels([]);
    setServices([]);
    setSellingPrice(45000); setShowGst(false); setTaxRate(5.0); setCustomerNotes(''); setItineraryDays([]);
  };

  const loadMasterData = async () => {
    try {
      const [cRes, pRes, hRes] = await Promise.all([fetch('/api/customers'), fetch('/api/packages'), fetch('/api/hotels')]);
      if (cRes.ok) { const d = await cRes.json(); setCustomers(d); if (d.length > 0) setCustomerId(d[0].id); }
      if (pRes.ok) setPackages(await pRes.json());
      if (hRes.ok) setHotelsMaster(await hRes.json());
    } catch (err) { console.error(err); }
  };

  const handleSelectPackage = (pkgId) => {
    setSelectedPackageId(pkgId);
    if (!pkgId) return;
    const pkg = packages.find(p => p.id === pkgId);
    if (pkg) {
      if (pkg.destination) setDestination(pkg.destination);
      setDurationDays(pkg.duration_days);
      setDurationNights(pkg.duration_nights);
      setSellingPrice(pkg.selling_price);
      if (pkg.day_wise_itinerary && pkg.day_wise_itinerary.length > 0) {
        setItineraryDays(pkg.day_wise_itinerary.map(d => ({
          day: d.day, title: d.title, morningActivity: d.morning_activity,
          afternoonActivity: d.afternoon_activity, eveningActivity: d.evening_activity,
          stayHotel: d.stay_hotel, mealsIncluded: d.meals_included
        })));
      }
    }
  };

  const handlePackageAdded = (newId, newPkg) => {
    setPackages(prev => [newPkg, ...prev]);
    setShowAddPackage(false);
    handleSelectPackage(newId);
  };

  const handleHotelChange = (idx, field, value) => {
    const updated = [...hotels]; updated[idx][field] = value;
    if (field === 'hotelId' && value) {
      const hm = hotelsMaster.find(h => h.id === value);
      if (hm) {
        updated[idx].hotelName = hm.name;
        updated[idx].ratePerNight = hm.base_rate || 4000;
        if (hm.room_types && hm.room_types.length > 0) updated[idx].roomType = hm.room_types[0];
      }
    }
    setHotels(updated);
  };

  const handleServiceChange = (idx, field, value) => {
    const updated = [...services]; updated[idx][field] = value; setServices(updated);
  };

  const totalHotelsCost = hotels.reduce((s, h) => s + (h.nights || 1) * (h.numRooms || 1) * (h.ratePerNight || 0), 0);
  const totalServicesCost = services.reduce((s, sv) => s + (Number(sv.costPrice) || 0), 0);
  const totalSupplierCost = totalHotelsCost + totalServicesCost;
  const baseSelling = Number(sellingPrice) || 0;
  const taxAmount = showGst ? Math.round((baseSelling * Number(taxRate)) / 100 * 100) / 100 : 0;
  const grossTotal = baseSelling + taxAmount;
  const estimatedProfit = baseSelling - totalSupplierCost;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!destination) { alert('Please enter travel destination'); return; }
    const payload = {
      customerId: custMode === 'existing' ? customerId : null,
      newCustomer: custMode === 'new' ? { name: custName, phone: custPhone, email: custEmail, city: custCity } : null,
      packageId: selectedPackageId || null, destination, startDate,
      durationDays, paxAdults, paxChildren,
      sellingPrice: baseSelling, taxRate: showGst ? taxRate : 0, showGst,
      customerNotes, hotels, services, itineraryDays
    };
    try {
      setSubmitting(true);
      const res = await fetch('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) { onSuccess(data.bookingId); }
      else { alert(data.error || 'Failed to create booking'); }
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSubmitting(false); }
  };

  if (!isOpen) return null;

  const COLORS = [
    { bg: '#fef3c7', accent: '#f59e0b', text: '#92400e' },
    { bg: '#d1fae5', accent: '#10b981', text: '#065f46' },
    { bg: '#dbeafe', accent: '#3b82f6', text: '#1e3a8a' },
    { bg: '#ede9fe', accent: '#7c3aed', text: '#4c1d95' },
    { bg: '#fee2e2', accent: '#ef4444', text: '#7f1d1d' },
    { bg: '#cffafe', accent: '#06b6d4', text: '#164e63' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-large" onClick={e => e.stopPropagation()} style={{ maxWidth: '960px' }}>

        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e3a8a' }}>New Travel Booking</h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Customer optional &bull; Package auto-fills &bull; Everything saves automatically</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="#64748b" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body">

            {/* 1. Customer */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', marginBottom: '10px' }}>
                Customer Details <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {[['skip','Skip / Walk-in Guest'],['existing','Select Existing Customer'],['new','Add New Customer']].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setCustMode(val)}
                    style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      border: custMode === val ? '2px solid #1e3a8a' : '2px solid #e2e8f0',
                      background: custMode === val ? '#eff6ff' : '#fff',
                      color: custMode === val ? '#1e3a8a' : '#64748b' }}>
                    {label}
                  </button>
                ))}
              </div>
              {custMode === 'skip' && <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Booking saved as Walk-in Guest. You can link a customer later from the booking details.</p>}
              {custMode === 'existing' && (
                <select className="form-select" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                  {customers.filter(c => c.name !== 'Walk-in Guest').map(c => (
                    <option key={c.id} value={c.id}>{c.name} &mdash; {c.phone} {c.city ? '(' + c.city + ')' : ''}</option>
                  ))}
                </select>
              )}
              {custMode === 'new' && (
                <div className="form-row" style={{ marginBottom: 0 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input className="form-input" placeholder="Full Name *" value={custName} onChange={e => setCustName(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input className="form-input" placeholder="Mobile Number" value={custPhone} onChange={e => setCustPhone(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input className="form-input" placeholder="Email (optional)" value={custEmail} onChange={e => setCustEmail(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input className="form-input" placeholder="City" value={custCity} onChange={e => setCustCity(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Package */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                  Select Package <span style={{ color: '#94a3b8', fontWeight: 400 }}>(auto-fills pricing and itinerary)</span>
                </div>
                <button type="button" onClick={() => setShowAddPackage(v => !v)}
                  style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
                  + Add New Package
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div onClick={() => handleSelectPackage('')}
                  style={{ padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', minWidth: '110px', textAlign: 'center',
                    border: selectedPackageId === '' ? '2px solid #1e3a8a' : '2px solid #e2e8f0',
                    background: selectedPackageId === '' ? '#eff6ff' : '#fff', transition: 'all 0.15s' }}>
                  <div style={{ fontSize: '20px', marginBottom: '2px' }}>&#9999;</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e3a8a' }}>Custom</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Build manually</div>
                </div>
                {packages.map((p, i) => {
                  const c = COLORS[i % COLORS.length];
                  const isSel = selectedPackageId === p.id;
                  return (
                    <div key={p.id} onClick={() => handleSelectPackage(p.id)}
                      style={{ padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', minWidth: '130px', maxWidth: '170px', position: 'relative',
                        border: isSel ? '2px solid ' + c.accent : '2px solid #e2e8f0',
                        background: isSel ? c.bg : '#fff',
                        boxShadow: isSel ? '0 0 0 3px ' + c.accent + '28' : 'none', transition: 'all 0.15s' }}>
                      {isSel && <span style={{ position: 'absolute', top: '6px', right: '6px', background: c.accent, borderRadius: '50%', width: '15px', height: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#fff', fontWeight: 800 }}>&#10003;</span>}
                      <div style={{ fontSize: '11px', fontWeight: 800, color: c.text, lineHeight: 1.3, marginBottom: '2px' }}>{p.name}</div>
                      <div style={{ fontSize: '10px', color: c.text, opacity: 0.7, marginBottom: '3px' }}>{p.duration_days}D/{p.duration_nights}N &middot; {p.destination}</div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: c.accent }}>&#8377;{Number(p.selling_price).toLocaleString('en-IN')}</div>
                    </div>
                  );
                })}
              </div>
              {showAddPackage && <QuickPackageAdder onSaved={handlePackageAdded} onCancel={() => setShowAddPackage(false)} />}
            </div>

            {/* 3. Trip Details */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', marginBottom: '10px' }}>Trip Details</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Destination *</label>
                  <input className="form-input" placeholder="e.g. Kashmir, Goa, Thailand" value={destination} onChange={e => setDestination(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (Days)</label>
                  <input type="number" className="form-input" min="1" max="60" value={durationDays} onChange={e => setDurationDays(Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date (Auto)</label>
                  <input type="date" className="form-input" value={endDate} readOnly style={{ background: '#f1f5f9', fontWeight: 700 }} />
                  <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>{durationDays}D / {durationNights}N</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Adults</label>
                  <input type="number" className="form-input" min="1" value={paxAdults} onChange={e => setPaxAdults(Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Children</label>
                  <input type="number" className="form-input" min="0" value={paxChildren} onChange={e => setPaxChildren(Number(e.target.value))} />
                </div>
              </div>
            </div>

            {/* 4 & 5. Add-on Services (Hotels, Transport, etc.) — collapsed by default */}
            <div style={{ background: '#fafbfc', padding: '16px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>Add-on Services <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '12px' }}>(optional — click to add)</span></div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>Leave empty if the package covers everything. Add only what needs separate tracking.</div>

              {/* Quick-add pill buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: hotels.length > 0 || services.length > 0 ? '14px' : '0' }}>
                <button type="button" onClick={() => setHotels([...hotels, { hotelId: '', hotelName: '', roomType: 'Deluxe Room', numRooms: 1, mealPlan: 'CP (Breakfast)', nights: durationNights || 4, ratePerNight: 4500, saveToMaster: false }])}
                  style={{ padding: '7px 14px', borderRadius: '20px', border: '2px dashed #3b82f6', background: '#eff6ff', color: '#1e3a8a', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                  🏨 + Hotel Stay
                </button>
                {[['Transport/Cab','🚗'],['Flight Tickets','✈️'],['Activity/Sightseeing','🎒'],['Tour Guide','🧭'],['Visa Assistance','📋']].map(([type, icon]) => (
                  <button key={type} type="button"
                    onClick={() => setServices([...services, { serviceType: type, description: '', costPrice: 0, sellingPrice: 0 }])}
                    style={{ padding: '7px 14px', borderRadius: '20px', border: '2px dashed #10b981', background: '#f0fdf4', color: '#065f46', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                    {icon} + {type}
                  </button>
                ))}
              </div>

              {/* Hotel rows — only shown if added */}
              {hotels.map((hotel, idx) => (
                <div key={idx} style={{ background: '#fff', padding: '12px 14px', borderRadius: '8px', border: '2px solid #bfdbfe', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '5px' }}>🏨 Hotel Stay #{idx + 1}</span>
                    <button type="button" onClick={() => setHotels(hotels.filter((_, i) => i !== idx))}
                      style={{ background: '#fee2e2', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                      Remove
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 70px 70px 90px', gap: '8px', alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Hotel Name</label>
                      <select className="form-select" style={{ fontSize: '12px' }} value={hotel.hotelId} onChange={e => handleHotelChange(idx, 'hotelId', e.target.value)}>
                        <option value="">-- Type hotel name below --</option>
                        {hotelsMaster.map(h => <option key={h.id} value={h.id}>{h.name} ({h.destination})</option>)}
                      </select>
                      {!hotel.hotelId && <input className="form-input" style={{ marginTop: '4px', fontSize: '12px' }} placeholder="Type hotel name..." value={hotel.hotelName} onChange={e => handleHotelChange(idx, 'hotelName', e.target.value)} />}
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Room Type</label>
                      <input className="form-input" style={{ fontSize: '12px' }} value={hotel.roomType} onChange={e => handleHotelChange(idx, 'roomType', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Meal Plan</label>
                      <select className="form-select" style={{ fontSize: '12px' }} value={hotel.mealPlan} onChange={e => handleHotelChange(idx, 'mealPlan', e.target.value)}>
                        <option value="EP (Room Only)">EP - Room Only</option>
                        <option value="CP (Breakfast)">CP - Breakfast</option>
                        <option value="MAP (B+D)">MAP - Breakfast+Dinner</option>
                        <option value="AP (All Meals)">AP - All Meals</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Nights</label>
                      <input type="number" className="form-input" style={{ fontSize: '12px' }} min="1" value={hotel.nights} onChange={e => handleHotelChange(idx, 'nights', Number(e.target.value))} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Rooms</label>
                      <input type="number" className="form-input" style={{ fontSize: '12px' }} min="1" value={hotel.numRooms} onChange={e => handleHotelChange(idx, 'numRooms', Number(e.target.value))} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Rate/Night (₹)</label>
                      <input type="number" className="form-input" style={{ fontSize: '12px' }} value={hotel.ratePerNight} onChange={e => handleHotelChange(idx, 'ratePerNight', Number(e.target.value))} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', cursor: 'pointer' }}>
                      <input type="checkbox" checked={hotel.saveToMaster} onChange={e => handleHotelChange(idx, 'saveToMaster', e.target.checked)} />
                      Save this hotel for future bookings
                    </label>
                    <span style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '13px' }}>
                      Hotel Cost: {formatINR((hotel.nights || 1) * (hotel.numRooms || 1) * (hotel.ratePerNight || 0))}
                    </span>
                  </div>
                </div>
              ))}

              {/* Service rows — only shown if added */}
              {services.map((svc, idx) => (
                <div key={idx} style={{ background: '#fff', padding: '12px 14px', borderRadius: '8px', border: '2px solid #a7f3d0', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#065f46' }}>
                      {svc.serviceType === 'Transport/Cab' ? '🚗' : svc.serviceType === 'Flight Tickets' ? '✈️' : svc.serviceType === 'Activity/Sightseeing' ? '🎒' : svc.serviceType === 'Tour Guide' ? '🧭' : '📋'} {svc.serviceType}
                    </span>
                    <button type="button" onClick={() => setServices(services.filter((_, i) => i !== idx))}
                      style={{ background: '#fee2e2', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                      Remove
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Description</label>
                      <input className="form-input" style={{ fontSize: '12px' }} placeholder="e.g. Private AC cab for 6 days" value={svc.description} onChange={e => handleServiceChange(idx, 'description', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Our Cost (₹)</label>
                      <input type="number" className="form-input" style={{ fontSize: '12px' }} placeholder="0" value={svc.costPrice} onChange={e => handleServiceChange(idx, 'costPrice', Number(e.target.value))} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Client Price (₹)</label>
                      <input type="number" className="form-input" style={{ fontSize: '12px' }} placeholder="0" value={svc.sellingPrice} onChange={e => handleServiceChange(idx, 'sellingPrice', Number(e.target.value))} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 6. Pricing & GST */}
            <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '2px solid #cbd5e1' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>Pricing &amp; GST</div>
                <button type="button" onClick={() => setShowGst(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px',
                    border: showGst ? '2px solid #059669' : '2px solid #e2e8f0',
                    background: showGst ? '#f0fdf4' : '#fff',
                    color: showGst ? '#059669' : '#94a3b8',
                    fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                  GST {showGst ? 'ON (shown on invoice)' : 'OFF (not on invoice)'}
                </button>
              </div>
              <div className="form-row" style={{ marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Client Selling Price (Rs) *</label>
                  <input type="number" className="form-input" style={{ fontSize: '16px', fontWeight: 700 }} value={sellingPrice} onChange={e => setSellingPrice(Number(e.target.value))} required />
                </div>
                {showGst && (
                  <div className="form-group">
                    <label className="form-label">GST Rate</label>
                    <select className="form-select" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))}>
                      <option value="5.0">5% - Tour Package</option>
                      <option value="18.0">18% - Service/Accommodation</option>
                      <option value="0.0">0% - Exempt</option>
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Notes for Customer</label>
                  <input className="form-input" placeholder="Special instructions..." value={customerNotes} onChange={e => setCustomerNotes(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', background: '#fff', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Subtotal</div>
                  <div style={{ fontSize: '16px', fontWeight: 800 }}>{formatINR(baseSelling)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>{showGst ? 'GST (' + taxRate + '%)' : 'GST'}</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: showGst ? '#0f172a' : '#cbd5e1' }}>{showGst ? formatINR(taxAmount) : 'Not Applied'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#1e3a8a', textTransform: 'uppercase', fontWeight: 700 }}>Total Billed</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e3a8a' }}>{formatINR(grossTotal)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: estimatedProfit >= 0 ? '#059669' : '#dc2626', textTransform: 'uppercase', fontWeight: 700 }}>Est. Profit</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: estimatedProfit >= 0 ? '#059669' : '#dc2626' }}>{formatINR(estimatedProfit)}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Costs: {formatINR(totalSupplierCost)}</div>
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ minWidth: '240px', fontSize: '14px', fontWeight: 700 }}>
              {submitting ? 'Saving Booking...' : 'Save Booking & Generate Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
