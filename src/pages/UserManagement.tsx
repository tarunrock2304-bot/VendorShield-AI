import { useEffect, useMemo, useState } from 'react';
import { Download, Plus, Search, Edit, Trash2, Eye, X } from 'lucide-react';
import { useAuth } from '../App';
import { UserRole } from '../types';
import { createAccountId, DemoAccount, getStoredAccounts, saveStoredAccounts } from '../lib/demo-auth';

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'auditor', label: 'Auditor' },
];

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<DemoAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState<Partial<DemoAccount>>({
    fullName: '',
    email: '',
    password: '',
    role: 'analyst',
    status: 'Active',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    setUsers(getStoredAccounts());
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.roleLabel.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = selectedRole === 'all' || u.role === selectedRole;
      const matchesStatus = selectedStatus === 'all' || u.status === selectedStatus;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, selectedRole, selectedStatus]);

  const stats = useMemo(
    () => ({
      totalUsers: users.length,
      activeUsers: users.filter((user) => user.status === 'Active').length,
      rolesConfigured: new Set(users.map((user) => user.roleLabel)).size,
    }),
    [users],
  );

  const openAddModal = () => {
    setNewUser({
      fullName: '',
      email: '',
      password: '',
      role: 'analyst',
      status: 'Active',
    });
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setError('');
  };

  const handleExport = () => {
    const rows = filteredUsers.map((user) => ({
      ID: user.id,
      Name: user.fullName,
      Email: user.email,
      Role: user.roleLabel,
      Status: user.status,
      Password: user.password,
      'Last Login': user.last_login ? new Date(user.last_login).toLocaleString() : 'Never',
    }));

    if (rows.length === 0) {
      alert('No users to export.');
      return;
    }

    const header = Object.keys(rows[0]);
    const csvLines = [header.join(',')];

    for (const row of rows) {
      csvLines.push(
        header
          .map((field) => {
            const value = String((row as any)[field] ?? '');
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(','),
      );
    }

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `user-management-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleSaveUser = () => {
    if (!newUser.fullName || !newUser.email || !newUser.password || !newUser.role) {
      setError('Please complete all required fields.');
      return;
    }

    const normalizedEmail = newUser.email.trim().toLowerCase();
    if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      setError('A user with this email already exists.');
      return;
    }

    const accountId = createAccountId(users);
    const createdAt = new Date().toISOString();
    const savedUser: DemoAccount = {
      id: accountId,
      fullName: newUser.fullName.trim(),
      email: normalizedEmail,
      password: newUser.password,
      role: newUser.role as UserRole,
      roleLabel: newUser.role === 'admin' ? 'Admin' : newUser.role === 'analyst' ? 'Analyst' : 'Auditor',
      status: newUser.status === 'Inactive' ? 'Inactive' : 'Active',
      last_login: '',
      created_at: createdAt,
      updated_at: createdAt,
    };

    const nextUsers = [savedUser, ...users];
    setUsers(nextUsers);
    saveStoredAccounts(nextUsers);
    setShowModal(false);
  };

  const handleDeleteUser = (id: string) => {
    const nextUsers = users.filter((user) => user.id !== id);
    setUsers(nextUsers);
    saveStoredAccounts(nextUsers);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
          <p className="text-slate-500 mt-1">Manage platform users, roles, and demo login credentials without backend queries.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={handleExport} className="btn-outline flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-sm font-medium text-slate-500">Total Users</p>
          <p className="text-3xl font-bold text-slate-900 mt-3">{stats.totalUsers}</p>
          <p className="text-xs text-slate-400 mt-2">All platform users</p>
        </div>
        <div className="card p-4 bg-emerald-50 border border-emerald-100">
          <p className="text-sm font-medium text-emerald-700">Active Users</p>
          <p className="text-3xl font-bold text-emerald-900 mt-3">{stats.activeUsers}</p>
          <p className="text-xs text-emerald-600 mt-2">100% of total users</p>
        </div>
        <div className="card p-4 bg-slate-50 border border-slate-200">
          <p className="text-sm font-medium text-slate-600">Roles Configured</p>
          <p className="text-3xl font-bold text-slate-900 mt-3">{stats.rolesConfigured}</p>
          <p className="text-xs text-slate-500 mt-2">Admin, Analyst, Auditor</p>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name or email..."
              className="input-field pl-10"
            />
          </div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="input-field w-44"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="analyst">Analyst</option>
            <option value="auditor">Auditor</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input-field w-44"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">ID</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">User</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">Email</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">Role</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">Status</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">Last Login</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((account) => (
                <tr key={account.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-700">{account.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white font-semibold">
                        {account.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{account.fullName}</div>
                        {currentUser?.email === account.email && (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">You</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{account.email}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{account.roleLabel}</td>
                  <td className="px-6 py-4">
                    <span className={`badge ${account.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                      {account.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {account.last_login ? new Date(account.last_login).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(account.id)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-slate-500">No users match your filter.</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Add User</h2>
                <p className="text-sm text-slate-500">Create a new demo user and make credentials available at login.</p>
              </div>
              <button onClick={closeModal} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Full Name</span>
                <input
                  type="text"
                  value={newUser.fullName || ''}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  className="input-field mt-2 w-full"
                  placeholder="Jane Doe"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  value={newUser.email || ''}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="input-field mt-2 w-full"
                  placeholder="jane.doe@example.com"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <input
                  type="text"
                  value={newUser.password || ''}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="input-field mt-2 w-full"
                  placeholder="Create a demo password"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Role</span>
                <select
                  value={newUser.role || 'analyst'}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                  className="input-field mt-2 w-full"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Status</span>
                <select
                  value={newUser.status || 'Active'}
                  onChange={(e) => setNewUser({ ...newUser, status: e.target.value as DemoAccount['status'] })}
                  className="input-field mt-2 w-full"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3 justify-end">
              <button onClick={closeModal} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSaveUser} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
