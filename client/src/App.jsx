import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  LayoutDashboard, Plane, Package, Building, Users, Building2, 
  ArrowDownLeft, ArrowUpRight, DollarSign, Bell, Sparkles, FileText, 
  Settings as SettingsIcon, Menu, X, Plus, CreditCard, ShieldCheck, 
  LogOut, UserCircle, ChevronDown, Check, Home, Sun, Moon,
  PanelLeftClose, PanelLeftOpen
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
import UserManagementView from './components/UserManagementView';
import LoginView from './components/LoginView';
import NewBookingModal from './components/NewBookingModal';

export default function App() {
  // Authentication & User Session
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('travel_erp_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Responsive mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Desktop sidebar collapse / full screen state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Light / Dark mode state
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('travel_erp_theme') || 'light';
    } catch (e) {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('travel_erp_theme', theme);
    } catch (e) {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Global modals
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [isMoneyInModalOpen, setIsMoneyInModalOpen] = useState(false);
  const [isMoneyOutModalOpen, setIsMoneyOutModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Selected booking drill-down ID
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [prefillSupplierId, setPrefillSupplierId] = useState(null);

  useEffect(() => {
    if (currentUser) {
      fetchSummary();
    }
  }, [currentUser]);

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

  const handleLogout = () => {
    localStorage.removeItem('travel_erp_user');
    setCurrentUser(null);
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
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

  // Define full module dictionary
  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'manager', 'accountant', 'sales'] },
    { id: 'bookings', label: 'Bookings', icon: Plane, roles: ['super_admin', 'manager', 'accountant', 'sales'] },
    { id: 'packages', label: 'Packages', icon: Package, roles: ['super_admin', 'manager', 'sales'] },
    { id: 'hotels', label: 'Hotels', icon: Building, roles: ['super_admin', 'manager'] },
    { id: 'customers', label: 'Customers', icon: Users, roles: ['super_admin', 'manager', 'sales'] },
    { id: 'suppliers', label: 'Suppliers', icon: Building2, roles: ['super_admin', 'manager', 'accountant'] },
    { id: 'money-in', label: 'Money In', icon: ArrowDownLeft, roles: ['super_admin', 'accountant'] },
    { id: 'money-out', label: 'Money Out', icon: ArrowUpRight, roles: ['super_admin', 'accountant'] },
    { id: 'expenses', label: 'Expenses', icon: DollarSign, roles: ['super_admin', 'accountant'] },
    { 
      id: 'reminders', 
      label: 'Reminders', 
      icon: Bell, 
      roles: ['super_admin', 'manager', 'accountant'],
      badge: summary?.reminders?.overdueCount > 0 ? summary.reminders.overdueCount : null 
    },
    { id: 'ai-builder', label: 'AI Builder', icon: Sparkles, roles: ['super_admin', 'manager', 'sales'] },
    { id: 'reports', label: 'Reports', icon: FileText, roles: ['super_admin', 'accountant', 'manager'] },
    { id: 'users', label: 'User Roles', icon: ShieldCheck, roles: ['super_admin'] },
  ];

  // If not logged in, render high-end Login View
  if (!currentUser) {
    return <LoginView onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  // Filter accessible modules based on current user's role
  const allowedNavItems = allNavItems.filter(item => 
    !item.roles || item.roles.includes(currentUser.role)
  );

  // If current tab is not allowed for user role, fallback to first allowed tab
  const isCurrentTabAllowed = allowedNavItems.some(i => i.id === currentTab) || 
    (currentTab === 'settings' && currentUser.role === 'super_admin');

  if (!isCurrentTabAllowed && allowedNavItems.length > 0) {
    setCurrentTab(allowedNavItems[0].id);
  }

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'manager': return 'Operations Mgr';
      case 'accountant': return 'Accountant';
      case 'sales': return 'Sales Agent';
      default: return role;
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'super_admin': return 'role-tag-super';
      case 'manager': return 'role-tag-manager';
      case 'accountant': return 'role-tag-accountant';
      case 'sales': return 'role-tag-sales';
      default: return '';
    }
  };

  return (
    <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-backdrop" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <img 
            src="https://nilkanthtourism.com/wp-content/uploads/2025/03/logo-Photoroom.png" 
            alt="Nilkanth Tourism" 
            className="sidebar-logo"
          />
          <button 
            className="mobile-close-btn"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Card inside Sidebar */}
        <div className="sidebar-user-pill">
          <div className="user-avatar-circle">
            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{currentUser.name}</span>
            <span className={`role-tag ${getRoleBadgeClass(currentUser.role)}`}>
              {getRoleDisplayName(currentUser.role)}
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="nav-links">
          {allowedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setCurrentTab(item.id);
                  if (item.id !== 'bookings') setSelectedBookingId(null);
                  setIsMobileMenuOpen(false);
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

        {/* Secondary Navigation (Settings & Logout) */}
        <div className="sidebar-footer">
          {currentUser.role === 'super_admin' && (
            <button
              className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`}
              onClick={() => {
                setCurrentTab('settings');
                setIsMobileMenuOpen(false);
              }}
              id="nav-settings"
            >
              <SettingsIcon size={18} />
              <span>Agency Settings</span>
            </button>
          )}

          <button
            className="nav-item nav-item-logout"
            onClick={handleLogout}
            id="nav-logout"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`main-content ${isSidebarCollapsed ? 'expanded' : ''}`}>
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            {/* Mobile Hamburger Menu Toggle */}
            <button 
              className="mobile-hamburger-btn" 
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            {/* Desktop Fullscreen / Collapse Sidebar Toggle */}
            <button 
              className="desktop-sidebar-toggle-btn"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={isSidebarCollapsed ? "Show Sidebar" : "Hide Sidebar (Full Screen Mode)"}
              aria-label="Toggle sidebar collapse"
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            </button>

            <h1 className="topbar-title">
              {currentTab === 'settings' ? 'Agency Settings' : (allNavItems.find(i => i.id === currentTab)?.label || 'Workspace')}
            </h1>
          </div>

          <div className="topbar-right">
            {/* Light / Dark Mode Toggle */}
            <button 
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle theme mode"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Agency Info (visible on larger screens) */}
            <div className="topbar-agency-info">
              <span className="agency-name">
                {summary?.agency?.agency_name || 'Nilkanth Tourism'}
              </span>
              <span className="agency-subtext">
                GSTIN: {summary?.agency?.gstin || '07AAAAA1234A1Z5'}
              </span>
            </div>

            {/* Quick Action: New Booking (for sales, manager, super admin) */}
            {['super_admin', 'manager', 'sales'].includes(currentUser.role) && (
              <button
                className="btn btn-primary btn-sm topbar-action-btn"
                onClick={() => setIsNewBookingModalOpen(true)}
                id="topbar-btn-new-booking"
              >
                <Plus size={15} /> <span>New Booking</span>
              </button>
            )}

            {/* Topbar User Profile Dropdown */}
            <div className="topbar-profile-wrapper">
              <button 
                className="topbar-profile-btn"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              >
                <div className="user-avatar-circle small">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="topbar-profile-text">
                  <span className="topbar-user-name">{currentUser.name}</span>
                  <span className={`role-tag ${getRoleBadgeClass(currentUser.role)} mini`}>
                    {getRoleDisplayName(currentUser.role)}
                  </span>
                </div>
                <ChevronDown size={14} className="profile-chevron" />
              </button>

              {isUserMenuOpen && (
                <div className="profile-dropdown-menu">
                  <div className="dropdown-user-header">
                    <span className="dropdown-user-name">{currentUser.name}</span>
                    <span className="dropdown-user-email">{currentUser.email}</span>
                  </div>

                  <div className="dropdown-divider" />

                  {currentUser.role === 'super_admin' && (
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        setCurrentTab('users');
                        setIsUserMenuOpen(false);
                      }}
                    >
                      <ShieldCheck size={16} /> User Management
                    </button>
                  )}

                  {currentUser.role === 'super_admin' && (
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        setCurrentTab('settings');
                        setIsUserMenuOpen(false);
                      }}
                    >
                      <SettingsIcon size={16} /> Agency Settings
                    </button>
                  )}

                  <div className="dropdown-divider" />

                  <button 
                    className="dropdown-item text-danger"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              )}
            </div>
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

          {currentTab === 'users' && currentUser.role === 'super_admin' && (
            <UserManagementView currentUser={currentUser} />
          )}

          {currentTab === 'settings' && currentUser.role === 'super_admin' && (
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

      {/* Mobile Bottom Navigation Bar for touch access */}
      <nav className="mobile-bottom-nav">
        <button 
          className={`bottom-nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentTab('dashboard')}
        >
          <Home size={19} />
          <span>Home</span>
        </button>

        {allowedNavItems.some(i => i.id === 'bookings') && (
          <button 
            className={`bottom-nav-item ${currentTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setCurrentTab('bookings')}
          >
            <Plane size={19} />
            <span>Bookings</span>
          </button>
        )}

        {['super_admin', 'manager', 'sales'].includes(currentUser.role) ? (
          <button 
            className="bottom-nav-action-circle"
            onClick={() => setIsNewBookingModalOpen(true)}
            aria-label="New Booking"
          >
            <Plus size={22} />
          </button>
        ) : (
          <button 
            className={`bottom-nav-item ${currentTab === 'money-in' ? 'active' : ''}`}
            onClick={() => setCurrentTab('money-in')}
          >
            <ArrowDownLeft size={19} />
            <span>Money In</span>
          </button>
        )}

        {allowedNavItems.some(i => i.id === 'packages') && (
          <button 
            className={`bottom-nav-item ${currentTab === 'packages' ? 'active' : ''}`}
            onClick={() => setCurrentTab('packages')}
          >
            <Package size={19} />
            <span>Packages</span>
          </button>
        )}

        <button 
          className="bottom-nav-item"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu size={19} />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
}
