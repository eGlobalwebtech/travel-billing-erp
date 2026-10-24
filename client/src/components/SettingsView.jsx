import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Save, Building, CreditCard, MessageSquare, 
  Sparkles, ShieldCheck, Check
} from 'lucide-react';

export default function SettingsView({ onRefreshSummary }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      if (res.ok) setSettings(await res.json());
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        if (onRefreshSummary) onRefreshSummary();
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  if (loading || !settings) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading settings...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>Agency Profile &amp; ERP Settings</h2>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            GST registration, bank account details, UPI ID, WhatsApp reminder templates &amp; AI credentials.
          </p>
        </div>

        {saved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', color: '#059669', padding: '8px 14px', borderRadius: '8px', fontWeight: 700 }}>
            <Check size={16} /> Settings saved successfully!
          </div>
        )}
      </div>

      <form onSubmit={handleSave}>
        {/* 1. Agency Details */}
        <div className="panel" style={{ padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1e3a8a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building size={18} /> Agency Profile &amp; Contact Information
          </h3>

          <div className="form-row">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Agency Legal Name *</label>
              <input 
                type="text" 
                className="form-input" 
                value={settings.agency_name}
                onChange={(e) => setSettings({ ...settings, agency_name: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Tagline / Slogan</label>
              <input 
                type="text" 
                className="form-input" 
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Owner / Managing Director</label>
              <input 
                type="text" 
                className="form-input" 
                value={settings.owner_name}
                onChange={(e) => setSettings({ ...settings, owner_name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Business Phone</label>
              <input 
                type="text" 
                className="form-input" 
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Official WhatsApp Number</label>
              <input 
                type="text" 
                className="form-input" 
                value={settings.whatsapp}
                onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Official Email</label>
              <input 
                type="email" 
                className="form-input" 
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Office Address</label>
              <input 
                type="text" 
                className="form-input" 
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">GSTIN Number</label>
              <input 
                type="text" 
                className="form-input" 
                value={settings.gstin}
                onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">PAN Number</label>
              <input 
                type="text" 
                className="form-input" 
                value={settings.pan}
                onChange={(e) => setSettings({ ...settings, pan: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* 2. Bank & UPI Details */}
        <div className="panel" style={{ padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#059669', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={18} /> Official Bank Account &amp; UPI ID (Printed on Invoices &amp; Sent via WhatsApp)
          </h3>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={settings.bank_name}
                onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Beneficiary Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={settings.account_name}
                onChange={(e) => setSettings({ ...settings, account_name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Current Account Number</label>
              <input 
                type="text" 
                className="form-input" 
                value={settings.account_number}
                onChange={(e) => setSettings({ ...settings, account_number: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">IFSC Code</label>
              <input 
                type="text" 
                className="form-input" 
                value={settings.ifsc_code}
                onChange={(e) => setSettings({ ...settings, ifsc_code: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">UPI ID for Direct Transfers</label>
              <input 
                type="text" 
                className="form-input" 
                value={settings.upi_id}
                onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default GST Rate (%)</label>
              <input 
                type="number" 
                className="form-input" 
                step="0.1"
                value={settings.default_gst_rate}
                onChange={(e) => setSettings({ ...settings, default_gst_rate: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default TCS Rate (%)</label>
              <input 
                type="number" 
                className="form-input" 
                step="0.1"
                value={settings.default_tcs_rate}
                onChange={(e) => setSettings({ ...settings, default_tcs_rate: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* 3. WhatsApp Reminder Template */}
        <div className="panel" style={{ padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#d97706', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} /> WhatsApp Payment Reminder Template
          </h3>

          <div className="form-group">
            <label className="form-label">Message Template (Available tags: {'{customer_name}'}, {'{amount}'}, {'{booking_id}'}, {'{destination}'}, {'{due_date}'}, {'{upi_id}'}, {'{agency_name}'}, {'{phone}'})</label>
            <textarea 
              className="form-textarea" 
              rows={3}
              value={settings.reminder_whatsapp_template}
              onChange={(e) => setSettings({ ...settings, reminder_whatsapp_template: e.target.value })}
            />
          </div>
        </div>

        {/* 4. AI Itinerary Configuration */}
        <div className="panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#4338ca', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} /> AI Engine Configuration
          </h3>

          <div className="form-row">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Google Gemini API Key (Optional live generation)</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="AIzaSy..."
                value={settings.ai_api_key || ''}
                onChange={(e) => setSettings({ ...settings, ai_api_key: e.target.value })}
              />
              <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                If left empty, the system automatically uses the built-in intelligent generative travel destination engine with zero external dependencies.
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="submit" className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '15px' }}>
            <Save size={18} /> Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
