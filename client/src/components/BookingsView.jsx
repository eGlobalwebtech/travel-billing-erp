import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Filter, Calendar, MapPin, User, Phone, CheckCircle, 
  Clock, AlertCircle, FileText, Printer, Eye, ChevronDown, Check,
  Building, Car, Plane, DollarSign, X, ArrowRight
} from 'lucide-react';
import { formatINR, formatDate, calculateEndDate } from '../utils/formatters';
import FilterBar, { exportToCSV } from './FilterBar';

export default function BookingsView({ 
  onOpenNewBooking, 
  onSelectBooking, 
  selectedBookingId, 
  onCloseBookingDetails,
  onOpenReceivePayment 
}) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingDetail, setBookingDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [printDocumentType, setPrintDocumentType] = useState(null);
  const [showGstOnPdf, setShowGstOnPdf] = useState(true);

  // Unified filter state
  const [filters, setFilters] = useState({ search: '', status: 'All', dateFrom: '', dateTo: '', destination: '', minAmount: '', maxAmount: '' });

  const handleFilterChange = (key, value) => setFilters(f => ({ ...f, [key]: value }));
  const handleFilterReset = () => setFilters({ search: '', status: 'All', dateFrom: '', dateTo: '', destination: '', minAmount: '', maxAmount: '' });

  // Derived: legacy aliases for existing code
  const search = filters.search;
  const statusFilter = filters.status;

  useEffect(() => { fetchBookings(); }, [filters.status, filters.search]);

  useEffect(() => {
    if (selectedBookingId) {
      fetchBookingDetails(selectedBookingId);
    } else {
      setBookingDetail(null);
    }
  }, [selectedBookingId]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/bookings', window.location.origin);
      if (filters.status !== 'All') url.searchParams.append('status', filters.status);
      if (filters.search) url.searchParams.append('search', filters.search);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingDetails = async (id) => {
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/bookings/${id}`);
      if (res.ok) {
        const data = await res.json();
        setBookingDetail(data);
      }
    } catch (err) {
      console.error('Failed to fetch booking details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!bookingDetail) return;
    try {
      const res = await fetch(`/api/bookings/${bookingDetail.booking.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchBookingDetails(bookingDetail.booking.id);
        fetchBookings();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div>
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>Bookings Management</h2>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            Track client itineraries, travel dates, multi-hotel stays, and payments.
          </p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={onOpenNewBooking}
          id="btn-create-booking"
        >
          <Plus size={18} /> New Travel Booking
        </button>
      </div>

      {/* FilterBar */}
      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleFilterReset}
        resultCount={bookings.length}
        onExport={() => exportToCSV(bookings.map(b => ({
          'Booking ID': b.booking_number,
          'Customer': b.customer_name,
          'Phone': b.customer_phone,
          'Destination': b.destination,
          'Start Date': b.start_date,
          'End Date': b.end_date,
          'Status': b.status,
          'Total (Rs)': b.gross_total,
          'Paid (Rs)': b.customer_paid || 0,
          'Balance (Rs)': b.customer_due || 0
        })), 'bookings.csv')}
        config={[
          { key: 'search', type: 'text', primary: true, label: 'Search', placeholder: 'Search booking ID, customer, destination, phone...' },
          { key: 'status', type: 'select', label: 'Status', options: ['Confirmed','In Progress','Completed','Quoted','Enquiry','Cancelled'] },
          { key: 'dateFrom', type: 'date', label: 'Travel From' },
          { key: 'dateTo', type: 'date', label: 'Travel To' },
          { key: 'destination', type: 'text', label: 'Destination', placeholder: 'e.g. Goa, Kashmir' },
          { key: 'minAmount', type: 'amount', label: 'Min Amount (₹)', placeholder: '0' },
          { key: 'maxAmount', type: 'amount', label: 'Max Amount (₹)', placeholder: '999999' },
        ]}
      />

      {/* Bookings Table */}
      <div className="panel">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Customer</th>
                <th>Destination</th>
                <th>Travel Dates</th>
                <th>Pax</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Total Bill (₹)</th>
                <th style={{ textAlign: 'right' }}>Paid (₹)</th>
                <th style={{ textAlign: 'right' }}>Balance Due (₹)</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    Loading bookings...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No bookings found matching your search. Click "New Travel Booking" to create one.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => {
                  const balance = b.customer_due !== undefined ? b.customer_due : (b.gross_total - (b.customer_paid || 0));
                  return (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#1e3a8a' }}>
                        {b.booking_number}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{b.customer_name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{b.customer_phone}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{b.destination}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {b.duration_days}D / {b.duration_nights}N
                        </div>
                      </td>
                      <td style={{ fontSize: '13px' }}>
                        <div style={{ fontWeight: 600 }}>{formatDate(b.start_date)}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748b' }}>to {formatDate(b.end_date)}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{b.pax_adults} Adults</span>
                        {b.pax_children > 0 && <span style={{ fontSize: '11px', color: '#64748b' }}> + {b.pax_children} K</span>}
                      </td>
                      <td>
                        <span className={`badge badge-${b.status.toLowerCase().replace(' ', '')}`}>
                          {b.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800 }}>
                        {formatINR(b.gross_total)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                        {formatINR(b.customer_paid || 0)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: balance > 0 ? '#dc2626' : '#059669' }}>
                        {balance > 0 ? formatINR(balance) : 'Settled'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn btn-outline btn-sm"
                          onClick={() => onSelectBooking(b.id)}
                          title="View complete booking file"
                        >
                          <Eye size={14} /> View File
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Details Modal / Drawer */}
      {selectedBookingId && bookingDetail && (
        <div className="modal-overlay" onClick={onCloseBookingDetails}>
          <div 
            className="modal-card modal-card-large" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '92vh' }}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{ background: '#f8fafc' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e3a8a' }}>
                    Booking File: #{bookingDetail.booking.booking_number}
                  </h3>
                  <span className={`badge badge-${bookingDetail.booking.status.toLowerCase().replace(' ', '')}`}>
                    {bookingDetail.booking.status}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                  {bookingDetail.booking.destination} • {bookingDetail.booking.duration_days} Days / {bookingDetail.booking.duration_nights} Nights • Travel: {formatDate(bookingDetail.booking.start_date)} to {formatDate(bookingDetail.booking.end_date)}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  className="btn btn-sm btn-outline"
                  onClick={() => setPrintDocumentType('invoice')}
                  title="Print Tax Invoice"
                >
                  <Printer size={14} /> Tax Invoice
                </button>
                <button 
                  className="btn btn-sm btn-outline"
                  onClick={() => setPrintDocumentType('itinerary')}
                  title="Print Client Proposal / Itinerary"
                >
                  <Printer size={14} /> Itinerary Proposal
                </button>
                <button 
                  className="btn btn-sm btn-outline"
                  onClick={() => setPrintDocumentType('voucher')}
                  title="Print Hotel Service Voucher"
                >
                  <Printer size={14} /> Hotel Voucher
                </button>
                <button 
                  onClick={onCloseBookingDetails} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
                >
                  <X size={20} color="#64748b" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="modal-body" style={{ padding: '20px 24px' }}>
              {/* Top Summary Bar */}
              <div className="booking-detail-summary-grid">
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Customer</div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '15px' }}>{bookingDetail.booking.customer_name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{bookingDetail.booking.customer_phone}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Selling Price (Gross)</div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '16px' }}>{formatINR(bookingDetail.booking.gross_total)}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Includes GST ₹{bookingDetail.booking.tax_amount}</div>
                </div>

                <div style={{ background: '#f0fdf4', padding: '12px 14px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '11px', color: '#166534', textTransform: 'uppercase', fontWeight: 700 }}>Customer Paid</div>
                  <div style={{ fontWeight: 800, color: '#166534', fontSize: '16px' }}>
                    {formatINR(bookingDetail.invoices?.[0]?.paid_amount || 0)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#15803d' }}>
                    Due: {formatINR(bookingDetail.invoices?.[0]?.balance_amount || 0)}
                  </div>
                </div>

                <div style={{ background: '#ecfdf5', padding: '12px 14px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                  <div style={{ fontSize: '11px', color: '#047857', textTransform: 'uppercase', fontWeight: 700 }}>Tour Profit Margin</div>
                  <div style={{ fontWeight: 800, color: '#047857', fontSize: '16px' }}>{formatINR(bookingDetail.booking.estimated_profit)}</div>
                  <div style={{ fontSize: '11px', color: '#059669' }}>
                    Supplier Cost: {formatINR(bookingDetail.booking.total_supplier_cost)}
                  </div>
                </div>
              </div>

              {/* Status Update Quick Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', background: '#f1f5f9', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>Update Booking Status:</span>
                {['Quoted', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'].map((st) => (
                  <button
                    key={st}
                    className={`btn btn-sm ${bookingDetail.booking.status === st ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleUpdateStatus(st)}
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                  >
                    {bookingDetail.booking.status === st && <Check size={12} />} {st}
                  </button>
                ))}
              </div>

              {/* Hotels Section */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={16} color="#1e3a8a" /> Hotel Accommodations ({bookingDetail.hotels?.length || 0})
                </h4>
                {bookingDetail.hotels?.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '13px' }}>No separate hotels logged.</p>
                ) : (
                  <table style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>Hotel Name</th>
                        <th>Room Category</th>
                        <th>Check-in / Check-out</th>
                        <th>Nights &amp; Rooms</th>
                        <th>Meal Plan</th>
                        <th>Supplier</th>
                        <th style={{ textAlign: 'right' }}>Total Cost (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookingDetail.hotels.map((h, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 700 }}>{h.hotel_name}</td>
                          <td>{h.room_type}</td>
                          <td>{formatDate(h.check_in)} - {formatDate(h.check_out)}</td>
                          <td>{h.nights}N × {h.num_rooms}R</td>
                          <td><span className="badge badge-quoted">{h.meal_plan}</span></td>
                          <td>{h.supplier_name || 'Direct'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatINR(h.total_cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Services Section */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Car size={16} color="#059669" /> Cabs, Transport &amp; Extra Services ({bookingDetail.services?.length || 0})
                </h4>
                {bookingDetail.services?.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '13px' }}>No additional transport/service items logged.</p>
                ) : (
                  <table style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Description</th>
                        <th>Supplier</th>
                        <th style={{ textAlign: 'right' }}>Cost Price (₹)</th>
                        <th style={{ textAlign: 'right' }}>Customer Price (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookingDetail.services.map((s, i) => (
                        <tr key={i}>
                          <td><span className="badge badge-confirmed">{s.service_type}</span></td>
                          <td>{s.description}</td>
                          <td>{s.supplier_name || 'Direct'}</td>
                          <td style={{ textAlign: 'right' }}>{formatINR(s.cost_price)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatINR(s.selling_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Day-wise Itinerary Snapshot */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={16} color="#d97706" /> Day-Wise Itinerary Plan ({bookingDetail.itinerary?.length || 0} Days)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {bookingDetail.itinerary?.map((day, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '14px' }}>
                          Day {day.day_number}: {day.title}
                        </span>
                        <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                          Meals: {day.meals_included || 'Standard'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.6 }}>
                        <div><strong>Morning:</strong> {day.morning_activity || 'Sightseeing'}</div>
                        <div><strong>Afternoon:</strong> {day.afternoon_activity || 'Touring'}</div>
                        <div><strong>Evening:</strong> {day.evening_activity || 'Dinner & rest'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button 
                className="btn btn-outline" 
                onClick={onCloseBookingDetails}
              >
                Close
              </button>
              {bookingDetail.invoices?.[0]?.balance_amount > 0 && (
                <button 
                  className="btn btn-success"
                  onClick={() => {
                    onCloseBookingDetails();
                    onOpenReceivePayment(bookingDetail.booking.id);
                  }}
                >
                  Receive Customer Payment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE DOCUMENT MODAL */}
      {printDocumentType && bookingDetail && (
        <div className="modal-overlay" onClick={() => setPrintDocumentType(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '820px', background: '#ffffff', overflowY: 'auto', maxHeight: '94vh' }}
          >
            {/* Print Controls (hidden on actual print) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: '#1e3a8a', borderRadius: '12px 12px 0 0' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['invoice','itinerary','voucher'].map(type => (
                  <button key={type} onClick={() => setPrintDocumentType(type)} className={printDocumentType === type ? 'btn btn-sm' : 'btn btn-sm'}
                    style={{ fontSize: '12px', fontWeight: 700, background: printDocumentType === type ? '#fff' : 'rgba(255,255,255,0.15)', color: printDocumentType === type ? '#1e3a8a' : '#fff', border: 'none', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer' }}>
                    {type === 'invoice' ? 'Tax Invoice' : type === 'itinerary' ? 'Itinerary' : 'Hotel Voucher'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {printDocumentType === 'invoice' && (
                  <button onClick={() => setShowGstOnPdf(v => !v)}
                    style={{ fontSize: '12px', fontWeight: 700, background: showGstOnPdf ? '#f0fdf4' : 'rgba(255,255,255,0.15)', color: showGstOnPdf ? '#059669' : '#fff', border: showGstOnPdf ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '4px 12px', cursor: 'pointer' }}>
                    GST {showGstOnPdf ? 'ON' : 'OFF'}
                  </button>
                )}
                <button onClick={() => window.print()} style={{ fontSize: '12px', fontWeight: 700, background: '#fff', color: '#1e3a8a', border: 'none', borderRadius: '6px', padding: '5px 14px', cursor: 'pointer' }}>
                  Print / Save PDF
                </button>
                <button onClick={() => setPrintDocumentType(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '18px' }}>&times;</button>
              </div>
            </div>

            {/* ── PRINTABLE CONTENT ── */}
            <div style={{ padding: '36px', fontFamily: 'Georgia, serif' }}>

              {/* Agency Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '20px', marginBottom: '20px', borderBottom: '3px solid #1e3a8a' }}>
                <div>
                  <img src="https://nilkanthtourism.com/wp-content/uploads/2025/03/logo-Photoroom.png" alt="Nilkanth Tourism" style={{ height: '52px', objectFit: 'contain', display: 'block', marginBottom: '6px' }} />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Premium Tour Operators &bull; Domestic &amp; International Packages</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                    GSTIN: 07AAAAA1234A1Z5 &bull; PAN: AAAAA1234A
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Ph: +91 75750 99090 &bull; Email: info@nilkanthtourism.com</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Web: www.nilkanthtourism.com</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-block', background: '#1e3a8a', color: '#fff', padding: '6px 18px', borderRadius: '6px', fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                    {printDocumentType === 'invoice' ? (showGstOnPdf ? 'Tax Invoice' : 'Invoice') : printDocumentType === 'itinerary' ? 'Tour Itinerary' : 'Hotel Voucher'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>#{bookingDetail.booking.booking_number}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Date: {formatDate(new Date())}</div>
                </div>
              </div>

              {/* Client & Trip Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, marginBottom: '6px', fontFamily: 'sans-serif' }}>Billed To</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{bookingDetail.booking.customer_name}</div>
                  {bookingDetail.booking.customer_phone && <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>Ph: {bookingDetail.booking.customer_phone}</div>}
                  {bookingDetail.booking.customer_email && <div style={{ fontSize: '12px', color: '#475569' }}>Email: {bookingDetail.booking.customer_email}</div>}
                  {bookingDetail.booking.customer_city && <div style={{ fontSize: '12px', color: '#475569' }}>{bookingDetail.booking.customer_city}</div>}
                </div>
                <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, marginBottom: '6px', fontFamily: 'sans-serif' }}>Tour Details</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{bookingDetail.booking.destination}</div>
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>{formatDate(bookingDetail.booking.start_date)} &rarr; {formatDate(bookingDetail.booking.end_date)}</div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>{bookingDetail.booking.duration_days} Days / {bookingDetail.booking.duration_nights} Nights</div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>Pax: {bookingDetail.booking.pax_adults} Adults{bookingDetail.booking.pax_children > 0 ? ` + ${bookingDetail.booking.pax_children} Children` : ''}</div>
                </div>
              </div>

              {/* ── INVOICE CONTENT ── */}
              {printDocumentType === 'invoice' && (
                <div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px', fontFamily: 'sans-serif' }}>
                    <thead>
                      <tr style={{ background: '#1e3a8a', color: '#fff' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>Description</th>
                        {showGstOnPdf && <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, width: '80px' }}>SAC</th>}
                        {showGstOnPdf && <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, width: '120px' }}>Taxable Amt</th>}
                        {showGstOnPdf && <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, width: '100px' }}>GST ({bookingDetail.booking.tax_rate || 5}%)</th>}
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, width: '130px' }}>Total (Rs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 700, marginBottom: '4px' }}>Tour Package: {bookingDetail.booking.destination}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
                            {bookingDetail.booking.duration_days} Days / {bookingDetail.booking.duration_nights} Nights all-inclusive tour package.
                            {bookingDetail.hotels?.length > 0 && ` Hotel stays: ${bookingDetail.hotels.map(h => h.hotel_name).join(', ')}.`}
                          </div>
                        </td>
                        {showGstOnPdf && <td style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>998555</td>}
                        {showGstOnPdf && <td style={{ padding: '12px', textAlign: 'right' }}>{formatINR(bookingDetail.booking.selling_price)}</td>}
                        {showGstOnPdf && <td style={{ padding: '12px', textAlign: 'right' }}>{formatINR(bookingDetail.booking.tax_amount)}</td>}
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800 }}>{formatINR(bookingDetail.booking.gross_total)}</td>
                      </tr>
                      {bookingDetail.services?.filter(s => s.selling_price > 0).map((s, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fafbfc' : '#fff' }}>
                          <td style={{ padding: '10px 12px' }}>{s.service_type}: {s.description}</td>
                          {showGstOnPdf && <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>998559</td>}
                          {showGstOnPdf && <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatINR(s.selling_price)}</td>}
                          {showGstOnPdf && <td style={{ padding: '10px 12px', textAlign: 'right' }}>—</td>}
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{formatINR(s.selling_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px' }}>
                    {/* Payment Details */}
                    <div style={{ background: '#f0f9ff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '12px', fontFamily: 'sans-serif', flex: 1 }}>
                      <div style={{ fontWeight: 800, color: '#0369a1', marginBottom: '8px' }}>Payment Details</div>
                      <div style={{ color: '#475569' }}>Bank: HDFC Bank Ltd</div>
                      <div style={{ color: '#475569' }}>Account No: 50200088991122</div>
                      <div style={{ color: '#475569' }}>IFSC: HDFC0000123</div>
                      <div style={{ color: '#475569', marginTop: '4px', fontWeight: 700 }}>UPI: nilkanthtourism@hdfcbank</div>
                    </div>

                    {/* Totals */}
                    <div style={{ minWidth: '240px', fontFamily: 'sans-serif' }}>
                      {showGstOnPdf && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                            <span style={{ color: '#475569' }}>Subtotal (excl. GST):</span>
                            <strong>{formatINR(bookingDetail.booking.selling_price)}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                            <span style={{ color: '#475569' }}>GST ({bookingDetail.booking.tax_rate || 5}%):</span>
                            <strong>{formatINR(bookingDetail.booking.tax_amount)}</strong>
                          </div>
                        </>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid #1e3a8a', marginTop: '4px', fontSize: '15px' }}>
                        <span style={{ fontWeight: 800 }}>Grand Total:</span>
                        <strong style={{ color: '#1e3a8a', fontSize: '16px' }}>{formatINR(bookingDetail.booking.gross_total)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: '#059669' }}>
                        <span>Amount Received:</span>
                        <strong>{formatINR(bookingDetail.invoices?.[0]?.paid_amount || 0)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: '#dc2626', fontWeight: 800, borderTop: '1px dashed #e2e8f0', marginTop: '4px' }}>
                        <span>Balance Due:</span>
                        <strong>{formatINR(bookingDetail.invoices?.[0]?.balance_amount || 0)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Terms */}
                  <div style={{ marginTop: '24px', padding: '12px 16px', background: '#fafbfc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b', fontFamily: 'sans-serif' }}>
                    <strong>Terms & Conditions:</strong> Payment due before travel date. No refund on cancellation within 7 days of travel. This is a computer-generated invoice.
                  </div>
                </div>
              )}

              {/* ── ITINERARY CONTENT ── */}
              {printDocumentType === 'itinerary' && (
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '14px', color: '#1e3a8a', fontFamily: 'sans-serif' }}>
                    Day-Wise Tour Itinerary &amp; Sightseeing Plan
                  </div>
                  {bookingDetail.itinerary?.length === 0 && (
                    <p style={{ color: '#94a3b8', fontFamily: 'sans-serif' }}>No day-wise itinerary added for this booking.</p>
                  )}
                  {bookingDetail.itinerary?.map((day, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '14px', marginBottom: '14px' }}>
                      <div style={{ background: '#1e3a8a', color: '#fff', borderRadius: '8px', padding: '8px 12px', textAlign: 'center', minWidth: '52px', alignSelf: 'flex-start', fontFamily: 'sans-serif' }}>
                        <div style={{ fontSize: '10px', fontWeight: 600 }}>DAY</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, lineHeight: 1 }}>{day.day_number}</div>
                      </div>
                      <div style={{ flex: 1, padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '5px', fontSize: '14px' }}>{day.title}</div>
                        <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.7 }}>
                          {day.morning_activity && <div>&#9728; <strong>Morning:</strong> {day.morning_activity}</div>}
                          {day.afternoon_activity && <div>&#9729; <strong>Afternoon:</strong> {day.afternoon_activity}</div>}
                          {day.evening_activity && <div>&#9790; <strong>Evening:</strong> {day.evening_activity}</div>}
                        </div>
                        {(day.stay_hotel || day.meals_included) && (
                          <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748b', fontFamily: 'sans-serif' }}>
                            {day.stay_hotel && <span>&#127968; {day.stay_hotel}</span>}
                            {day.meals_included && <span style={{ marginLeft: '12px' }}>&#127858; {day.meals_included}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Hotels used in tour */}
                  {bookingDetail.hotels?.length > 0 && (
                    <div style={{ marginTop: '20px', padding: '14px 16px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', fontFamily: 'sans-serif' }}>
                      <div style={{ fontWeight: 800, color: '#1e3a8a', marginBottom: '8px', fontSize: '13px' }}>Accommodation Summary</div>
                      {bookingDetail.hotels.map((h, i) => (
                        <div key={i} style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                          &#9654; <strong>{h.hotel_name}</strong>: {h.num_rooms} {h.room_type} &bull; {h.nights}N &bull; {h.meal_plan} &bull; Check-in: {formatDate(h.check_in)}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Price note */}
                  <div style={{ marginTop: '16px', padding: '12px 16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontFamily: 'sans-serif' }}>
                    <div style={{ fontWeight: 800, color: '#166534', marginBottom: '4px' }}>Package Price: {formatINR(bookingDetail.booking.gross_total)}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Price is per package basis. Contact us for customization.</div>
                  </div>
                </div>
              )}

              {/* ── VOUCHER CONTENT ── */}
              {printDocumentType === 'voucher' && (
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '14px', color: '#1e3a8a', fontFamily: 'sans-serif' }}>
                    Hotel &amp; Service Confirmation Voucher
                  </div>
                  {bookingDetail.hotels?.map((h, idx) => (
                    <div key={idx} style={{ padding: '16px', border: '2px solid #cbd5e1', borderRadius: '10px', marginBottom: '14px', fontFamily: 'sans-serif' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: '#1e3a8a' }}>{h.hotel_name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{bookingDetail.booking.destination}</div>
                        </div>
                        <span style={{ background: '#d1fae5', color: '#065f46', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>CONFIRMED</span>
                      </div>
                      <div className="hotel-voucher-grid">
                        <div><div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Check-In</div><div style={{ fontWeight: 700 }}>{formatDate(h.check_in)}</div></div>
                        <div><div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Check-Out</div><div style={{ fontWeight: 700 }}>{formatDate(h.check_out)}</div></div>
                        <div><div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Duration</div><div style={{ fontWeight: 700 }}>{h.nights} Night{h.nights > 1 ? 's' : ''}</div></div>
                        <div><div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Room Type</div><div style={{ fontWeight: 700 }}>{h.num_rooms} &times; {h.room_type}</div></div>
                        <div><div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Meal Plan</div><div style={{ fontWeight: 700 }}>{h.meal_plan}</div></div>
                        <div><div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Guests</div><div style={{ fontWeight: 700 }}>{bookingDetail.booking.pax_adults} Adults{bookingDetail.booking.pax_children > 0 ? ` + ${bookingDetail.booking.pax_children} Children` : ''}</div></div>
                      </div>
                      <div style={{ marginTop: '10px', padding: '8px 12px', background: '#eff6ff', borderRadius: '6px', fontSize: '12px', color: '#1e3a8a', fontWeight: 700 }}>
                        Guest Name: {bookingDetail.booking.customer_name} &bull; Booking Ref: {bookingDetail.booking.booking_number}
                      </div>
                    </div>
                  ))}
                  {bookingDetail.services?.map((s, idx) => (
                    <div key={idx} style={{ padding: '14px', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '10px', fontFamily: 'sans-serif' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{s.service_type}: {s.description}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Confirmed for: {bookingDetail.booking.customer_name} &bull; Travel: {formatDate(bookingDetail.booking.start_date)}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8', fontFamily: 'sans-serif' }}>
                <span>Thank you for choosing Nilkanth Tourism &bull; This is a computer-generated document</span>
                <span>Printed: {new Date().toLocaleDateString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
