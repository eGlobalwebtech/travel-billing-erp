import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, MessageSquare, Mail, CheckCircle, Clock, Search, 
  Check, Phone, RefreshCw, Send, ShieldCheck
} from 'lucide-react';
import { formatINR, formatDate, getDaysDiff } from '../utils/formatters';

export default function RemindersView({ onRefreshSummary }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchReminders();
  }, [statusFilter]);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/reminders', window.location.origin);
      if (statusFilter !== 'All') url.searchParams.append('status', statusFilter);
      const res = await fetch(url.toString());
      if (res.ok) setReminders(await res.json());
    } catch (err) {
      console.error('Failed to load reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkStatus = async (id, newStatus, sentVia) => {
    try {
      const res = await fetch(`/api/reminders/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, sentVia })
      });
      if (res.ok) {
        fetchReminders();
        if (onRefreshSummary) onRefreshSummary();
      }
    } catch (err) {
      console.error('Failed to update reminder:', err);
    }
  };

  const filtered = reminders.filter(r => 
    r.party_name.toLowerCase().includes(search.toLowerCase()) || 
    (r.booking_number && r.booking_number.toLowerCase().includes(search.toLowerCase())) ||
    r.party_phone.includes(search)
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>Payment Reminders &amp; WhatsApp Automation</h2>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            Instant 1-click WhatsApp and Email reminders for customer instalments and supplier dues.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', padding: '6px 14px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
          <ShieldCheck size={16} color="#059669" />
          <span style={{ fontSize: '12.5px', color: '#047857', fontWeight: 700 }}>Test Safe Mode: Click WhatsApp to review before sending</span>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="panel" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
            <input 
              type="text" 
              className="form-input" 
              style={{ paddingLeft: '36px' }}
              placeholder="Search by client/supplier, booking #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {['Pending', 'Sent', 'Settled', 'All'].map(st => (
              <button
                key={st}
                className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setStatusFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reminders List Table */}
      <div className="panel">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Client / Supplier</th>
                <th>Booking #</th>
                <th>Due Date &amp; Urgency</th>
                <th>Phone &amp; Email</th>
                <th style={{ textAlign: 'right' }}>Amount Due (₹)</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Send / Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(rem => {
                const diff = getDaysDiff(rem.due_date);
                const isOverdue = diff < 0 && rem.status === 'Pending';
                const isDueToday = diff === 0 && rem.status === 'Pending';

                return (
                  <tr key={rem.id} style={{ background: isOverdue ? '#fffbfb' : 'inherit' }}>
                    <td>
                      <span className={`badge ${rem.party_type === 'Customer' ? 'badge-confirmed' : 'badge-quoted'}`}>
                        {rem.party_type}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{rem.party_name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{rem.reminder_type}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e3a8a' }}>
                      {rem.booking_number || '—'}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{formatDate(rem.due_date)}</div>
                      {isOverdue && (
                        <span className="badge badge-overdue" style={{ fontSize: '11px' }}>
                          {Math.abs(diff)} days overdue
                        </span>
                      )}
                      {isDueToday && (
                        <span className="badge badge-partial" style={{ fontSize: '11px' }}>
                          Due Today!
                        </span>
                      )}
                      {!isOverdue && !isDueToday && diff > 0 && rem.status === 'Pending' && (
                        <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>
                          In {diff} days
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{rem.party_phone}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>{rem.party_email || '—'}</div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '15px', color: isOverdue ? '#dc2626' : '#0f172a' }}>
                      {formatINR(rem.amount_due)}
                    </td>
                    <td>
                      <span className={`badge ${
                        rem.status === 'Settled' ? 'badge-paid' : 
                        rem.status === 'Sent' ? 'badge-inprogress' : 'badge-partial'
                      }`}>
                        {rem.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        {/* 1-Click WhatsApp Button */}
                        <a 
                          href={rem.whatsappUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="btn btn-whatsapp btn-sm"
                          title="Open WhatsApp with customized Indian travel polite reminder"
                          onClick={() => handleMarkStatus(rem.id, 'Sent', 'WhatsApp')}
                          style={{ textDecoration: 'none' }}
                        >
                          <MessageSquare size={13} /> WhatsApp
                        </a>

                        {/* Email Button */}
                        {rem.party_email && (
                          <a 
                            href={rem.mailtoUrl}
                            className="btn btn-outline btn-sm"
                            title="Send email reminder"
                            onClick={() => handleMarkStatus(rem.id, 'Sent', 'Email')}
                            style={{ textDecoration: 'none' }}
                          >
                            <Mail size={13} />
                          </a>
                        )}

                        {/* Settle Button */}
                        {rem.status !== 'Settled' && (
                          <button
                            className="btn btn-outline btn-sm"
                            title="Mark reminder settled"
                            onClick={() => handleMarkStatus(rem.id, 'Settled')}
                            style={{ color: '#059669' }}
                          >
                            <Check size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
