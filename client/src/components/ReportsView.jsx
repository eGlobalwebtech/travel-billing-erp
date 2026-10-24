import React, { useState, useEffect } from 'react';
import { 
  FileText, TrendingUp, AlertCircle, Clock, Landmark, 
  Download, Printer, Filter, Calendar, CheckCircle
} from 'lucide-react';
import { formatINR, formatDate } from '../utils/formatters';

export default function ReportsView() {
  const [reportType, setReportType] = useState('pnl'); // 'pnl', 'ageing', 'profitability', 'cashbook'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport(reportType);
  }, [reportType]);

  const fetchReport = async (type) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports?type=${type}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  // CSV Exporter for Excel
  const exportToCSV = () => {
    if (!data) return;
    let csvContent = "data:text/csv;charset=utf-8,";

    if (reportType === 'profitability') {
      csvContent += "Booking ID,Customer,Destination,Start Date,End Date,Status,Selling Price,Supplier Cost,Margin (₹),Margin (%)\n";
      data.forEach(b => {
        csvContent += `"${b.booking_number}","${b.customer_name}","${b.destination}","${b.start_date}","${b.end_date}","${b.status}",${b.selling_price},${b.total_supplier_cost},${b.calculated_margin},${b.margin_percentage}%\n`;
      });
    } else if (reportType === 'cashbook') {
      csvContent += "Date,Type,Reference,Account,Payment Mode,Debit (₹),Credit (₹),Notes\n";
      data.forEach(row => {
        csvContent += `"${row.tx_date}","${row.type}","${row.ref}","${row.account_name}","${row.payment_mode}",${row.debit},${row.credit},"${row.notes || ''}"\n`;
      });
    } else if (reportType === 'pnl') {
      csvContent += "Metric,Amount (₹)\n";
      csvContent += `"Net Sales",${data.totalRevenue}\n`;
      csvContent += `"GST Collected",${data.gstCollected}\n`;
      csvContent += `"Direct Supplier Costs",${data.directSupplierCosts}\n`;
      csvContent += `"Gross Profit",${data.grossProfit}\n`;
      csvContent += `"Operating Expenses",${data.operatingExpenses}\n`;
      csvContent += `"Net Profit",${data.netProfit}\n`;
    } else if (reportType === 'ageing') {
      csvContent += "Bucket,Invoice #,Customer,Phone,Destination,Due Date,Overdue Days,Amount Due (₹)\n";
      Object.keys(data.buckets).forEach(bKey => {
        data.buckets[bKey].forEach(inv => {
          csvContent += `"${bKey}","${inv.invoice_number}","${inv.customer_name}","${inv.customer_phone}","${inv.destination}","${inv.due_date}",${inv.overdueDays},${inv.balance_amount}\n`;
        });
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `YatraBilling_${reportType}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>Financial Reports &amp; Statements</h2>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            Accurate P&amp;L, customer ageing brackets, trip profitability, cash book, and Excel export.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline" onClick={exportToCSV}>
            <Download size={16} /> Export to Excel / CSV
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={16} /> Print Report
          </button>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="panel" style={{ padding: '12px 16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className={`btn ${reportType === 'pnl' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setReportType('pnl')}
          >
            <TrendingUp size={16} /> Profit &amp; Loss Statement
          </button>

          <button
            className={`btn ${reportType === 'ageing' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setReportType('ageing')}
          >
            <AlertCircle size={16} /> Customer Overdue Ageing
          </button>

          <button
            className={`btn ${reportType === 'profitability' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setReportType('profitability')}
          >
            <FileText size={16} /> Trip Profitability Analysis
          </button>

          <button
            className={`btn ${reportType === 'cashbook' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setReportType('cashbook')}
          >
            <Landmark size={16} /> Cash Book &amp; Bank Ledger
          </button>
        </div>
      </div>

      {/* 1. PROFIT & LOSS STATEMENT */}
      {reportType === 'pnl' && data && (
        <div>
          {/* High-level KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div className="panel" style={{ margin: 0, padding: '20px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Total Billed Revenue</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {formatINR(data.totalRevenue)}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>+ GST ₹{data.gstCollected}</div>
            </div>

            <div className="panel" style={{ margin: 0, padding: '20px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Direct Package Costs</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
                {formatINR(data.directSupplierCosts)}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Hotels, cabs &amp; flights</div>
            </div>

            <div className="panel" style={{ margin: 0, padding: '20px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Gross Margin ({data.grossProfitMargin}%)</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
                {formatINR(data.grossProfit)}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Revenue - Package Costs</div>
            </div>

            <div className="panel" style={{ margin: 0, padding: '20px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '12px', color: '#166534', fontWeight: 700 }}>Net Business Profit ({data.netProfitMargin}%)</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                {formatINR(data.netProfit)}
              </div>
              <div style={{ fontSize: '11px', color: '#166534' }}>After operating overheads</div>
            </div>
          </div>

          {/* Detailed Statement Table */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Statement of Profit &amp; Loss (Trading &amp; Operating)</div>
            </div>
            <table>
              <tbody>
                <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                  <td colSpan={2}>A. REVENUE FROM TOUR OPERATIONS</td>
                  <td style={{ textAlign: 'right' }}>Amount (₹)</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '32px' }}>Gross Package Invoiced Sales</td>
                  <td></td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(data.totalRevenue)}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '32px' }}>Less: Direct Supplier Land Costs (Hotels, Transports, DMCs)</td>
                  <td></td>
                  <td style={{ textAlign: 'right', color: '#d97706' }}>- {formatINR(data.directSupplierCosts)}</td>
                </tr>
                <tr style={{ fontWeight: 800, background: '#eff6ff', color: '#1e3a8a' }}>
                  <td>GROSS TOUR OPERATING PROFIT</td>
                  <td style={{ textAlign: 'right' }}>Margin: {data.grossProfitMargin}%</td>
                  <td style={{ textAlign: 'right' }}>{formatINR(data.grossProfit)}</td>
                </tr>

                <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                  <td colSpan={2}>B. OPERATING &amp; ADMINISTRATIVE OVERHEADS</td>
                  <td style={{ textAlign: 'right' }}></td>
                </tr>
                {data.expenseBreakdown?.map((exp, i) => (
                  <tr key={i}>
                    <td style={{ paddingLeft: '32px' }}>{exp.category}</td>
                    <td></td>
                    <td style={{ textAlign: 'right', color: '#dc2626' }}>- {formatINR(exp.amount)}</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 700, background: '#fff1f2', color: '#991b1b' }}>
                  <td>TOTAL OPERATING EXPENSES</td>
                  <td></td>
                  <td style={{ textAlign: 'right' }}>- {formatINR(data.operatingExpenses)}</td>
                </tr>

                <tr style={{ background: '#ecfdf5', fontWeight: 800, fontSize: '16px', color: '#065f46' }}>
                  <td>NET PROFIT BEFORE TAX</td>
                  <td style={{ textAlign: 'right' }}>Net Margin: {data.netProfitMargin}%</td>
                  <td style={{ textAlign: 'right' }}>{formatINR(data.netProfit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. CUSTOMER OUTSTANDING AGEING */}
      {reportType === 'ageing' && data && (
        <div>
          {/* Summary Buckets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '24px' }}>
            <div className="panel" style={{ margin: 0, padding: '16px' }}>
              <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>Current (Not Overdue)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                {formatINR(data.summary.currentTotal)}
              </div>
            </div>

            <div className="panel" style={{ margin: 0, padding: '16px' }}>
              <div style={{ fontSize: '11px', color: '#d97706', fontWeight: 700 }}>1 - 30 Days Overdue</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
                {formatINR(data.summary.days0_30Total)}
              </div>
            </div>

            <div className="panel" style={{ margin: 0, padding: '16px' }}>
              <div style={{ fontSize: '11px', color: '#ea580c', fontWeight: 700 }}>31 - 60 Days Overdue</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#ea580c', marginTop: '4px' }}>
                {formatINR(data.summary.days31_60Total)}
              </div>
            </div>

            <div className="panel" style={{ margin: 0, padding: '16px' }}>
              <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700 }}>61 - 90 Days Overdue</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
                {formatINR(data.summary.days61_90Total)}
              </div>
            </div>

            <div className="panel" style={{ margin: 0, padding: '16px', background: '#fef2f2', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '11px', color: '#991b1b', fontWeight: 800 }}>90+ Days (Critical)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#991b1b', marginTop: '4px' }}>
                {formatINR(data.summary.days90PlusTotal)}
              </div>
            </div>
          </div>

          {/* Ageing Breakdown Table */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Customer Pending Receivables by Ageing Bracket</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer Name</th>
                  <th>Mobile Phone</th>
                  <th>Tour Destination</th>
                  <th>Due Date</th>
                  <th>Overdue Days</th>
                  <th style={{ textAlign: 'right' }}>Total Invoiced (₹)</th>
                  <th style={{ textAlign: 'right' }}>Outstanding (₹)</th>
                </tr>
              </thead>
              <tbody>
                {['days90Plus', 'days61_90', 'days31_60', 'days0_30', 'current'].map(bucketKey => (
                  <React.Fragment key={bucketKey}>
                    {data.buckets[bucketKey]?.map(inv => (
                      <tr key={inv.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{inv.invoice_number}</td>
                        <td style={{ fontWeight: 700 }}>{inv.customer_name}</td>
                        <td>{inv.customer_phone}</td>
                        <td>{inv.destination}</td>
                        <td>{formatDate(inv.due_date)}</td>
                        <td>
                          <span className={`badge ${inv.overdueDays > 30 ? 'badge-overdue' : 'badge-partial'}`}>
                            {inv.overdueDays === 0 ? 'Due soon' : `${inv.overdueDays} days`}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>{formatINR(inv.total_amount)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>
                          {formatINR(inv.balance_amount)}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. TRIP PROFITABILITY ANALYSIS */}
      {reportType === 'profitability' && Array.isArray(data) && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Booking-Wise Selling Price, Land Costs &amp; Profit Margins</div>
          </div>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Customer</th>
                  <th>Destination</th>
                  <th>Travel Dates</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Selling Price (₹)</th>
                  <th style={{ textAlign: 'right' }}>Supplier Cost (₹)</th>
                  <th style={{ textAlign: 'right' }}>Gross Margin (₹)</th>
                  <th style={{ textAlign: 'right' }}>Margin (%)</th>
                </tr>
              </thead>
              <tbody>
                {data.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 800, fontFamily: 'monospace', color: '#1e3a8a' }}>{b.booking_number}</td>
                    <td style={{ fontWeight: 700 }}>{b.customer_name}</td>
                    <td>{b.destination}</td>
                    <td>{formatDate(b.start_date)}</td>
                    <td><span className={`badge badge-${b.status.toLowerCase().replace(' ', '')}`}>{b.status}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatINR(b.selling_price)}</td>
                    <td style={{ textAlign: 'right', color: '#64748b' }}>{formatINR(b.total_supplier_cost)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                      {formatINR(b.calculated_margin)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800 }}>
                      <span style={{ 
                        color: b.margin_percentage >= 25 ? '#059669' : b.margin_percentage >= 15 ? '#d97706' : '#dc2626' 
                      }}>
                        {b.margin_percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. CASH BOOK & BANK LEDGER */}
      {reportType === 'cashbook' && Array.isArray(data) && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Combined Cash Book &amp; Bank Ledger (All Inflows &amp; Outflows)</div>
          </div>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Reference #</th>
                  <th>Account</th>
                  <th>Payment Mode</th>
                  <th style={{ textAlign: 'right' }}>Debit (Inflow ₹)</th>
                  <th style={{ textAlign: 'right' }}>Credit (Outflow ₹)</th>
                  <th>Particulars / Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{formatDate(row.tx_date)}</td>
                    <td>
                      <span className={`badge ${
                        row.type === 'Money In' ? 'badge-paid' :
                        row.type === 'Money Out' ? 'badge-partial' : 'badge-unpaid'
                      }`}>
                        {row.type}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.ref}</td>
                    <td>{row.account_name}</td>
                    <td>{row.payment_mode}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: row.debit > 0 ? '#059669' : '#cbd5e1' }}>
                      {row.debit > 0 ? `+ ${formatINR(row.debit)}` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: row.credit > 0 ? '#dc2626' : '#cbd5e1' }}>
                      {row.credit > 0 ? `- ${formatINR(row.credit)}` : '—'}
                    </td>
                    <td style={{ fontSize: '12.5px', color: '#64748b' }}>{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
