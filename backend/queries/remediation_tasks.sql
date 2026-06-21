-- remediation_tasks.sql
-- Query to fetch remediation tasks with related vendor and assignee info
SELECT
  rt.id,
  rt.vendor_id,
  v.name AS vendor_name,
  rt.title,
  rt.description,
  rt.category,
  rt.priority,
  rt.status,
  rt.assigned_to,
  u.full_name AS assigned_to_name,
  rt.due_date,
  rt.completed_date,
  rt.progress_percentage,
  rt.notes,
  rt.created_by,
  rt.created_at,
  rt.updated_at
FROM remediation_tasks rt
LEFT JOIN vendors v ON v.id = rt.vendor_id
LEFT JOIN users u ON u.id = rt.assigned_to
ORDER BY rt.due_date ASC NULLS LAST;

-- DDL: create table if not exists (id uses short VARCHAR keys)
CREATE TABLE IF NOT EXISTS remediation_tasks (
  id VARCHAR(20) PRIMARY KEY,
  vendor_id VARCHAR(20) REFERENCES vendors(id),
  assessment_id VARCHAR(20),
  incident_id VARCHAR(20),
  title TEXT NOT NULL,
  description TEXT,
  category VARCHAR(100),
  priority VARCHAR(20),
  status VARCHAR(20),
  assigned_to VARCHAR(20) REFERENCES users(id),
  due_date TIMESTAMP,
  completed_date TIMESTAMP,
  impact_score NUMERIC(6,2),
  effort_score NUMERIC(6,2),
  progress_percentage INTEGER DEFAULT 0,
  notes TEXT,
  created_by VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed: 10 remediation tasks (short IDs, Indian-style context)
INSERT INTO remediation_tasks (id, vendor_id, assessment_id, incident_id, title, description, category, priority, status, assigned_to, due_date, completed_date, impact_score, effort_score, progress_percentage, notes, created_by, created_at, updated_at)
VALUES
('TASK01', 'VEND01', 'ASM01', NULL, 'Implement Zero Trust Architecture', 'Deploy Zero Trust network segmentation and strong identity controls for cloud workloads.', 'Network Security', 'high', 'in_progress', 'ID03', '2024-08-31', NULL, 85.00, 75.00, 35, 'Phase 1 design approved', 'ID02', NOW(), NOW()),
('TASK02', 'VEND02', 'ASM02', NULL, 'Encrypt Backups At Rest', 'Enable AES-256 encryption for all backup targets and verify key management.', 'Data Protection', 'critical', 'overdue', 'ID04', '2024-06-15', NULL, 95.00, 60.00, 40, 'Critical security gap', 'ID02', NOW(), NOW()),
('TASK03', 'VEND03', 'ASM03', NULL, 'Implement Data Masking', 'Mask all PII in non-production environments and secure test datasets.', 'Data Governance', 'critical', 'open', 'ID05', '2024-06-30', NULL, 98.00, 70.00, 0, 'Immediate action required', 'ID02', NOW(), NOW()),
('TASK04', 'VEND04', 'ASM04', NULL, 'SOC Tuning and SIEM Integration', 'Integrate vendor logs into SIEM and tune SOC rules for high-fidelity alerts.', 'Monitoring', 'high', 'in_progress', 'ID06', '2024-07-31', NULL, 72.00, 45.00, 60, 'SIEM integration ongoing', 'ID02', NOW(), NOW()),
('TASK05', 'VEND05', 'ASM05', 'INC01', 'Review Third-Party Access', 'Audit and restrict third-party privileged access; apply least privilege.', 'Access Management', 'medium', 'completed', 'ID07', '2024-06-15', '2024-06-10', 65.00, 35.00, 100, 'Completed ahead of schedule', 'ID02', NOW(), NOW()),
('TASK06', 'VEND06', 'ASM06', NULL, 'DevSecOps Pipeline Hardening', 'Enforce SCA, pipeline secrets management and policy-as-code.', 'SDLC Security', 'high', 'in_progress', 'ID08', '2024-09-30', NULL, 78.00, 85.00, 25, 'Procurement in progress', 'ID02', NOW(), NOW()),
('TASK07', 'VEND07', 'ASM07', 'INC03', 'Privacy Impact Assessment', 'Conduct PIA for data-sharing workflows and remediate gaps.', 'Privacy', 'critical', 'open', 'ID09', '2024-06-20', NULL, 88.00, 50.00, 10, 'PIA kickoff scheduled', 'ID02', NOW(), NOW()),
('TASK08', 'VEND08', 'ASM08', NULL, 'HR Data Retention Review', 'Update retention policies and minimize PII exposure in HR integrations.', 'Policy', 'low', 'open', 'ID10', '2024-07-01', NULL, 45.00, 30.00, 5, 'Policy draft under review', 'ID02', NOW(), NOW()),
('TASK09', 'VEND09', 'ASM09', 'INC01', 'Disaster Recovery Runbook', 'Validate DR runbook and perform tabletop and live failover tests.', 'Business Continuity', 'medium', 'in_progress', 'ID03', '2024-08-01', NULL, 82.00, 55.00, 20, 'DR test scheduled', 'ID02', NOW(), NOW()),
('TASK10', 'VEND10', 'ASM10', NULL, 'Identity Provider Hardening', 'Enforce MFA, session timeouts and SSO security posture for IAM provider.', 'Identity & Access', 'high', 'open', 'ID04', '2024-09-15', NULL, 68.00, 40.00, 0, 'MFA policy rollout', 'ID02', NOW(), NOW());

