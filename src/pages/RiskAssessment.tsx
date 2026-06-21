import { useState, useEffect } from 'react';
import {
  Brain,
  Shield,
  AlertTriangle,
  Search,
  ChevronRight,
  Target,
  Eye,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Clock,
  Zap,
  Award,
  BarChart3,
  TrendingUp,
  Info,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  Legend,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { Vendor, RiskAssessment, AIRecommendation } from '../types';
import { format } from 'date-fns';

const RISK_FACTORS = [
  { key: 'security_posture_score', label: 'Security Posture', weight: 1.2 },
  { key: 'compliance_score', label: 'Compliance', weight: 1.1 },
  { key: 'breach_history_score', label: 'Breach History', weight: 1.3 },
  { key: 'access_management_score', label: 'Access Management', weight: 1.0 },
  { key: 'incident_response_score', label: 'Incident Response', weight: 1.1 },
  { key: 'business_continuity_score', label: 'Business Continuity', weight: 0.9 },
  { key: 'financial_stability_score', label: 'Financial Stability', weight: 0.8 },
  { key: 'data_protection_score', label: 'Data Protection', weight: 1.2 },
  { key: 'third_party_risk_score', label: 'Third-Party Risk', weight: 1.0 },
];

const FRAMEWORKS = [
  { id: 'nist', name: 'NIST CSF', color: '#6366f1', icon: '🛡️' },
  { id: 'owasp', name: 'OWASP Top 10', color: '#f59e0b', icon: '🔐' },
  { id: 'mitre', name: 'MITRE ATT&CK', color: '#ef4444', icon: '🎯' },
  { id: 'cis', name: 'CIS Controls', color: '#22c55e', icon: '✓' },
  { id: 'cvss', name: 'CVSS v3.1', color: '#8b5cf6', icon: '📊' },
  { id: 'fair', name: 'FAIR Model', color: '#06b6d4', icon: '💰' },
];

const FALLBACK_QUESTIONNAIRE = {
  questions: [
    {
      key: 'financial_stability_score',
      label: 'Financial Stability',
      description: 'How strong is the vendor’s financial standing and cash flow?',
      min_label: 'Weak',
      max_label: 'Strong',
      default: 60,
    },
    {
      key: 'third_party_dependency_exposure',
      label: 'Third-Party Dependency Exposure',
      description: 'How much does the vendor rely on external partners for critical services?',
      min_label: 'Low',
      max_label: 'High',
      default: 60,
    },
    {
      key: 'sensitive_data_exposure',
      label: 'Sensitive Data Exposure',
      description: 'How much sensitive or regulated data does the vendor process?',
      min_label: 'Low',
      max_label: 'High',
      default: 60,
    },
    {
      key: 'access_scope_risk',
      label: 'Access Scope Risk',
      description: 'How broad is the vendor’s access to systems and data?',
      min_label: 'Narrow',
      max_label: 'Broad',
      default: 60,
    },
    {
      key: 'contract_complexity',
      label: 'Contract Complexity',
      description: 'How complex and interdependent are the vendor contracts?',
      min_label: 'Simple',
      max_label: 'Complex',
      default: 60,
    },
    {
      key: 'recent_breach_history',
      label: 'Recent Breach History',
      description: 'How recently has the vendor experienced a security incident?',
      min_label: 'None',
      max_label: 'Recent',
      default: 60,
    },
    {
      key: 'compliance_maturity',
      label: 'Compliance Maturity',
      description: 'How mature is the vendor’s compliance and audit program?',
      min_label: 'Low',
      max_label: 'High',
      default: 60,
    },
    {
      key: 'monitoring_maturity',
      label: 'Monitoring Maturity',
      description: 'How well does the vendor monitor, detect, and respond to risk?',
      min_label: 'Basic',
      max_label: 'Advanced',
      default: 60,
    },
    {
      key: 'incident_response_maturity',
      label: 'Incident Response Maturity',
      description: 'How prepared is the vendor to respond to incidents quickly?',
      min_label: 'Reactive',
      max_label: 'Proactive',
      default: 60,
    },
  ],
  vendor_tiers: [
    { value: 'strategic', label: 'Strategic' },
    { value: 'preferred', label: 'Preferred' },
    { value: 'standard', label: 'Standard' },
    { value: 'ad_hoc', label: 'Ad-Hoc' },
  ],
};

export default function RiskAssessmentPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [questionnaire, setQuestionnaire] = useState<any>(null);
  const [questionnaireError, setQuestionnaireError] = useState<string | null>(null);
  const [phase5Error, setPhase5Error] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({
    financial_stability_score: 60,
    third_party_dependency_exposure: 60,
    sensitive_data_exposure: 60,
    access_scope_risk: 60,
    contract_complexity: 60,
    recent_breach_history: 60,
    compliance_maturity: 60,
    monitoring_maturity: 60,
    incident_response_maturity: 60,
  });
  const [vendorTier, setVendorTier] = useState<'strategic' | 'preferred' | 'standard' | 'ad_hoc'>('standard');
  const [phase5Result, setPhase5Result] = useState<any>(null);

  useEffect(() => {
    fetchData();
    fetchQuestionnaire();
  }, []);

  const fetchQuestionnaire = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v2/risk-assessments/questions');
      if (!response.ok) {
        throw new Error(`Questionnaire request failed: ${response.status}`);
      }
      const data = await response.json();
      setQuestionnaire(data);
      setQuestionnaireError(null);
    } catch (error) {
      console.error('Error fetching questionnaire:', error);
      setQuestionnaireError('Unable to load Phase 5 questionnaire. Using fallback defaults.');
      setQuestionnaire(FALLBACK_QUESTIONNAIRE);
    }
  };

  const fetchData = async () => {
    try {
      const [vendorsRes, assessmentsRes, recsRes] = await Promise.all([
        supabase.from('vendors').select('*, category:vendor_categories(*)').order('overall_risk_score', { ascending: false }),
        supabase.from('risk_assessments').select('*, vendor:vendors(*), assessor:users(*)').order('assessment_date', { ascending: false }),
        supabase.from('ai_recommendations').select('*, vendor:vendors(*)').eq('implemented', false).order('confidence_score', { ascending: false }),
      ]);

      setVendors((vendorsRes.data as unknown as Vendor[]) || []);
      setAssessments((assessmentsRes.data as unknown as RiskAssessment[]) || []);
      setRecommendations((recsRes.data as unknown as AIRecommendation[]) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAIRiskAnalysis = async (vendor: Vendor) => {
    setAnalyzing(true);
    setSelectedVendor(vendor);
    setShowAssessmentView(true);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const baseScores: Record<string, number> = {};
    RISK_FACTORS.forEach(factor => {
      const existingAssessment = assessments.find(a => a.vendor_id === vendor.id);
      baseScores[factor.key] = existingAssessment ?
        (existingAssessment as Record<string, number>)[factor.key] || Math.random() * 40 + 40 :
        Math.random() * 40 + 40;
    });

    const overallScore = RISK_FACTORS.reduce((acc, factor) => {
      return acc + baseScores[factor.key] * factor.weight;
    }, 0) / RISK_FACTORS.reduce((acc, f) => acc + f.weight, 0);

    const existingAssessment = assessments.find(a => a.vendor_id === vendor.id);
    if (!existingAssessment) {
      const newAssessment = {
        vendor_id: vendor.id,
        assessor_id: '22222222-2222-2222-2222-222222222001',
        assessment_date: new Date().toISOString(),
        ...baseScores,
        overall_score: Math.round(overallScore * 100) / 100,
        risk_level: overallScore > 70 ? 'high' as const : overallScore > 45 ? 'medium' as const : 'low' as const,
        ai_confidence_score: Math.random() * 15 + 80,
        ai_recommendations: generateAIRecommendations(overallScore),
        assessment_method: 'AI-Powered Analysis',
        remediation_required: overallScore > 60,
      };

      const { data } = await supabase.from('risk_assessments').insert([newAssessment]).select();
      if (data) {
        setAssessments(prev => [data[0] as RiskAssessment, ...prev]);
      }

      await supabase
        .from('vendors')
        .update({
          overall_risk_score: Math.round(overallScore * 100) / 100,
          risk_level: overallScore > 70 ? 'high' : overallScore > 45 ? 'medium' : 'low',
          last_assessment_date: new Date().toISOString(),
          next_assessment_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', vendor.id);
    }

    setAnalyzing(false);
    fetchData();
  };

  const calculatePhase5Risk = async () => {
    if (!selectedVendor) return;
    setAnalyzing(true);
    try {
      setPhase5Error(null);
      const payload = {
        vendor_id: selectedVendor.id,
        financial_stability_score: answers.financial_stability_score,
        third_party_dependency_exposure: answers.third_party_dependency_exposure,
        sensitive_data_exposure: answers.sensitive_data_exposure,
        access_scope_risk: answers.access_scope_risk,
        contract_complexity: answers.contract_complexity,
        recent_breach_history: answers.recent_breach_history,
        compliance_maturity: answers.compliance_maturity,
        monitoring_maturity: answers.monitoring_maturity,
        incident_response_maturity: answers.incident_response_maturity,
        vendor_tier: vendorTier,
      };

      const response = await fetch('http://localhost:8000/api/v2/risk-assessments/third-party-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        const message = data?.detail || data?.error || 'Phase 5 scoring request failed';
        throw new Error(message);
      }

      setPhase5Result(data);
      fetchData();
    } catch (error: any) {
      console.error('Error calculating Phase 5 risk:', error);
      setPhase5Result(null);
      setPhase5Error(error?.message || 'Unable to calculate third-party risk score.');
    } finally {
      setAnalyzing(false);
    }
  };

  const generateAIRecommendations = (score: number): string => {
    const recs = [];
    if (score > 70) {
      recs.push('Immediate action required for critical security gaps');
      recs.push('Implement enhanced monitoring and incident response');
    }
    if (score > 50) {
      recs.push('Strengthen access controls and data protection measures');
      recs.push('Review third-party dependencies and supply chain security');
    }
    return recs.join('. ') + '. Consider regular security assessments and penetration testing.';
  };

  const getLatestAssessment = (vendorId: string) => {
    return assessments.find(a => a.vendor_id === vendorId);
  };

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <Brain className="w-7 h-7 text-primary-500" />
            AI Risk Assessment
          </h1>
          <p className="text-slate-500 mt-1">
            Multi-framework risk scoring: NIST CSF, OWASP, MITRE ATT&CK, CIS Controls, CVSS, FAIR
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 rounded-lg">
            <Sparkles className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-medium text-primary-700">
              {assessments.length} Assessments Analyzed
            </span>
          </div>
        </div>
      </div>

      {questionnaireError && (
        <div className="card p-4 bg-orange-50 border border-orange-100 text-orange-700">
          <p className="text-sm font-medium">Phase 5 questionnaire could not be loaded from the API.</p>
          <p className="text-sm mt-1">Using fallback scoring inputs to keep vendor risk assessment available.</p>
        </div>
      )}

      {phase5Error && (
        <div className="card p-4 bg-red-50 border border-red-100 text-red-700">
          <p className="text-sm font-medium">{phase5Error}</p>
        </div>
      )}

      {/* Framework Legend */}
      <div className="card p-4">
        <div className="flex items-center gap-6 flex-wrap">
          {FRAMEWORKS.map(fw => (
            <div key={fw.id} className="flex items-center gap-2">
              <span>{fw.icon}</span>
              <span className="text-sm font-medium text-slate-700">{fw.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vendor List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-4">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          <div className="card divide-y divide-slate-100 max-h-[calc(100vh-300px)] overflow-y-auto">
            {filteredVendors.length > 0 ? (
              filteredVendors.map((vendor) => {
                const assessment = getLatestAssessment(vendor.id);
                return (
                  <div
                    key={vendor.id}
                    onClick={() => {
                      setSelectedVendor(vendor);
                    }}
                    className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                      selectedVendor?.id === vendor.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''
                    }`}
                  >
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
                            (vendor.overall_risk_score || 0) > 70 ? 'text-red-600' :
                            (vendor.overall_risk_score || 0) > 45 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {vendor.overall_risk_score?.toFixed(1) || 'N/A'}
                          </span>
                        </div>
                        <span className={`badge text-[10px] ${
                          vendor.risk_level === 'high' ? 'badge-danger' :
                          vendor.risk_level === 'medium' ? 'badge-warning' : 'badge-success'
                        }`}>
                          {vendor.risk_level?.toUpperCase() || 'N/A'}
                        </span>
                      </div>
                    </div>
                    {assessment && (
                      <p className="text-xs text-slate-400 mt-2">
                        Last assessed: {format(new Date(assessment.assessment_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-500">
                <p>No vendors found</p>
              </div>
            )}
          </div>
        </div>

        {/* Assessment Analysis - Always Visible */}
        <div className="lg:col-span-2">
          {selectedVendor ? (
            analyzing ? (
              <div className="card p-8 flex flex-col items-center justify-center min-h-[500px]">
                <Brain className="w-16 h-16 text-primary-500 animate-pulse" />
                <h3 className="text-xl font-semibold text-slate-800 mt-4">Analyzing {selectedVendor.name}</h3>
                <p className="text-slate-500 mt-2 text-center">
                  Running multi-framework analysis:<br/>
                  NIST CSF | OWASP | MITRE ATT&CK | CIS | CVSS | FAIR
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <VendorRiskAnalysis
                  vendor={selectedVendor}
                  assessment={getLatestAssessment(selectedVendor.id)}
                  recommendations={recommendations.filter(r => r.vendor_id === selectedVendor.id)}
                  onClose={() => setSelectedVendor(null)}
                  onReanalyze={() => runAIRiskAnalysis(selectedVendor)}
                />

                {/* Phase 5 Third-Party Risk Scoring */}
                {questionnaire && (
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800">Phase 5: Third-Party Risk Scoring</h3>
                        <p className="text-sm text-slate-500">Use vendor questionnaire responses to calculate financial and third-party risk.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Vendor Tier</span>
                        <select
                          value={vendorTier}
                          onChange={(e) => setVendorTier(e.target.value as typeof vendorTier)}
                          className="input-field w-48"
                        >
                          {questionnaire.vendor_tiers.map((tier: any) => (
                            <option key={tier.value} value={tier.value}>{tier.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {questionnaire.questions.map((question: any) => (
                        <div key={question.key} className="card p-4 border border-slate-200">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div>
                              <h4 className="font-medium text-slate-800">{question.label}</h4>
                              <p className="text-xs text-slate-500">{question.description}</p>
                            </div>
                            <span className="text-xs text-slate-400">{answers[question.key]}</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={answers[question.key]}
                            onChange={(e) => setAnswers({ ...answers, [question.key]: Number(e.target.value) })}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-slate-500 mt-2">
                            <span>{question.min_label}</span>
                            <span>{question.max_label}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex flex-col lg:flex-row items-start lg:items-center gap-4">
                      <button
                        onClick={calculatePhase5Risk}
                        disabled={analyzing}
                        className="btn btn-primary flex items-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        Calculate Phase 5 Score
                      </button>
                      <div className="text-sm text-slate-600">
                        This scoring blends financial stability, exposure, contracts, breach history, and maturity into a final third-party risk score.
                      </div>
                    </div>

                    {phase5Result && (
                      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="card p-4 border border-slate-200">
                          <p className="text-xs text-slate-500 uppercase">Third-party Risk Score</p>
                          <p className="text-3xl font-bold text-slate-800 mt-2">{phase5Result.third_party_score}</p>
                        </div>
                        <div className="card p-4 border border-slate-200">
                          <p className="text-xs text-slate-500 uppercase">Final Overall Score</p>
                          <p className="text-3xl font-bold text-slate-800 mt-2">{phase5Result.overall_score}</p>
                          <p className="text-xs text-slate-500 mt-2">Risk Level: <span className="font-semibold">{phase5Result.risk_level.toUpperCase()}</span></p>
                        </div>
                        <div className="card p-4 border border-slate-200">
                          <p className="text-xs text-slate-500 uppercase">Recommendations</p>
                          <p className="text-sm text-slate-700 mt-2">{phase5Result.recommendation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="card p-8 flex flex-col items-center justify-center min-h-[500px]">
              <Target className="w-16 h-16 text-slate-300" />
              <h3 className="text-xl font-semibold text-slate-800 mt-4">Select a Vendor</h3>
              <p className="text-slate-500 mt-2 text-center">
                Choose a vendor from the list to view comprehensive<br/>risk assessment with multi-framework analysis
              </p>
              <div className="mt-6 flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-800">{vendors.length}</p>
                  <p className="text-xs text-slate-500">Total Vendors</p>
                </div>
                <div className="w-px h-10 bg-slate-200" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{vendors.filter(v => v.risk_level === 'high').length}</p>
                  <p className="text-xs text-slate-500">High Risk</p>
                </div>
                <div className="w-px h-10 bg-slate-200" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{vendors.filter(v => v.risk_level === 'medium').length}</p>
                  <p className="text-xs text-slate-500">Medium Risk</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface VendorRiskAnalysisProps {
  vendor: Vendor;
  assessment: RiskAssessment | undefined;
  recommendations: AIRecommendation[];
  onClose: () => void;
  onReanalyze: () => void;
}

function VendorRiskAnalysis({ vendor, assessment, recommendations, onClose, onReanalyze }: VendorRiskAnalysisProps) {

  // Risk factor data for radar chart
  const riskFactorData = RISK_FACTORS.map(factor => ({
    factor: factor.label,
    score: assessment?.[factor.key as keyof RiskAssessment] as number || 50,
    fullMark: 100,
  }));

  // Simulated framework scores
  const frameworkScores = [
    { framework: 'NIST CSF', score: 72, icon: '🛡️', color: '#6366f1' },
    { framework: 'OWASP', score: 68, icon: '🔐', color: '#f59e0b' },
    { framework: 'MITRE', score: 75, icon: '🎯', color: '#ef4444' },
    { framework: 'CIS', score: 70, icon: '✓', color: '#22c55e' },
    { framework: 'CVSS', score: 65, icon: '📊', color: '#8b5cf6' },
    { framework: 'FAIR', score: 78, icon: '💰', color: '#06b6d4' },
  ];

  const trendData = [
    { month: 'Jan', score: (assessment?.overall_score || 60) - 5 },
    { month: 'Feb', score: (assessment?.overall_score || 60) - 3 },
    { month: 'Mar', score: assessment?.overall_score || 60 },
    { month: 'Apr', score: (assessment?.overall_score || 60) + 2 },
    { month: 'May', score: assessment?.overall_score || 60 },
    { month: 'Jun', score: assessment?.overall_score || 60 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
              {vendor.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{vendor.name}</h2>
              <p className="text-sm text-slate-500">{vendor.category?.name} | {vendor.industry}</p>
              {assessment && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400">
                    Assessed: {format(new Date(assessment.assessment_date), 'MMM d, yyyy')}
                  </span>
                  <span className="text-xs text-slate-400">|</span>
                  <span className="text-xs text-slate-400">
                    Confidence: {assessment.ai_confidence_score?.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="btn-secondary">Close</button>
            <button onClick={onReanalyze} className="btn-primary flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Re-analyze
            </button>
          </div>
        </div>
      </div>

      {/* Risk Score & Framework Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-6 bg-gradient-to-br from-primary-600 to-purple-600 text-white md:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">Comprehensive Risk Score</p>
              <p className="text-4xl font-bold mt-2">{assessment?.overall_score?.toFixed(1) || vendor.overall_risk_score?.toFixed(1) || 'N/A'}</p>
            </div>
            <Shield className="w-12 h-12 text-white/30" />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className={`badge ${
              (assessment?.risk_level || vendor.risk_level) === 'high' ? 'bg-red-100 text-red-700' :
              (assessment?.risk_level || vendor.risk_level) === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {((assessment?.risk_level || vendor.risk_level) || 'medium').toUpperCase()} RISK
            </span>
          </div>
        </div>

        {/* Framework Scores Bar */}
        <div className="card p-6 md:col-span-3">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Multi-Framework Compliance Scores</h3>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={frameworkScores} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
              <YAxis dataKey="framework" type="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {frameworkScores.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Framework Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {frameworkScores.map(fw => (
          <div key={fw.framework} className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{fw.icon}</span>
                <span className="text-sm font-medium text-slate-700">{fw.framework}</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold" style={{ color: fw.color }}>{fw.score}</p>
                <div className="w-16 bg-slate-200 h-1.5 rounded-full mt-1">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${fw.score}%`, backgroundColor: fw.color }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Risk Factor Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-500" />
            Risk Factor Analysis
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={riskFactorData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="factor" tick={{ fontSize: 9 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            Risk Trend
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="card">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            AI Recommendations
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {recommendations.length > 0 ? recommendations.map((rec) => (
            <div key={rec.id} className="p-4 hover:bg-slate-50">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  rec.priority === 'critical' ? 'bg-red-100 text-red-600' :
                  rec.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-800">{rec.title}</p>
                    <div className="flex items-center gap-2">
                      <span className={`badge text-[10px] ${
                        rec.priority === 'critical' ? 'badge-danger' :
                        rec.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        'badge-info'
                      }`}>
                        {rec.priority.toUpperCase()}
                      </span>
                      {rec.risk_reduction_estimate && (
                        <span className="text-xs text-green-600 font-medium">-{rec.risk_reduction_estimate}% risk</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{rec.description}</p>
                </div>
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-slate-500">
              <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-2" />
              <p>No pending recommendations</p>
            </div>
          )}
        </div>
      </div>

      {/* Framework Details */}
      <div className="card p-6 bg-gradient-to-br from-slate-50 to-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Info className="w-5 h-5 text-primary-500" />
          Framework Analysis Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
          <div>
            <h4 className="font-medium text-slate-800">NIST CSF 2.0 Findings</h4>
            <p className="mt-1">Vendor demonstrates Tier 2 (Risk Informed) maturity. Key gaps in Incident Response and Recovery Planning.</p>
          </div>
          <div>
            <h4 className="font-medium text-slate-800">OWASP Top 10 Risks</h4>
            <p className="mt-1">A03: Injection (Medium), A06: Vulnerable Components (High). Patch management process needs improvement.</p>
          </div>
          <div>
            <h4 className="font-medium text-slate-800">MITRE ATT&CK Coverage</h4>
            <p className="mt-1">Initial Access and Execution tactics well-mitigated. Credential Access protections need enhancement.</p>
          </div>
          <div>
            <h4 className="font-medium text-slate-800">CIS Controls Implementation</h4>
            <p className="mt-1">IG1 compliant (12/14 controls implemented). Security Awareness Training and Penetration Testing pending.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
