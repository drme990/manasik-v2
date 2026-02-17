'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { User, AdminPage, ALL_ADMIN_PAGES } from '@/types/User';
import { Plus, Trash2, Shield, UserCog } from 'lucide-react';
import Table from '@/components/ui/table';
import Modal from '@/components/ui/modal';
import Dropdown from '@/components/ui/dropdown';
import Input from '@/components/ui/input';
import { toast } from 'react-toastify';
import ConfirmModal, { useConfirmModal } from '@/components/ui/confirm-modal';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin' as 'admin' | 'super_admin',
    allowedPages: [] as AdminPage[],
  });
  const t = useTranslations('admin.users');
  const { confirm, modalProps } = useConfirmModal();

  // Table columns configuration
  const columns = [
    {
      header: t('table.name'),
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
      header: t('table.email'),
      accessor: (user: User) => (
        <span className="text-secondary">{user.email}</span>
      ),
    },
    {
      header: t('table.role'),
      accessor: (user: User) => (
        <div className="flex flex-col gap-1">
          <span
            className={`inline-block w-fit px-2 py-1 rounded-full text-xs font-medium ${
              user.role === 'super_admin'
                ? 'bg-purple-500/10 text-purple-500'
                : 'bg-blue-500/10 text-blue-500'
            }`}
          >
            {user.role === 'super_admin'
              ? t('roles.super_admin')
              : t('roles.admin')}
          </span>
          {user.role === 'admin' &&
            user.allowedPages &&
            user.allowedPages.length > 0 && (
              <span className="text-xs text-secondary">
                {user.allowedPages.length} {t('pagesAccess')}
              </span>
            )}
        </div>
      ),
    },
    {
      header: t('table.createdAt'),
      accessor: (user: User) => (
        <span className="text-secondary">
          {new Date(user.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: t('table.actions'),
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
    { value: 'admin', label: t('roles.admin') },
    { value: 'super_admin', label: t('roles.super_admin') },
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
        toast.success(t('messages.createSuccess'));
        fetchUsers();
        closeModal();
      } else {
        const data = await res.json();
        toast.error(data.error || t('messages.createFailed'));
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(t('messages.createFailed'));
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: t('deleteConfirmTitle', { defaultValue: 'Delete User' }),
      message: t('deleteConfirm'),
      type: 'danger',
      confirmText: t('deleteConfirmButton', { defaultValue: 'Delete' }),
      cancelText: t('deleteCancelButton', { defaultValue: 'Cancel' }),
    });

    if (!confirmed) return;

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
      allowedPages: [],
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-secondary">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('title')}
          </h1>
          <p className="text-secondary">{t('description')}</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors"
        >
          <Plus size={20} />
          {t('addUser')}
        </button>
      </div>

      {/* Users Table */}
      <Table<User>
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage={t('emptyMessage')}
      />

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={t('addUser')}
        size="md"
        footer={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 py-2 bg-background border border-stroke rounded-lg hover:bg-stroke/10 transition-colors font-medium"
            >
              {t('buttons.cancel')}
            </button>
            <button
              type="submit"
              form="user-form"
              className="flex-1 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors font-medium"
            >
              {t('buttons.addUser')}
            </button>
          </div>
        }
      >
        <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('form.name')}
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Input
            label={t('form.email')}
            type="email"
            required
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />

          <Input
            label={t('form.password')}
            type="password"
            required
            minLength={6}
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            placeholder={t('form.passwordPlaceholder')}
            helperText={t('form.passwordPlaceholder')}
          />

          <Dropdown
            label={t('form.role')}
            value={formData.role}
            options={roleOptions}
            onChange={(value) =>
              setFormData({
                ...formData,
                role: value as 'admin' | 'super_admin',
                allowedPages:
                  value === 'super_admin' ? [] : formData.allowedPages,
              })
            }
          />

          {formData.role === 'admin' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                {t('form.allowedPages')}
              </label>
              <p className="text-xs text-secondary mb-2">
                {t('form.allowedPagesHelp')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ALL_ADMIN_PAGES.map((page) => (
                  <label
                    key={page}
                    className="flex items-center gap-2 p-2 rounded-lg border border-stroke hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.allowedPages.includes(page)}
                      onChange={(e) => {
                        const pages = e.target.checked
                          ? [...formData.allowedPages, page]
                          : formData.allowedPages.filter((p) => p !== page);
                        setFormData({ ...formData, allowedPages: pages });
                      }}
                      className="rounded accent-success"
                    />
                    <span className="text-sm">{t(`pageLabels.${page}`)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </form>
      </Modal>

      <ConfirmModal {...modalProps} />
    </div>
  );
}
