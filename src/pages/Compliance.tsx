import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Award,
  AlertTriangle,
  Calendar,
  Search,
  Plus,
  Download,
  Eye,
  Edit,
  X,
  ChevronRight,
  CheckCircle2,
  Clock,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { ComplianceCertification, Vendor } from '../types';
import { format, differenceInDays } from 'date-fns';

const COMPLIANCE_STANDARDS = [
  { id: 'ISO27001', name: 'ISO 27001', color: '#6366f1' },
  { id: 'SOC2_Type_II', name: 'SOC 2 Type II', color: '#8b5cf6' },
  { id: 'GDPR', name: 'GDPR', color: '#22c55e' },
  { id: 'NIST_800-53', name: 'NIST 800-53', color: '#f59e0b' },
  { id: 'PCI_DSS', name: 'PCI DSS', color: '#ef4444' },
  { id: 'HIPAA', name: 'HIPAA', color: '#06b6d4' },
];

const STATUS_COLORS: Record<string, string> = {
  compliant: 'bg-green-100 text-green-700',
  partially_compliant: 'bg-yellow-100 text-yellow-700',
  non_compliant: 'bg-red-100 text-red-700',
  pending_review: 'bg-blue-100 text-blue-700',
  expired: 'bg-slate-100 text-slate-700',
};

export default function Compliance() {
  const [certifications, setCertifications] = useState<ComplianceCertification[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStandard, setSelectedStandard] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editCert, setEditCert] = useState<ComplianceCertification | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [certsRes, vendorsRes] = await Promise.all([
        supabase
          .from('compliance_certifications')
          .select('*, vendor:vendors(id, name, category_id, industry)')
          .order('expiry_date', { ascending: true }),
        supabase.from('vendors').select('id, name, category_id, industry').order('name'),
      ]);

      setCertifications((certsRes.data as unknown as ComplianceCertification[]) || []);
      setVendors((vendorsRes.data as unknown as Vendor[]) || []);
    } catch (error) {
      console.error('Error fetching compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      const rows = filteredCerts.map(cert => {
        const vendor = vendors.find(v => v.id === cert.vendor_id);
        return {
          Vendor: vendor?.name || 'Unknown Vendor',
          Standard: cert.standard.replace(/_/g, ' '),
          CertificationBody: cert.certification_body || '',
          CertificationNumber: cert.certification_number || '',
          Status: cert.status || '',
          IssueDate: cert.issue_date ? format(new Date(cert.issue_date), 'yyyy-MM-dd') : '',
          ExpiryDate: cert.expiry_date ? format(new Date(cert.expiry_date), 'yyyy-MM-dd') : '',
          CompliancePercentage: cert.compliance_percentage?.toFixed(0) || '0',
          Notes: cert.notes || '',
        };
      });

      if (rows.length === 0) {
        alert('No certifications to export');
        return;
      }

      const header = Object.keys(rows[0]);
      const csvLines = [header.join(',')];
      for (const r of rows) {
        const line = header.map(h => {
          const cell = String((r as any)[h] ?? '');
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return '"' + cell.replace(/"/g, '""') + '"';
          }
          return cell;
        }).join(',');
        csvLines.push(line);
      }

      const csvContent = csvLines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance_export_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
      alert('Export failed — check console for details');
    }
  };

  const openModal = (cert?: ComplianceCertification) => {
    setEditCert(cert || null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditCert(null);
  };

  const handleSave = async (formData: Partial<ComplianceCertification>) => {
    setSaving(true);
    try {
      if (editCert) {
        await supabase
          .from('compliance_certifications')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', editCert.id);
      } else {
        await supabase.from('compliance_certifications').insert([formData]);
      }
      await fetchData();
      closeModal();
    } catch (error) {
      console.error('Error saving certification:', error);
    } finally {
      setSaving(false);
    }
  };

  const filteredCerts = certifications.filter((cert) => {
    const vendor = vendors.find(v => v.id === cert.vendor_id);
    const matchesSearch =
      cert.standard.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.certification_body?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStandard = selectedStandard === 'all' || cert.standard === selectedStandard;
    const matchesStatus = selectedStatus === 'all' || cert.status === selectedStatus;
    return matchesSearch && matchesStandard && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    totalCerts: certifications.length,
    compliant: certifications.filter(c => c.status === 'compliant').length,
    expiring90Days: certifications.filter(c => {
      if (!c.expiry_date) return false;
      const days = differenceInDays(new Date(c.expiry_date), new Date());
      return days <= 90 && days > 0;
    }).length,
    expiring30Days: certifications.filter(c => {
      if (!c.expiry_date) return false;
      const days = differenceInDays(new Date(c.expiry_date), new Date());
      return days <= 30 && days > 0;
    }).length,
    overdue: certifications.filter(c => c.status === 'expired' || (c.expiry_date && differenceInDays(new Date(c.expiry_date), new Date()) <= 0)).length,
  };

  // Compliance by standard chart data
  const standardStats = COMPLIANCE_STANDARDS.map(std => {
    const certsForStandard = certifications.filter(c => c.standard === std.id);
    return {
      name: std.name,
      compliant: certsForStandard.filter(c => c.status === 'compliant').length,
      partially: certsForStandard.filter(c => c.status === 'partially_compliant').length,
      nonCompliant: certsForStandard.filter(c => ['non_compliant', 'expired'].includes(c.status)).length,
      color: std.color,
    };
  }).filter(s => s.compliant + s.partially + s.nonCompliant > 0);

  // Compliance distribution pie chart
  const distributionData = [
    { name: 'Compliant', value: stats.compliant, color: '#22c55e' },
    { name: 'Partial', value: certifications.filter(c => c.status === 'partially_compliant').length, color: '#eab308' },
    { name: 'Non-Compliant', value: certifications.filter(c => c.status === 'non_compliant').length, color: '#ef4444' },
    { name: 'Pending', value: certifications.filter(c => c.status === 'pending_review').length, color: '#3b82f6' },
    { name: 'Expired', value: certifications.filter(c => c.status === 'expired').length, color: '#64748b' },
  ].filter(d => d.value > 0);

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
            <ShieldCheck className="w-7 h-7 text-primary-500" />
            Compliance & Certification
          </h1>
          <p className="text-slate-500 mt-1">
            Track vendor certifications, standards compliance, and renewal schedules
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => handleExport()} className="btn-outline flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Certification
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Award className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.totalCerts}</p>
              <p className="text-xs text-slate-500">Total Certifications</p>
            </div>
          </div>
        </div>
        <div className="card p-4 border-green-200 bg-green-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{stats.compliant}</p>
              <p className="text-xs text-green-600">Compliant</p>
            </div>
          </div>
        </div>
        <div className="card p-4 border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-700">{stats.expiring90Days}</p>
              <p className="text-xs text-yellow-600">Expiring 90 Days</p>
            </div>
          </div>
        </div>
        <div className="card p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{stats.expiring30Days}</p>
              <p className="text-xs text-red-600">Expiring 30 Days</p>
            </div>
          </div>
        </div>
        <div className="card p-4 border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-700">{stats.overdue}</p>
              <p className="text-xs text-slate-500">Overdue/Expired</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            Compliance by Standard
          </h3>
          {standardStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={standardStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="compliant" stackId="a" fill="#22c55e" name="Compliant" />
                <Bar dataKey="partially" stackId="a" fill="#eab308" name="Partial" />
                <Bar dataKey="nonCompliant" stackId="a" fill="#ef4444" name="Non-Compliant" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-400">
              No data available
            </div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary-500" />
            Compliance Distribution
          </h3>
          {distributionData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {distributionData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-600">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-400">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search certifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={selectedStandard}
            onChange={(e) => setSelectedStandard(e.target.value)}
            className="input-field w-48"
          >
            <option value="all">All Standards</option>
            {COMPLIANCE_STANDARDS.map(std => (
              <option key={std.id} value={std.id}>{std.name}</option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input-field w-44"
          >
            <option value="all">All Status</option>
            <option value="compliant">Compliant</option>
            <option value="partially_compliant">Partially Compliant</option>
            <option value="non_compliant">Non-Compliant</option>
            <option value="pending_review">Pending Review</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Certifications Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Vendor / Standard</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Certification Details</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Validity Period</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Compliance %</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCerts.map((cert) => {
                const vendor = vendors.find(v => v.id === cert.vendor_id);
                const daysUntilExpiry = cert.expiry_date ? differenceInDays(new Date(cert.expiry_date), new Date()) : null;
                const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry >= 0;
                const standard = COMPLIANCE_STANDARDS.find(s => s.id === cert.standard);

                return (
                  <tr key={cert.id} className="table-row">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {vendor?.name?.charAt(0) || 'V'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{vendor?.name || 'Unknown Vendor'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: standard?.color || '#64748b' }}
                            />
                            <span className="text-xs text-slate-500">{cert.standard.replace(/_/g, ' ')}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-slate-700">{cert.certification_body || 'N/A'}</p>
                        <p className="text-xs text-slate-400">{cert.certification_number || 'No cert number'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${STATUS_COLORS[cert.status] || 'bg-slate-100 text-slate-700'}`}>
                        {cert.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-slate-700">
                            {cert.expiry_date ? format(new Date(cert.expiry_date), 'MMM d, yyyy') : 'N/A'}
                          </p>
                          {daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry >= 0 && (
                            <span className="text-xs text-red-600 font-medium">
                              ({daysUntilExpiry}d left)
                            </span>
                          )}
                        </div>
                        {isExpiringSoon && daysUntilExpiry && (
                          <div className="w-20 bg-slate-200 h-1 rounded-full mt-2">
                            <div
                              className={`h-1 rounded-full transition-all ${
                                daysUntilExpiry <= 30 ? 'bg-red-500' : 'bg-yellow-500'
                              }`}
                              style={{ width: `${Math.max(10, (daysUntilExpiry / 90) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 h-2 rounded-full">
                          <div
                            className={`h-2 rounded-full ${
                              (cert.compliance_percentage || 0) >= 90 ? 'bg-green-500' :
                              (cert.compliance_percentage || 0) >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, cert.compliance_percentage || 0))}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                          {cert.compliance_percentage?.toFixed(0) || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openModal(cert)}
                          className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredCerts.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            No certifications found
          </div>
        )}
      </div>

      {/* Expiring Soon Alert */}
      {stats.expiring30Days > 0 && (
        <div className="card p-6 border-red-200 bg-red-50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800">
                Action Required: {stats.expiring30Days} Certifications Expiring Soon
              </h3>
              <p className="text-sm text-red-600 mt-1">
                The following certifications will expire within the next 30 days.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <CertificationModal
          cert={editCert}
          vendors={vendors}
          onClose={closeModal}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}

interface CertificationModalProps {
  cert: ComplianceCertification | null;
  vendors: Vendor[];
  onClose: () => void;
  onSave: (data: Partial<ComplianceCertification>) => Promise<void>;
  saving: boolean;
}

function CertificationModal({ cert, vendors, onClose, onSave, saving }: CertificationModalProps) {
  const [formData, setFormData] = useState<Partial<ComplianceCertification>>({
    vendor_id: cert?.vendor_id || '',
    standard: cert?.standard || 'ISO27001',
    certification_number: cert?.certification_number || '',
    certification_body: cert?.certification_body || '',
    issue_date: cert?.issue_date || '',
    expiry_date: cert?.expiry_date || '',
    scope: cert?.scope || '',
    status: cert?.status || 'pending_review',
    compliance_percentage: cert?.compliance_percentage || 0,
    notes: cert?.notes || '',
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
            {cert ? 'Edit Certification' : 'Add Certification'}
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Standard *</label>
            <select
              value={formData.standard}
              onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
              className="input-field"
              required
            >
              {COMPLIANCE_STANDARDS.map(std => (
                <option key={std.id} value={std.id}>{std.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cert Number</label>
              <input
                type="text"
                value={formData.certification_number || ''}
                onChange={(e) => setFormData({ ...formData, certification_number: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cert Body</label>
              <input
                type="text"
                value={formData.certification_body || ''}
                onChange={(e) => setFormData({ ...formData, certification_body: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Issue Date</label>
              <input
                type="date"
                value={formData.issue_date || ''}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={formData.expiry_date || ''}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ComplianceCertification['status'] })}
                className="input-field"
              >
                <option value="compliant">Compliant</option>
                <option value="partially_compliant">Partially Compliant</option>
                <option value="non_compliant">Non-Compliant</option>
                <option value="pending_review">Pending Review</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Compliance %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.compliance_percentage || 0}
                onChange={(e) => setFormData({ ...formData, compliance_percentage: parseFloat(e.target.value) })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field h-20 resize-none"
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
