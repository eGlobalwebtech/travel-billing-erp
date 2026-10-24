import React from 'react';
import { 
  Calendar, CreditCard, DollarSign, Users, AlertCircle, ArrowUpRight, 
  ArrowDownRight, CheckCircle, Clock, Plane, FileText, Plus, Landmark, 
  TrendingUp, MessageSquare, ExternalLink, ShieldCheck, ChevronRight
} from 'lucide-react';
import { formatINR, formatDate, getDaysDiff } from '../utils/formatters';

export default function Dashboard({ 
  summary, 
  onNavigate, 
  onOpenNewBooking, 
  onOpenReceivePayment, 
  onOpenAddExpense,
  onSelectBooking
}) {
  if (!summary) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
        <p>Loading agency management dashboard...</p>
      </div>
    );
  }

  const { kpis, reminders, upcomingTrips, recentTransactions, agency, accounts } = summary;

  return (
    <div>
      {/* 4 Large Quick-Action Buttons */}
      <div className="quick-actions-bar">
        <button 
          className="quick-action-btn btn-booking"
          onClick={onOpenNewBooking}
          id="btn-quick-new-booking"
        >
          <div className="quick-action-icon">
            <Plus size={26} strokeWidth={2.5} />
          </div>
          <div className="quick-action-text">
            <h4>New Booking</h4>
            <p>Packages, hotels &amp; auto calculations</p>
          </div>
        </button>

        <button 
          className="quick-action-btn btn-receive"
          onClick={onOpenReceivePayment}
          id="btn-quick-receive-payment"
        >
          <div className="quick-action-icon">
            <CreditCard size={26} strokeWidth={2.5} />
          </div>
          <div className="quick-action-text">
            <h4>Receive Payment</h4>
            <p>Customer advances &amp; final settlements</p>
          </div>
        </button>

        <button 
          className="quick-action-btn btn-expense"
          onClick={onOpenAddExpense}
          id="btn-quick-add-expense"
        >
          <div className="quick-action-icon">
            <DollarSign size={26} strokeWidth={2.5} />
          </div>
          <div className="quick-action-text">
            <h4>Add Expense</h4>
            <p>Office rent, staff salaries &amp; marketing</p>
          </div>
        </button>

        <button 
          className="quick-action-btn btn-reports"
          onClick={() => onNavigate('reports')}
          id="btn-quick-view-reports"
        >
          <div className="quick-action-icon">
            <FileText size={26} strokeWidth={2.5} />
          </div>
          <div className="quick-action-text">
            <h4>View Reports</h4>
            <p>P&amp;L, ageing, cashbook &amp; margins</p>
          </div>
        </button>
      </div>

      {/* KPI Cards Grid (Clicking opens relevant records) */}
      <div className="kpi-grid">
        {/* 1. Total Bookings */}
        <div 
          className="kpi-card" 
          onClick={() => onNavigate('bookings')}
          title="Click to view all bookings"
        >
          <div className="kpi-header">
            <span className="kpi-title">Total Bookings</span>
            <div className="kpi-icon-wrapper" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
              <Plane size={18} />
            </div>
          </div>
          <div className="kpi-amount">{kpis.totalBookings}</div>
          <div className="kpi-subtext">
            <span style={{ color: '#059669', fontWeight: 700 }}>{kpis.confirmedBookings} Confirmed</span>
            <span>•</span>
            <span>{kpis.ongoingBookings} Active</span>
          </div>
        </div>

        {/* 2. Total Invoiced Sales */}
        <div 
          className="kpi-card"
          onClick={() => onNavigate('reports', 'pnl')}
          title="Click to view Sales & Revenue report"
        >
          <div className="kpi-header">
            <span className="kpi-title">Invoiced Sales</span>
            <div className="kpi-icon-wrapper" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-amount" style={{ color: '#0f172a' }}>{formatINR(kpis.totalInvoicedSales)}</div>
          <div className="kpi-subtext">
            <span>GST compliant billed value</span>
          </div>
        </div>

        {/* 3. Customer Payments Received */}
        <div 
          className="kpi-card"
          onClick={() => onNavigate('money-in')}
          title="Click to view Customer Receipts (Money In)"
        >
          <div className="kpi-header">
            <span className="kpi-title">Payments Received</span>
            <div className="kpi-icon-wrapper" style={{ background: '#ecfdf5', color: '#059669' }}>
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="kpi-amount" style={{ color: '#059669' }}>{formatINR(kpis.customerPaymentsReceived)}</div>
          <div className="kpi-subtext">
            <span>Collected via Bank &amp; UPI</span>
          </div>
        </div>

        {/* 4. Customer Outstanding Balances */}
        <div 
          className="kpi-card"
          onClick={() => onNavigate('reports', 'ageing')}
          title="Click to view Customer Overdue Ageing"
          style={{ borderColor: kpis.customerOutstanding > 0 ? '#fca5a5' : '#e2e8f0' }}
        >
          <div className="kpi-header">
            <span className="kpi-title">Customer Pending</span>
            <div className="kpi-icon-wrapper" style={{ background: '#fef2f2', color: '#dc2626' }}>
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="kpi-amount" style={{ color: '#dc2626' }}>{formatINR(kpis.customerOutstanding)}</div>
          <div className="kpi-subtext" style={{ color: '#b91c1c' }}>
            <span>{reminders?.overdueCount || 0} overdue payments</span>
          </div>
        </div>

        {/* 5. Supplier Bills & Due */}
        <div 
          className="kpi-card"
          onClick={() => onNavigate('money-out')}
          title="Click to view Supplier Payables (Money Out)"
        >
          <div className="kpi-header">
            <span className="kpi-title">Supplier Due</span>
            <div className="kpi-icon-wrapper" style={{ background: '#fffbeb', color: '#d97706' }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-amount" style={{ color: '#d97706' }}>{formatINR(kpis.supplierDue)}</div>
          <div className="kpi-subtext">
            <span>Hotels, Cabs &amp; DMC payables</span>
          </div>
        </div>

        {/* 6. Total Business Expenses */}
        <div 
          className="kpi-card"
          onClick={() => onNavigate('expenses')}
          title="Click to view Business Operating Expenses"
        >
          <div className="kpi-header">
            <span className="kpi-title">Operating Expenses</span>
            <div className="kpi-icon-wrapper" style={{ background: '#fef2f2', color: '#b91c1c' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className="kpi-amount" style={{ color: '#475569' }}>{formatINR(kpis.totalExpenses)}</div>
          <div className="kpi-subtext">
            <span>Office rent, salaries &amp; marketing</span>
          </div>
        </div>

        {/* 7. Current Cash & Bank Balances */}
        <div 
          className="kpi-card"
          onClick={() => onNavigate('reports', 'cashbook')}
          title="Click to view Cash Book & Bank Ledger"
          style={{ background: '#f8fafc' }}
        >
          <div className="kpi-header">
            <span className="kpi-title">Liquid Cash &amp; Bank</span>
            <div className="kpi-icon-wrapper" style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <Landmark size={18} />
            </div>
          </div>
          <div className="kpi-amount" style={{ color: '#0284c7' }}>{formatINR(kpis.cashAndBankBalance)}</div>
          <div className="kpi-subtext">
            <span>Across HDFC, SBI &amp; Cash safe</span>
          </div>
        </div>

        {/* 8. Estimated & Final Profit */}
        <div 
          className="kpi-card"
          onClick={() => onNavigate('reports', 'profitability')}
          title="Click to view Trip Profitability Analysis"
          style={{ background: 'linear-gradient(135deg, #ffffff, #f0fdf4)' }}
        >
          <div className="kpi-header">
            <span className="kpi-title">Gross Tour Margin</span>
            <div className="kpi-icon-wrapper" style={{ background: '#dcfce7', color: '#15803d' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-amount" style={{ color: '#15803d' }}>{formatINR(kpis.estimatedProfit)}</div>
          <div className="kpi-subtext">
            <span style={{ fontWeight: 600 }}>Net Gain: {formatINR(kpis.netEstimatedGain)}</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Payment Reminders (WhatsApp/Email) & Upcoming Trips */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        
        {/* PAYMENT REMINDERS PANEL */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <div className="panel-title">
              <AlertCircle size={18} style={{ color: '#dc2626' }} />
              Payment Reminders &amp; Overdue Collections
            </div>
            <button 
              className="btn btn-outline btn-sm"
              onClick={() => onNavigate('reminders')}
            >
              View All ({reminders?.overdueCount + reminders?.upcomingCount || 0})
            </button>
          </div>

          <div style={{ padding: '16px 20px' }}>
            {reminders?.overdueList?.length === 0 && reminders?.upcomingList?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 20px', color: '#64748b' }}>
                <CheckCircle size={36} color="#059669" style={{ margin: '0 auto 10px' }} />
                <p style={{ fontWeight: 600 }}>All payments are up to date!</p>
                <p style={{ fontSize: '13px' }}>No pending overdue payments today.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Overdue Items */}
                {reminders?.overdueList?.map((rem) => {
                  const daysOverdue = Math.abs(getDaysDiff(rem.due_date));
                  return (
                    <div 
                      key={rem.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#991b1b' }}>
                            {rem.party_name}
                          </span>
                          <span className="badge badge-overdue" style={{ fontSize: '10.5px' }}>
                            {daysOverdue} days overdue
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '2px' }}>
                          Booking #{rem.booking_number} • Due: {formatDate(rem.due_date)} • Phone: {rem.party_phone}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '15px', color: '#b91c1c' }}>
                          {formatINR(rem.amount_due)}
                        </span>
                        
                        {/* 1-Click WhatsApp Button */}
                        <a 
                          href={rem.whatsappUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="btn btn-whatsapp btn-sm"
                          title="Send polite WhatsApp payment reminder"
                          style={{ textDecoration: 'none' }}
                        >
                          <MessageSquare size={14} /> WhatsApp
                        </a>
                      </div>
                    </div>
                  );
                })}

                {/* Upcoming Items */}
                {reminders?.upcomingList?.map((rem) => {
                  const daysRemaining = getDaysDiff(rem.due_date);
                  return (
                    <div 
                      key={rem.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#92400e' }}>
                            {rem.party_name}
                          </span>
                          <span className="badge badge-partial" style={{ fontSize: '10.5px' }}>
                            Due in {daysRemaining === 0 ? 'today' : `${daysRemaining} days`}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#78350f', marginTop: '2px' }}>
                          Booking #{rem.booking_number} • Due: {formatDate(rem.due_date)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '15px', color: '#b45309' }}>
                          {formatINR(rem.amount_due)}
                        </span>
                        <a 
                          href={rem.whatsappUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="btn btn-whatsapp btn-sm"
                          style={{ textDecoration: 'none' }}
                        >
                          <MessageSquare size={14} /> WhatsApp
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* UPCOMING TRIPS PANEL */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <div className="panel-title">
              <Plane size={18} style={{ color: '#2563eb' }} />
              Upcoming Trips &amp; Traveler Departures
            </div>
            <button 
              className="btn btn-outline btn-sm"
              onClick={() => onNavigate('bookings')}
            >
              All Bookings
            </button>
          </div>

          <div style={{ padding: '16px 20px' }}>
            {upcomingTrips?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 20px', color: '#64748b' }}>
                <p>No upcoming trips scheduled in the immediate pipeline.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcomingTrips.map((trip) => (
                  <div 
                    key={trip.id}
                    onClick={() => onSelectBooking(trip.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                          {trip.destination}
                        </span>
                        <span className={`badge badge-${trip.status.toLowerCase().replace(' ', '')}`}>
                          {trip.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                        {trip.customer_name} • {trip.pax_adults} Adults {trip.pax_children > 0 ? `+ ${trip.pax_children} Kids` : ''} • {formatDate(trip.start_date)} to {formatDate(trip.end_date)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '14.5px', color: '#0f172a' }}>
                        {formatINR(trip.gross_total)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                        Est. Margin: {formatINR(trip.estimated_profit)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* RECENT TRANSACTIONS LEDGER (Money In, Money Out, Expenses) */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <CreditCard size={18} style={{ color: '#475569' }} />
            Recent Financial Transactions (Money In &amp; Money Out)
          </div>
          <button 
            className="btn btn-outline btn-sm"
            onClick={() => onNavigate('reports', 'cashbook')}
          >
            Open Full Cash/Bank Book
          </button>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Reference #</th>
                <th>Party / Category</th>
                <th>Payment Mode</th>
                <th>Notes / Description</th>
                <th style={{ textAlign: 'right' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions?.map((tx, idx) => {
                const isPositive = tx.amount > 0;
                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{formatDate(tx.date)}</td>
                    <td>
                      <span className={`badge ${
                        tx.tx_type === 'Money In' ? 'badge-paid' :
                        tx.tx_type === 'Money Out' ? 'badge-partial' : 'badge-unpaid'
                      }`}>
                        {tx.tx_type}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>
                      {tx.ref}
                    </td>
                    <td style={{ fontWeight: 600 }}>{tx.party}</td>
                    <td>
                      <span style={{ fontSize: '12px', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        {tx.payment_mode}
                      </span>
                    </td>
                    <td style={{ color: '#64748b', fontSize: '12.5px', maxWidth: '300px' }}>
                      {tx.notes || '—'}
                    </td>
                    <td style={{ 
                      textAlign: 'right', 
                      fontWeight: 800, 
                      color: isPositive ? '#059669' : '#dc2626' 
                    }}>
                      {isPositive ? `+ ${formatINR(tx.amount)}` : `- ${formatINR(Math.abs(tx.amount))}`}
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
