import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Copy, Edit, Trash2, Calendar, MapPin, Check, 
  ChevronRight, Eye, X, Image as ImageIcon, CheckCircle, Tag
} from 'lucide-react';
import { formatINR } from '../utils/formatters';

export default function PackagesView({ onOpenNewBooking }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/packages');
      if (res.ok) {
        const data = await res.json();
        setPackages(data);
      }
    } catch (err) {
      console.error('Failed to fetch packages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (pkgId) => {
    try {
      const res = await fetch(`/api/packages/${pkgId}/duplicate`, { method: 'POST' });
      if (res.ok) {
        alert('Package duplicated successfully!');
        fetchPackages();
      }
    } catch (err) {
      console.error('Failed to duplicate package:', err);
    }
  };

  const handleDelete = async (pkgId) => {
    if (!window.confirm('Are you sure you want to delete this package template?')) return;
    try {
      const res = await fetch(`/api/packages/${pkgId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPackages();
        if (selectedPackage?.id === pkgId) setSelectedPackage(null);
      }
    } catch (err) {
      console.error('Failed to delete package:', err);
    }
  };

  const handleOpenEdit = (pkg) => {
    setEditingPackage({
      ...pkg,
      inclusionsText: pkg.inclusions || '',
      exclusionsText: pkg.exclusions || '',
      cancellationTermsText: pkg.cancellation_terms || '',
      days: pkg.day_wise_itinerary || []
    });
    setIsEditModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingPackage({
      name: '',
      destination: '',
      country: 'India',
      description: '',
      duration_days: 5,
      duration_nights: 4,
      selling_price: 45000,
      estimated_cost: 32000,
      pricing_basis: 'Per Person (Twin Sharing)',
      inclusionsText: '• Hotel accommodation with breakfast\n• Chauffeur-driven AC cab\n• Airport pickups & drops\n• Sightseeing tours',
      exclusionsText: '• Airfare / Train tickets\n• Monument entry tickets\n• GST 5%',
      cancellationTermsText: '• Cancellation 15 days prior: 25% retention\n• Cancellation within 7 days: 100% non-refundable',
      days: [
        { day: 1, title: 'Arrival & Welcome', morning_activity: 'Pickup & hotel check-in', afternoon_activity: 'Leisure & relax', evening_activity: 'Local market stroll', stay_hotel: '4-Star Comfort Resort', meals_included: 'Dinner' }
      ],
      image_url: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800',
      is_active: 1
    });
    setIsEditModalOpen(true);
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: editingPackage.name,
        destination: editingPackage.destination,
        country: editingPackage.country,
        description: editingPackage.description,
        durationDays: editingPackage.duration_days,
        durationNights: editingPackage.duration_nights,
        sellingPrice: editingPackage.selling_price,
        estimatedCost: editingPackage.estimated_cost,
        pricingBasis: editingPackage.pricing_basis,
        inclusions: editingPackage.inclusionsText,
        exclusions: editingPackage.exclusionsText,
        cancellationTerms: editingPackage.cancellationTermsText,
        dayWiseItinerary: editingPackage.days,
        imageUrl: editingPackage.image_url,
        isActive: editingPackage.is_active
      };

      const isUpdate = !!editingPackage.id;
      const url = isUpdate ? `/api/packages/${editingPackage.id}` : '/api/packages';
      const method = isUpdate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        fetchPackages();
      }
    } catch (err) {
      console.error('Failed to save package:', err);
    }
  };

  const filtered = packages.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.destination.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>Package Master</h2>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            Reusable itineraries, supplier cost benchmarks &amp; selling prices. Selecting a package auto-populates bookings.
          </p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={handleOpenNew}
        >
          <Plus size={18} /> Create Reusable Package
        </button>
      </div>

      {/* Search Bar */}
      <div className="panel" style={{ padding: '14px 20px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
          <input 
            type="text" 
            className="form-input" 
            style={{ paddingLeft: '36px' }}
            placeholder="Search packages by destination or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Package Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {filtered.map(pkg => (
          <div 
            key={pkg.id} 
            className="panel"
            style={{ 
              margin: 0, 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'all 0.2s ease',
              border: selectedPackage?.id === pkg.id ? '2px solid #2563eb' : '1px solid #e2e8f0'
            }}
          >
            {/* Image banner */}
            <div style={{ position: 'relative', height: '160px', overflow: 'hidden', background: '#e2e8f0' }}>
              <img 
                src={pkg.image_url || 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800'} 
                alt={pkg.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ 
                position: 'absolute', 
                top: '12px', 
                right: '12px', 
                background: 'rgba(15, 23, 42, 0.75)', 
                color: 'white', 
                padding: '4px 10px', 
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700
              }}>
                {pkg.duration_days}D / {pkg.duration_nights}N
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <MapPin size={13} color="#2563eb" /> {pkg.destination}
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', lineHeight: 1.3 }}>
                {pkg.name}
              </h3>
              <p style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.5, marginBottom: '14px', flex: 1 }}>
                {pkg.description?.slice(0, 110)}...
              </p>

              {/* Price Row */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'baseline', 
                justifyContent: 'space-between', 
                padding: '10px 12px', 
                background: '#f8fafc', 
                borderRadius: '8px',
                marginBottom: '14px' 
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Selling Price</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e3a8a' }}>
                    {formatINR(pkg.selling_price)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>Est. Cost: {formatINR(pkg.estimated_cost)}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{pkg.pricing_basis}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <button 
                  className="btn btn-outline btn-sm" 
                  style={{ flex: 1 }}
                  onClick={() => setSelectedPackage(pkg)}
                >
                  <Eye size={13} /> View Plan
                </button>
                <button 
                  className="btn btn-outline btn-sm" 
                  title="Duplicate Package"
                  onClick={() => handleDuplicate(pkg.id)}
                >
                  <Copy size={13} />
                </button>
                <button 
                  className="btn btn-outline btn-sm" 
                  title="Edit Package"
                  onClick={() => handleOpenEdit(pkg)}
                >
                  <Edit size={13} />
                </button>
                <button 
                  className="btn btn-outline btn-sm" 
                  title="Delete Package"
                  onClick={() => handleDelete(pkg.id)}
                  style={{ color: '#dc2626' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Package Detail Preview Modal */}
      {selectedPackage && (
        <div className="modal-overlay" onClick={() => setSelectedPackage(null)}>
          <div className="modal-card modal-card-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e3a8a' }}>{selectedPackage.name}</h3>
                <p style={{ fontSize: '13px', color: '#64748b' }}>{selectedPackage.destination} • {selectedPackage.duration_days} Days / {selectedPackage.duration_nights} Nights</p>
              </div>
              <button onClick={() => setSelectedPackage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '75vh' }}>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#334155', marginBottom: '20px' }}>
                {selectedPackage.description}
              </p>

              <h4 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '10px', color: '#0f172a' }}>
                Day-Wise Default Itinerary
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {selectedPackage.day_wise_itinerary?.map((day, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '14px', marginBottom: '4px' }}>
                      Day {day.day}: {day.title}
                    </div>
                    <div style={{ fontSize: '13px', color: '#334155' }}>• Morning: {day.morning_activity}</div>
                    <div style={{ fontSize: '13px', color: '#334155' }}>• Afternoon: {day.afternoon_activity}</div>
                    <div style={{ fontSize: '13px', color: '#334155' }}>• Evening: {day.evening_activity}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Hotel: {day.stay_hotel} | Meals: {day.meals_included}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <h5 style={{ fontWeight: 800, color: '#166534', marginBottom: '6px' }}>Inclusions</h5>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '12.5px', color: '#14532d' }}>
                    {selectedPackage.inclusions}
                  </pre>
                </div>

                <div style={{ background: '#fef2f2', padding: '14px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  <h5 style={{ fontWeight: 800, color: '#991b1b', marginBottom: '6px' }}>Exclusions</h5>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '12.5px', color: '#7f1d1d' }}>
                    {selectedPackage.exclusions}
                  </pre>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setSelectedPackage(null)}>Close</button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setSelectedPackage(null);
                  onOpenNewBooking();
                }}
              >
                Use Package for New Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Package Modal */}
      {isEditModalOpen && editingPackage && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-card modal-card-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e3a8a' }}>
                {editingPackage.id ? 'Edit Package Master' : 'Create Reusable Package'}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleSavePackage}>
              <div className="modal-body" style={{ maxHeight: '75vh' }}>
                <div className="form-row">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Package Title *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Splendid Kashmir Paradise"
                      value={editingPackage.name}
                      onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Destination *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Srinagar, Gulmarg"
                      value={editingPackage.destination}
                      onChange={(e) => setEditingPackage({ ...editingPackage, destination: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Duration (Days)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      min="1"
                      value={editingPackage.duration_days}
                      onChange={(e) => setEditingPackage({ 
                        ...editingPackage, 
                        duration_days: Number(e.target.value),
                        duration_nights: Math.max(1, Number(e.target.value) - 1)
                      })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Duration (Nights)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={editingPackage.duration_nights}
                      readOnly
                      style={{ background: '#f1f5f9' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Selling Price (₹) *</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={editingPackage.selling_price}
                      onChange={(e) => setEditingPackage({ ...editingPackage, selling_price: Number(e.target.value) })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Est. Supplier Cost (₹)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={editingPackage.estimated_cost}
                      onChange={(e) => setEditingPackage({ ...editingPackage, estimated_cost: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Package Description</label>
                  <textarea 
                    className="form-textarea"
                    rows={2}
                    value={editingPackage.description}
                    onChange={(e) => setEditingPackage({ ...editingPackage, description: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Inclusions (Bullet list)</label>
                    <textarea 
                      className="form-textarea"
                      rows={3}
                      value={editingPackage.inclusionsText}
                      onChange={(e) => setEditingPackage({ ...editingPackage, inclusionsText: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Exclusions (Bullet list)</label>
                    <textarea 
                      className="form-textarea"
                      rows={3}
                      value={editingPackage.exclusionsText}
                      onChange={(e) => setEditingPackage({ ...editingPackage, exclusionsText: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Image URL</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editingPackage.image_url}
                    onChange={(e) => setEditingPackage({ ...editingPackage, image_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Package Master</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
