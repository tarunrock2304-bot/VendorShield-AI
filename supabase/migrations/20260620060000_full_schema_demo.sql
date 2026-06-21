-- Full demo schema, policies, and seed data in one file

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom types
CREATE TYPE user_role AS ENUM ('Admin', 'Analyst', 'Auditor');
CREATE TYPE vendor_status AS ENUM ('active', 'inactive', 'under_review', 'suspended', 'terminated');
CREATE TYPE risk_level AS ENUM ('critical', 'high', 'medium', 'low', 'minimal');
CREATE TYPE compliance_status AS ENUM ('compliant', 'partially_compliant', 'non_compliant', 'pending_review', 'expired');
CREATE TYPE task_status AS ENUM ('open', 'in_progress', 'completed', 'overdue', 'cancelled');
CREATE TYPE task_priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE alert_severity AS ENUM ('critical', 'high', 'medium', 'low', 'info');
CREATE TYPE contract_status AS ENUM ('active', 'expired', 'pending_renewal', 'terminated');

-- Core tables
CREATE TABLE users (
    id VARCHAR(20) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'Analyst',
    department VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE vendor_categories (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    default_risk_weight DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE vendors (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id VARCHAR(20) REFERENCES vendor_categories(id) ON DELETE SET NULL,
    description TEXT,
    website TEXT,
    primary_contact_name VARCHAR(255),
    primary_contact_email VARCHAR(255),
    primary_contact_phone VARCHAR(20),
    address TEXT,
    country VARCHAR(100),
    industry VARCHAR(100),
    employee_count INTEGER,
    annual_revenue DECIMAL(15,2),
    data_access_scope VARCHAR(50),
    access_level VARCHAR(20),
    criticality VARCHAR(20) DEFAULT 'medium',
    annual_spend DECIMAL(15,2),
    systems_accessed TEXT[],
    sensitive_data_types TEXT[],
    data_sensitivity_score DECIMAL(5,2),
    breach_history TEXT,
    last_breach_date DATE,
    financial_stability_score DECIMAL(5,2) DEFAULT 50,
    status vendor_status DEFAULT 'active',
    overall_risk_score DECIMAL(5,2) DEFAULT 0,
    risk_level risk_level DEFAULT 'medium',
    onboarding_date DATE,
    last_assessment_date DATE,
    next_assessment_date DATE,
    notes TEXT,
    created_by VARCHAR(20) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE risk_assessments (
    id VARCHAR(20) PRIMARY KEY,
    vendor_id VARCHAR(20) REFERENCES vendors(id) ON DELETE CASCADE,
    assessor_id VARCHAR(20) REFERENCES users(id),
    assessment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    security_posture_score DECIMAL(5,2) DEFAULT 0,
    compliance_score DECIMAL(5,2) DEFAULT 0,
    breach_history_score DECIMAL(5,2) DEFAULT 0,
    access_management_score DECIMAL(5,2) DEFAULT 0,
    incident_response_score DECIMAL(5,2) DEFAULT 0,
    business_continuity_score DECIMAL(5,2) DEFAULT 0,
    financial_stability_score DECIMAL(5,2) DEFAULT 0,
    data_protection_score DECIMAL(5,2) DEFAULT 0,
    third_party_risk_score DECIMAL(5,2) DEFAULT 0,
    overall_score DECIMAL(5,2) DEFAULT 0,
    risk_level risk_level DEFAULT 'medium',
    ai_confidence_score DECIMAL(5,2),
    ai_recommendations TEXT,
    ai_risk_factors JSONB,
    assessment_method VARCHAR(100),
    evidence_collected JSONB,
    findings TEXT,
    remediation_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE compliance_certifications (
    id VARCHAR(20) PRIMARY KEY,
    vendor_id VARCHAR(20) REFERENCES vendors(id) ON DELETE CASCADE,
    standard VARCHAR(100) NOT NULL,
    certification_number VARCHAR(100),
    certification_body VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    scope TEXT,
    status compliance_status DEFAULT 'pending_review',
    compliance_percentage DECIMAL(5,2) DEFAULT 0,
    last_audit_date DATE,
    next_audit_date DATE,
    certificate_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE contracts (
    id VARCHAR(20) PRIMARY KEY,
    vendor_id VARCHAR(20) REFERENCES vendors(id) ON DELETE CASCADE,
    contract_number VARCHAR(100),
    contract_name VARCHAR(255) NOT NULL,
    contract_type VARCHAR(100),
    start_date DATE,
    end_date DATE,
    value DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    status contract_status DEFAULT 'active',
    auto_renewal BOOLEAN DEFAULT false,
    renewal_notice_days INTEGER DEFAULT 90,
    termination_notice_days INTEGER DEFAULT 30,
    sla_terms JSONB,
    data_processing_terms BOOLEAN DEFAULT false,
    security_requirements JSONB,
    liability_cap DECIMAL(15,2),
    insurance_requirements TEXT,
    contract_document_url TEXT,
    sla_violations INTEGER DEFAULT 0,
    contract_health_score DECIMAL(5,2) DEFAULT 100,
    risk_score DECIMAL(5,2) DEFAULT 0,
    risk_level risk_level DEFAULT 'medium',
    notes TEXT,
    created_by VARCHAR(20) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE security_incidents (
    id VARCHAR(20) PRIMARY KEY,
    vendor_id VARCHAR(20) REFERENCES vendors(id) ON DELETE CASCADE,
    incident_date TIMESTAMP WITH TIME ZONE,
    reported_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    incident_type VARCHAR(100) NOT NULL,
    severity risk_level DEFAULT 'medium',
    description TEXT NOT NULL,
    affected_systems TEXT,
    affected_data_types TEXT,
    data_breach BOOLEAN DEFAULT false,
    records_affected INTEGER DEFAULT 0,
    root_cause TEXT,
    remediation_actions TEXT,
    resolution_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'open',
    regulatory_notification BOOLEAN DEFAULT false,
    notification_date TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(20) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE remediation_tasks (
    id VARCHAR(20) PRIMARY KEY,
    vendor_id VARCHAR(20) REFERENCES vendors(id) ON DELETE CASCADE,
    assessment_id VARCHAR(20) REFERENCES risk_assessments(id) ON DELETE SET NULL,
    incident_id VARCHAR(20) REFERENCES security_incidents(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    priority task_priority DEFAULT 'medium',
    status task_status DEFAULT 'open',
    assigned_to VARCHAR(20) REFERENCES users(id),
    due_date DATE,
    completed_date DATE,
    impact_score DECIMAL(5,2) DEFAULT 0,
    effort_score DECIMAL(5,2) DEFAULT 0,
    progress_percentage INTEGER DEFAULT 0,
    notes TEXT,
    created_by VARCHAR(20) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ai_recommendations (
    id VARCHAR(20) PRIMARY KEY,
    vendor_id VARCHAR(20) REFERENCES vendors(id) ON DELETE CASCADE,
    assessment_id VARCHAR(20) REFERENCES risk_assessments(id) ON DELETE SET NULL,
    recommendation_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    current_state TEXT,
    recommended_action TEXT,
    expected_impact TEXT,
    confidence_score DECIMAL(5,2) DEFAULT 0,
    priority task_priority DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    implemented BOOLEAN DEFAULT false,
    implemented_date TIMESTAMP WITH TIME ZONE,
    risk_reduction_estimate DECIMAL(5,2),
    effort_estimate VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE alerts (
    id VARCHAR(20) PRIMARY KEY,
    vendor_id VARCHAR(20) REFERENCES vendors(id) ON DELETE CASCADE,
    alert_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    severity alert_severity DEFAULT 'medium',
    source VARCHAR(100),
    is_read BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by VARCHAR(20) REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    action_taken TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE reports (
    id VARCHAR(20) PRIMARY KEY,
    report_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    parameters JSONB,
    generated_by VARCHAR(20) REFERENCES users(id),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    report_data JSONB,
    format VARCHAR(20) DEFAULT 'pdf',
    file_url TEXT,
    is_scheduled BOOLEAN DEFAULT false,
    schedule_frequency VARCHAR(50),
    recipients JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(20) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE security_controls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE UNIQUE,
    nist_asset_management DECIMAL(5,2) DEFAULT 50,
    nist_risk_assessment DECIMAL(5,2) DEFAULT 50,
    nist_access_control DECIMAL(5,2) DEFAULT 50,
    nist_data_security DECIMAL(5,2) DEFAULT 50,
    nist_protective_tech DECIMAL(5,2) DEFAULT 50,
    nist_anomaly_detection DECIMAL(5,2) DEFAULT 50,
    nist_continuous_monitoring DECIMAL(5,2) DEFAULT 50,
    nist_response_planning DECIMAL(5,2) DEFAULT 50,
    nist_recovery_planning DECIMAL(5,2) DEFAULT 50,
    owasp_broken_access_control DECIMAL(5,2) DEFAULT 50,
    owasp_crypto_failures DECIMAL(5,2) DEFAULT 50,
    owasp_injection DECIMAL(5,2) DEFAULT 50,
    owasp_insecure_design DECIMAL(5,2) DEFAULT 50,
    owasp_misconfiguration DECIMAL(5,2) DEFAULT 50,
    owasp_vulnerable_components DECIMAL(5,2) DEFAULT 50,
    owasp_auth_failures DECIMAL(5,2) DEFAULT 50,
    owasp_integrity_failures DECIMAL(5,2) DEFAULT 50,
    owasp_logging_failures DECIMAL(5,2) DEFAULT 50,
    owasp_ssrf DECIMAL(5,2) DEFAULT 50,
    cis_asset_inventory VARCHAR(20) DEFAULT 'partial',
    cis_software_inventory VARCHAR(20) DEFAULT 'partial',
    cis_data_protection VARCHAR(20) DEFAULT 'partial',
    cis_secure_assets VARCHAR(20) DEFAULT 'partial',
    cis_account_management VARCHAR(20) DEFAULT 'partial',
    cis_access_control VARCHAR(20) DEFAULT 'partial',
    cis_vuln_management VARCHAR(20) DEFAULT 'partial',
    cis_audit_logs VARCHAR(20) DEFAULT 'partial',
    cis_email_web VARCHAR(20) DEFAULT 'partial',
    cis_malware_defense VARCHAR(20) DEFAULT 'partial',
    cis_data_recovery VARCHAR(20) DEFAULT 'partial',
    cis_network_mgmt VARCHAR(20) DEFAULT 'partial',
    cis_network_monitoring VARCHAR(20) DEFAULT 'partial',
    cis_security_training VARCHAR(20) DEFAULT 'partial',
    cis_provider_management VARCHAR(20) DEFAULT 'partial',
    cis_app_security VARCHAR(20) DEFAULT 'partial',
    cis_incident_response VARCHAR(20) DEFAULT 'partial',
    cis_penetration_testing VARCHAR(20) DEFAULT 'not_implemented',
    nist_overall_score DECIMAL(5,2) DEFAULT 50,
    owasp_overall_score DECIMAL(5,2) DEFAULT 50,
    mitre_overall_score DECIMAL(5,2) DEFAULT 50,
    cis_overall_score DECIMAL(5,2) DEFAULT 50,
    cvss_overall_score DECIMAL(5,2) DEFAULT 50,
    fair_overall_score DECIMAL(5,2) DEFAULT 50,
    comprehensive_score DECIMAL(5,2) DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Updated-at trigger helper
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Helpful indexes
CREATE INDEX idx_vendors_category ON vendors(category_id);
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_risk_level ON vendors(risk_level);
CREATE INDEX idx_vendors_risk_score ON vendors(overall_risk_score DESC);
CREATE INDEX idx_assessments_vendor ON risk_assessments(vendor_id);
CREATE INDEX idx_assessments_date ON risk_assessments(assessment_date DESC);
CREATE INDEX idx_certifications_vendor ON compliance_certifications(vendor_id);
CREATE INDEX idx_certifications_expiry ON compliance_certifications(expiry_date);
CREATE INDEX idx_certifications_standard ON compliance_certifications(standard);
CREATE INDEX idx_contracts_vendor ON contracts(vendor_id);
CREATE INDEX idx_contracts_end_date ON contracts(end_date);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_incidents_vendor ON security_incidents(vendor_id);
CREATE INDEX idx_incidents_date ON security_incidents(incident_date DESC);
CREATE INDEX idx_tasks_vendor ON remediation_tasks(vendor_id);
CREATE INDEX idx_tasks_status ON remediation_tasks(status);
CREATE INDEX idx_tasks_due_date ON remediation_tasks(due_date);
CREATE INDEX idx_recommendations_vendor ON ai_recommendations(vendor_id);
CREATE INDEX idx_alerts_vendor ON alerts(vendor_id);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Triggers for updated timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON risk_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_certifications_updated_at BEFORE UPDATE ON compliance_certifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON security_incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON remediation_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_controls_updated_at BEFORE UPDATE ON security_controls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Demo RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE remediation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_demo" ON users FOR SELECT TO anon USING (true);
CREATE POLICY "users_insert_demo" ON users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "users_update_demo" ON users FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "users_delete_demo" ON users FOR DELETE TO anon USING (true);

CREATE POLICY "vendors_select_demo" ON vendors FOR SELECT TO anon USING (true);
CREATE POLICY "vendors_insert_demo" ON vendors FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "vendors_update_demo" ON vendors FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "vendors_delete_demo" ON vendors FOR DELETE TO anon USING (true);

CREATE POLICY "categories_select_demo" ON vendor_categories FOR SELECT TO anon USING (true);
CREATE POLICY "categories_insert_demo" ON vendor_categories FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "categories_update_demo" ON vendor_categories FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "categories_delete_demo" ON vendor_categories FOR DELETE TO anon USING (true);

CREATE POLICY "assessments_select_demo" ON risk_assessments FOR SELECT TO anon USING (true);
CREATE POLICY "assessments_insert_demo" ON risk_assessments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "assessments_update_demo" ON risk_assessments FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "assessments_delete_demo" ON risk_assessments FOR DELETE TO anon USING (true);

CREATE POLICY "certifications_select_demo" ON compliance_certifications FOR SELECT TO anon USING (true);
CREATE POLICY "certifications_insert_demo" ON compliance_certifications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "certifications_update_demo" ON compliance_certifications FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "certifications_delete_demo" ON compliance_certifications FOR DELETE TO anon USING (true);

CREATE POLICY "contracts_select_demo" ON contracts FOR SELECT TO anon USING (true);
CREATE POLICY "contracts_insert_demo" ON contracts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "contracts_update_demo" ON contracts FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "contracts_delete_demo" ON contracts FOR DELETE TO anon USING (true);

CREATE POLICY "incidents_select_demo" ON security_incidents FOR SELECT TO anon USING (true);
CREATE POLICY "incidents_insert_demo" ON security_incidents FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "incidents_update_demo" ON security_incidents FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "incidents_delete_demo" ON security_incidents FOR DELETE TO anon USING (true);

CREATE POLICY "tasks_select_demo" ON remediation_tasks FOR SELECT TO anon USING (true);
CREATE POLICY "tasks_insert_demo" ON remediation_tasks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "tasks_update_demo" ON remediation_tasks FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "tasks_delete_demo" ON remediation_tasks FOR DELETE TO anon USING (true);

CREATE POLICY "recommendations_select_demo" ON ai_recommendations FOR SELECT TO anon USING (true);
CREATE POLICY "recommendations_insert_demo" ON ai_recommendations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "recommendations_update_demo" ON ai_recommendations FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "recommendations_delete_demo" ON ai_recommendations FOR DELETE TO anon USING (true);

CREATE POLICY "alerts_select_demo" ON alerts FOR SELECT TO anon USING (true);
CREATE POLICY "alerts_insert_demo" ON alerts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "alerts_update_demo" ON alerts FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "alerts_delete_demo" ON alerts FOR DELETE TO anon USING (true);

CREATE POLICY "reports_select_demo" ON reports FOR SELECT TO anon USING (true);
CREATE POLICY "reports_insert_demo" ON reports FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "reports_update_demo" ON reports FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "reports_delete_demo" ON reports FOR DELETE TO anon USING (true);

CREATE POLICY "audit_logs_select_demo" ON audit_logs FOR SELECT TO anon USING (true);
CREATE POLICY "audit_logs_insert_demo" ON audit_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "audit_logs_update_demo" ON audit_logs FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "audit_logs_delete_demo" ON audit_logs FOR DELETE TO anon USING (true);

CREATE POLICY "controls_select_demo" ON security_controls FOR SELECT TO anon USING (true);
CREATE POLICY "controls_insert_demo" ON security_controls FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "controls_update_demo" ON security_controls FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "controls_delete_demo" ON security_controls FOR DELETE TO anon USING (true);

-- Seed vendor categories
INSERT INTO vendor_categories (id, name, description, default_risk_weight) VALUES
('CAT01', 'Cloud Services', 'Cloud infrastructure, SaaS, and cloud platform providers', 1.2),
('CAT02', 'Data Analytics', 'Data processing and analytics platforms', 1.3),
('CAT03', 'Financial Services', 'Payment processing and financial technology', 1.5),
('CAT04', 'IT Infrastructure', 'Hardware and infrastructure providers', 1.1),
('CAT05', 'Security Services', 'Cybersecurity and security service providers', 1.4),
('CAT06', 'Software Development', 'Development tools and software platforms', 1.2),
('CAT07', 'Consulting', 'Professional services and consulting firms', 0.9),
('CAT08', 'Human Resources', 'HR services and workforce management', 1.0);

-- Seed users
INSERT INTO users (id, email, full_name, role, department, is_active) VALUES
('ID01', 'ravi.kumar@vendorshield.in', 'Ravi Kumar', 'Admin', 'Security Operations', true),
('ID02', 'tarun.sharma@vendorshield.in', 'Tarun Sharma', 'Analyst', 'Risk Management', true),
('ID03', 'rizvan.khan@vendorshield.in', 'Rizvan Khan', 'Auditor', 'Compliance', true),
('ID04', 'girish.patel@vendorshield.in', 'Girish Patel', 'Auditor', 'Internal Audit', true),
('ID05', 'priya.singh@vendorshield.in', 'Priya Singh', 'Analyst', 'Risk Management', true),
('ID06', 'neha.kapoor@vendorshield.in', 'Neha Kapoor', 'Auditor', 'Internal Audit', true),
('ID07', 'arjun.rao@vendorshield.in', 'Arjun Rao', 'Analyst', 'Risk Management', true),
('ID08', 'ananya.mehta@vendorshield.in', 'Ananya Mehta', 'Auditor', 'Compliance', true),
('ID09', 'karan.desai@vendorshield.in', 'Karan Desai', 'Analyst', 'Risk Management', true),
('ID10', 'rishi.gupta@vendorshield.in', 'Rishi Gupta', 'Admin', 'Security Operations', true),
('ID11', 'nisha.iyer@vendorshield.in', 'Nisha Iyer', 'Auditor', 'Internal Audit', true),
('ID12', 'siddharth.jain@vendorshield.in', 'Siddharth Jain', 'Auditor', 'Compliance', true),
('ID13', 'pooja.nair@vendorshield.in', 'Pooja Nair', 'Analyst', 'Risk Management', true),
('ID14', 'kunal.reddy@vendorshield.in', 'Kunal Reddy', 'Admin', 'Security Operations', true),
('ID15', 'sameer.verma@vendorshield.in', 'Sameer Verma', 'Analyst', 'Risk Management', true),
('ID16', 'ritu.joshi@vendorshield.in', 'Ritu Joshi', 'Auditor', 'Internal Audit', true),
('ID17', 'aryan.sinha@vendorshield.in', 'Aryan Sinha', 'Auditor', 'Compliance', true),
('ID18', 'sneha.bose@vendorshield.in', 'Sneha Bose', 'Analyst', 'Risk Management', true),
('ID19', 'manoj.menon@vendorshield.in', 'Manoj Menon', 'Auditor', 'Internal Audit', true),
('ID20', 'deepa.roy@vendorshield.in', 'Deepa Roy', 'Auditor', 'Compliance', true);

-- Seed vendors
INSERT INTO vendors (id, name, category_id, description, website, primary_contact_name, primary_contact_email, primary_contact_phone, address, country, industry, employee_count, annual_revenue, status, overall_risk_score, risk_level, onboarding_date, last_assessment_date, next_assessment_date, notes, created_by) VALUES
('VEND01', 'TechCloud Solutions', 'CAT01', 'Enterprise cloud infrastructure provider specializing in secure multi-cloud deployments', 'https://techcloud.io', 'Ravi Iyer', 'ravi.iyer@techcloud.in', '+1-555-0101', '100 Cloud Avenue, San Francisco, CA 94105', 'United States', 'Technology', 2500, 450000000.00, 'active', 72.50, 'medium', '2023-01-15', '2024-06-01', '2024-12-01', 'Critical infrastructure partner', 'ID01'),
('VEND02', 'SecurePay Financial', 'CAT03', 'Global payment processing and fraud detection services', 'https://securepay.com', 'Tarun Sharma', 'tarun.sharma@securepay.in', '+1-555-0102', '500 Financial District, New York, NY 10004', 'United States', 'Financial Services', 1200, 89000000.00, 'active', 45.80, 'low', '2022-06-20', '2024-05-15', '2024-11-15', 'PCI DSS certified', 'ID01'),
('VEND03', 'DataInsight Analytics', 'CAT02', 'Business intelligence and data analytics platform', 'https://datainsight.ai', 'Rizvan Khan', 'rizvan.khan@datainsight.in', '+1-555-0103', '200 Tech Park, Austin, TX 78701', 'United States', 'Technology', 450, 35000000.00, 'active', 58.30, 'medium', '2023-03-10', '2024-04-20', '2024-10-20', 'AI-powered analytics', 'ID01'),
('VEND04', 'CyberGuard Security', 'CAT05', 'Managed security services and threat intelligence', 'https://cyberguard.sec', 'Girish Patel', 'girish.patel@cyberguard.in', '+1-555-0104', '300 Security Lane, Boston, MA 02101', 'United States', 'Cybersecurity', 800, 120000000.00, 'active', 32.10, 'low', '2022-09-01', '2024-03-15', '2024-09-15', 'Primary SOC partner', 'ID01'),
('VEND05', 'GlobalNet Infrastructure', 'CAT04', 'Network infrastructure and communications', 'https://globalnet.com', 'Priya Singh', 'priya.singh@globalnet.in', '+1-555-0105', '1000 Network Blvd, Chicago, IL 60601', 'United States', 'Telecommunications', 3500, 520000000.00, 'active', 65.70, 'medium', '2021-05-01', '2024-02-28', '2024-08-28', 'Critical network provider', 'ID01'),
('VEND06', 'DevTools Pro', 'CAT06', 'Software development lifecycle tools', 'https://devtools.pro', 'Neha Kapoor', 'neha.kapoor@devtools.in', '+1-555-0106', '450 Developer Way, Seattle, WA 98101', 'United States', 'Technology', 320, 42000000.00, 'active', 41.20, 'low', '2023-07-15', '2024-07-01', TO_DATE('01/01/2025','DD/MM/YYYY'), 'DevSecOps integration', 'ID01'),
('VEND07', 'ConsultPro Services', 'CAT07', 'Strategic IT consulting and advisory', 'https://consultpro.io', 'Arjun Rao', 'arjun.rao@consultpro.in', '+1-555-0107', '750 Consulting Ave, Denver, CO 80202', 'United States', 'Consulting', 180, 28000000.00, 'active', 55.40, 'medium', '2022-11-01', '2024-06-15', '2024-12-15', 'Compliance advisory partner', 'ID01'),
('VEND08', 'HRConnect Solutions', 'CAT08', 'Human resources management platform', 'https://hrconnect.com', 'Ananya Mehta', 'ananya.mehta@hrconnect.in', '+1-555-0108', '200 HR Plaza, Atlanta, GA 30301', 'United States', 'Human Resources', 150, 15000000.00, 'active', 38.90, 'low', '2023-04-20', '2024-05-10', '2024-11-10', 'HR data processor', 'ID01'),
('VEND09', 'CloudBackup Express', 'CAT01', 'Cloud backup and disaster recovery', 'https://cloudbackup.exp', 'Karan Desai', 'karan.desai@cloudbackup.in', '+1-555-0109', '150 Backup Dr, Phoenix, AZ 85001', 'United States', 'Technology', 200, 18000000.00, 'active', 78.90, 'high', '2022-02-15', '2024-04-01', '2024-10-01', 'DR critical vendor', 'ID01'),
('VEND10', 'SecureIdentity Corp', 'CAT05', 'Identity and access management solutions', 'https://secureid.corp', 'Rishi Gupta', 'rishi.gupta@secureid.in', '+1-555-0110', '400 Identity Way, Portland, OR 97201', 'United States', 'Cybersecurity', 550, 95000000.00, 'active', 28.50, 'low', '2023-01-01', '2024-06-20', '2024-12-20', 'IAM primary provider', 'ID01'),
('VEND11', 'DataFlow Systems', 'CAT02', 'Real-time data integration platform', 'https://dataflow.sys', 'Nisha Iyer', 'nisha.iyer@dataflow.in', '+1-555-0111', '600 Data Street, San Jose, CA 95110', 'United States', 'Technology', 280, 32000000.00, 'under_review', 85.20, 'high', '2022-08-10', '2024-03-20', '2024-09-20', 'Data handling concerns', 'ID01'),
('VEND12', 'EuroSecure Ltd', 'CAT05', 'European security operations center', 'https://eurosecure.eu', 'Siddharth Jain', 'siddharth.jain@eurosecure.in', '+49-555-0112', 'HauptstraÃŸe 100, Berlin, Germany', 'Germany', 'Cybersecurity', 420, 75000000.00, 'active', 52.10, 'medium', '2023-02-28', '2024-05-25', '2024-11-25', 'GDPR specialist', 'ID01');

-- Seed security controls after vendors exist
INSERT INTO security_controls (vendor_id,
    nist_asset_management, nist_risk_assessment, nist_access_control, nist_data_security,
    owasp_broken_access_control, owasp_crypto_failures, owasp_injection, owasp_vulnerable_components,
    cis_asset_inventory, cis_software_inventory, cis_data_protection,
    nist_overall_score, owasp_overall_score, cis_overall_score, comprehensive_score
)
SELECT 
    id,
    75 + (random() * 20)::int,
    70 + (random() * 20)::int,
    65 + (random() * 25)::int,
    80 + (random() * 15)::int,
    70 + (random() * 20)::int,
    85 + (random() * 10)::int,
    75 + (random() * 15)::int,
    60 + (random() * 30)::int,
    CASE WHEN random() > 0.3 THEN 'implemented' ELSE 'partial' END,
    CASE WHEN random() > 0.4 THEN 'implemented' ELSE 'partial' END,
    CASE WHEN random() > 0.5 THEN 'implemented' ELSE 'partial' END,
    60 + (random() * 30)::int,
    60 + (random() * 30)::int,
    60 + (random() * 30)::int,
    60 + (random() * 30)::int
FROM vendors;

-- Seed risk assessments
INSERT INTO risk_assessments (id, vendor_id, assessor_id, assessment_date, security_posture_score, compliance_score, breach_history_score, access_management_score, incident_response_score, business_continuity_score, financial_stability_score, data_protection_score, third_party_risk_score, overall_score, risk_level, ai_confidence_score, ai_recommendations, ai_risk_factors, assessment_method, findings, remediation_required) VALUES
('ASM01', 'VEND01', 'ID02', '2024-06-01 10:00:00+00', 75.0, 82.0, 90.0, 70.0, 68.0, 72.0, 85.0, 78.0, 65.0, 72.50, 'medium', 92.50, 'Implement Zero Trust architecture across cloud environments. Enhance third-party access controls and monitoring. Consider additional DLP controls.', '{"factors": ["third_party_access", "encryption_standards", "incident_response_time"], "trend": "improving"}', 'On-site Audit', 'Strong security posture with room for improvement in incident response and third-party risk management', true),
('ASM02', 'VEND02', 'ID02', '2024-05-15 09:00:00+00', 88.0, 95.0, 92.0, 85.0, 90.0, 88.0, 92.0, 95.0, 80.0, 88.38, 'low', 95.00, 'Maintain current security standards. Consider expanding bug bounty program. Update BIA annually.', '{"factors": ["pci_compliance", "fraud_detection", "data_encryption"], "trend": "stable"}', 'Remote Assessment', 'Excellent security posture with comprehensive compliance coverage', false),
('ASM03', 'VEND03', 'ID02', '2024-04-20 11:00:00+00', 62.0, 70.0, 75.0, 58.0, 55.0, 60.0, 78.0, 65.0, 70.0, 65.92, 'medium', 88.00, 'Strengthen data governance policies. Implement enhanced logging and monitoring. Improve access control mechanisms for PII data.', '{"factors": ["data_governance", "pii_handling", "logging_coverage"], "trend": "attention_needed"}', 'Questionnaire', 'Moderate risk profile with data handling gaps requiring attention', true),
('ASM04', 'VEND04', 'ID02', '2024-03-15 14:00:00+00', 95.0, 98.0, 100.0, 92.0, 95.0, 90.0, 88.0, 96.0, 85.0, 93.22, 'low', 97.50, 'Security vendor exceeds baseline requirements. Recommend as benchmark for other vendors. Consider expanding partnership scope.', '{"factors": ["soc_coverage", "threat_intelligence", "response_time"], "trend": "excellent"}', 'On-site Audit', 'Exemplary security posture with industry-leading practices', false),
('ASM05', 'VEND05', 'ID02', '2024-02-28 10:30:00+00', 68.0, 72.0, 65.0, 62.0, 58.0, 70.0, 85.0, 68.0, 72.0, 68.89, 'medium', 85.00, 'Modernize legacy network equipment. Implement network segmentation improvements. Enhance monitoring capabilities for east-west traffic.', '{"factors": ["legacy_systems", "network_segmentation", "monitoring_coverage"], "trend": "improving"}', 'Hybrid Assessment', 'Established provider with aging infrastructure requiring updates', true),
('ASM06', 'VEND09', 'ID02', '2024-04-01 13:00:00+00', 55.0, 62.0, 45.0, 52.0, 48.0, 58.0, 72.0, 60.0, 55.0, 56.33, 'high', 78.50, 'Critical gaps in disaster recovery testing. Insufficient backup verification procedures. Immediate action required for encryption at rest.', '{"factors": ["dr_testing", "backup_verification", "encryption_gaps"], "trend": "concerning"}', 'On-site Audit', 'Significant gaps in DR capabilities and encryption practices', true),
('ASM07', 'VEND11', 'ID02', '2024-03-20 15:00:00+00', 42.0, 48.0, 35.0, 55.0, 40.0, 52.0, 58.0, 45.0, 50.0, 47.22, 'critical', 82.00, 'Immediate remediation required for data handling practices. Third-party data sharing review urgent. Privacy impact assessment overdue.', '{"factors": ["data_handling", "privacy_compliance", "third_party_sharing"], "trend": "critical"}', 'Forensic Assessment', 'Critical vulnerabilities in data handling and privacy compliance', true);

-- Seed compliance certifications
INSERT INTO compliance_certifications (id, vendor_id, standard, certification_number, certification_body, issue_date, expiry_date, scope, status, compliance_percentage, last_audit_date, next_audit_date, notes) VALUES
('CERT01', 'VEND01', 'ISO27001', 'ISO-2024-TC-001', 'BSI', '2024-01-15', '2027-01-14', 'Cloud infrastructure services', 'compliant', 95.00, '2024-01-10', '2025-01-10', 'Full scope certification'),

('CERT02', 'VEND01', 'SOC2_Type_II', 'SOC-2024-TC-0892', 'Ernst & Young', '2024-03-01', TO_DATE('01/03/2025','DD/MM/YYYY'), 'Cloud platform and services', 'compliant', 92.00, '2024-02-25', '2025-02-25', 'Type II attestation'),
('CERT03', 'VEND01', 'GDPR', 'DPO-2024-TC-100', 'Internal DPO', '2024-02-01', TO_DATE('01/02/2025','DD/MM/YYYY'), 'EU data processing', 'compliant', 88.00, '2024-01-15', '2025-01-15', 'Annual review required'),
('CERT04', 'VEND02', 'PCI_DSS', 'PCI-2024-SP-4521', 'SecurityMetrics', '2024-04-01', '2025-04-01', 'Payment processing', 'compliant', 98.00, '2024-03-28', '2025-03-28', 'Level 1 merchant'),
('CERT05', 'VEND02', 'SOC2_Type_II', 'SOC-2024-SP-1293', 'KPMG', '2024-05-01', '2025-05-01', 'Payment services', 'compliant', 96.00, '2024-04-20', '2025-04-20', 'No exceptions noted'),
('CERT06', 'VEND03', 'ISO27001', 'ISO-2024-DI-002', 'Det Norske Veritas', '2024-02-20', '2027-02-19', 'Analytics platform', 'partially_compliant', 78.00, '2024-02-15', '2025-02-15', 'Minor findings to address'),
('CERT07', 'VEND04', 'ISO27001', 'ISO-2023-CG-015', 'AICPA', '2023-08-15', '2026-08-14', 'Security operations', 'compliant', 99.00, '2023-08-10', '2024-08-10', 'Industry leader'),
('CERT08', 'VEND04', 'NIST_800-53', 'NIST-CG-2024-001', 'Internal Assessment', '2024-04-01', '2025-04-01', 'SOC services', 'compliant', 94.00, '2024-03-28', '2025-03-28', 'High maturity level'),
('CERT09', 'VEND05', 'ISO27001', 'ISO-2022-GN-105', 'British Standards', '2022-06-01', '2025-05-31', 'Network services', 'partially_compliant', 72.00, '2022-05-28', '2024-05-28', 'Renewal approaching - 5 months remaining'),
('CERT10', 'VEND05', 'SOC2_Type_II', 'SOC-2023-GN-2014', 'Deloitte', '2023-11-01', '2024-10-31', 'Network infrastructure', 'pending_review', NULL, '2023-10-25', '2024-10-25', '4 months to renewal'),
('CERT11', 'VEND09', 'ISO27001', 'ISO-2023-CB-078', 'BSI', '2023-03-15', '2026-03-14', 'Backup services', 'non_compliant', 58.00, '2023-03-10', '2024-03-10', 'Multiple findings - remediation in progress'),
('CERT12', 'VEND10', 'ISO27001', 'ISO-2024-SI-042', 'Det Norske Veritas', '2024-01-20', '2027-01-19', 'Identity services', 'compliant', 97.00, '2024-01-15', '2025-01-15', 'Excellent maturity'),
('CERT13', 'VEND10', 'SOC2_Type_II', 'SOC-2024-SI-3652', 'PwC', '2024-02-28', '2025-02-28', 'IAM platform', 'compliant', 95.00, '2024-02-25', '2025-02-25', 'Strong access controls'),
('CERT14', 'VEND12', 'GDPR', 'GDPR-EU-2024-SB', 'German DPA', '2024-04-15', '2026-04-14', 'EU operations', 'compliant', 91.00, '2024-04-10', '2025-04-10', 'Strong EU compliance'),
('CERT15', 'VEND12', 'ISO27001', 'ISO-2024-ES-198', 'TÃœV Rheinland', '2024-03-01', '2027-02-28', 'European SOC', 'compliant', 93.00, '2024-02-25', '2025-02-25', 'Comprehensive coverage');

-- Seed contracts
INSERT INTO contracts (id, vendor_id, contract_number, contract_name, contract_type, start_date, end_date, value, currency, status, auto_renewal, renewal_notice_days, termination_notice_days, data_processing_terms, security_requirements, risk_score, risk_level, notes, created_by) VALUES
('CTR01', 'VEND01', 'CTR-2024-001', 'Enterprise Cloud Services Agreement', 'Master Services Agreement', TO_DATE('01/01/2024','DD/MM/YYYY'), '2026-12-31', 2500000.00, 'USD', 'active', true, 90, 60, true, '{"encryption_required": true, "audit_frequency": "annual", "incident_notification": "24_hours"}', 65.00, 'medium', 'Critical infrastructure contract', 'ID01'),
('CTR02', 'VEND02', 'CTR-2023-015', 'Payment Processing Services', 'Processing Agreement', '2023-04-01', '2025-03-31', 850000.00, 'USD', 'pending_renewal', false, 60, 30, true, '{"pci_compliance": true, "fraud_detection": true, "settlement_time": "T+1"}', 38.00, 'low', 'PCI DSS required', 'ID01'),
('CTR03', 'VEND04', 'CTR-2024-008', 'Managed Security Services', 'Professional Services', '2024-03-01', '2027-02-28', 1800000.00, 'USD', 'active', true, 120, 90, true, '{"soc_coverage": "24x7", "response_sla": "15_minutes", "threat_intelligence": true}', 28.00, 'low', 'Primary SOC provider', 'ID01'),
('CTR04', 'VEND05', 'CTR-2021-022', 'Network Infrastructure Services', 'Infrastructure Services', '2021-07-01', '2024-06-30', 3200000.00, 'USD', 'pending_renewal', false, 90, 60, true, '{"uptime_sla": "99.9%", "bandwidth_sla": true, "latency_sla": "<100ms"}', 72.00, 'medium', 'Expires in 10 days', 'ID01'),
('CTR05', 'VEND09', 'CTR-2023-041', 'Disaster Recovery Services', 'DR Services Agreement', '2023-02-01', '2025-01-31', 450000.00, 'USD', 'active', false, 60, 30, true, '{"rto": "4_hours", "rpo": "1_hour", "dr_testing": "quarterly"}', 82.00, 'high', 'Requires improvement', 'ID01'),
('CTR06', 'VEND10', 'CTR-2024-012', 'Identity and Access Management', 'Platform Subscription', '2024-02-01', '2027-01-31', 720000.00, 'USD', 'active', true, 90, 60, true, '{"sso_required": true, "mfa_required": true, "provisioning": "automated"}', 32.00, 'low', 'Enterprise IAM', 'ID01');

-- Seed security incidents
INSERT INTO security_incidents (id, vendor_id, incident_date, incident_type, severity, description, affected_systems, affected_data_types, data_breach, records_affected, status, created_by) VALUES
('INC01', 'VEND09', '2024-03-15 14:30:00+00', 'Data Breach', 'high', 'Unauthorized access to backup storage systems detected during routine audit', 'Backup Storage Systems', 'Customer Data, Financial Records', true, 15000, 'resolved', 'ID02'),
('INC02', 'VEND03', '2024-04-22 09:15:00+00', 'System Compromise', 'medium', 'Malware detected on analytics server', 'Analytics Platform', 'Internal Analytics Data', false, 0, 'resolved', 'ID02'),
('INC03', 'VEND11', '2024-05-10 16:45:00+00', 'Data Exposure', 'critical', 'PII data found in unsecured development environment', 'Development Systems', 'Customer PII', true, 50000, 'open', 'ID02'),
('INC04', 'VEND01', '2024-02-28 11:00:00+00', 'Denial of Service', 'medium', 'DDoS attack mitigated by cloud provider', 'Cloud Infrastructure', 'None', false, 0, 'resolved', 'ID02'),
('INC05', 'VEND05', '2024-01-15 08:30:00+00', 'Configuration Error', 'low', 'Misconfigured firewall rule exposed internal services temporarily', 'Firewall Systems', 'None', false, 0, 'resolved', 'ID02');

-- Seed remediation tasks
INSERT INTO remediation_tasks (id, vendor_id, assessment_id, incident_id, title, description, category, priority, status, assigned_to, due_date, completed_date, impact_score, effort_score, progress_percentage, notes, created_by) VALUES
('TASK01', 'VEND01', 'ASM01', NULL, 'Implement Zero Trust Architecture', 'Deploy Zero Trust network architecture across all cloud environments', 'Network Security', 'high', 'in_progress', 'ID03', '2024-08-31', NULL, 85.00, 75.00, 35, 'Phase 1 design approved', 'ID02'),
('TASK02', 'VEND09', 'ASM06', 'INC01', 'Enhance Backup Encryption', 'Implement AES-256 encryption for all backup data at rest', 'Data Protection', 'critical', 'overdue', 'ID03', '2024-06-15', NULL, 95.00, 60.00, 40, 'Critical security gap', 'ID02'),
('TASK03', 'VEND11', 'ASM07', 'INC03', 'Secure Development Environment', 'Remove all PII from development systems and implement data masking', 'Data Protection', 'critical', 'open', 'ID03', '2024-06-30', NULL, 98.00, 70.00, 0, 'Immediate action required', 'ID02'),
('TASK04', 'VEND03', 'ASM03', NULL, 'Enhance Data Logging', 'Implement comprehensive logging for all data access events', 'Monitoring', 'high', 'in_progress', 'ID02', '2024-07-31', NULL, 72.00, 45.00, 60, 'SIEM integration ongoing', 'ID02'),
('TASK05', 'VEND01', 'ASM01', NULL, 'Third-Party Access Review', 'Conduct comprehensive review of all third-party access privileges', 'Access Management', 'medium', 'completed', 'ID02', '2024-06-15', '2024-06-10', 65.00, 35.00, 100, 'Completed ahead of schedule', 'ID02'),
('TASK06', 'VEND05', 'ASM05', NULL, 'Network Equipment Upgrade', 'Replace end-of-life network equipment with modern hardware', 'Infrastructure', 'high', 'in_progress', 'ID03', '2024-09-30', NULL, 78.00, 85.00, 25, 'Procurement in progress', 'ID02');

-- Seed AI recommendations
INSERT INTO ai_recommendations (id, vendor_id, assessment_id, recommendation_type, title, description, current_state, recommended_action, expected_impact, confidence_score, priority, status, risk_reduction_estimate, effort_estimate) VALUES
('REC01', 'VEND01', 'ASM01', 'security', 'Implement Privileged Access Management', 'Deploy PAM solution for enhanced control over administrative access', 'Basic admin controls with manual approval', 'Deploy CyberArk or HashiCorp Vault for automated privileged access management', 'Reduce risk of insider threats and unauthorized access by 40%', 92.00, 'high', 'pending', 25.00, '3-4 months'),
('REC02', 'VEND01', 'ASM01', 'compliance', 'Enhance BCP Testing Frequency', 'Increase business continuity testing from annual to quarterly', 'Annual testing with limited scenarios', 'Implement quarterly BCP drills with varied scenarios including ransomware', 'Improve resilience and reduce recovery time by 35%', 88.00, 'medium', 'pending', 15.00, '1-2 months'),
('REC03', 'VEND09', 'ASM06', 'security', 'Critical: Encryption at Rest', 'Immediate implementation of encryption for all backup data', 'Only encryption in transit implemented', 'Deploy AES-256 encryption for all backup storage immediately', 'Address critical security gap, prevent data breaches', 98.00, 'critical', 'pending', 45.00, '1 month'),
('REC04', 'VEND03', 'ASM03', 'data_governance', 'Implement Data Classification', 'Deploy automated data classification and DLP controls', 'Manual data classification processes', 'Implement Microsoft Purview or similar for automated classification', 'Reduce risk of data mishandling by 50%', 85.00, 'high', 'pending', 20.00, '2-3 months'),
('REC05', 'VEND11', 'ASM07', 'privacy', 'Urgent: PII Data Masking', 'Implement comprehensive data masking for all non-production environments', 'PII present in development', 'Deploy enterprise data masking solution, scrub all development data', 'Eliminate PII exposure risk in development', 96.00, 'critical', 'pending', 55.00, '2 weeks'),
('REC06', 'VEND02', 'ASM02', 'security', 'Expand Bug Bounty Program', 'Increase scope and rewards of bug bounty program', 'Limited bug bounty scope', 'Partner with HackerOne for expanded scope including API testing', 'Identify vulnerabilities earlier, improve security posture', 78.00, 'low', 'pending', 8.00, '1 month'),
('REC07', 'VEND05', 'ASM05', 'infrastructure', 'Network Segmentation Enhancement', 'Implement micro-segmentation for critical network zones', 'Flat network with limited segmentation', 'Deploy VMware NSX or similar for micro-segmentation', 'Reduce blast radius of attacks by 60%', 90.00, 'high', 'pending', 30.00, '4-6 months'),
('REC08', 'VEND04', NULL, 'security', 'Maintain Current Standard', 'Continue current best practices and consider expanding scope', 'Industry-leading security posture', 'Document current practices as benchmark, expand monitoring coverage', 'Maintain excellent risk posture', 95.00, 'low', 'implemented', 5.00, 'N/A');

-- Seed alerts
INSERT INTO alerts (id, vendor_id, alert_type, title, message, severity, source, is_read) VALUES
('ALRT01', 'VEND11', 'data_exposure', 'Critical: PII Data Exposure Detected', 'PII data found exposed in development environment. Immediate action required.', 'critical', 'AI Risk Monitor', false),
('ALRT02', 'VEND09', 'encryption_gap', 'Encryption Gap Identified', 'Backup systems lack encryption at rest. Remediation overdue.', 'high', 'Security Assessment', false),
('ALRT03', 'VEND05', 'contract_expiry', 'Contract Expiring Soon', 'Network Infrastructure Services contract expires in 10 days. Renewal action needed.', 'high', 'Contract Monitor', false),
('ALRT04', 'VEND05', 'certification_expiry', 'ISO27001 Certification Expiring', 'ISO27001 certification expires in 5 months. Plan renewal audit.', 'medium', 'Compliance Tracker', true),
('ALRT05', 'VEND01', 'assessment_due', 'Annual Assessment Due', 'Annual risk assessment due for TechCloud Solutions. Schedule within 30 days.', 'medium', 'Assessment Scheduler', false),
('ALRT06', 'VEND02', 'contract_renewal', 'Contract Renewal Window', 'Payment Processing Services contract renewal window opens in 60 days.', 'low', 'Contract Monitor', true),
('ALRT07', 'VEND04', 'best_practice', 'Excellent Security Posture', 'CyberGuard Security maintains exemplary security standards. Benchmark candidate.', 'info', 'AI Risk Assessment', false),
('ALRT08', NULL, 'system', 'Weekly Risk Report Generated', 'Weekly vendor risk summary report is available for review.', 'info', 'System', true);

-- Seed reports
INSERT INTO reports (id, report_type, title, description, parameters, generated_by, report_data) VALUES
('RPT01', 'risk_summary', 'Monthly Risk Summary', 'Comprehensive risk analysis for all active suppliers', '{"period": "2024-06", "include_charts": true}', 'ID01', '{"summary": {"total_vendors": 12, "high_risk": 2, "medium_risk": 4, "low_risk": 6}}'),
('RPT02', 'compliance', 'Compliance Status Report', 'Overview of compliance certifications and gaps', '{"include_expiry": true, "days_ahead": 90}', 'ID03', '{"total_certs": 15, "expiring_90_days": 3, "compliant": 11}'),
('RPT03', 'contract', 'Contract Renewal Report', 'Contracts approaching renewal in next 120 days', '{"days_ahead": 120}', 'ID01', '{"expiring_contracts": 2, "total_value": 4050000}'),
('RPT04', 'vendor_detail', 'TechCloud Solutions Profile', 'Detailed vendor analysis and risk assessment', '{"vendor_id": "VEND01"}', 'ID02', '{"overall_score": 72.5, "trend": "improving"}');

