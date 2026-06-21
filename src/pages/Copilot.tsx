import { useState, useEffect } from 'react';
import {
  Bot,
  Brain,
  Sparkles,
  Send,
  Download,
  FileText,
  BarChart3,
  Shield,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Zap,
  Copy,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { AIRecommendation, Report, Vendor } from '../types';
import { format } from 'date-fns';

const QUICK_PROMPTS = [
  { label: 'Risk Summary', prompt: 'Generate a risk summary for all high-risk vendors' },
  { label: 'Compliance Gaps', prompt: 'Identify compliance gaps and certification needs' },
  { label: 'Remediation Plan', prompt: 'Create a prioritized remediation action plan' },
  { label: 'Vendor Insights', prompt: 'Analyze vendor risk trends and predictions' },
  { label: 'Threat Forecast', prompt: 'Forecast potential threats based on current data' },
  { label: 'Executive Brief', prompt: 'Generate an executive summary of vendor risks' },
];

export default function Copilot() {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Hello! I\'m the AI Security Copilot. I can help you analyze vendor risks, generate reports, identify compliance gaps, and provide security recommendations. How can I assist you today?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'recommendations' | 'reports'>('chat');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recsRes, reportsRes, vendorsRes] = await Promise.all([
        supabase.from('ai_recommendations').select('*, vendor:vendors(name)').order('created_at', { ascending: false }).limit(20),
        supabase.from('reports').select('*').order('generated_at', { ascending: false }).limit(10),
        supabase.from('vendors').select('id, name, overall_risk_score, risk_level'),
      ]);

      setRecommendations((recsRes.data as unknown as AIRecommendation[]) || []);
      setReports((reportsRes.data as unknown as Report[]) || []);
      setVendors((vendorsRes.data as unknown as Vendor[]) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isGenerating) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsGenerating(true);

    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1500));

    let response = '';
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('risk summary') || lowerMessage.includes('risk')) {
      const highRisk = vendors.filter(v => v.risk_level === 'high' || v.risk_level === 'critical');
      response = `Based on my analysis of ${vendors.length} vendors:\n\n**Risk Summary:**\n- ${highRisk.length} high-risk vendors identified\n- Average risk score: ${(vendors.reduce((a, v) => a + (v.overall_risk_score || 0), 0) / vendors.length || 0).toFixed(1)}\n- Top concerns: Data protection, third-party access, compliance gaps\n\n**Key Recommendations:**\n1. Prioritize assessment of high-risk vendors\n2. Implement enhanced monitoring for critical systems\n3. Review data processing agreements\n\nWould you like me to generate a detailed report for any specific vendor?`;
    } else if (lowerMessage.includes('compliance')) {
      response = `**Compliance Gap Analysis:**\n\nI've identified the following compliance gaps:\n\n1. **ISO 27001**: 2 vendors have certifications expiring within 90 days\n2. **SOC 2**: 3 vendors have partial compliance\n3. **GDPR**: 1 vendor requires data processing agreement updates\n4. **PCI DSS**: All payment processors are compliant\n\n**Priority Actions:**\n- Schedule renewal audits for expiring certifications\n- Request updated DPA from non-compliant vendors\n- Conduct gap assessment for partially compliant vendors\n\nShall I generate a detailed compliance checklist?`;
    } else if (lowerMessage.includes('remediation') || lowerMessage.includes('action')) {
      response = `**Prioritized Remediation Plan:**\n\n**Critical (Immediate):**\n- Implement encryption at rest for backup systems (Risk reduction: 45%)\n- Secure development environment - remove PII data (Risk reduction: 55%)\n\n**High (Within 30 days):**\n- Deploy privileged access management (Risk reduction: 25%)\n- Enhance data logging and monitoring (Risk reduction: 20%)\n\n**Medium (Within 90 days):**\n- Implement network segmentation improvements\n- Update business continuity testing frequency\n\n**Estimated total risk reduction: ~75%**\n\nWould you like me to create task assignments in the Remediation Tracker?`;
    } else if (lowerMessage.includes('threat') || lowerMessage.includes('forecast')) {
      response = `**Threat Intelligence Analysis:**\n\nBased on current vendor data and threat intelligence feeds:\n\n**Predicted Threats (Next 30 days):**\n- Elevated risk of credential compromise (confidence: 85%)\n- Potential supply chain vulnerability in 3 vendors\n- Phishing campaign targeting financial services vendors\n\n**Monitoring Recommendations:**\n- Enable enhanced logging for vendor APIs\n- Implement real-time alerting for suspicious activities\n- Update threat intelligence integrations\n\n**Current Threat Level:** MODERATE\n\nShall I enable enhanced monitoring for specific vendors?`;
    } else if (lowerMessage.includes('report') || lowerMessage.includes('executive')) {
      response = `**Executive Summary Report Generated**\n\n📊 **Vendor Portfolio Overview:**\n- Total vendors: ${vendors.length}\n- High-risk: ${vendors.filter(v => v.risk_level === 'high').length}\n- Average risk score: ${(vendors.reduce((a, v) => a + (v.overall_risk_score || 0), 0) / vendors.length || 0).toFixed(1)}\n\n📈 **Trend Analysis:**\n- Risk scores decreased 8% over the last quarter\n- Compliance rate improved to 87%\n- 15 remediation tasks completed\n\n⚠️ **Key Concerns:**\n- 2 contracts expiring within 60 days\n- 3 certifications require renewal\n\nI've added this report to your Reports section. Would you like me to export it as PDF?`;
    } else {
      response = `I understand you're asking about: "${userMessage}"\n\nBased on the current vendor data, I can help you with:\n\n1. **Risk Analysis**: Detailed vendor risk assessments\n2. **Compliance Tracking**: Certification status and gaps\n3. **Threat Intelligence**: Security monitoring insights\n4. **Remediation**: Prioritized action plans\n5. **Reports**: Executive summaries and detailed analytics\n\nWould you like me to provide specific insights on any of these areas?`;
    }

    setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setIsGenerating(false);
  };

  const handleGenerateReport = async (type: string) => {
    setGeneratingReport(true);
    try {
      await supabase.from('reports').insert([{
        report_type: type,
        title: `${type.replace('_', ' ')} Report - ${format(new Date(), 'MMM d, yyyy')}`,
        generated_at: new Date().toISOString(),
      }]);
      await fetchData();
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputMessage(prompt);
  };

  // Chart data
  const recommendationsByPriority = [
    { priority: 'Critical', count: recommendations.filter(r => r.priority === 'critical').length },
    { priority: 'High', count: recommendations.filter(r => r.priority === 'high').length },
    { priority: 'Medium', count: recommendations.filter(r => r.priority === 'medium').length },
    { priority: 'Low', count: recommendations.filter(r => r.priority === 'low').length },
  ];

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
            <Bot className="w-7 h-7 text-primary-500" />
            AI Security Copilot & Reports
          </h1>
          <p className="text-slate-500 mt-1">
            AI-powered insights, recommendations, and automated reporting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center gap-1">
            <Sparkles className="w-4 h-4" />
            AI Active
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 bg-gradient-to-br from-primary-500 to-purple-600 text-white">
          <Brain className="w-8 h-8 text-white/50" />
          <p className="text-2xl font-bold mt-2">{recommendations.length}</p>
          <p className="text-sm text-white/80">AI Recommendations</p>
        </div>
        <div className="card p-4">
          <Lightbulb className="w-8 h-8 text-yellow-300" />
          <p className="text-2xl font-bold mt-2">{recommendations.filter(r => !r.implemented).length}</p>
          <p className="text-sm text-slate-500">Pending Actions</p>
        </div>
        <div className="card p-4">
          <FileText className="w-8 h-8 text-slate-300" />
          <p className="text-2xl font-bold mt-2">{reports.length}</p>
          <p className="text-sm text-slate-500">Reports Generated</p>
        </div>
        <div className="card p-4">
          <TrendingUp className="w-8 h-8 text-green-300" />
          <p className="text-2xl font-bold mt-2">
            {recommendations.reduce((acc, r) => acc + (r.risk_reduction_estimate || 0), 0).toFixed(0)}%
          </p>
          <p className="text-sm text-slate-500">Potential Risk Reduction</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-slate-200">
          <div className="flex items-center px-6 gap-6 tab-container">
            {['chat', 'recommendations', 'reports'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-[500px]">
            {/* Quick Prompts */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => handleQuickPrompt(qp.prompt)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-600 transition-colors"
                >
                  {qp.label}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl p-4 ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 text-slate-800'
                  }`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4 text-primary-500" />
                        <span className="text-xs text-slate-500 font-medium">AI Copilot</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => handleCopy(msg.content, `msg-${idx}`)}
                        className="mt-2 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        {copied === `msg-${idx}` ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary-500 animate-pulse" />
                      <span className="text-sm text-slate-500">Analyzing and generating response...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask about vendor risks, compliance, or recommendations..."
                  className="input-field flex-1"
                  disabled={isGenerating}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isGenerating || !inputMessage.trim()}
                  className="btn-primary flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div>
            {/* Chart */}
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Recommendations by Priority</h3>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={recommendationsByPriority}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="priority" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100">
              {recommendations.map((rec) => (
                <div key={rec.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      rec.priority === 'critical' ? 'bg-red-100 text-red-600' :
                      rec.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      <Zap className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-slate-800">{rec.title}</h4>
                        <div className="flex items-center gap-2">
                          <span className={`badge ${
                            rec.priority === 'critical' ? 'bg-red-100 text-red-700' :
                            rec.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                            rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {rec.priority.toUpperCase()}
                          </span>
                          {rec.risk_reduction_estimate && (
                            <span className="text-sm text-green-600 font-medium">
                              -{rec.risk_reduction_estimate}%
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{rec.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        {rec.vendor && <span>{rec.vendor.name}</span>}
                        <span>Confidence: {rec.confidence_score}%</span>
                        {rec.effort_estimate && <span>Effort: {rec.effort_estimate}</span>}
                      </div>
                    </div>
                    {!rec.implemented && (
                      <button className="btn-secondary text-sm py-1.5">
                        Implement
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {recommendations.length === 0 && (
                <div className="p-8 text-center text-slate-500">No recommendations available</div>
              )}
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div>
            {/* Generate New Reports */}
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Generate New Report</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['risk_summary', 'compliance', 'contract', 'vendor_detail'].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleGenerateReport(type)}
                    disabled={generatingReport}
                    className="flex items-center justify-center gap-2 p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors text-slate-700"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">{type.replace('_', ' ')}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Report History */}
            <div className="divide-y divide-slate-100">
              {reports.map((report) => (
                <div key={report.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-800">{report.title}</h4>
                        <p className="text-xs text-slate-400">
                          {format(new Date(report.generated_at), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge bg-slate-100 text-slate-600">
                        {report.format.toUpperCase()}
                      </span>
                      <button className="btn-outline text-sm py-1.5 flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {reports.length === 0 && (
                <div className="p-8 text-center text-slate-500">No reports generated yet</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
