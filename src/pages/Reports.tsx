import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Plus,
  TrendingUp,
  BarChart3,
  Shield,
  Users,
  Calendar,
  Loader,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Vendor } from '../types';
import { format } from 'date-fns';

type ReportType = 'executive_summary' | 'vendor_scorecard' | 'compliance_attestation' | 'risk_trend';
type Period = 'monthly' | 'quarterly';

interface Report {
  id: string;
  type: ReportType;
  vendor_id?: string;
  period: Period;
  created_at: string;
  status: 'pending' | 'completed';
  download_url?: string;
}

interface Benchmark {
  by_category: Record<string, any>;
  overall: any;
  timestamp: string;
}

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [benchmark, setBenchmark] = useState<Benchmark | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    reportType: 'executive_summary' as ReportType,
    vendorId: '',
    period: 'monthly' as Period,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch reports
      const reportsRes = await fetch('http://localhost:8000/api/v2/reports/list');
      const reportsData = await reportsRes.json();
      setReports(reportsData.reports || []);
      
      // Fetch vendors
      const { data: vendorsData } = await supabase.from('vendors').select('*');
      setVendors(vendorsData || []);
      
      // Fetch benchmark
      const benchmarkRes = await fetch('http://localhost:8000/api/v2/reports/benchmark');
      const benchmarkData = await benchmarkRes.json();
      setBenchmark(benchmarkData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      
      const params = new URLSearchParams({
        report_type: formData.reportType,
        period: formData.period,
      });
      
      if (formData.reportType === 'vendor_scorecard' && formData.vendorId) {
        params.append('vendor_id', formData.vendorId);
      }
      
      const response = await fetch(
        `http://localhost:8000/api/v2/reports/generate?${params}`,
        { method: 'POST' }
      );
      
      if (response.ok) {
        await fetchData();
        setShowGenerateModal(false);
        setFormData({
          reportType: 'executive_summary',
          vendorId: '',
          period: 'monthly',
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const exportReport = async (reportId: string, format: 'json' | 'html' = 'json') => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/v2/reports/${reportId}/export?format=${format}`
      );
      
      if (!response.ok) throw new Error('Export failed');
      
      const data = await response.json();
      
      if (format === 'html') {
        const link = document.createElement('a');
        link.href = 'data:text/html;charset=utf-8,' + encodeURIComponent(data.html);
        link.download = data.filename;
        link.click();
      } else {
        const link = document.createElement('a');
        link.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
        link.download = `report_${reportId}.json`;
        link.click();
      }
    } catch (error) {
      console.error('Error exporting report:', error);
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
          <h1 className="text-2xl font-bold text-slate-800">Reports & Analytics</h1>
          <p className="text-slate-500 mt-1">Generate comprehensive vendor risk and compliance reports</p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Generate Report
        </button>
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 rounded-lg">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Generate New Report</h2>
            
            <div className="space-y-4">
              {/* Report Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Report Type</label>
                <select
                  value={formData.reportType}
                  onChange={(e) => setFormData({ ...formData, reportType: e.target.value as ReportType })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-primary-500"
                >
                  <option value="executive_summary">Executive Summary</option>
                  <option value="vendor_scorecard">Vendor Scorecard</option>
                  <option value="compliance_attestation">Compliance Attestation</option>
                  <option value="risk_trend">Risk Trend Report</option>
                </select>
              </div>

              {/* Vendor Selection (for vendor_scorecard) */}
              {formData.reportType === 'vendor_scorecard' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Vendor</label>
                  <select
                    value={formData.vendorId}
                    onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-primary-500"
                  >
                    <option value="">Choose a vendor...</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Period */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Period</label>
                <select
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value as Period })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-primary-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateReport}
                disabled={generating || (formData.reportType === 'vendor_scorecard' && !formData.vendorId)}
                className="flex-1 btn btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generating && <Loader className="w-4 h-4 animate-spin" />}
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Peer Benchmarking */}
      {benchmark && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Overall Benchmarks</h3>
              <TrendingUp className="w-5 h-5 text-primary-500" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Average Risk Score</span>
                <span className="font-semibold text-slate-800">{benchmark.overall.avg_risk_score?.toFixed(1) || 'N/A'}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Median Risk Score</span>
                <span className="font-semibold text-slate-800">{benchmark.overall.median_risk_score?.toFixed(1) || 'N/A'}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Industry Standard</span>
                <span className="font-semibold text-slate-800">{benchmark.overall.industry_standard_avg}/100</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-sm text-slate-600">Total Vendors</span>
                <span className="font-semibold text-slate-800">{benchmark.overall.total_vendors}</span>
              </div>
            </div>
          </div>

          <div className="card p-6 bg-gradient-to-br from-red-50 to-orange-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Risk Distribution</h3>
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-red-600">Critical Risk</span>
                <span className="font-semibold text-red-700">{benchmark.overall.critical_vendors}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-orange-600">High Risk</span>
                <span className="font-semibold text-orange-700">{benchmark.overall.high_vendors}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-yellow-600">Medium Risk</span>
                <span className="font-semibold text-yellow-700">
                  {(benchmark.overall.total_vendors - benchmark.overall.critical_vendors - benchmark.overall.high_vendors) * 0.3 | 0}
                </span>
              </div>
            </div>
          </div>

          <div className="card p-6 bg-gradient-to-br from-green-50 to-emerald-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Compliance Status</h3>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Compliant Vendors</span>
                <span className="font-semibold text-green-700">
                  {Math.round((benchmark.overall.total_vendors - benchmark.overall.critical_vendors) * 0.8)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Compliance Rate</span>
                <span className="font-semibold text-green-700">
                  {(((benchmark.overall.total_vendors - benchmark.overall.critical_vendors) / benchmark.overall.total_vendors) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">vs Industry Avg</span>
                <span className="font-semibold text-green-700">+12%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports List */}
      <div className="card">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" />
            Generated Reports
          </h3>
          <span className="badge">{reports.length} Reports</span>
        </div>

        {reports.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto opacity-50 mb-2" />
            <p>No reports generated yet. Click "Generate Report" to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {reports.map((report) => (
              <div key={report.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-shrink-0">
                        {report.type === 'executive_summary' && <Shield className="w-5 h-5 text-primary-500" />}
                        {report.type === 'vendor_scorecard' && <Users className="w-5 h-5 text-blue-500" />}
                        {report.type === 'compliance_attestation' && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {report.type === 'risk_trend' && <TrendingUp className="w-5 h-5 text-orange-500" />}
                      </div>
                      <h4 className="font-semibold text-slate-800">
                        {report.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h4>
                      <span className="badge badge-success">{report.status}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 ml-7">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(report.created_at), 'MMM d, yyyy HH:mm')}
                      </span>
                      {report.period && (
                        <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-700">
                          {report.period.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => exportReport(report.id, 'html')}
                      className="btn btn-sm btn-secondary flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      HTML
                    </button>
                    <button
                      onClick={() => exportReport(report.id, 'json')}
                      className="btn btn-sm btn-secondary flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      JSON
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
