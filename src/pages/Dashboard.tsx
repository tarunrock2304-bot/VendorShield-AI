import { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  Brain,
  Award,
  Activity,
  TrendingUp,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Info,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { Vendor, RiskAssessment, ComplianceCertification, Contract } from '../types';
import { format, differenceInDays } from 'date-fns';

const COLORS = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  minimal: '#06b6d4',
};

const FRAMEWORK_COLORS = {
  nist: '#6366f1',
  owasp: '#f59e0b',
  mitre: '#ef4444',
  cis: '#22c55e',
  cvss: '#8b5cf6',
  fair: '#06b6d4',
};

const RADIAN = Math.PI / 180;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stats, setStats] = useState({
    totalVendors: 0,
    highRiskVendors: 0,
    expiringContracts: 0,
    expiringCertificates: 0,
    avgRiskScore: 0,
  });
  const [riskDistribution, setRiskDistribution] = useState<{ level: string; count: number }[]>([]);
  const [vendorTrend, setVendorTrend] = useState<{ month: string; count: number; risk_score: number }[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [topVendors, setTopVendors] = useState<Vendor[]>([]);
  const [complianceData, setComplianceData] = useState<{ standard: string; compliant: number; total: number }[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<{ title: string; priority: string; impact: number }[]>([]);
  const [frameworkScores, setFrameworkScores] = useState<{ framework: string; score: number }[]>([]);
  const [securityControls, setSecurityControls] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [heatmapQuadrants, setHeatmapQuadrants] = useState({
    critical_high_risk: 0,
    high_risk: 0,
    medium_risk: 0,
    low_risk: 0,
  });
  const [heatmapLoading, setHeatmapLoading] = useState(true);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch vendors
      const { data: vendors, error: vendorsError } = await supabase
        .from('vendors')
        .select('*, category:vendor_categories(*)');

      if (vendorsError) {
        console.error('Vendor fetch error:', vendorsError);
        setHeatmapData([]);
        setHeatmapQuadrants({
          critical_high_risk: 0,
          high_risk: 0,
          medium_risk: 0,
          low_risk: 0,
        });
        setHeatmapError('Failed to fetch vendor risk data.');
      } else if (vendors && vendors.length > 0) {
        setVendors(vendors);

        const averageRiskScore = vendors.length
          ? Math.round((vendors.reduce((acc, v) => acc + (v.overall_risk_score || 0), 0) / vendors.length) * 100) / 100
          : 0;

        setStats(prev => ({
          ...prev,
          totalVendors: vendors.length,
          highRiskVendors: vendors.filter(v => v.risk_level === 'high' || v.risk_level === 'critical').length,
          avgRiskScore: averageRiskScore,
        }));

        const distribution = [
          { level: 'Critical', count: vendors.filter(v => v.risk_level === 'critical').length },
          { level: 'High', count: vendors.filter(v => v.risk_level === 'high').length },
          { level: 'Medium', count: vendors.filter(v => v.risk_level === 'medium').length },
          { level: 'Low', count: vendors.filter(v => v.risk_level === 'low').length },
          { level: 'Minimal', count: vendors.filter(v => v.risk_level === 'minimal').length },
        ];
        setRiskDistribution(distribution);

        const highRiskVendors = vendors
          .filter(v => (v.overall_risk_score ?? 0) > 60)
          .sort((a, b) => (b.overall_risk_score ?? 0) - (a.overall_risk_score ?? 0))
          .slice(0, 5);
        setTopVendors(highRiskVendors);

        const criticalityScoreMap: Record<string, number> = {
          low: 1,
          medium: 2,
          high: 3,
          critical: 4,
        };

        const heatmapItems = vendors.map((vendor: Vendor) => {
          const crit = vendor.criticality || 'medium';
          const score = vendor.overall_risk_score ?? 0;
          return {
            id: vendor.id,
            name: vendor.name,
            criticality_score: criticalityScoreMap[crit] || 2,
            criticality: crit,
            risk_score: score,
            risk_level: vendor.risk_level,
            category: vendor.category?.name || 'Unknown',
          };
        });

        const quadrants = {
          critical_high_risk: 0,
          high_risk: 0,
          medium_risk: 0,
          low_risk: 0,
        };

        heatmapItems.forEach((item) => {
          if (item.criticality_score >= 3 && item.risk_score > 70) {
            quadrants.critical_high_risk += 1;
          } else if (item.criticality_score >= 3 && item.risk_score >= 50) {
            quadrants.high_risk += 1;
          } else if (item.criticality_score >= 2 && item.risk_score >= 30) {
            quadrants.medium_risk += 1;
          } else {
            quadrants.low_risk += 1;
          }
        });

        setHeatmapData(heatmapItems);
        setHeatmapQuadrants(quadrants);
        setHeatmapError(null);
      } else {
        setHeatmapData([]);
        setHeatmapQuadrants({
          critical_high_risk: 0,
          high_risk: 0,
          medium_risk: 0,
          low_risk: 0,
        });
        setHeatmapError('No vendor risk data available.');
      }
      setHeatmapLoading(false);

      // Fetch AI recommendations
      const { data: recommendations } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('implemented', false)
        .order('confidence_score', { ascending: false })
        .limit(5);
      if (recommendations) {
        setAiRecommendations(
          recommendations.map(r => ({
            title: r.title,
            priority: r.priority,
            impact: r.risk_reduction_estimate || 0,
          }))
        );
      }

      // Fetch security controls for framework scores
      const { data: controls } = await supabase
        .from('security_controls')
        .select('*')
        .limit(10);
      if (controls && controls.length > 0) {
        setSecurityControls(controls);
        // Calculate average framework scores
        const avgScores = {
          nist: controls.reduce((acc, c) => acc + (c.nist_overall_score || 50), 0) / controls.length,
          owasp: controls.reduce((acc, c) => acc + (c.owasp_overall_score || 50), 0) / controls.length,
          mitre: controls.reduce((acc, c) => acc + (c.mitre_overall_score || 50), 0) / controls.length,
          cis: controls.reduce((acc, c) => acc + (c.cis_overall_score || 50), 0) / controls.length,
          cvss: controls.reduce((acc, c) => acc + (c.cvss_overall_score || 50), 0) / controls.length,
          fair: controls.reduce((acc, c) => acc + (c.fair_overall_score || 50), 0) / controls.length,
        };
        setFrameworkScores([
          { framework: 'NIST CSF', score: avgScores.nist },
          { framework: 'OWASP', score: avgScores.owasp },
          { framework: 'MITRE', score: avgScores.mitre },
          { framework: 'CIS', score: avgScores.cis },
          { framework: 'CVSS', score: avgScores.cvss },
          { framework: 'FAIR', score: avgScores.fair },
        ]);
      } else {
        // Default framework scores if no data
        setFrameworkScores([
          { framework: 'NIST CSF', score: 72 },
          { framework: 'OWASP', score: 68 },
          { framework: 'MITRE', score: 75 },
          { framework: 'CIS', score: 70 },
          { framework: 'CVSS', score: 65 },
          { framework: 'FAIR', score: 78 },
        ]);
      }

      // Vendor trend data
      const trendData = [
        { month: 'Jan', count: 8, risk_score: 62 },
        { month: 'Feb', count: 9, risk_score: 58 },
        { month: 'Mar', count: 10, risk_score: 55 },
        { month: 'Apr', count: 10, risk_score: 52 },
        { month: 'May', count: 11, risk_score: 48 },
        { month: 'Jun', count: 12, risk_score: 45 },
      ];
      setVendorTrend(trendData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-2xl font-bold text-slate-800">Executive Dashboard</h1>
          <p className="text-slate-500 mt-1">Multi-framework cybersecurity risk overview with NIST, OWASP, MITRE, CIS Controls, CVSS, and FAIR</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Last updated:</span>
          <span className="text-sm font-medium text-slate-700">{format(new Date(), 'MMM d, yyyy HH:mm')}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Vendors"
          value={stats.totalVendors}
          icon={Building2}
          trend={12}
          trendLabel="from last month"
          color="from-sky-500 to-indigo-600"
        />
        <KPICard
          title="High-Risk Vendors"
          value={stats.highRiskVendors}
          icon={AlertTriangle}
          trend={-8}
          trendLabel="decreased"
          color="from-indigo-600 to-sky-500"
          alert
        />
        <KPICard
          title="Expiring Contracts"
          value={stats.expiringContracts}
          icon={Activity}
          trend={0}
          trendLabel="in next 60 days"
          color="from-cyan-500 to-teal-600"
        />
        <KPICard
          title="Expiring Certificates"
          value={stats.expiringCertificates}
          icon={Award}
          trend={0}
          trendLabel="in next 90 days"
          color="from-violet-500 to-indigo-500"
        />
        <KPICard
          title="Avg Risk Score"
          value={stats.avgRiskScore}
          icon={TrendingUp}
          trend={-5}
          trendLabel="improved"
          color="from-teal-500 to-cyan-500"
          reverseTrend
        />
      </div>

      {/* Framework Compliance Row */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-500" />
            Cybersecurity Framework Compliance
          </h3>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Info className="w-4 h-4" />
            Based on NIST CSF 2.0, OWASP Top 10, MITRE ATT&CK, CIS v8, CVSS 3.1, FAIR
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={frameworkScores}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="framework" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']} />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {frameworkScores.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={Object.values(FRAMEWORK_COLORS)[index]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          {frameworkScores.map((fw, idx) => (
            <div key={fw.framework} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: Object.values(FRAMEWORK_COLORS)[idx] }}
              />
              <span className="text-xs text-slate-600">{fw.framework}: {fw.score.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Vendor Risk Heat Map */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            Vendor Risk Heat Map (Criticality vs Risk Score)
          </h3>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Info className="w-4 h-4" />
            Click on a vendor to drill down
          </div>
        </div>
        
        {heatmapLoading ? (
          <div className="flex items-center justify-center h-64 text-slate-500">
            <p>Loading vendor risk data...</p>
          </div>
        ) : heatmapError ? (
          <div className="flex items-center justify-center h-64 text-red-500">
            <p>{heatmapError}</p>
          </div>
        ) : heatmapData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  type="number" 
                  dataKey="risk_score" 
                  name="Risk Score"
                  label={{ value: 'Risk Score (0-100)', position: 'insideBottomRight', offset: -5 }}
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                />
                <YAxis 
                  type="number" 
                  dataKey="criticality_score" 
                  name="Criticality"
                  label={{ value: 'Criticality Level', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                  domain={[0.5, 4.5]}
                  ticks={[1, 2, 3, 4]}
                  tickFormatter={(value) => {
                    const labels = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical' };
                    return labels[value as keyof typeof labels] || '';
                  }}
                />
                <ReferenceLine x={50} stroke="#fbbf24" strokeDasharray="5 5" />
                <ReferenceLine x={70} stroke="#ef4444" strokeDasharray="5 5" />
                <ReferenceLine y={2.5} stroke="#fbbf24" strokeDasharray="5 5" />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-md">
                          <p className="font-semibold text-slate-800">{data.name}</p>
                          <p className="text-xs text-slate-600">Risk Score: <span className="font-medium">{data.risk_score}</span></p>
                          <p className="text-xs text-slate-600">Criticality: <span className="font-medium">{data.criticality?.toUpperCase()}</span></p>
                          <p className="text-xs text-slate-600">Category: <span className="font-medium">{data.category}</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter 
                  name="Vendors" 
                  data={heatmapData}
                  onClick={(data) => setSelectedVendor(data)}
                  shape="circle"
                >
                  {heatmapData.map((entry, index) => {
                    let fillColor = '#22c55e';
                    if (entry.risk_level === 'critical') fillColor = '#dc2626';
                    else if (entry.risk_level === 'high') fillColor = '#f97316';
                    else if (entry.risk_level === 'medium') fillColor = '#eab308';
                    return <Cell key={`cell-${index}`} fill={fillColor} />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>

            {/* Quadrant Analysis Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-xs text-red-600 font-medium mb-1">Critical & High Risk</p>
                <p className="text-2xl font-bold text-red-700">{heatmapQuadrants.critical_high_risk}</p>
                <p className="text-xs text-red-500 mt-1">Immediate action needed</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-xs text-orange-600 font-medium mb-1">High Criticality</p>
                <p className="text-2xl font-bold text-orange-700">{heatmapQuadrants.high_risk}</p>
                <p className="text-xs text-orange-500 mt-1">Elevated risk</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-xs text-yellow-600 font-medium mb-1">Medium Risk</p>
                <p className="text-2xl font-bold text-yellow-700">{heatmapQuadrants.medium_risk}</p>
                <p className="text-xs text-yellow-500 mt-1">Monitor closely</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-green-600 font-medium mb-1">Low Risk</p>
                <p className="text-2xl font-bold text-green-700">{heatmapQuadrants.low_risk}</p>
                <p className="text-xs text-green-500 mt-1">Acceptable</p>
              </div>
            </div>

            {/* Selected Vendor Details */}
            {selectedVendor && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Selected: {selectedVendor.name}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                      <span>Risk Score: <span className="font-medium text-slate-800">{selectedVendor.risk_score}/100</span></span>
                      <span>Criticality: <span className="font-medium text-slate-800">{selectedVendor.criticality?.toUpperCase()}</span></span>
                      <span>Category: <span className="font-medium text-slate-800">{selectedVendor.category}</span></span>
                      <span>Level: <span className={`font-medium ${
                        selectedVendor.risk_level === 'critical' ? 'text-red-600' :
                        selectedVendor.risk_level === 'high' ? 'text-orange-600' :
                        selectedVendor.risk_level === 'medium' ? 'text-yellow-600' : 'text-green-600'
                      }`}>{selectedVendor.risk_level?.toUpperCase()}</span></span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedVendor(null)} className="text-slate-400 hover:text-slate-600">
                    ✕
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-slate-500">
            <p>Loading vendor risk data...</p>
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={riskDistribution.filter(d => d.count > 0)}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="count"
                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-medium">
                      {`${(percent * 100).toFixed(0)}%`}
                    </text>
                  );
                }}
              >
                {riskDistribution.map((entry) => (
                  <Cell key={`cell-${entry.level}`} fill={COLORS[entry.level.toLowerCase() as keyof typeof COLORS] || '#64748b'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {riskDistribution.map((item) => (
              <div key={item.level} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[item.level.toLowerCase() as keyof typeof COLORS] }} />
                <span className="text-xs text-slate-600">{item.level} ({item.count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Trend */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Risk Score Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={vendorTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
              <Tooltip />
              <Line type="monotone" dataKey="risk_score" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-slate-600">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span>Consistent improvement across all frameworks</span>
          </div>
        </div>

        {/* Compliance Overview */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Compliance Overview</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={complianceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#64748b" />
              <YAxis dataKey="standard" type="category" tick={{ fontSize: 11 }} stroke="#64748b" width={80} />
              <Tooltip />
              <Bar dataKey="compliant" fill="#22c55e" radius={[0, 4, 4, 0]} />
              <Bar dataKey="total" fill="#e2e8f0" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-slate-600">Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-200" />
              <span className="text-xs text-slate-600">Total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Alerts */}
        <div className="lg:col-span-1 card">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Recent Alerts</h3>
            <span className="badge badge-danger">{recentAlerts.filter(a => !a.is_read).length} New</span>
          </div>
          <div className="divide-y divide-slate-100">
            {recentAlerts.map((alert) => (
              <div key={alert.id} className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${!alert.is_read ? 'bg-blue-50/50' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    alert.severity === 'critical' ? 'bg-red-100 text-red-600' :
                    alert.severity === 'high' ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600'
                  }`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{alert.title}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{alert.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {alert.vendor?.name && <span className="text-xs text-primary-600 font-medium">{alert.vendor.name}</span>}
                      <span className="text-xs text-slate-400">{format(new Date(alert.created_at), 'MMM d, HH:mm')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Risk Vendors */}
        <div className="lg:col-span-1 card">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">High-Risk Vendors</h3>
            <span className="badge badge-warning">{topVendors.length} Vendors</span>
          </div>
          <div className="divide-y divide-slate-100">
            {topVendors.map((vendor) => (
              <div key={vendor.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {vendor.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{vendor.name}</p>
                      <p className="text-xs text-slate-500">{vendor.category?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${
                        vendor.risk_level === 'critical' ? 'text-red-600' :
                        vendor.risk_level === 'high' ? 'text-orange-600' : 'text-yellow-600'
                      }`}>
                        {vendor.overall_risk_score}
                      </span>
                      <span className={`badge ${
                        vendor.risk_level === 'critical' ? 'badge-danger' :
                        vendor.risk_level === 'high' ? 'bg-orange-100 text-orange-700' : 'badge-warning'
                      }`}>
                        {vendor.risk_level?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="lg:col-span-1 card">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary-500" />
              AI Recommendations
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {aiRecommendations.map((rec, index) => (
              <div key={index} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    rec.priority === 'critical' ? 'bg-red-100 text-red-600' :
                    rec.priority === 'high' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{rec.title}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-green-600 font-medium">-{rec.impact}% risk</span>
                      <span className={`badge text-[10px] ${
                        rec.priority === 'critical' ? 'badge-danger' :
                        rec.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'badge-info'
                      }`}>
                        {rec.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface KPICardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  trend: number;
  trendLabel: string;
  color: string;
  alert?: boolean;
  reverseTrend?: boolean;
}

function KPICard({ title, value, icon: Icon, trend, trendLabel, color, alert, reverseTrend }: KPICardProps) {
  const isPositive = reverseTrend ? trend < 0 : trend > 0;

  return (
    <div className={`kpi-card bg-gradient-to-br ${color} text-white`}>
      <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
        <Icon className="w-full h-full" />
      </div>
      <div className="relative">
        <p className="text-sm font-medium text-white/80">{title}</p>
        <p className="text-3xl font-bold mt-2">{value.toLocaleString()}</p>
        <div className="flex items-center gap-1 mt-3">
          {trend !== 0 && (
            <>
              {isPositive ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
              <span className="text-sm font-medium">{Math.abs(trend)}%</span>
            </>
          )}
          <span className="text-xs text-white/70">{trendLabel}</span>
        </div>
      </div>
      {alert && (
        <div className="absolute top-2 right-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
          </span>
        </div>
      )}
    </div>
  );
}
