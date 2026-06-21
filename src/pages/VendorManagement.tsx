import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Building2,
  MapPin,
  Mail,
  Phone,
  Globe,
  Users,
  DollarSign,
  Edit,
  Trash2,
  Eye,
  FileText,
  Download,
  X,
  ChevronDown,
  ArrowUpDown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Vendor, VendorCategory, RiskLevel, VendorStatus } from '../types';
import { format } from 'date-fns';

const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
  minimal: 'bg-cyan-100 text-cyan-700',
};

const STATUS_COLORS: Record<VendorStatus, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-slate-100 text-slate-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-orange-100 text-orange-700',
  terminated: 'bg-red-100 text-red-700',
};

export default function VendorManagement() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'risk_score' | 'assessment_date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchData();
  }, []);

  const handleExportVendors = () => {
    const rows = filteredVendors.map((vendor) => ({
      Vendor: vendor.name,
      Category: vendor.category?.name || '',
      Status: vendor.status,
      RiskScore: vendor.overall_risk_score?.toFixed(1) || '0',
      RiskLevel: vendor.risk_level,
      Criticality: vendor.criticality || '',
      AccessScope: vendor.data_access_scope || '',
      AccessLevel: vendor.access_level || '',
      SensitiveDataTypes: (vendor.sensitive_data_types || []).join(', '),
      SystemsAccessed: (vendor.systems_accessed || []).join(', '),
      AnnualSpend: vendor.annual_spend?.toFixed(2) || '',
      NextAssessment: vendor.next_assessment_date || '',
    }));

    if (rows.length === 0) {
      alert('No vendors to export');
      return;
    }

    const header = Object.keys(rows[0]);
    const csvLines = [header.join(',')];
    for (const row of rows) {
      const line = header
        .map((key) => {
          const cell = String((row as any)[key] ?? '');
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return '"' + cell.replace(/"/g, '""') + '"';
          }
          return cell;
        })
        .join(',');
      csvLines.push(line);
    }

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendor_register_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const fetchData = async () => {
    try {
      const [vendorsRes, categoriesRes] = await Promise.all([
        supabase.from('vendors').select('*, category:vendor_categories(*)').order('created_at', { ascending: false }),
        supabase.from('vendor_categories').select('*').order('name'),
      ]);

      setVendors((vendorsRes.data as unknown as Vendor[]) || []);
      setCategories((categoriesRes.data as unknown as VendorCategory[]) || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (mode: 'create' | 'edit' | 'view', vendor?: Vendor) => {
    setModalMode(mode);
    setSelectedVendor(vendor || null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedVendor(null);
    setModalMode('create');
  };

  const handleDelete = async (vendor: Vendor) => {
    if (confirm(`Are you sure you want to delete ${vendor.name}? This action cannot be undone.`)) {
      try {
        console.log(`[DELETE] Starting cascade deletion of vendor ID: ${vendor.id}, Name: ${vendor.name}`);
        
        // Define all tables that reference vendors and delete in the correct order
        const tablesToDelete = [
          'alerts',
          'ai_recommendations',
          'remediation_tasks',
          'security_incidents',
          'contracts',
          'compliance_certifications',
          'risk_assessments',
          'security_controls',
        ];

        // Delete from each table in order
        for (const table of tablesToDelete) {
          console.log(`[DELETE] Deleting from ${table}...`);
          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .eq('vendor_id', vendor.id);
          
          if (deleteError) {
            console.error(`[DELETE] Error deleting from ${table}:`, deleteError);
            // Continue with other tables even if one fails
          } else {
            console.log(`[DELETE] ${table} deleted successfully`);
          }
        }

        // Finally, delete the vendor itself
        console.log(`[DELETE] Deleting vendor record...`);
        const { error, data, status, statusText } = await supabase
          .from('vendors')
          .delete()
          .eq('id', vendor.id)
          .select();
        
        console.log(`[DELETE] Vendor delete response - Status: ${status} (${statusText}), Error:`, error, 'Data:', data);
        
        if (error) {
          console.error('[DELETE] Vendor deletion failed with error:', error);
          
          // Check if this is a foreign key constraint error
          if (error.code === '23503' || error.message?.includes('violates foreign key')) {
            alert(
              `Cannot delete vendor "${vendor.name}" because there are related records in the system that couldn't be removed.\n\n` +
              'This might be due to database constraints. Please contact your administrator.'
            );
          } else {
            alert(`Failed to delete vendor: ${error.message || JSON.stringify(error)}`);
          }
          return;
        }

        if (data && data.length > 0) {
          console.log(`[DELETE] Successfully deleted vendor. Updating list.`);
          alert(`Vendor "${vendor.name}" and all associated records deleted successfully.`);
          await fetchVendors();
        } else {
          console.warn(`[DELETE] Delete returned empty data array. Trying to verify deletion...`);
          // Even if .select() returns empty, the deletion might have succeeded
          await fetchVendors();
        }
      } catch (error) {
        console.error('[DELETE] Error in deletion process:', error);
        alert(`Error deleting vendor: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('vendors')
        .select('*, category:vendor_categories(*)')
        .order('created_at', { ascending: false });
      setVendors((data as unknown as Vendor[]) || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.primary_contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.industry?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || vendor.category_id === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || vendor.status === selectedStatus;
    const matchesRisk = selectedRisk === 'all' || vendor.risk_level === selectedRisk;
    return matchesSearch && matchesCategory && matchesStatus && matchesRisk;
  }).sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
    else if (sortBy === 'risk_score') comparison = (a.overall_risk_score || 0) - (b.overall_risk_score || 0);
    else if (sortBy === 'assessment_date') {
      comparison = new Date(a.last_assessment_date || 0).getTime() - new Date(b.last_assessment_date || 0).getTime();
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

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
          <h1 className="text-2xl font-bold text-slate-800">Vendor Management</h1>
          <p className="text-slate-500 mt-1">
            Manage your vendor portfolio and track risk profiles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportVendors} className="btn-outline flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Register
          </button>
          <button onClick={() => openModal('create')} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Vendor
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-field w-48"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input-field w-36"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="under_review">Under Review</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="input-field w-36"
          >
            <option value="all">All Risks</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>{filteredVendors.length} vendors</span>
          </div>
        </div>
      </div>

      {/* Vendor Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <button
                    className="flex items-center gap-1 hover:text-slate-700"
                    onClick={() => {
                      setSortBy('name');
                      setSortOrder(sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    Vendor <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Risk Score
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Assessment
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVendors.map((vendor) => (
                <tr key={vendor.id} className="table-row">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                        {vendor.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{vendor.name}</p>
                        <p className="text-xs text-slate-500">{vendor.industry}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {vendor.category?.name || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            (vendor.overall_risk_score || 0) > 70
                              ? 'bg-red-500'
                              : (vendor.overall_risk_score || 0) > 40
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                          }`}
                          style={{ width: `${vendor.overall_risk_score || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {vendor.overall_risk_score || 0}
                      </span>
                    </div>
                    <span className={`badge mt-1 ${RISK_LEVEL_COLORS[vendor.risk_level || 'medium']}`}>
                      {vendor.risk_level?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge ${STATUS_COLORS[vendor.status]}`}>{vendor.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div>
                      <p>{vendor.last_assessment_date ? format(new Date(vendor.last_assessment_date), 'MMM d, yyyy') : 'Never'}</p>
                      {vendor.next_assessment_date && (
                        <p className="text-xs text-slate-400">
                          Next: {format(new Date(vendor.next_assessment_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-700">{vendor.primary_contact_name || '-'}</p>
                    <p className="text-xs text-slate-500">{vendor.primary_contact_email || '-'}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openModal('view', vendor)}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openModal('edit', vendor)}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(vendor)}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors text-red-500"
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
      </div>

      {/* Modal */}
      {showModal && (
        <VendorModal
          mode={modalMode}
          vendor={selectedVendor}
          categories={categories}
          onClose={closeModal}
          onSave={fetchVendors}
        />
      )}
    </div>
  );
}

interface VendorModalProps {
  mode: 'create' | 'edit' | 'view';
  vendor: Vendor | null;
  categories: VendorCategory[];
  onClose: () => void;
  onSave: () => void;
}

function VendorModal({ mode, vendor, categories, onClose, onSave }: VendorModalProps) {
  const [formData, setFormData] = useState<Partial<Vendor>>({
    name: '',
    category_id: '',
    description: '',
    website: '',
    primary_contact_name: '',
    primary_contact_email: '',
    primary_contact_phone: '',
    address: '',
    country: '',
    industry: '',
    employee_count: undefined,
    annual_revenue: undefined,
    annual_spend: undefined,
    status: 'active',
    notes: '',
    data_access_scope: 'Service Provider',
    access_level: 'limited',
    criticality: 'medium',
    systems_accessed: [],
    sensitive_data_types: [],
    data_sensitivity_score: undefined,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData({
      name: '',
      category_id: '',
      description: '',
      website: '',
      primary_contact_name: '',
      primary_contact_email: '',
      primary_contact_phone: '',
      address: '',
      country: '',
      industry: '',
      employee_count: undefined,
      annual_revenue: undefined,
      annual_spend: undefined,
      status: 'active',
      notes: '',
      data_access_scope: 'Service Provider',
      access_level: 'limited',
      criticality: 'medium',
      systems_accessed: [],
      sensitive_data_types: [],
      data_sensitivity_score: undefined,
      ...vendor,
    });
  }, [vendor, mode]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (mode === 'view') return;

    setSaving(true);
    try {
      const riskScore = Math.round(
        50 + Math.random() * 40
      );
      const riskLevel: RiskLevel =
        riskScore > 80 ? 'critical' : riskScore > 65 ? 'high' : riskScore > 45 ? 'medium' : 'low';

      if (mode === 'create') {
        await supabase.from('vendors').insert([
          {
            ...formData,
            overall_risk_score: riskScore,
            risk_level: riskLevel,
            onboarding_date: new Date().toISOString().split('T')[0],
          },
        ]);
      } else if (vendor?.id) {
        await supabase
          .from('vendors')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', vendor.id);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving vendor:', error);
    } finally {
      setSaving(false);
    }
  };

  const isViewMode = mode === 'view';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">
            {mode === 'create' ? 'Add New Vendor' : mode === 'edit' ? 'Edit Vendor' : 'Vendor Details'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                disabled={isViewMode}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="input-field"
                disabled={isViewMode}
                required
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
              <input
                type="text"
                value={formData.industry || ''}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="input-field"
                disabled={isViewMode}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field h-20 resize-none"
                disabled={isViewMode}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
              <input
                type="url"
                value={formData.website || ''}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="input-field"
                disabled={isViewMode}
                placeholder="https://"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as VendorStatus })}
                className="input-field"
                disabled={isViewMode}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="under_review">Under Review</option>
                <option value="suspended">Suspended</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>

            <div className="md:col-span-2 border-t border-slate-200 pt-4 mt-2">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Primary Contact</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
              <input
                type="text"
                value={formData.primary_contact_name || ''}
                onChange={(e) => setFormData({ ...formData, primary_contact_name: e.target.value })}
                className="input-field"
                disabled={isViewMode}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={formData.primary_contact_email || ''}
                onChange={(e) => setFormData({ ...formData, primary_contact_email: e.target.value })}
                className="input-field"
                disabled={isViewMode}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.primary_contact_phone || ''}
                onChange={(e) => setFormData({ ...formData, primary_contact_phone: e.target.value })}
                className="input-field"
                disabled={isViewMode}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data Access Scope</label>
              <select
                value={formData.data_access_scope || 'Service Provider'}
                onChange={(e) => setFormData({ ...formData, data_access_scope: e.target.value })}
                className="input-field"
                disabled={isViewMode}
              >
                <option value="Service Provider">Service Provider</option>
                <option value="Processor">Processor</option>
                <option value="Controller">Controller</option>
                <option value="Subprocessor">Subprocessor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Access Level</label>
              <select
                value={formData.access_level || 'limited'}
                onChange={(e) => setFormData({ ...formData, access_level: e.target.value as Vendor['access_level'] })}
                className="input-field"
                disabled={isViewMode}
              >
                <option value="limited">Limited</option>
                <option value="read">Read</option>
                <option value="write">Write</option>
                <option value="admin">Admin</option>
                <option value="full">Full</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Criticality</label>
              <select
                value={formData.criticality || 'medium'}
                onChange={(e) => setFormData({ ...formData, criticality: e.target.value as Vendor['criticality'] })}
                className="input-field"
                disabled={isViewMode}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Annual Vendor Spend</label>
              <input
                type="number"
                value={formData.annual_spend ?? ''}
                onChange={(e) => setFormData({ ...formData, annual_spend: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="input-field"
                disabled={isViewMode}
                placeholder="USD"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Systems Accessed</label>
              <input
                type="text"
                value={(formData.systems_accessed || []).join(', ')}
                onChange={(e) => setFormData({ ...formData, systems_accessed: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })}
                className="input-field"
                disabled={isViewMode}
                placeholder="CRM, Database, Backup, HR System"
              />
              <p className="text-xs text-slate-400 mt-1">Comma-separated list of systems/vendor access points.</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Sensitive Data Types</label>
              <input
                type="text"
                value={(formData.sensitive_data_types || []).join(', ')}
                onChange={(e) => setFormData({ ...formData, sensitive_data_types: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })}
                className="input-field"
                disabled={isViewMode}
                placeholder="PII, Financial, Health, Customer Data"
              />
              <p className="text-xs text-slate-400 mt-1">Use comma-separated values to capture sensitive data scope.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data Sensitivity Score</label>
              <input
                type="number"
                min={0}
                max={100}
                value={formData.data_sensitivity_score ?? ''}
                onChange={(e) => setFormData({ ...formData, data_sensitivity_score: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="input-field"
                disabled={isViewMode}
                placeholder="0-100"
              />
              <p className="text-xs text-slate-400 mt-1">Higher values mean more sensitive access and higher risk weighting.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
              <input
                type="text"
                value={formData.country || ''}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="input-field"
                disabled={isViewMode}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="input-field"
                disabled={isViewMode}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Employee Count</label>
              <input
                type="number"
                value={formData.employee_count || ''}
                onChange={(e) => setFormData({ ...formData, employee_count: parseInt(e.target.value) })}
                className="input-field"
                disabled={isViewMode}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Annual Revenue ($)</label>
              <input
                type="number"
                value={formData.annual_revenue || ''}
                onChange={(e) => setFormData({ ...formData, annual_revenue: parseFloat(e.target.value) })}
                className="input-field"
                disabled={isViewMode}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input-field h-20 resize-none"
                disabled={isViewMode}
              />
            </div>
          </div>

          {!isViewMode && (
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>Save Vendor</>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
