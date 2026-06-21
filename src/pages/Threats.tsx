import { useState, useEffect } from 'react';
import {
  Radar,
  AlertTriangle,
  Shield,
  Activity,
  Bell,
  TrendingUp,
  TrendingDown,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { Alert, SecurityIncident, Vendor } from '../types';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
  info: 'bg-slate-500',
};

const SEVERITY_BG: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
  info: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function Threats() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'alerts' | 'incidents'>('alerts');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [alertsRes, incidentsRes, vendorsRes] = await Promise.all([
        supabase.from('alerts').select('*, vendor:vendors(id, name)').order('created_at', { ascending: false }).limit(50),
        supabase.from('security_incidents').select('*, vendor:vendors(id, name)').order('incident_date', { ascending: false }),
        supabase.from('vendors').select('id, name'),
      ]);

      setAlerts((alertsRes.data as unknown as Alert[]) || []);
      setIncidents((incidentsRes.data as unknown as SecurityIncident[]) || []);
      setVendors((vendorsRes.data as unknown as Vendor[]) || []);
    } catch (error) {
      console.error('Error fetching threat data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await supabase
        .from('alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId);
      await fetchData();
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const generateAlerts = async () => {
    setGenerating(true);
    try {
      const response = await fetch('http://localhost:8000/api/v2/alerts/generate-risk-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error generating alerts:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleResolveIncident = async (incidentId: string) => {
    try {
      await supabase
        .from('security_incidents')
        .update({
          status: 'resolved',
          resolution_date: new Date().toISOString(),
        })
        .eq('id', incidentId);
      await fetchData();
    } catch (error) {
      console.error('Error resolving incident:', error);
    }
  };

  // Calculate statistics
  const stats = {
    totalAlerts: alerts.length,
    unreadAlerts: alerts.filter(a => !a.is_read).length,
    criticalAlerts: alerts.filter(a => a.severity === 'critical' && !a.is_resolved).length,
    totalIncidents: incidents.length,
    openIncidents: incidents.filter(i => i.status === 'open').length,
    breachIncidents: incidents.filter(i => i.data_breach).length,
  };

  // Threat trend data (simulated)
  const threatTrend = [
    { day: 'Mon', alerts: 12, incidents: 2 },
    { day: 'Tue', alerts: 8, incidents: 1 },
    { day: 'Wed', alerts: 15, incidents: 3 },
    { day: 'Thu', alerts: 10, incidents: 2 },
    { day: 'Fri', alerts: 18, incidents: 4 },
    { day: 'Sat', alerts: 5, incidents: 1 },
    { day: 'Sun', alerts: 7, incidents: 0 },
  ];

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.vendor?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = selectedSeverity === 'all' || alert.severity === selectedSeverity;
    return matchesSearch && matchesSeverity;
  });

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.incident_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.vendor?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = selectedSeverity === 'all' || incident.severity === selectedSeverity;
    return matchesSearch && matchesSeverity;
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
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Radar className="w-7 h-7 text-primary-500" />
            Threat & Monitoring Center
          </h1>
          <p className="text-slate-500 mt-1">
            Real-time threat monitoring and incident management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-lg ${stats.criticalAlerts > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            <span className="text-sm font-medium">
              {stats.criticalAlerts > 0 ? `${stats.criticalAlerts} Critical Alerts` : 'All Clear'}
            </span>
          </div>
          <button onClick={fetchData} className="btn-outline flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Refresh
          </button>
          <button onClick={generateAlerts} disabled={generating} className="btn-primary flex items-center gap-2">
            <Zap className="w-4 h-4" />
            {generating ? 'Generating...' : 'Generate Alerts'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="card p-4 col-span-1">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-red-600">{stats.criticalAlerts}</p>
              <p className="text-xs text-slate-500">Critical</p>
            </div>
          </div>
        </div>
        <div className="card p-4 col-span-1">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-800">{stats.unreadAlerts}</p>
              <p className="text-xs text-slate-500">Unread</p>
            </div>
          </div>
        </div>
        <div className="card p-4 col-span-1">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-600">{stats.openIncidents}</p>
              <p className="text-xs text-slate-500">Open Incidents</p>
            </div>
          </div>
        </div>
        <div className="card p-4 col-span-1">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-800">{stats.breachIncidents}</p>
              <p className="text-xs text-slate-500">Breaches</p>
            </div>
          </div>
        </div>
        <div className="card p-4 col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Threat Level</p>
              <div className="flex items-center gap-2 mt-1">
                {stats.criticalAlerts > 3 ? (
                  <TrendingUp className="w-5 h-5 text-red-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-green-500" />
                )}
                <span className={`text-lg font-bold ${stats.criticalAlerts > 3 ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.criticalAlerts > 3 ? 'ELEVATED' : 'NORMAL'}
                </span>
              </div>
            </div>
            <div className="w-16 h-16 rounded-full border-4 flex items-center justify-center">
              <div className={`w-8 h-8 rounded-full ${stats.criticalAlerts > 3 ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: stats.criticalAlerts > 3 ? '#ef4444' : '#22c55e' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Threat Trend Chart */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Threat Activity (7 Days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={threatTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Area type="monotone" dataKey="alerts" stackId="1" stroke="#f59e0b" fill="#fcd34d" name="Alerts" />
            <Area type="monotone" dataKey="incidents" stackId="1" stroke="#ef4444" fill="#fca5a5" name="Incidents" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Tabs and Filters */}
      <div className="card">
        <div className="border-b border-slate-200">
          <div className="flex items-center px-6 gap-6">
            <button
              onClick={() => setActiveTab('alerts')}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'alerts'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Alerts ({stats.totalAlerts})
            </button>
            <button
              onClick={() => setActiveTab('incidents')}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'incidents'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Incidents ({stats.totalIncidents})
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="input-field w-40"
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="divide-y divide-slate-100">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 hover:bg-slate-50 transition-colors ${!alert.is_read ? 'bg-blue-50/50' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-2 h-2 rounded-full mt-2 ${SEVERITY_COLORS[alert.severity]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-slate-800">{alert.title}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`badge text-[10px] ${SEVERITY_BG[alert.severity]}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{alert.message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        {alert.vendor && (
                          <span>{alert.vendor.name}</span>
                        )}
                        <span>{alert.source}</span>
                      </div>
                      {!alert.is_resolved && (
                        <button
                          onClick={() => handleResolveAlert(alert.id)}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredAlerts.length === 0 && (
              <div className="p-8 text-center text-slate-500">No alerts found</div>
            )}
          </div>
        )}

        {/* Incidents Tab */}
        {activeTab === 'incidents' && (
          <div className="divide-y divide-slate-100">
            {filteredIncidents.map((incident) => (
              <div key={incident.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    incident.data_breach ? 'bg-red-100' : 'bg-orange-100'
                  }`}>
                    <Shield className={`w-5 h-5 ${incident.data_breach ? 'text-red-600' : 'text-orange-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-slate-800">{incident.incident_type}</h4>
                      <div className="flex items-center gap-2">
                        {incident.data_breach && (
                          <span className="badge bg-red-100 text-red-700">Data Breach</span>
                        )}
                        <span className={`badge ${SEVERITY_BG[incident.severity]}`}>
                          {incident.severity.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{incident.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>{incident.vendor?.name}</span>
                        {incident.incident_date && (
                          <span>{format(new Date(incident.incident_date), 'MMM d, yyyy')}</span>
                        )}
                        {incident.records_affected > 0 && (
                          <span className="text-red-600">{incident.records_affected} records affected</span>
                        )}
                      </div>
                      {incident.status !== 'resolved' && (
                        <button
                          onClick={() => handleResolveIncident(incident.id)}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredIncidents.length === 0 && (
              <div className="p-8 text-center text-slate-500">No incidents found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
