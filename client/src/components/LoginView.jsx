import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, Sparkles, CheckCircle2, User, KeyRound } from 'lucide-react';

export default function LoginView({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const demoAccounts = [
    {
      role: 'Super Admin',
      email: 'admin@nilkanthtourism.com',
      password: 'Admin@123',
      color: '#7c3aed',
      bg: '#f5f3ff',
      border: '#ddd6fe',
      desc: 'Full system, user management & financials'
    },
    {
      role: 'Operations Mgr',
      email: 'manager@nilkanthtourism.com',
      password: 'Manager@123',
      color: '#0284c7',
      bg: '#f0f9ff',
      border: '#bae6fd',
      desc: 'Bookings, packages, hotels & vendors'
    },
    {
      role: 'Accountant',
      email: 'accounts@nilkanthtourism.com',
      password: 'Accounts@123',
      color: '#059669',
      bg: '#ecfdf5',
      border: '#a7f3d0',
      desc: 'Invoices, money in/out, expenses & P&L'
    },
    {
      role: 'Sales Agent',
      email: 'sales@nilkanthtourism.com',
      password: 'Sales@123',
      color: '#d97706',
      bg: '#fffbeb',
      border: '#fde68a',
      desc: 'Packages, bookings & client itineraries'
    }
  ];

  const handleLogin = async (e, customEmail = null, customPass = null) => {
    if (e) e.preventDefault();
    const loginEmail = customEmail || email;
    const loginPass = customPass || password;

    if (!loginEmail || !loginPass) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Persist in localStorage and trigger App state
      localStorage.setItem('travel_erp_user', JSON.stringify(data.user));
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    handleLogin(null, acc.email, acc.password);
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-card-container">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-logo-box">
            <img 
              src="https://nilkanthtourism.com/wp-content/uploads/2025/03/logo-Photoroom.png" 
              alt="Nilkanth Tourism" 
              className="login-logo-img"
            />
          </div>
          <h2 className="login-title">Travel Billing ERP</h2>
          <p className="login-subtitle">Secure Role-Based Agency Management System</p>
        </div>

        {error && (
          <div className="login-error-alert">
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={(e) => handleLogin(e)} className="login-form">
          <div className="login-input-group">
            <label className="login-label">Email Address</label>
            <div className="login-input-wrapper">
              <Mail size={18} className="login-input-icon" />
              <input 
                type="email" 
                className="login-input" 
                placeholder="name@nilkanthtourism.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="login-input-group">
            <label className="login-label">Password</label>
            <div className="login-input-wrapper">
              <Lock size={18} className="login-input-icon" />
              <input 
                type={showPassword ? 'text' : 'password'} 
                className="login-input" 
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button 
                type="button" 
                className="login-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary login-submit-btn" 
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
            ) : (
              <>Sign In to Workspace</>
            )}
          </button>
        </form>

        {/* Quick Demo Access Pills */}
        <div className="login-demo-section">
          <div className="login-divider">
            <span>1-CLICK ROLE ACCESS (DEMO)</span>
          </div>

          <div className="login-demo-grid">
            {demoAccounts.map((acc) => (
              <button
                key={acc.role}
                type="button"
                className="login-demo-pill"
                style={{
                  background: acc.bg,
                  borderColor: acc.border
                }}
                onClick={() => handleQuickDemo(acc)}
                disabled={loading}
              >
                <div className="login-demo-pill-header">
                  <span className="login-demo-pill-title" style={{ color: acc.color }}>
                    {acc.role}
                  </span>
                  <KeyRound size={12} style={{ color: acc.color, opacity: 0.8 }} />
                </div>
                <span className="login-demo-pill-desc">{acc.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Security Footer */}
        <div className="login-card-footer">
          <ShieldCheck size={14} className="text-success" />
          <span>PostgreSQL Live Cloud Database • SSL Encrypted</span>
        </div>
      </div>
    </div>
  );
}

