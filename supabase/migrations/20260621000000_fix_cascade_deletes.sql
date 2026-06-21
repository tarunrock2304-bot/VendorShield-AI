-- Fix foreign key constraints to enable CASCADE deletes
-- This migration updates all foreign key constraints referencing vendors to use ON DELETE CASCADE

-- Drop existing constraints and recreate with CASCADE
ALTER TABLE risk_assessments DROP CONSTRAINT IF EXISTS risk_assessments_vendor_id_fkey;
ALTER TABLE risk_assessments ADD CONSTRAINT risk_assessments_vendor_id_fkey 
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;

ALTER TABLE compliance_certifications DROP CONSTRAINT IF EXISTS compliance_certifications_vendor_id_fkey;
ALTER TABLE compliance_certifications ADD CONSTRAINT compliance_certifications_vendor_id_fkey 
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;

ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_vendor_id_fkey;
ALTER TABLE contracts ADD CONSTRAINT contracts_vendor_id_fkey 
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;

ALTER TABLE security_incidents DROP CONSTRAINT IF EXISTS security_incidents_vendor_id_fkey;
ALTER TABLE security_incidents ADD CONSTRAINT security_incidents_vendor_id_fkey 
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;

ALTER TABLE remediation_tasks DROP CONSTRAINT IF EXISTS remediation_tasks_vendor_id_fkey;
ALTER TABLE remediation_tasks ADD CONSTRAINT remediation_tasks_vendor_id_fkey 
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;

ALTER TABLE ai_recommendations DROP CONSTRAINT IF EXISTS ai_recommendations_vendor_id_fkey;
ALTER TABLE ai_recommendations ADD CONSTRAINT ai_recommendations_vendor_id_fkey 
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;

ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_vendor_id_fkey;
ALTER TABLE alerts ADD CONSTRAINT alerts_vendor_id_fkey 
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;

ALTER TABLE security_controls DROP CONSTRAINT IF EXISTS security_controls_vendor_id_fkey;
ALTER TABLE security_controls ADD CONSTRAINT security_controls_vendor_id_fkey 
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;
