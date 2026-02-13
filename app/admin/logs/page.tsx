'use client';

import { useEffect, useState } from 'react';
import { ActivityLog } from '@/types/ActivityLog';
import { Filter, RefreshCw } from 'lucide-react';
import Table from '@/components/ui/table';
import Dropdown from '@/components/ui/dropdown';

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    action: '',
    resource: '',
  });

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (filter.action) params.append('action', filter.action);
        if (filter.resource) params.append('resource', filter.resource);
        params.append('limit', '100');

        const res = await fetch(`/api/logs?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
          setLogs(data.data.logs);
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [filter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.action) params.append('action', filter.action);
      if (filter.resource) params.append('resource', filter.resource);
      params.append('limit', '100');

      const res = await fetch(`/api/logs?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setLogs(data.data.logs);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-500/10 text-green-500';
      case 'update':
        return 'bg-blue-500/10 text-blue-500';
      case 'delete':
        return 'bg-red-500/10 text-red-500';
      case 'login':
        return 'bg-purple-500/10 text-purple-500';
      case 'logout':
        return 'bg-gray-500/10 text-gray-500';
      default:
        return 'bg-secondary/10 text-secondary';
    }
  };

  const getResourceColor = (resource: string) => {
    switch (resource) {
      case 'product':
        return 'bg-success/10 text-success';
      case 'user':
        return 'bg-blue-500/10 text-blue-500';
      case 'auth':
        return 'bg-purple-500/10 text-purple-500';
      default:
        return 'bg-secondary/10 text-secondary';
    }
  };

  // Table columns configuration
  const columns = [
    {
      header: 'User',
      accessor: (log: ActivityLog) => (
        <div>
          <p className="font-medium text-sm">{log.userName}</p>
          <p className="text-secondary text-xs">{log.userEmail}</p>
        </div>
      ),
    },
    {
      header: 'Action',
      accessor: (log: ActivityLog) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}
        >
          {log.action}
        </span>
      ),
    },
    {
      header: 'Resource',
      accessor: (log: ActivityLog) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getResourceColor(log.resource)}`}
        >
          {log.resource}
        </span>
      ),
    },
    {
      header: 'Details',
      accessor: (log: ActivityLog) => (
        <span className="text-sm max-w-md block">{log.details}</span>
      ),
    },
    {
      header: 'Date',
      accessor: (log: ActivityLog) => (
        <span className="text-secondary text-sm">
          {new Date(log.createdAt).toLocaleString()}
        </span>
      ),
    },
  ];

  const actionOptions = [
    { value: '', label: 'All Actions' },
    { value: 'create', label: 'Create' },
    { value: 'update', label: 'Update' },
    { value: 'delete', label: 'Delete' },
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' },
  ];

  const resourceOptions = [
    { value: '', label: 'All Resources' },
    { value: 'product', label: 'Product' },
    { value: 'user', label: 'User' },
    { value: 'auth', label: 'Auth' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Activity Logs
          </h1>
          <p className="text-secondary">Track admin activities and changes</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card-bg border border-stroke rounded-site p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={18} />
          <h3 className="font-semibold">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Dropdown
            label="Action"
            value={filter.action}
            options={actionOptions}
            onChange={(value: string) => setFilter({ ...filter, action: value })}
          />
          <Dropdown
            label="Resource"
            value={filter.resource}
            options={resourceOptions}
            onChange={(value: string) => setFilter({ ...filter, resource: value })}
          />
        </div>
      </div>

      {/* Logs List */}
      <Table<ActivityLog>
        columns={columns}
        data={logs}
        loading={loading}
        emptyMessage="No activity logs found"
      />
    </div>
  );
}
