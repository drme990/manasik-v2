'use client';

import { useEffect, useState } from 'react';
import { User } from '@/types/User';
import { Plus, Trash2, Shield, UserCog } from 'lucide-react';
import Table from '@/components/ui/table';
import Modal from '@/components/ui/modal';
import Dropdown from '@/components/ui/dropdown';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin' as 'admin' | 'super_admin',
  });

  // Table columns configuration
  const columns = [
    {
      header: 'Name',
      accessor: (user: User) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
            {user.role === 'super_admin' ? (
              <Shield size={16} className="text-success" />
            ) : (
              <UserCog size={16} className="text-success" />
            )}
          </div>
          <span className="font-medium">{user.name}</span>
        </div>
      ),
    },
    {
      header: 'Email',
      accessor: (user: User) => (
        <span className="text-secondary">{user.email}</span>
      ),
    },
    {
      header: 'Role',
      accessor: (user: User) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            user.role === 'super_admin'
              ? 'bg-purple-500/10 text-purple-500'
              : 'bg-blue-500/10 text-blue-500'
          }`}
        >
          {user.role}
        </span>
      ),
    },
    {
      header: 'Created At',
      accessor: (user: User) => (
        <span className="text-secondary">
          {new Date(user.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: (user: User) => (
        <button
          onClick={() => handleDelete(user._id)}
          className="p-2 hover:bg-error/10 text-error rounded-lg transition-colors"
        >
          <Trash2 size={16} />
        </button>
      ),
    },
  ];

  const roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'super_admin', label: 'Super Admin' },
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchUsers();
        closeModal();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const openModal = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'admin',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Users</h1>
          <p className="text-secondary">Manage admin users</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors"
        >
          <Plus size={20} />
          Add User
        </button>
      </div>

      {/* Users Table */}
      <Table<User>
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="No users found"
      />

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title="Add User"
        size="md"
        footer={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 py-2 bg-background border border-stroke rounded-lg hover:bg-stroke/10 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="user-form"
              className="flex-1 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors font-medium"
            >
              Add User
            </button>
          </div>
        }
      >
        <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 rounded-lg border border-stroke bg-background focus:outline-none focus:border-success"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-4 py-2 rounded-lg border border-stroke bg-background focus:outline-none focus:border-success"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password *</label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-4 py-2 rounded-lg border border-stroke bg-background focus:outline-none focus:border-success"
              placeholder="Minimum 6 characters"
            />
          </div>

          <Dropdown
            label="Role *"
            value={formData.role}
            options={roleOptions}
            onChange={(value) =>
              setFormData({
                ...formData,
                role: value as 'admin' | 'super_admin',
              })
            }
          />
        </form>
      </Modal>
    </div>
  );
}
