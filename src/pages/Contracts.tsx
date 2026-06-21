import { useState, useEffect } from 'react';
import {
  FileText,
  AlertTriangle,
  Calendar,
  Search,
  Plus,
  Download,
  Edit,
  X,
  ChevronRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  DollarSign,
  Building2,
  RefreshCw,
  Eye,
  Activity,
  Zap,
  AlertCircle,
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
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { Contract, Vendor } from '../types';
import { format, differenceInDays } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  expired: 'bg-slate-100 text-slate-700',
  pending_renewal: 'bg-yellow-100 text-yellow-700',
  terminated: 'bg-red-100 text-red-700',
};

const RISK_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

export default function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editContract, setEditContract] = useState<Contract | null>(null);
  const [saving, setSaving] = useState(false);
  const [healthDashboard, setHealthDashboard] = useState<any>(null);
  const [healthTrend, setHealthTrend] = useState<any[]>([]);
  const [escalationRules, setEscalationRules] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contractsRes, vendorsRes] = await Promise.all([
        supabase
          .from('contracts')
          .select('*, vendor:vendors(id, name, industry)')
          .order('end_date', { ascending: true }),
        supabase.from('vendors').select('id, name, industry').order('name'),
      ]);

      setContracts((contractsRes.data as unknown as Contract[]) || []);
      setVendors((vendorsRes.data as unknown as Vendor[]) || []);
      
      // Fetch health dashboard
      try {
        const healthRes = await fetch('http://localhost:8000/api/v2/contracts/health-dashboard');
        const healthData = await healthRes.json();
        setHealthDashboard(healthData.summary);
        
        const trendRes = await fetch('http://localhost:8000/api/v2/contracts/trend/health-history?days=90');
        const trendData = await trendRes.json();
        setHealthTrend(trendData.trend || []);
      } catch (error) {
        console.error('Error fetching health data:', error);
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (contract?: Contract) => {
    setEditContract(contract || null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditContract(null);
  };

  const handleSave = async (formData: Partial<Contract>) => {
    setSaving(true);
    try {
      const riskScore = 50 + Math.round(Math.random() * 30);
      const riskLevel = riskScore > 70 ? 'high' : riskScore > 45 ? 'medium' : 'low';

      if (editContract) {
        await supabase
          .from('contracts')
          .update({
            ...formData,
            risk_score: riskScore,
            risk_level: riskLevel,
            updated_at: new Date().toISOString()
          })
          .eq('id', editContract.id);
      } else {
        await supabase.from('contracts').insert([{
          ...formData,
          risk_score: riskScore,
          risk_level: riskLevel,
        }]);
      }
      await fetchData();
      closeModal();
    } catch (error) {
      console.error('Error saving contract:', error);
    } finally {
      setSaving(false);
    }
  };

  const filteredContracts = contracts.filter((contract) => {
    const vendor = vendors.find(v => v.id === contract.vendor_id);
    const matchesSearch =
      contract.contract_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.contract_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || contract.status === selectedStatus;
    const matchesRisk = selectedRisk === 'all' || contract.risk_level === selectedRisk;
    return matchesSearch && matchesStatus && matchesRisk;
  });

  // Calculate statistics
  const stats = {
    totalContracts: contracts.length,
    active: contracts.filter(c => c.status === 'active').length,
    expiring60Days: contracts.filter(c => {
      if (!c.end_date) return false;
      const days = differenceInDays(new Date(c.end_date), new Date());
      return days <= 60 && days > 0 && c.status === 'active';
    }).length,
    totalValue: contracts.reduce((acc, c) => acc + (c.value || 0), 0),
    highRisk: contracts.filter(c => c.risk_level === 'high' || c.risk_level === 'critical').length,
  };

  // Risk distribution
  const riskDistribution = [
    { name: 'High', value: contracts.filter(c => c.risk_level === 'high').length, color: '#f97316' },
    { name: 'Medium', value: contracts.filter(c => c.risk_level === 'medium').length, color: '#eab308' },
    { name: 'Low', value: contracts.filter(c => c.risk_level === 'low').length, color: '#22c55e' },
  ].filter(d => d.value > 0);

  // Value by vendor
  const valueByVendor = contracts
    .filter(c => c.vendor)
    .reduce((acc: { name: string; value: number }[], c) => {
      const vendorName = (c.vendor as Vendor)?.name || 'Unknown';
      const existing = acc.find(a => a.name === vendorName);
      if (existing) {
        existing.value += c.value || 0;
      } else {
        acc.push({ name: vendorName, value: c.value || 0 });
      }
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

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
            <FileText className="w-7 h-7 text-primary-500" />
            Contract Risk Analyzer
          </h1>
          <p className="text-slate-500 mt-1">
            Monitor contracts, analyze risks, and track renewals
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-outline flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Contract
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.totalContracts}</p>
              <p className="text-xs text-slate-500">Total Contracts</p>
            </div>
          </div>
        </div>
        <div className="card p-4 border-green-200 bg-green-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{stats.active}</p>
              <p className="text-xs text-green-600">Active</p>
            </div>
          </div>
        </div>
        <div className="card p-4 border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-700">{stats.expiring60Days}</p>
              <p className="text-xs text-yellow-600">Expiring 60 Days</p>
            </div>
          </div>
        </div>
        <div className="card p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{stats.highRisk}</p>
              <p className="text-xs text-red-600">High Risk</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">${(stats.totalValue / 1000000).toFixed(1)}M</p>
              <p className="text-xs text-slate-500">Total Value</p>
            </div>
          </div>
        </div>
      </div>

      {/* SLA Health Monitoring - Phase 4 */}
      {healthDashboard && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary-500" />
            Contract Health & SLA Monitoring
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="card p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700">{healthDashboard.healthy}</p>
                  <p className="text-xs text-green-600">Healthy</p>
                </div>
              </div>
            </div>
            
            <div className="card p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-700">{healthDashboard.at_risk}</p>
                  <p className="text-xs text-yellow-600">At Risk</p>
                </div>
              </div>
            </div>
            
            <div className="card p-4 bg-gradient-to-br from-red-50 to-rose-50 border border-red-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-700">{healthDashboard.critical}</p>
                  <p className="text-xs text-red-600">Critical</p>
                </div>
              </div>
            </div>
            
            <div className="card p-4 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-700">{healthDashboard.total_violations}</p>
                  <p className="text-xs text-slate-600">SLA Violations</p>
                </div>
              </div>
            </div>
            
            <div className="card p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-700">{healthDashboard.expiring_soon}</p>
                  <p className="text-xs text-blue-600">Expiring 60d</p>
                </div>
              </div>
            </div>
            
            <div className="card p-4 bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-700">{healthDashboard.avg_health_score?.toFixed(1)}/100</p>
                  <p className="text-xs text-purple-600">Avg Health</p>
                </div>
              </div>
            </div>
          </div>

          {/* Health Trend Chart */}
          {healthTrend.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Contract Health Trend (90 Days)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={healthTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="avg_health_score" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    name="Avg Health Score"
                    dot={{ fill: '#22c55e', r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="healthy_contracts" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Healthy Contracts"
                    dot={{ fill: '#3b82f6', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Contract Value by Vendor</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={valueByVendor} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Risk Distribution</h3>
          {riskDistribution.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {riskDistribution.map((item) => (
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
              placeholder="Search contracts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input-field w-44"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="pending_renewal">Pending Renewal</option>
          </select>
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="input-field w-40"
          >
            <option value="all">All Risk Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Contract</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Vendor</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Value</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Risk Level</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Health</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">SLA Violations</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">End Date</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContracts.map((contract) => {
                const vendor = vendors.find(v => v.id === contract.vendor_id);
                const daysUntilExpiry = contract.end_date ? differenceInDays(new Date(contract.end_date), new Date()) : null;

                return (
                  <tr key={contract.id} className="table-row">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{contract.contract_name}</p>
                        <p className="text-xs text-slate-400">{contract.contract_number || 'No number'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                          {vendor?.name?.charAt(0) || 'V'}
                        </div>
                        <span className="text-sm text-slate-700">{vendor?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-700">
                        {contract.value ? `$${contract.value.toLocaleString()}` : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${STATUS_COLORS[contract.status]}`}>
                        {contract.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`badge ${
                          contract.risk_level === 'high' ? 'bg-orange-100 text-orange-700' :
                          contract.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {contract.risk_level?.toUpperCase() || 'N/A'}
                        </span>
                        <span className="text-sm text-slate-600">{contract.risk_score || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold text-white"
                          style={{
                            backgroundColor: (contract.contract_health_score || 100) >= 80 ? '#22c55e' :
                                          (contract.contract_health_score || 100) >= 50 ? '#f59e0b' : '#ef4444'
                          }}>
                          {Math.round(contract.contract_health_score || 100)}
                        </div>
                        <span className="text-sm text-slate-600">
                          {(contract.contract_health_score || 100) >= 80 ? 'Healthy' :
                           (contract.contract_health_score || 100) >= 50 ? 'At Risk' : 'Critical'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {(contract.sla_violations || 0) > 0 ? (
                          <>
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold text-white ${
                              (contract.sla_violations || 0) > 2 ? 'bg-red-500' : 'bg-yellow-500'
                            }`}>
                              {contract.sla_violations}
                            </span>
                            <span className="text-sm text-slate-600">violations</span>
                          </>
                        ) : (
                          <span className="text-sm text-green-600 font-medium">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-slate-700">
                          {contract.end_date ? format(new Date(contract.end_date), 'MMM d, yyyy') : 'N/A'}
                        </p>
                        {daysUntilExpiry !== null && daysUntilExpiry <= 60 && daysUntilExpiry >= 0 && (
                          <p className="text-xs text-orange-600 font-medium">
                            {daysUntilExpiry} days left
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openModal(contract)}
                          className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
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
        {filteredContracts.length === 0 && (
          <div className="p-8 text-center text-slate-500">No contracts found</div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <ContractModal
          contract={editContract}
          vendors={vendors}
          onClose={closeModal}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}

function ContractModal({ contract, vendors, onClose, onSave, saving }: {
  contract: Contract | null;
  vendors: Vendor[];
  onClose: () => void;
  onSave: (data: Partial<Contract>) => Promise<void>;
  saving: boolean;
}) {
  const [formData, setFormData] = useState<Partial<Contract>>({
    vendor_id: contract?.vendor_id || '',
    contract_name: contract?.contract_name || '',
    contract_number: contract?.contract_number || '',
    contract_type: contract?.contract_type || '',
    start_date: contract?.start_date || '',
    end_date: contract?.end_date || '',
    value: contract?.value || 0,
    currency: contract?.currency || 'USD',
    status: contract?.status || 'active',
    auto_renewal: contract?.auto_renewal || false,
    renewal_notice_days: contract?.renewal_notice_days || 90,
    termination_notice_days: contract?.termination_notice_days || 30,
    data_processing_terms: contract?.data_processing_terms || false,
    notes: contract?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-slate-800">
            {contract ? 'Edit Contract' : 'Add Contract'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vendor * </label>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Contract Name * </label>
              <input
                type="text"
                value={formData.contract_name}
                onChange={(e) => setFormData({ ...formData, contract_name: e.target.value })}
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contract Number</label>
              <input
                type="text"
                value={formData.contract_number || ''}
                onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contract Type</label>
              <input
                type="text"
                value={formData.contract_type || ''}
                onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                className="input-field"
                placeholder="MSA, SOW, NDA..."
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Value ($)</label>
              <input
                type="number"
                value={formData.value || ''}
                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Contract['status'] })}
                className="input-field"
              >
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="pending_renewal">Pending Renewal</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="input-field"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Renewal Notice (days)</label>
              <input
                type="number"
                value={formData.renewal_notice_days || ''}
                onChange={(e) => setFormData({ ...formData, renewal_notice_days: parseInt(e.target.value) })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Termination Notice (days)</label>
              <input
                type="number"
                value={formData.termination_notice_days || ''}
                onChange={(e) => setFormData({ ...formData, termination_notice_days: parseInt(e.target.value) })}
                className="input-field"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.auto_renewal}
                onChange={(e) => setFormData({ ...formData, auto_renewal: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-700">Auto-renewal</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.data_processing_terms}
                onChange={(e) => setFormData({ ...formData, data_processing_terms: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-700">Data Processing Terms</span>
            </label>
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
