import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  LayoutDashboard, Plane, Package, Building, Users, Building2, 
  ArrowDownLeft, ArrowUpRight, DollarSign, Bell, Sparkles, FileText, 
  Settings as SettingsIcon, Menu, X, Plus, CreditCard
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import BookingsView from './components/BookingsView';
import PackagesView from './components/PackagesView';
import HotelsView from './components/HotelsView';
import CustomersView from './components/CustomersView';
import SuppliersView from './components/SuppliersView';
import MoneyInView from './components/MoneyInView';
import MoneyOutView from './components/MoneyOutView';
import ExpensesView from './components/ExpensesView';
import RemindersView from './components/RemindersView';
import AIItineraryView from './components/AIItineraryView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import NewBookingModal from './components/NewBookingModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Global modals
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [isMoneyInModalOpen, setIsMoneyInModalOpen] = useState(false);
  const [isMoneyOutModalOpen, setIsMoneyOutModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Selected booking drill-down ID
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [prefillSupplierId, setPrefillSupplierId] = useState(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/summary');
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  const handleBookingCreated = (newId) => {
    setIsNewBookingModalOpen(false);
    triggerCelebration();
    fetchSummary();
    setSelectedBookingId(newId);
    setCurrentTab('bookings');
  };

  const handleOpenReceivePayment = (bookingId = null) => {
    setIsMoneyInModalOpen(true);
  };

  const handleOpenMoneyOut = (supplierId = null) => {
    setPrefillSupplierId(supplierId);
    setIsMoneyOutModalOpen(true);
  };

  const handleSelectBooking = (bookingId) => {
    setSelectedBookingId(bookingId);
    setCurrentTab('bookings');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'bookings', label: 'Bookings', icon: Plane },
    { id: 'packages', label: 'Packages', icon: Package },
    { id: 'hotels', label: 'Hotels', icon: Building },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'suppliers', label: 'Suppliers', icon: Building2 },
    { id: 'money-in', label: 'Money In', icon: ArrowDownLeft },
    { id: 'money-out', label: 'Money Out', icon: ArrowUpRight },
    { id: 'expenses', label: 'Expenses', icon: DollarSign },
    { 
      id: 'reminders', 
      label: 'Reminders', 
      icon: Bell, 
      badge: summary?.reminders?.overdueCount > 0 ? summary.reminders.overdueCount : null 
    },
    { id: 'ai-builder', label: 'AI Builder', icon: Sparkles },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header" style={{ justifyContent: 'center', padding: '14px 16px' }}>
          <img 
            src="https://nilkanthtourism.com/wp-content/uploads/2025/03/logo-Photoroom.png" 
            alt="Nilkanth Tourism" 
            style={{ 
              width: '170px', 
              height: 'auto', 
              objectFit: 'contain',
              display: 'block'
            }} 
          />
        </div>

        <nav className="nav-links">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setCurrentTab(item.id);
                  if (item.id !== 'bookings') setSelectedBookingId(null);
                }}
                id={`nav-${item.id}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Secondary Navigation (Settings) */}
        <div className="sidebar-footer">
          <button
            className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentTab('settings')}
            id="nav-settings"
          >
            <SettingsIcon size={18} />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="topbar-title">
              {navItems.find(i => i.id === currentTab)?.label || 'Settings'}
            </h1>
          </div>

          <div className="topbar-right">
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                {summary?.agency?.agency_name || 'Nilkanth Tourism'}
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                GSTIN: {summary?.agency?.gstin || '07AAAAA1234A1Z5'} | Ph: +91 75750 99090
              </span>
            </div>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => setIsNewBookingModalOpen(true)}
              id="topbar-btn-new-booking"
            >
              <Plus size={14} /> New Booking
            </button>
          </div>
        </header>

        {/* Page View Body */}
        <div className="content-body">
          {currentTab === 'dashboard' && (
            <Dashboard 
              summary={summary}
              onNavigate={(tab) => {
                setCurrentTab(tab);
                setSelectedBookingId(null);
              }}
              onOpenNewBooking={() => setIsNewBookingModalOpen(true)}
              onOpenReceivePayment={() => setIsMoneyInModalOpen(true)}
              onOpenAddExpense={() => setIsExpenseModalOpen(true)}
              onSelectBooking={handleSelectBooking}
            />
          )}

          {currentTab === 'bookings' && (
            <BookingsView 
              onOpenNewBooking={() => setIsNewBookingModalOpen(true)}
              selectedBookingId={selectedBookingId}
              onSelectBooking={(id) => setSelectedBookingId(id)}
              onCloseBookingDetails={() => setSelectedBookingId(null)}
              onOpenReceivePayment={handleOpenReceivePayment}
            />
          )}

          {currentTab === 'packages' && (
            <PackagesView onOpenNewBooking={() => setIsNewBookingModalOpen(true)} />
          )}

          {currentTab === 'hotels' && (
            <HotelsView />
          )}

          {currentTab === 'customers' && (
            <CustomersView onSelectBooking={handleSelectBooking} />
          )}

          {currentTab === 'suppliers' && (
            <SuppliersView onOpenMoneyOut={handleOpenMoneyOut} />
          )}

          {currentTab === 'money-in' && (
            <MoneyInView 
              isModalOpen={isMoneyInModalOpen}
              onOpenModal={() => setIsMoneyInModalOpen(true)}
              onCloseModal={() => setIsMoneyInModalOpen(false)}
              onRefreshSummary={fetchSummary}
            />
          )}

          {currentTab === 'money-out' && (
            <MoneyOutView 
              isModalOpen={isMoneyOutModalOpen}
              onOpenModal={() => setIsMoneyOutModalOpen(true)}
              onCloseModal={() => {
                setIsMoneyOutModalOpen(false);
                setPrefillSupplierId(null);
              }}
              prefillSupplierId={prefillSupplierId}
              onRefreshSummary={fetchSummary}
            />
          )}

          {currentTab === 'expenses' && (
            <ExpensesView 
              isModalOpen={isExpenseModalOpen}
              onOpenModal={() => setIsExpenseModalOpen(true)}
              onCloseModal={() => setIsExpenseModalOpen(false)}
              onRefreshSummary={fetchSummary}
            />
          )}

          {currentTab === 'reminders' && (
            <RemindersView onRefreshSummary={fetchSummary} />
          )}

          {currentTab === 'ai-builder' && (
            <AIItineraryView 
              onOpenNewBooking={() => setIsNewBookingModalOpen(true)}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView />
          )}

          {currentTab === 'settings' && (
            <SettingsView onRefreshSummary={fetchSummary} />
          )}
        </div>
      </main>

      {/* Global New Booking Modal */}
      <NewBookingModal 
        isOpen={isNewBookingModalOpen}
        onClose={() => setIsNewBookingModalOpen(false)}
        onSuccess={handleBookingCreated}
      />
    </div>
  );
}
