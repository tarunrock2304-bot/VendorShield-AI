export type UserRole = 'admin' | 'analyst' | 'auditor';
export type VendorStatus = 'active' | 'inactive' | 'under_review' | 'suspended' | 'terminated';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'minimal';
export type ComplianceStatus = 'compliant' | 'partially_compliant' | 'non_compliant' | 'pending_review' | 'expired';
export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ContractStatus = 'active' | 'expired' | 'pending_renewal' | 'terminated';

export interface User {
  id: string;
  auth_user_id?: string;
  email: string;
  password?: string;
  full_name: string;
  role: UserRole;
  department?: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface VendorCategory {
  id: string;
  name: string;
  description?: string;
  default_risk_weight: number;
  created_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  category_id?: string;
  category?: VendorCategory;
  description?: string;
  website?: string;
  primary_contact_name?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
  address?: string;
  country?: string;
  industry?: string;
  employee_count?: number;
  annual_revenue?: number;
  annual_spend?: number;
  criticality?: 'low' | 'medium' | 'high' | 'critical';
  data_access_scope?: 'Processor' | 'Controller' | 'Subprocessor' | 'Service Provider' | string;
  systems_accessed?: string[];
  sensitive_data_types?: string[];
  access_level?: 'read' | 'write' | 'admin' | 'full' | 'limited';
  data_sensitivity_score?: number;
  breach_history?: string;
  last_breach_date?: string;
  financial_stability_score?: number;
  status: VendorStatus;
  overall_risk_score: number;
  risk_level: RiskLevel;
  onboarding_date?: string;
  last_assessment_date?: string;
  next_assessment_date?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RiskAssessment {
  id: string;
  vendor_id: string;
  vendor?: Vendor;
  assessor_id?: string;
  assessor?: User;
  assessment_date: string;
  security_posture_score: number;
  compliance_score: number;
  breach_history_score: number;
  access_management_score: number;
  incident_response_score: number;
  business_continuity_score: number;
  financial_stability_score: number;
  data_protection_score: number;
  third_party_risk_score: number;
  overall_score: number;
  risk_level: RiskLevel;
  ai_confidence_score?: number;
  ai_recommendations?: string;
  ai_risk_factors?: Record<string, unknown>;
  assessment_method?: string;
  evidence_collected?: Record<string, unknown>;
  findings?: string;
  remediation_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComplianceCertification {
  id: string;
  vendor_id: string;
  vendor?: Vendor;
  standard: string;
  certification_number?: string;
  certification_body?: string;
  issue_date?: string;
  expiry_date?: string;
  scope?: string;
  status: ComplianceStatus;
  compliance_percentage: number;
  last_audit_date?: string;
  next_audit_date?: string;
  certificate_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  vendor_id: string;
  vendor?: Vendor;
  contract_number?: string;
  contract_name: string;
  contract_type?: string;
  start_date?: string;
  end_date?: string;
  value?: number;
  currency: string;
  status: ContractStatus;
  auto_renewal: boolean;
  renewal_notice_days: number;
  termination_notice_days: number;
  sla_terms?: Record<string, unknown>;
  data_processing_terms: boolean;
  security_requirements?: Record<string, unknown>;
  liability_cap?: number;
  insurance_requirements?: string;
  contract_document_url?: string;
  sla_violations?: number;
  contract_health_score?: number;
  risk_score: number;
  risk_level: RiskLevel;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SecurityIncident {
  id: string;
  vendor_id: string;
  vendor?: Vendor;
  incident_date?: string;
  reported_date: string;
  incident_type: string;
  severity: RiskLevel;
  description: string;
  affected_systems?: string;
  affected_data_types?: string;
  data_breach: boolean;
  records_affected: number;
  root_cause?: string;
  remediation_actions?: string;
  resolution_date?: string;
  status: string;
  regulatory_notification: boolean;
  notification_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RemediationTask {
  id: string;
  vendor_id: string;
  vendor?: Vendor;
  assessment_id?: string;
  incident_id?: string;
  title: string;
  description?: string;
  category?: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to?: string;
  assignee?: User;
  due_date?: string;
  completed_date?: string;
  impact_score: number;
  effort_score: number;
  progress_percentage: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AIRecommendation {
  id: string;
  vendor_id: string;
  vendor?: Vendor;
  assessment_id?: string;
  recommendation_type: string;
  title: string;
  description?: string;
  current_state?: string;
  recommended_action?: string;
  expected_impact?: string;
  confidence_score: number;
  priority: TaskPriority;
  status: string;
  implemented: boolean;
  implemented_date?: string;
  risk_reduction_estimate?: number;
  effort_estimate?: string;
  created_at: string;
}

export interface Alert {
  id: string;
  vendor_id?: string;
  vendor?: Vendor;
  alert_type: string;
  title: string;
  message?: string;
  severity: AlertSeverity;
  source?: string;
  is_read: boolean;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  action_taken?: string;
  created_at: string;
}

export interface Report {
  id: string;
  report_type: string;
  title: string;
  description?: string;
  parameters?: Record<string, unknown>;
  generated_by?: string;
  generated_at: string;
  report_data?: Record<string, unknown>;
  format: string;
  file_url?: string;
  is_scheduled: boolean;
  schedule_frequency?: string;
  recipients?: Record<string, unknown>;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user?: User;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  details?: string;
  created_at: string;
}

export interface DashboardStats {
  total_vendors: number;
  high_risk_vendors: number;
  expiring_contracts: number;
  expiring_certificates: number;
  average_risk_score: number;
  risk_distribution: { level: string; count: number }[];
  compliance_overview: { standard: string; compliant: number; total: number }[];
  recent_alerts: Alert[];
  vendor_trend: { month: string; count: number; risk_score: number }[];
}

export interface RiskFactorAnalysis {
  factor: string;
  current_score: number;
  benchmark_score: number;
  weight: number;
  trend: 'improving' | 'stable' | 'declining';
}
