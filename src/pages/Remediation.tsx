import { useState, useEffect } from 'react';
import {
  ClipboardList,
  AlertTriangle,
  Calendar,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  Filter,
  X,
  ArrowUpDown,
  User,
  Building2,
  Zap,
  Edit,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RemediationTask, Vendor, User as UserType } from '../types';
import { format, differenceInDays } from 'date-fns';

const SAMPLE_REMEDIATION_TASKS: RemediationTask[] = [
  {
    id: 'TASK01',
    vendor_id: 'VEND01',
    title: 'Implement Zero Trust Architecture',
    description: 'Deploy Zero Trust network architecture across all cloud environments',
    category: 'Network Security',
    priority: 'high',
    status: 'in_progress',
    assigned_to: 'ID03',
    assignee: { id: 'ID03', full_name: 'Rizvan Khan', role: 'Auditor', department: 'Compliance', is_active: true },
    due_date: '2024-08-31',
    completed_date: undefined,
    impact_score: 85,
    effort_score: 75,
    progress_percentage: 35,
    notes: 'Phase 1 design approved',
    created_by: 'ID02',
    created_at: '2024-05-01T08:00:00Z',
    updated_at: '2024-05-20T10:00:00Z',
    vendor: { id: 'VEND01', name: 'CloudBackup Express' },
  },
  {
    id: 'TASK02',
    vendor_id: 'VEND09',
    title: 'Enhance Backup Encryption',
    description: 'Implement AES-256 encryption for all backup data at rest',
    category: 'Data Protection',
    priority: 'critical',
    status: 'overdue',
    assigned_to: 'ID03',
    assignee: { id: 'ID03', full_name: 'Rizvan Khan', role: 'Auditor', department: 'Compliance', is_active: true },
    due_date: '2024-06-15',
    completed_date: undefined,
    impact_score: 95,
    effort_score: 60,
    progress_percentage: 40,
    notes: 'Critical security gap',
    created_by: 'ID02',
    created_at: '2024-04-15T09:30:00Z',
    updated_at: '2024-05-22T11:30:00Z',
    vendor: { id: 'VEND09', name: 'SecurePay Financial' },
  },
  {
    id: 'TASK03',
    vendor_id: 'VEND11',
    title: 'Secure Development Environment',
    description: 'Remove all PII from development systems and implement data masking',
    category: 'Data Protection',
    priority: 'critical',
    status: 'open',
    assigned_to: 'ID03',
    assignee: { id: 'ID03', full_name: 'Rizvan Khan', role: 'Auditor', department: 'Compliance', is_active: true },
    due_date: '2024-06-30',
    completed_date: undefined,
    impact_score: 98,
    effort_score: 70,
    progress_percentage: 0,
    notes: 'Immediate action required',
    created_by: 'ID02',
    created_at: '2024-05-10T12:15:00Z',
    updated_at: '2024-05-10T12:15:00Z',
    vendor: { id: 'VEND11', name: 'CyberGuard Security' },
  },
];

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
};

export default function Remediation() {
  const [tasks, setTasks] = useState<RemediationTask[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<RemediationTask | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Try backend endpoint first (returns normalized tasks with vendor/assignee embedded)
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const apiUrl = `${API_BASE}/api/v2/remediations`;
      let loadedTasks: RemediationTask[] = [];

      try {
        const apiResp = await fetch(apiUrl);
        if (apiResp.ok) {
          const json = await apiResp.json();
          loadedTasks = (json.tasks as RemediationTask[]) || [];
        } else {
          console.warn('Backend remediation API returned', apiResp.status);
        }
      } catch (backendError) {
        console.warn('Backend remediation API fetch failed, falling back to Supabase:', backendError);
      }

      if (loadedTasks.length === 0) {
        const tasksRes = await supabase
          .from('remediation_tasks')
          .select('*, vendor:vendors(id, name), assignee:users(id, full_name)')
          .order('due_date', { ascending: true });
        console.warn('Supabase remediation_tasks response:', tasksRes);
        if (tasksRes.error) {
          console.error('Supabase remediation_tasks error:', tasksRes.error);
        }
        loadedTasks = (tasksRes.data as unknown as RemediationTask[]) || [];
      }

      if (loadedTasks.length === 0) {
        console.warn('No remediation tasks found from backend or Supabase, using sample fallback tasks.');
        loadedTasks = SAMPLE_REMEDIATION_TASKS;
      }

      setTasks(loadedTasks);

      // Always load vendors and users for selector lists
      const [vendorsRes, usersRes] = await Promise.all([
        supabase.from('vendors').select('id, name').order('name'),
        supabase.from('users').select('id, full_name').order('full_name'),
      ]);

      if (vendorsRes.error) {
        console.error('Supabase vendors error:', vendorsRes.error);
      }
      if (usersRes.error) {
        console.error('Supabase users error:', usersRes.error);
      }

      setVendors((vendorsRes.data as unknown as Vendor[]) || []);
      setUsers((usersRes.data as unknown as UserType[]) || []);
    } catch (error) {
      console.error('Error fetching remediation tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (task?: RemediationTask) => {
    setEditTask(task || null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditTask(null);
  };

  const handleSave = async (formData: Partial<RemediationTask>) => {
    setSaving(true);
    try {
      if (editTask) {
        await supabase
          .from('remediation_tasks')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', editTask.id);
      } else {
        await supabase.from('remediation_tasks').insert([formData]);
      }
      await fetchData();
      closeModal();
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (taskId: string) => {
    console.warn('handleComplete called for', taskId);
    // Optimistic UI update so the user sees immediate feedback even if backend is slow
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed', progress_percentage: 100, completed_date: new Date().toISOString() } : t));

    try {
      const resp = await supabase
        .from('remediation_tasks')
        .update({
          status: 'completed',
          completed_date: new Date().toISOString(),
          progress_percentage: 100,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      console.warn('Supabase update response for complete:', resp);

      if (resp.error) {
        console.error('Error completing task (supabase):', resp.error);
        // revert optimistic update
        await fetchData();
      } else {
        // Try to fetch the updated row — if the remote DB is empty (demo), avoid reloading
        try {
          const single = await supabase.from('remediation_tasks').select('*').eq('id', taskId).single();
          console.warn('Single fetch after update:', single);
          if (single.error || !single.data) {
            console.warn('No remote row found after update — keeping optimistic UI state.');
          } else {
            await fetchData();
          }
        } catch (ex) {
          console.error('Error fetching single task after update:', ex);
          // keep optimistic UI
        }
      }
    } catch (error) {
      console.error('Error completing task (exception):', error);
      // revert optimistic update
      await fetchData();
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const vendor = vendors.find(v => v.id === task.vendor_id);
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || task.status === selectedStatus;
    const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Calculate statistics
  const stats = {
    totalTasks: tasks.length,
    open: tasks.filter(t => t.status === 'open' || t.status === 'in_progress').length,
    overdue: tasks.filter(t => {
      if (!t.due_date || t.status === 'completed') return false;
      return differenceInDays(new Date(t.due_date), new Date()) < 0;
    }).length,
    critical: tasks.filter(t => t.priority === 'critical' && t.status !== 'completed').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-primary-500" />
            Remediation Tracker
          </h1>
          <p className="text-slate-500 mt-1">
            Track and manage security remediation tasks
          </p>
        </div>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.totalTasks}</p>
              <p className="text-xs text-slate-500">Total Tasks</p>
            </div>
          </div>
        </div>
        <div className="card p-4 border-blue-200 bg-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{stats.open}</p>
              <p className="text-xs text-blue-600">Open</p>
            </div>
          </div>
        </div>
        <div className="card p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{stats.overdue}</p>
              <p className="text-xs text-red-600">Overdue</p>
            </div>
          </div>
        </div>
        <div className="card p-4 border-orange-200 bg-orange-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-700">{stats.critical}</p>
              <p className="text-xs text-orange-600">Critical</p>
            </div>
          </div>
        </div>
        <div className="card p-4 border-green-200 bg-green-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
              <p className="text-xs text-green-600">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input-field w-40"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="input-field w-40"
          >
            <option value="all">All Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.map((task) => {
          const vendor = vendors.find(v => v.id === task.vendor_id);
          const isOverdue = task.due_date && differenceInDays(new Date(task.due_date), new Date()) < 0 && task.status !== 'completed';

          return (
            <div
              key={task.id}
              className={`card p-4 border-l-4 ${
                task.priority === 'critical' ? 'border-l-red-500' :
                task.priority === 'high' ? 'border-l-orange-500' :
                task.priority === 'medium' ? 'border-l-yellow-500' :
                'border-l-blue-500'
              } ${isOverdue ? 'bg-red-50' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-slate-800">{task.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">{vendor?.name || 'Unknown'}</span>
                  </div>
                </div>
                <span className={`badge ${PRIORITY_COLORS[task.priority]}`}>
                  {task.priority.toUpperCase()}
                </span>
              </div>

              {task.description && (
                <p className="text-sm text-slate-600 mb-3 line-clamp-2">{task.description}</p>
              )}

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-medium text-slate-700">{task.progress_percentage}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      task.status === 'completed' ? 'bg-green-500' :
                      task.progress_percentage >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${task.progress_percentage}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span className={isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}>
                    {task.due_date ? format(new Date(task.due_date), 'MMM d') : 'No due date'}
                  </span>
                </div>
                <span className={`badge ${STATUS_COLORS[task.status]}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>

              {task.status !== 'completed' && (
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleComplete(task.id)}
                    className="flex-1 btn-primary text-sm py-2"
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => openModal(task)}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredTasks.length === 0 && (
        <div className="card p-8 text-center text-slate-500">
          No remediation tasks found
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <TaskModal
          task={editTask}
          vendors={vendors}
          users={users}
          onClose={closeModal}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}

function TaskModal({ task, vendors, users, onClose, onSave, saving }: {
  task: RemediationTask | null;
  vendors: Vendor[];
  users: UserType[];
  onClose: () => void;
  onSave: (data: Partial<RemediationTask>) => Promise<void>;
  saving: boolean;
}) {
  const [formData, setFormData] = useState<Partial<RemediationTask>>({
    vendor_id: task?.vendor_id || '',
    title: task?.title || '',
    description: task?.description || '',
    category: task?.category || '',
    priority: task?.priority || 'medium',
    status: task?.status || 'open',
    assigned_to: task?.assigned_to || '',
    due_date: task?.due_date || '',
    impact_score: task?.impact_score || 0,
    effort_score: task?.effort_score || 0,
    progress_percentage: task?.progress_percentage || 0,
    notes: task?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">
            {task ? 'Edit Task' : 'Add Task'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vendor *</label>
            <select
              value={formData.vendor_id}
              onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
              className="input-field"
              required
            >
              <option value="">Select vendor</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field h-20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as RemediationTask['priority'] })}
                className="input-field"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as RemediationTask['status'] })}
                className="input-field"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assigned To</label>
              <select
                value={formData.assigned_to || ''}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="input-field"
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                value={formData.due_date || ''}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Progress ({formData.progress_percentage}%)</label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.progress_percentage}
              onChange={(e) => setFormData({ ...formData, progress_percentage: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
