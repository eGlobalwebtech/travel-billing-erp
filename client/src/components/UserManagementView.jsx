import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, CheckCircle2, XCircle, Search, 
  Edit3, Trash2, Key, Phone, Mail, Sparkles, AlertTriangle, X 
} from 'lucide-react';

export default function UserManagementView({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'sales',
    phone: '',
    avatar: ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'sales',
      phone: '',
      avatar: ''
    });
    setFormError('');
    setFormSuccess('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // optional on edit
      role: user.role,
      phone: user.phone || '',
      avatar: user.avatar || '',
      is_active: user.is_active === 1
    });
    setFormError('');
    setFormSuccess('');
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setSubmitting(true);

    try {
      if (editingUser) {
        // Update user
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update user');
        setFormSuccess('User updated successfully!');
        setTimeout(() => {
          setEditingUser(null);
          fetchUsers();
        }, 1000);
      } else {
        // Create user
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create user');
        setFormSuccess('User created successfully!');
        setTimeout(() => {
          setIsAddModalOpen(false);
          fetchUsers();
        }, 1000);
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user) => {
    if (user.id === 'USR-001') {
      alert('The primary Super Admin cannot be deactivated.');
      return;
    }
    const newStatus = user.is_active === 1 ? 0 : 1;
    const confirmMsg = newStatus === 0 
      ? `Are you sure you want to deactivate ${user.name}? They will not be able to log in.`
      : `Reactivate login access for ${user.name}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus })
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin':
        return <span className="role-tag role-tag-super">👑 Super Admin</span>;
      case 'manager':
        return <span className="role-tag role-tag-manager">👔 Manager</span>;
      case 'accountant':
        return <span className="role-tag role-tag-accountant">💰 Accountant</span>;
      case 'sales':
        return <span className="role-tag role-tag-sales">✈️ Sales Agent</span>;
      default:
        return <span className="role-tag">{role}</span>;
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone && u.phone.includes(search));
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="view-container">
      {/* Header bar */}
      <div className="view-header">
        <div>
          <h2 className="view-title">User & Role Management</h2>
          <p className="view-subtitle">
            Configure system accounts, role-based module permissions, and staff login access.
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={handleOpenAdd}
          id="btn-add-new-user"
        >
          <UserPlus size={16} /> Add Team Member
        </button>
      </div>

      {/* Role explanation cards */}
      <div className="role-cards-grid">
        <div className="role-card role-card-super">
          <div className="role-card-header">
            <span className="role-tag role-tag-super">👑 Super Admin</span>
            <span className="role-card-access">Full Access</span>
          </div>
          <p className="role-card-desc">
            Complete control over agency settings, user creation, financial reporting, bookings, packages, and master catalogs.
          </p>
        </div>

        <div className="role-card role-card-manager">
          <div className="role-card-header">
            <span className="role-tag role-tag-manager">👔 Operations Manager</span>
            <span className="role-card-access">Operational</span>
          </div>
          <p className="role-card-desc">
            Manages bookings, master packages, hotel rates, suppliers, itineraries, and booking status workflows.
          </p>
        </div>

        <div className="role-card role-card-accountant">
          <div className="role-card-header">
            <span className="role-tag role-tag-accountant">💰 Accountant</span>
            <span className="role-card-access">Financial</span>
          </div>
          <p className="role-card-desc">
            Receives customer payments, generates invoices, releases supplier payments, records expenses, and reviews P&L reports.
          </p>
        </div>

        <div className="role-card role-card-sales">
          <div className="role-card-header">
            <span className="role-tag role-tag-sales">✈️ Sales Agent</span>
            <span className="role-card-access">Front Office</span>
          </div>
          <p className="role-card-desc">
            Creates inquiries and quotes, designs AI itineraries, browses packages, and manages customer travel profiles.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="table-filter-bar">
        <div className="search-input-box">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by name, email, or phone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-pill-group">
          {['All', 'super_admin', 'manager', 'accountant', 'sales'].map((r) => (
            <button
              key={r}
              className={`filter-pill ${roleFilter === r ? 'active' : ''}`}
              onClick={() => setRoleFilter(r)}
            >
              {r === 'All' ? 'All Roles' : r === 'super_admin' ? 'Super Admin' : r === 'manager' ? 'Managers' : r === 'accountant' ? 'Accountants' : 'Sales Agents'}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table / Responsive Cards */}
      <div className="card table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>User / Name</th>
                <th>Email Address</th>
                <th>Phone</th>
                <th>Role & Permissions</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
                    <span style={{ color: '#64748b' }}>Loading team members from PostgreSQL...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No users found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-profile-cell">
                        <div className="user-avatar-circle">
                          {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <span className="user-name-text">{u.name}</span>
                          <span className="user-id-text">ID: {u.id}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex-align-center" style={{ gap: '6px', color: '#334155' }}>
                        <Mail size={14} style={{ color: '#94a3b8' }} />
                        <span>{u.email}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex-align-center" style={{ gap: '6px', color: '#475569' }}>
                        <Phone size={14} style={{ color: '#94a3b8' }} />
                        <span>{u.phone || '—'}</span>
                      </div>
                    </td>
                    <td>{getRoleBadge(u.role)}</td>
                    <td>
                      {u.is_active === 1 ? (
                        <span className="badge badge-success flex-align-center" style={{ display: 'inline-flex', gap: '4px' }}>
                          <CheckCircle2 size={12} /> Active
                        </span>
                      ) : (
                        <span className="badge badge-danger flex-align-center" style={{ display: 'inline-flex', gap: '4px' }}>
                          <XCircle size={12} /> Inactive
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="action-buttons-inline" style={{ justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-outline btn-xs"
                          onClick={() => handleOpenEdit(u)}
                          title="Edit User"
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        {u.id !== 'USR-001' && (
                          <button 
                            className={`btn btn-xs ${u.is_active === 1 ? 'btn-danger' : 'btn-success'}`}
                            onClick={() => handleToggleActive(u)}
                            title={u.is_active === 1 ? 'Deactivate' : 'Activate'}
                          >
                            {u.is_active === 1 ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add / Edit User */}
      {(isAddModalOpen || editingUser) && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingUser ? `Edit User: ${editingUser.name}` : 'Add New Team Member'}
              </h3>
              <button 
                className="modal-close-btn"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingUser(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUser}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {formError && (
                  <div className="alert alert-danger" style={{ padding: '10px 14px', fontSize: '13px' }}>
                    {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="alert alert-success" style={{ padding: '10px 14px', fontSize: '13px' }}>
                    {formSuccess}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Ramesh Chandra Verma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="user@nilkanthtourism.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="+91 98110 00000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">System Role *</label>
                  <select 
                    className="form-control"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    required
                  >
                    <option value="super_admin">👑 Super Admin (Full Unrestricted Access)</option>
                    <option value="manager">👔 Operations Manager (Bookings, Packages, Vendors)</option>
                    <option value="accountant">💰 Accountant / Finance (Invoices, Receipts, Expenses, Reports)</option>
                    <option value="sales">✈️ Sales / Tour Agent (Bookings, Packages, AI Planner)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {editingUser ? 'Reset Password (leave empty to keep unchanged)' : 'Login Password *'}
                  </label>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder={editingUser ? 'Leave blank to keep current' : 'Min 6 characters'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-outline"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingUser(null);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

