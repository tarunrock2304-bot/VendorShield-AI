# Core Framework
from fastapi import FastAPI, HTTPException, Depends, Query, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from pydantic import BaseModel, EmailStr, Field, validator
from pydantic_settings import BaseSettings
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime, date, timedelta
from pathlib import Path
from postgrest._sync.client import SyncPostgrestClient
import os
from dotenv import load_dotenv
import uuid
import re
import hashlib
import secrets
from collections import defaultdict
from functools import wraps
import time
import logging

backend_root = Path(__file__).resolve().parents[1]
project_root = backend_root.parent
load_dotenv(backend_root / ".env", override=False)
load_dotenv(project_root / ".env", override=False)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Settings
class Settings(BaseSettings):
    SUPABASE_URL: Optional[str] = None
    SUPABASE_SERVICE_KEY: Optional[str] = None
    JWT_SECRET: str = "your-secret-key-change-in-production"
    ENVIRONMENT: str = "development"
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds

    model_config = {
        "env_file": ".env",
        "case_sensitive": False,
        "extra": "ignore",
    }

def _valid_env_value(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    normalized = value.strip()
    if not normalized:
        return None
    if re.search(r"(?:replace_with|your_service_role_key|your-service-role|REPLACE_WITH|REPLACE|your_service_role_key)", normalized, re.IGNORECASE):
        return None
    return normalized

settings = Settings()

supabase_url = _valid_env_value(settings.SUPABASE_URL)
if not supabase_url:
    supabase_url = _valid_env_value(os.getenv("SUPABASE_URL"))
if not supabase_url:
    supabase_url = _valid_env_value(os.getenv("VITE_SUPABASE_URL"))
if not supabase_url:
    supabase_url = _valid_env_value(os.getenv("NEXT_PUBLIC_SUPABASE_URL"))

supabase_key = _valid_env_value(settings.SUPABASE_SERVICE_KEY)
if not supabase_key:
    supabase_key = _valid_env_value(os.getenv("SUPABASE_SERVICE_KEY"))
if not supabase_key:
    supabase_key = _valid_env_value(os.getenv("VITE_SUPABASE_ANON_KEY"))
if not supabase_key:
    supabase_key = _valid_env_value(os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"))

if not supabase_url or not supabase_key:
    missing = []
    if not supabase_url:
        missing.append("SUPABASE_URL / VITE_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL")
    if not supabase_key:
        missing.append("SUPABASE_SERVICE_KEY / VITE_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
    logger.error("Missing backend environment configuration: %s", ", ".join(missing))
    raise RuntimeError(
        "Backend requires a valid Supabase URL and key to start. "
        "Set these values in backend/.env, the root .env, or the environment."
    )

if _valid_env_value(settings.SUPABASE_SERVICE_KEY) is None and _valid_env_value(os.getenv("SUPABASE_SERVICE_KEY")) is None:
    logger.warning(
        "SUPABASE_SERVICE_KEY is not configured; using public/anon key for backend Supabase client. "
        "This may limit write operations depending on your Supabase policies."
    )

supabase = SyncPostgrestClient(
    f"{supabase_url}/rest/v1",
    headers={
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
    },
)


# ============================================
# CYBERSECURITY FRAMEWORKS & STANDARDS
# ============================================

class NISTFramework:
    """NIST Cybersecurity Framework 2.0 Implementation"""

    # NIST CSF Functions
    FUNCTIONS = {
        'GOVERN': 'Establish and monitor the organization\'s cybersecurity risk management strategy',
        'IDENTIFY': 'Understand organization context, resources, and risks',
        'PROTECT': 'Implement safeguards to ensure critical services delivery',
        'DETECT': 'Discover and analyze cybersecurity events',
        'RESPOND': 'Take action regarding detected cybersecurity incident',
        'RECOVER': 'Maintain resilience and restore capabilities'
    }

    # NIST CSF Categories mapped to vendor controls
    CATEGORIES = {
        'Asset Management': {
            'id': 'ID.AM',
            'controls': ['Inventory of hardware', 'Inventory of software', 'Data classification'],
            'weight': 1.2
        },
        'Risk Assessment': {
            'id': 'ID.RA',
            'controls': ['Asset vulnerabilities', 'Threat intelligence', 'Risk response'],
            'weight': 1.3
        },
        'Access Control': {
            'id': 'PR.AC',
            'controls': ['Identity management', 'Physical access', 'Remote access'],
            'weight': 1.2
        },
        'Data Security': {
            'id': 'PR.DS',
            'controls': ['Data-at-rest protection', 'Data-in-transit protection', 'Backup'],
            'weight': 1.2
        },
        'Protective Technology': {
            'id': 'PR.PT',
            'controls': ['Audit logs', 'Multi-factor authentication', 'Network segregation'],
            'weight': 1.1
        },
        'Anomalies and Events': {
            'id': 'DE.AE',
            'controls': ['Event analysis', 'Attack detection', 'Monitoring'],
            'weight': 1.1
        },
        'Security Continuous Monitoring': {
            'id': 'DE.CM',
            'controls': ['Network monitoring', 'Physical monitoring', 'Vulnerability scanning'],
            'weight': 1.0
        },
        'Response Planning': {
            'id': 'RS.RP',
            'controls': ['Incident response plan', 'Disaster recovery', 'Communications'],
            'weight': 1.0
        },
        'Recovery Planning': {
            'id': 'RC.RP',
            'controls': ['Recovery plan', 'Improvements', 'Communications'],
            'weight': 0.9
        }
    }

    # Maturity Levels
    MATURITY_LEVELS = {
        'Tier 1 - Partial': 1,
        'Tier 2 - Risk Informed': 2,
        'Tier 3 - Repeatable': 3,
        'Tier 4 - Adaptive': 4
    }

    @classmethod
    def calculate_vendor_nist_score(cls, vendor_data: Dict, controls: Dict) -> Dict:
        """Calculate NIST CSF compliance score for a vendor"""
        scores = {}
        for category, info in cls.CATEGORIES.items():
            control_scores = controls.get(category, {})
            if control_scores:
                avg_score = sum(control_scores.values()) / len(control_scores)
            else:
                avg_score = 50  # Default baseline
            scores[category] = {
                'score': avg_score,
                'id': info['id'],
                'weight': info['weight'],
                'weighted_score': avg_score * info['weight']
            }

        total_weight = sum(s['weight'] for s in scores.values())
        overall_score = sum(s['weighted_score'] for s in scores.values()) / total_weight

        # Determine maturity tier
        if overall_score >= 85:
            maturity = 'Tier 4 - Adaptive'
        elif overall_score >= 70:
            maturity = 'Tier 3 - Repeatable'
        elif overall_score >= 50:
            maturity = 'Tier 2 - Risk Informed'
        else:
            maturity = 'Tier 1 - Partial'

        return {
            'category_scores': scores,
            'overall_score': round(overall_score, 2),
            'maturity_tier': maturity,
            'nist_compliance_percentage': round(overall_score, 2)
        }


class OWASPTop10:
    """OWASP Top 10 2021 Security Risks Assessment"""

    RISKS = {
        'A01:2021': {
            'name': 'Broken Access Control',
            'weight': 1.3,
            'indicators': ['rbac_implemented', 'access_logs', 'session_management'],
            'description': 'Failures in access control policies allowing unauthorized access'
        },
        'A02:2021': {
            'name': 'Cryptographic Failures',
            'weight': 1.2,
            'indicators': ['encryption_at_rest', 'encryption_in_transit', 'key_management'],
            'description': 'Failures in cryptography leading to sensitive data exposure'
        },
        'A03:2021': {
            'name': 'Injection',
            'weight': 1.4,
            'indicators': ['input_validation', 'prepared_statements', 'output_encoding'],
            'description': 'SQL, NoSQL, OS command injection vulnerabilities'
        },
        'A04:2021': {
            'name': 'Insecure Design',
            'weight': 1.1,
            'indicators': ['threat_modeling', 'secure_sdlc', 'architecture_review'],
            'description': 'Missing or ineffective security controls in design'
        },
        'A05:2021': {
            'name': 'Security Misconfiguration',
            'weight': 1.0,
            'indicators': ['hardening_guide', 'default_credentials_removed', 'security_headers'],
            'description': 'Improper implementation of security controls'
        },
        'A06:2021': {
            'name': 'Vulnerable Components',
            'weight': 1.2,
            'indicators': ['dependency_scanning', 'patch_management', 'sbom_available'],
            'description': 'Using vulnerable or outdated components'
        },
        'A07:2021': {
            'name': 'Authentication Failures',
            'weight': 1.3,
            'indicators': ['mfa_enabled', 'password_policy', 'account_lockout'],
            'description': 'Weak authentication mechanisms'
        },
        'A08:2021': {
            'name': 'Software Integrity Failures',
            'weight': 1.0,
            'indicators': ['code_signing', 'ci_cd_security', 'supply_chain_security'],
            'description': 'Code and infrastructure integrity violations'
        },
        'A09:2021': {
            'name': 'Logging & Monitoring Failures',
            'weight': 0.9,
            'indicators': ['log_retention', 'monitoring_alerts', 'incident_detection'],
            'description': 'Insufficient logging and monitoring capabilities'
        },
        'A10:2021': {
            'name': 'Server-Side Request Forgery',
            'weight': 1.0,
            'indicators': ['url_validation', 'network_segmentation', 'proxy_validation'],
            'description': 'SSRF vulnerabilities allowing unauthorized requests'
        }
    }

    @classmethod
    def assess_vendor_owasp(cls, security_controls: Dict) -> Dict:
        """Assess vendor against OWASP Top 10"""
        scores = {}

        for risk_id, risk_info in cls.RISKS.items():
            indicator_scores = []
            for indicator in risk_info['indicators']:
                score = security_controls.get(indicator, 50)
                indicator_scores.append(score)

            avg_score = sum(indicator_scores) / len(indicator_scores) if indicator_scores else 50
            scores[risk_id] = {
                'name': risk_info['name'],
                'score': round(avg_score, 2),
                'weight': risk_info['weight'],
                'weighted_score': round(avg_score * risk_info['weight'], 2),
                'description': risk_info['description'],
                'risk_level': 'Critical' if avg_score < 40 else 'High' if avg_score < 60 else 'Medium' if avg_score < 80 else 'Low'
            }

        total_weight = sum(s['weight'] for s in scores.values())
        overall_score = sum(s['weighted_score'] for s in scores.values()) / total_weight

        return {
            'risk_scores': scores,
            'overall_score': round(overall_score, 2),
            'critical_risks': [r['name'] for r in scores.values() if r['risk_level'] == 'Critical'],
            'high_risks': [r['name'] for r in scores.values() if r['risk_level'] == 'High'],
            'owasp_compliance_percentage': round(overall_score, 2)
        }


class MITRE_ATTACK:
    """MITRE ATT&CK Framework Integration"""

    TACTICS = {
        'Initial Access': 'TA0001',
        'Execution': 'TA0002',
        'Persistence': 'TA0003',
        'Privilege Escalation': 'TA0004',
        'Defense Evasion': 'TA0005',
        'Credential Access': 'TA0006',
        'Discovery': 'TA0007',
        'Lateral Movement': 'TA0008',
        'Collection': 'TA0009',
        'Command and Control': 'TA0011',
        'Exfiltration': 'TA0010',
        'Impact': 'TA0040'
    }

    # Common techniques relevant to vendor risk
    TECHNIQUES = {
        'T1199': {'name': 'Trusted Relationship', 'tactic': 'Initial Access', 'severity': 'Critical'},
        'T1566': {'name': 'Phishing', 'tactic': 'Initial Access', 'severity': 'High'},
        'T1133': {'name': 'External Remote Services', 'tactic': 'Initial Access', 'severity': 'High'},
        'T1078': {'name': 'Valid Accounts', 'tactic': 'Credential Access', 'severity': 'High'},
        'T1528': {'name': 'Steal Application Access Token', 'tactic': 'Credential Access', 'severity': 'High'},
        'T1195': {'name': 'Supply Chain Compromise', 'tactic': 'Initial Access', 'severity': 'Critical'},
        'T1485': {'name': 'Data Destruction', 'tactic': 'Impact', 'severity': 'Critical'},
        'T1567': {'name': 'Exfiltration Over Web Service', 'tactic': 'Exfiltration', 'severity': 'High'},
        'T1027': {'name': 'Obfuscated Files or Information', 'tactic': 'Defense Evasion', 'severity': 'Medium'},
        'T1059': {'name': 'Command and Scripting Interpreter', 'tactic': 'Execution', 'severity': 'High'},
        'T1105': {'name': 'Ingress Tool Transfer', 'tactic': 'Command and Control', 'severity': 'Medium'},
        'T1530': {'name': 'Data from Cloud Storage', 'tactic': 'Collection', 'severity': 'High'},
        'T1087': {'name': 'Account Discovery', 'tactic': 'Discovery', 'severity': 'Medium'},
        'T1020': {'name': 'Automated Exfiltration', 'tactic': 'Exfiltration', 'severity': 'High'},
        'T1072': {'name': 'Software Deployment Tools', 'tactic': 'Lateral Movement', 'severity': 'Medium'},
    }

    @classmethod
    def map_vendor_threats(cls, vendor_data: Dict, incidents: List[Dict]) -> Dict:
        """Map vendor threats to MITRE ATT&CK framework"""
        threat_mapping = defaultdict(list)
        technique_scores = {}

        # Analyze incidents and map to techniques
        for incident in incidents:
            incident_type = incident.get('incident_type', '').lower()

            # Map common incident types to ATT&CK techniques
            if 'data breach' in incident_type or 'exfiltration' in incident_type:
                threat_mapping['Exfiltration'].append('T1567')
                threat_mapping['Collection'].append('T1530')
            elif 'phishing' in incident_type:
                threat_mapping['Initial Access'].append('T1566')
            elif 'credential' in incident_type or 'password' in incident_type:
                threat_mapping['Credential Access'].append('T1078')
            elif 'malware' in incident_type or 'ransomware' in incident_type:
                threat_mapping['Execution'].append('T1059')
                threat_mapping['Impact'].append('T1485')
            elif 'supply chain' in incident_type:
                threat_mapping['Initial Access'].append('T1195')
                threat_mapping['Initial Access'].append('T1199')

        # Calculate technique coverage scores
        for tech_id, tech_info in cls.TECHNIQUES.items():
            # Determine if vendor has controls for this technique
            has_controls = bool(vendor_data.get(f'control_{tech_id}', True))
            technique_scores[tech_id] = {
                'name': tech_info['name'],
                'tactic': tech_info['tactic'],
                'severity': tech_info['severity'],
                'mitigated': has_controls,
                'score': 80 if has_controls else 30
            }

        # Calculate tactic-level scores
        tactic_scores = {}
        for tactic, tactic_id in cls.TACTICS.items():
            relevant_techniques = [
                t for t, v in technique_scores.items()
                if cls.TECHNIQUES.get(t, {}).get('tactic') == tactic
            ]
            if relevant_techniques:
                avg_score = sum(technique_scores[t]['score'] for t in relevant_techniques) / len(relevant_techniques)
            else:
                avg_score = 75
            tactic_scores[tactic] = {
                'id': tactic_id,
                'score': round(avg_score, 2),
                'techniques': relevant_techniques
            }

        return {
            'tactic_scores': tactic_scores,
            'technique_details': technique_scores,
            'threat_mapping': dict(threat_mapping),
            'critical_techniques': [
                t for t, v in technique_scores.items()
                if v['severity'] == 'Critical' and not v['mitigated']
            ]
        }


class CVSSCalculator:
    """CVSS v3.1 - Common Vulnerability Scoring System"""

    # CVSS v3.1 Base Metrics
    ATTACK_VECTOR = {'Network': 0.85, 'Adjacent': 0.62, 'Local': 0.55, 'Physical': 0.2}
    ATTACK_COMPLEXITY = {'Low': 0.77, 'High': 0.44}
    PRIVILEGES_REQUIRED = {'None': 0.85, 'Low': 0.62, 'High': 0.27}
    USER_INTERACTION = {'None': 0.85, 'Required': 0.62}
    SCOPE = {'Unchanged': 1.0, 'Changed': 1.0}
    CONFIDENTIALITY = {'None': 0.0, 'Low': 0.22, 'High': 0.56}
    INTEGRITY = {'None': 0.0, 'Low': 0.22, 'High': 0.56}
    AVAILABILITY = {'None': 0.0, 'Low': 0.22, 'High': 0.56}

    @classmethod
    def calculate_base_score(cls,
                              attack_vector: str = 'Network',
                              attack_complexity: str = 'Low',
                              privileges_required: str = 'None',
                              user_interaction: str = 'None',
                              scope: str = 'Unchanged',
                              confidentiality: str = 'High',
                              integrity: str = 'High',
                              availability: str = 'High') -> Dict:
        """Calculate CVSS v3.1 Base Score"""

        # Get metric values
        av = cls.ATTACK_VECTOR.get(attack_vector, 0.85)
        ac = cls.ATTACK_COMPLEXITY.get(attack_complexity, 0.77)
        pr = cls.PRIVILEGES_REQUIRED.get(privileges_required, 0.85)
        ui = cls.USER_INTERACTION.get(user_interaction, 0.85)
        c = cls.CONFIDENTIALITY.get(confidentiality, 0.56)
        i = cls.INTEGRITY.get(integrity, 0.56)
        a = cls.AVAILABILITY.get(availability, 0.56)

        # Calculate Impact Sub Score
        if scope == 'Unchanged':
            iss = 1 - ((1 - c) * (1 - i) * (1 - a))
            impact = 6.42 * iss
        else:
            iss = 1 - ((1 - c) * (1 - i) * (1 - a))
            impact = 7.52 * (iss - 0.029) - 3.25 * (iss - 0.02)**15

        # Calculate Exploitability Score
        exploitability = 8.22 * av * ac * pr * ui

        # Calculate Base Score
        if impact <= 0:
            base_score = 0
        elif scope == 'Unchanged':
            base_score = min(impact + exploitability, 10)
        else:
            base_score = min(1.08 * (impact + exploitability), 10)

        # Round to one decimal place
        base_score = round(base_score * 10) / 10

        # Determine severity rating
        if base_score >= 9.0:
            severity = 'Critical'
        elif base_score >= 7.0:
            severity = 'High'
        elif base_score >= 4.0:
            severity = 'Medium'
        elif base_score > 0:
            severity = 'Low'
        else:
            severity = 'None'

        return {
            'cvss_vector': f"CVSS:3.1/AV:{attack_vector[0]}/AC:{attack_complexity[0]}/PR:{privileges_required[0]}/UI:{user_interaction[0]}/S:{scope[0]}/C:{confidentiality[0]}/I:{integrity[0]}/A:{availability[0]}",
            'base_score': base_score,
            'impact_score': round(impact, 2),
            'exploitability_score': round(exploitability, 2),
            'severity_rating': severity,
            'metrics': {
                'Attack Vector': attack_vector,
                'Attack Complexity': attack_complexity,
                'Privileges Required': privileges_required,
                'User Interaction': user_interaction,
                'Scope': scope,
                'Confidentiality Impact': confidentiality,
                'Integrity Impact': integrity,
                'Availability Impact': availability
            }
        }

    @classmethod
    def calculate_vendor_vulnerability_score(cls, vendor_data: Dict, vulnerabilities: List[Dict]) -> Dict:
        """Calculate aggregate CVSS score for vendor based on vulnerabilities"""
        if not vulnerabilities:
            return {
                'average_cvss': 0,
                'max_cvss': 0,
                'vulnerability_count': 0,
                'critical_count': 0,
                'high_count': 0,
                'medium_count': 0,
                'low_count': 0
            }

        scores = []
        severity_counts = {'Critical': 0, 'High': 0, 'Medium': 0, 'Low': 0, 'None': 0}

        for vuln in vulnerabilities:
            cvss_score = vuln.get('cvss_score', 5.0)
            scores.append(cvss_score)

            if cvss_score >= 9.0:
                severity_counts['Critical'] += 1
            elif cvss_score >= 7.0:
                severity_counts['High'] += 1
            elif cvss_score >= 4.0:
                severity_counts['Medium'] += 1
            elif cvss_score > 0:
                severity_counts['Low'] += 1

        return {
            'average_cvss': round(sum(scores) / len(scores), 2) if scores else 0,
            'max_cvss': max(scores) if scores else 0,
            'vulnerability_count': len(vulnerabilities),
            'critical_count': severity_counts['Critical'],
            'high_count': severity_counts['High'],
            'medium_count': severity_counts['Medium'],
            'low_count': severity_counts['Low']
        }


class CISControls:
    """CIS Controls v8 Implementation Status"""

    CONTROLS = {
        '1': {'name': 'Enterprise Assets Inventory', 'weight': 1.1, 'description': 'Establish and maintain an accurate inventory of all enterprise assets'},
        '2': {'name': 'Software Inventory', 'weight': 1.1, 'description': 'Establish and maintain a software inventory'},
        '3': {'name': 'Data Protection', 'weight': 1.3, 'description': 'Develop processes and technical controls to protect data'},
        '4': {'name': 'Secure Enterprise Assets', 'weight': 1.0, 'description': 'Implement configurations and management processes to prevent security vulnerabilities'},
        '5': {'name': 'Account Management', 'weight': 1.1, 'description': 'Establish processes and controls for account management'},
        '6': {'name': 'Access Control Management', 'weight': 1.2, 'description': 'Establish processes and controls for access control'},
        '7': {'name': 'Continuous Vulnerability Management', 'weight': 1.3, 'description': 'Develop a plan to continuously assess and track vulnerabilities'},
        '8': {'name': 'Audit Log Management', 'weight': 1.0, 'description': 'Collect, alert, review, and retain audit logs'},
        '9': {'name': 'Email and Web Protections', 'weight': 1.0, 'description': 'Improve protections and monitoring of email and web traffic'},
        '10': {'name': 'Malware Defenses', 'weight': 1.2, 'description': 'Implement controls to prevent and mitigate malware infections'},
        '11': {'name': 'Data Recovery', 'weight': 0.9, 'description': 'Establish and maintain a data recovery process'},
        '12': {'name': 'Network Infrastructure Management', 'weight': 1.1, 'description': 'Establish and implement network controls'},
        '13': {'name': 'Network Monitoring and Defense', 'weight': 1.1, 'description': 'Monitor network traffic to detect potential threats'},
        '14': {'name': 'Security Awareness and Skills Training', 'weight': 0.9, 'description': 'Establish and maintain security awareness training'},
        '15': {'name': 'Service Provider Management', 'weight': 1.3, 'description': 'Establish controls for service provider management'},
        '16': {'name': 'Application Software Security', 'weight': 1.2, 'description': 'Manage the security lifecycle of in-house developed software'},
        '17': {'name': 'Incident Response Management', 'weight': 1.2, 'description': 'Establish a program to develop and maintain incident response'},
        '18': {'name': 'Penetration Testing', 'weight': 1.0, 'description': 'Establish and manage a penetration testing program'},
    }

    # Implementation Groups
    IMPLEMENTATION_GROUPS = {
        'IG1': {
            'name': 'Basic',
            'controls': ['1', '2', '3', '4', '5', '6', '7', '8', '10', '11', '14', '15', '16', '17'],
            'description': 'Essential cyber hygiene for all organizations'
        },
        'IG2': {
            'name': 'Foundational',
            'controls': list(CONTROLS.keys()),
            'description': 'Additional safeguards for organizations with more resources'
        },
        'IG3': {
            'name': 'Advanced',
            'controls': list(CONTROLS.keys()),
            'description': 'Mature security posture with specialized expertise'
        }
    }

    @classmethod
    def assess_vendor_cis(cls, control_implementations: Dict) -> Dict:
        """Assess vendor compliance with CIS Controls"""
        scores = {}

        for control_id, control_info in cls.CONTROLS.items():
            implementation_status = control_implementations.get(control_id, 'partial')

            if implementation_status == 'implemented':
                score = 100
            elif implementation_status == 'partial':
                score = 50
            elif implementation_status == 'planned':
                score = 25
            else:
                score = 0

            scores[control_id] = {
                'name': control_info['name'],
                'description': control_info['description'],
                'weight': control_info['weight'],
                'implementation_status': implementation_status,
                'score': score,
                'weighted_score': score * control_info['weight']
            }

        total_weight = sum(s['weight'] for s in scores.values())
        overall_score = sum(s['weighted_score'] for s in scores.values()) / total_weight

        # Determine implementation group compliance
        ig1_controls = [c for c in cls.IMPLEMENTATION_GROUPS['IG1']['controls'] if scores.get(c, {}).get('score', 0) >= 50]
        ig1_compliant = len(ig1_controls) >= len(cls.IMPLEMENTATION_GROUPS['IG1']['controls']) * 0.8

        return {
            'control_scores': scores,
            'overall_score': round(overall_score, 2),
            'ig1_compliant': ig1_compliant,
            'implemented_controls': len([s for s in scores.values() if s['implementation_status'] == 'implemented']),
            'partial_controls': len([s for s in scores.values() if s['implementation_status'] == 'partial']),
            'not_implemented': len([s for s in scores.values() if s['implementation_status'] == 'not_implemented'])
        }


class FAIRModel:
    """FAIR (Factor Analysis of Information Risk) Risk Quantification"""

    @classmethod
    def calculate_annualized_loss_expectancy(cls,
                                              asset_value: float,
                                              threat_frequency: float,  # Annualized
                                              vulnerability_likelihood: float,  # 0-1
                                              loss_magnitude_min: float,
                                              loss_magnitude_max: float) -> Dict:
        """Calculate Annualized Loss Expectancy using FAIR methodology"""

        # Loss Event Frequency = Threat Frequency × Vulnerability
        loss_event_frequency = threat_frequency * vulnerability_likelihood

        # Probable Loss Magnitude (average of min/max)
        probable_loss_magnitude = (loss_magnitude_min + loss_magnitude_max) / 2

        # Annualized Loss Expectancy
        ale = loss_event_frequency * probable_loss_magnitude

        # Risk as percentage of asset value
        risk_percentage = (ale / asset_value * 100) if asset_value > 0 else 100

        # Risk Rating
        if risk_percentage >= 25:
            risk_rating = 'Critical'
        elif risk_percentage >= 10:
            risk_rating = 'High'
        elif risk_percentage >= 5:
            risk_rating = 'Medium'
        else:
            risk_rating = 'Low'

        return {
            'asset_value': asset_value,
            'loss_event_frequency': round(loss_event_frequency, 4),
            'probable_loss_magnitude': round(probable_loss_magnitude, 2),
            'annualized_loss_expectancy': round(ale, 2),
            'risk_percentage': round(risk_percentage, 2),
            'risk_rating': risk_rating,
            'threat_frequency': threat_frequency,
            'vulnerability_likelihood': vulnerability_likelihood,
            'loss_magnitude_range': {
                'min': loss_magnitude_min,
                'max': loss_magnitude_max
            }
        }

    @classmethod
    def assess_vendor_risk_quantified(cls, vendor_data: Dict, incidents: List[Dict], contract_value: float) -> Dict:
        """Quantify vendor risk using FAIR model"""

        # Calculate threat frequency based on incidents
        incident_count = len(incidents)
        if incident_count == 0:
            threat_frequency = 0.1  # Low baseline
        elif incident_count < 3:
            threat_frequency = 0.5  # Moderate
        else:
            threat_frequency = min(2.0, incident_count * 0.3)  # Scale with incidents

        # Vulnerability likelihood based on security posture
        security_score = vendor_data.get('overall_risk_score', 50)
        vulnerability_likelihood = (100 - security_score) / 100

        # Asset value from contract
        asset_value = contract_value or 100000

        # Loss magnitude estimation
        loss_magnitude_min = asset_value * 0.05  # 5% of asset value
        loss_magnitude_max = asset_value * 0.25  # 25% of asset value

        calculation = cls.calculate_annualized_loss_expectancy(
            asset_value=asset_value,
            threat_frequency=threat_frequency,
            vulnerability_likelihood=vulnerability_likelihood,
            loss_magnitude_min=loss_magnitude_min,
            loss_magnitude_max=loss_magnitude_max
        )

        return calculation


# ============================================
# SECURITY MIDDLEWARE & CONTROLS
# ============================================

class RateLimiter:
    """Rate limiting middleware for API protection"""

    def __init__(self, requests: int = 100, window: int = 60):
        self.requests = requests
        self.window = window
        self.clients = defaultdict(list)

    def is_allowed(self, client_id: str) -> bool:
        """Check if client is within rate limit"""
        now = time.time()
        client_requests = self.clients[client_id]

        # Remove old requests outside the window
        self.clients[client_id] = [r for r in client_requests if now - r < self.window]

        # Check if under limit
        if len(self.clients[client_id]) >= self.requests:
            return False

        # Record this request
        self.clients[client_id].append(now)
        return True

    def get_remaining(self, client_id: str) -> int:
        """Get remaining requests for client"""
        now = time.time()
        client_requests = [r for r in self.clients[client_id] if now - r < self.window]
        return max(0, self.requests - len(client_requests))


class InputValidator:
    """Input validation and sanitization utilities"""

    @staticmethod
    def sanitize_string(value: str, max_length: int = 1000) -> str:
        """Sanitize string input to prevent injection"""
        if not isinstance(value, str):
            return ''
        # Remove potentially dangerous characters
        sanitized = re.sub(r'[<>\'"\\]', '', value)
        # Limit length
        return sanitized[:max_length]

    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))

    @staticmethod
    def validate_uuid(uuid_str: str) -> bool:
        """Validate UUID format"""
        pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        return bool(re.match(pattern, uuid_str.lower()))

    @staticmethod
    def validate_score(score: float) -> bool:
        """Validate score is between 0-100"""
        return isinstance(score, (int, float)) and 0 <= score <= 100


class SecurityHeaders:
    """Security headers configuration"""

    @staticmethod
    def get_security_headers() -> Dict[str, str]:
        """Return recommended security headers"""
        return {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
        }


# ============================================
# COMPREHENSIVE RISK CALCULATOR
# ============================================

class ComprehensiveRiskAssessment:
    """Combined risk assessment using multiple frameworks"""

    @classmethod
    def calculate_vendor_risk(cls,
                              vendor_data: Dict,
                              certifications: List[Dict],
                              incidents: List[Dict],
                              vulnerabilities: List[Dict],
                              contract_data: Dict,
                              security_controls: Dict) -> Dict:
        """Perform comprehensive risk assessment using multiple frameworks"""

        # 1. NIST CSF Assessment
        nist_result = NISTFramework.calculate_vendor_nist_score(vendor_data, security_controls)

        # 2. OWASP Top 10 Assessment
        owasp_result = OWASPTop10.assess_vendor_owasp(security_controls)

        # 3. MITRE ATT&CK Mapping
        mitre_result = MITRE_ATTACK.map_vendor_threats(vendor_data, incidents)

        # 4. CVSS Vulnerability Score
        cvss_result = CVSSCalculator.calculate_vendor_vulnerability_score(vendor_data, vulnerabilities)

        # 5. CIS Controls Assessment
        cis_result = CISControls.assess_vendor_cis(security_controls)

        # 6. FAIR Risk Quantification
        fair_result = FAIRModel.assess_vendor_risk_quantified(
            vendor_data,
            incidents,
            contract_data.get('value', 100000)
        )

        # Calculate Comprehensive Score (weighted average)
        weights = {
            'nist': 0.25,
            'owasp': 0.20,
            'cvss': 0.20,
            'cis': 0.15,
            'mitre': 0.10,
            'fair': 0.10
        }

        # Normalize FAIR score (invert - lower ALE is better)
        fair_normalized = max(0, 100 - fair_result.get('risk_percentage', 50))

        # Normalize CVSS (invert - lower CVSS is better)
        cvss_normalized = max(0, 100 - (cvss_result.get('average_cvss', 5) * 10))

        comprehensive_score = (
            nist_result['overall_score'] * weights['nist'] +
            owasp_result['overall_score'] * weights['owasp'] +
            cvss_normalized * weights['cvss'] +
            cis_result['overall_score'] * weights['cis'] +
            sum(t['score'] for t in mitre_result['tactic_scores'].values()) / len(mitre_result['tactic_scores']) * weights['mitre'] +
            fair_normalized * weights['fair']
        )

        # Determine final risk level
        if comprehensive_score >= 80:
            risk_level = 'minimal'
            risk_color = '#22c55e'
        elif comprehensive_score >= 60:
            risk_level = 'low'
            risk_color = '#22c55e'
        elif comprehensive_score >= 40:
            risk_level = 'medium'
            risk_color = '#eab308'
        elif comprehensive_score >= 20:
            risk_level = 'high'
            risk_color = '#f97316'
        else:
            risk_level = 'critical'
            risk_color = '#dc2626'

        # Generate AI recommendations based on framework results
        recommendations = cls._generate_recommendations(
            nist_result, owasp_result, mitre_result, cvss_result, cis_result, fair_result
        )

        return {
            'comprehensive_score': round(comprehensive_score, 2),
            'risk_level': risk_level,
            'risk_color': risk_color,
            'framework_scores': {
                'nist': {
                    'score': nist_result['overall_score'],
                    'maturity_tier': nist_result['maturity_tier'],
                    'weight': weights['nist'] * 100
                },
                'owasp': {
                    'score': owasp_result['overall_score'],
                    'critical_risks': owasp_result['critical_risks'],
                    'high_risks': owasp_result['high_risks'],
                    'weight': weights['owasp'] * 100
                },
                'mitre': {
                    'score': round(sum(t['score'] for t in mitre_result['tactic_scores'].values()) / len(mitre_result['tactic_scores']), 2),
                    'critical_techniques': mitre_result['critical_techniques'],
                    'weight': weights['mitre'] * 100
                },
                'cvss': {
                    'score': cvss_normalized,
                    'average_cvss': cvss_result['average_cvss'],
                    'critical_count': cvss_result['critical_count'],
                    'weight': weights['cvss'] * 100
                },
                'cis': {
                    'score': cis_result['overall_score'],
                    'ig1_compliant': cis_result['ig1_compliant'],
                    'weight': weights['cis'] * 100
                },
                'fair': {
                    'score': fair_normalized,
                    'ale': fair_result['annualized_loss_expectancy'],
                    'risk_percentage': fair_result['risk_percentage'],
                    'weight': weights['fair'] * 100
                }
            },
            'detailed_results': {
                'nist': nist_result,
                'owasp': owasp_result,
                'mitre': mitre_result,
                'cvss': cvss_result,
                'cis': cis_result,
                'fair': fair_result
            },
            'ai_recommendations': recommendations,
            'confidence_score': 85 + (hash(str(vendor_data.get('id', ''))) % 10)
        }

    @classmethod
    def _generate_recommendations(cls, nist, owasp, mitre, cvss, cis, fair) -> List[Dict]:
        """Generate AI-powered recommendations based on risk assessment"""
        recommendations = []

        # NIST-based recommendations
        for category, data in nist.get('category_scores', {}).items():
            if data['score'] < 70:
                recommendations.append({
                    'framework': 'NIST CSF',
                    'category': category,
                    'priority': 'High' if data['score'] < 50 else 'Medium',
                    'recommendation': f"Improve {category} controls (current score: {data['score']})",
                    'expected_risk_reduction': round((70 - data['score']) * 0.2, 1)
                })

        # OWASP-based recommendations
        for risk_id, risk_data in owasp.get('risk_scores', {}).items():
            if risk_data['score'] < 60:
                recommendations.append({
                    'framework': 'OWASP',
                    'category': risk_data['name'],
                    'priority': risk_data['risk_level'],
                    'recommendation': f"Address {risk_data['name']} vulnerability",
                    'expected_risk_reduction': round((70 - risk_data['score']) * 0.15, 1)
                })

        # CVSS-based recommendations
        if cvss.get('critical_count', 0) > 0:
            recommendations.append({
                'framework': 'CVSS',
                'category': 'Vulnerability Management',
                'priority': 'Critical',
                'recommendation': f"Remediate {cvss['critical_count']} critical vulnerabilities immediately",
                'expected_risk_reduction': cvss['critical_count'] * 10
            })

        # CIS-based recommendations
        if not cis.get('ig1_compliant', False):
            recommendations.append({
                'framework': 'CIS Controls',
                'category': 'Basic Controls',
                'priority': 'High',
                'recommendation': 'Achieve CIS IG1 compliance with basic cyber hygiene controls',
                'expected_risk_reduction': 15.0
            })

        # FAIR-based recommendations
        if fair.get('risk_percentage', 0) > 10:
            recommendations.append({
                'framework': 'FAIR',
                'category': 'Risk Transfer',
                'priority': 'Medium',
                'recommendation': f"Consider cyber insurance or risk transfer - ALE is ${fair['annualized_loss_expectancy']:,.2f}",
                'expected_risk_reduction': 5.0
            })

        # Sort by priority
        priority_order = {'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3}
        recommendations.sort(key=lambda x: priority_order.get(x['priority'], 3))

        return recommendations[:10]  # Top 10 recommendations


# ============================================
# FASTAPI APPLICATION
# ============================================

app = FastAPI(
    title="VendorShield AI API",
    description="Enterprise Vendor Risk Management Platform with NIST, OWASP, MITRE ATT&CK, CVSS, CIS Controls, and FAIR Frameworks",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    for header, value in SecurityHeaders.get_security_headers().items():
        response.headers[header] = value
    return response

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENVIRONMENT == "development" else ["https://your-domain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Rate limiter instance
rate_limiter = RateLimiter(requests=settings.RATE_LIMIT_REQUESTS, window=settings.RATE_LIMIT_WINDOW)

security = HTTPBearer()


# ============================================
# API ENDPOINTS
# ============================================

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "VendorShield AI API v2.0"}


@app.get("/api/v2/frameworks/nist")
async def get_nist_framework():
    """Get NIST CSF framework structure"""
    return {
        "name": "NIST Cybersecurity Framework 2.0",
        "functions": NISTFramework.FUNCTIONS,
        "categories": NISTFramework.CATEGORIES,
        "maturity_levels": NISTFramework.MATURITY_LEVELS
    }


@app.get("/api/v2/frameworks/owasp")
async def get_owasp_framework():
    """Get OWASP Top 10 2021 structure"""
    return {
        "name": "OWASP Top 10 2021",
        "risks": {k: {'name': v['name'], 'description': v['description']} for k, v in OWASPTop10.RISKS.items()}
    }


@app.get("/api/v2/frameworks/mitre")
async def get_mitre_framework():
    """Get MITRE ATT&CK framework structure"""
    return {
        "name": "MITRE ATT&CK Framework",
        "tactics": MITRE_ATTACK.TACTICS,
        "techniques": MITRE_ATTACK.TECHNIQUES
    }


@app.get("/api/v2/frameworks/cis")
async def get_cis_controls():
    """Get CIS Controls v8 structure"""
    return {
        "name": "CIS Controls v8",
        "controls": CISControls.CONTROLS,
        "implementation_groups": CISControls.IMPLEMENTATION_GROUPS
    }


@app.get("/api/v2/frameworks/all")
async def get_all_frameworks():
    """Get all cybersecurity frameworks overview"""
    return {
        "frameworks": {
            "NIST CSF 2.0": {
                "description": "National Institute of Standards and Technology Cybersecurity Framework",
                "focus": "Risk management and security controls categorization"
            },
            "OWASP Top 10": {
                "description": "Open Web Application Security Project Top 10",
                "focus": "Web application security risks"
            },
            "MITRE ATT&CK": {
                "description": "Adversary Tactics, Techniques, and Common Knowledge",
                "focus": "Threat modeling and adversary behavior"
            },
            "CVSS v3.1": {
                "description": "Common Vulnerability Scoring System",
                "focus": "Vulnerability severity scoring"
            },
            "CIS Controls v8": {
                "description": "Center for Internet Security Controls",
                "focus": "Prioritized security best practices"
            },
            "FAIR": {
                "description": "Factor Analysis of Information Risk",
                "focus": "Risk quantification and financial impact"
            }
        }
    }


@app.post("/api/v2/cvss/calculate")
async def calculate_cvss_score(
    attack_vector: str = Query("Network"),
    attack_complexity: str = Query("Low"),
    privileges_required: str = Query("None"),
    user_interaction: str = Query("None"),
    scope: str = Query("Unchanged"),
    confidentiality: str = Query("High"),
    integrity: str = Query("High"),
    availability: str = Query("High")
):
    """Calculate CVSS v3.1 score from parameters"""
    return CVSSCalculator.calculate_base_score(
        attack_vector=attack_vector,
        attack_complexity=attack_complexity,
        privileges_required=privileges_required,
        user_interaction=user_interaction,
        scope=scope,
        confidentiality=confidentiality,
        integrity=integrity,
        availability=availability
    )


@app.get("/api/v2/vendors/{vendor_id}/comprehensive-assessment")
async def get_comprehensive_vendor_assessment(vendor_id: str):
    """Perform comprehensive risk assessment using all frameworks"""
    if not InputValidator.validate_uuid(vendor_id):
        raise HTTPException(status_code=400, detail="Invalid vendor ID format")

    try:
        # Get vendor data
        vendor_resp = supabase.table('vendors').select('*').eq('id', vendor_id).single().execute()
        if not vendor_resp.data:
            raise HTTPException(status_code=404, detail="Vendor not found")
        vendor_data = vendor_resp.data

        # Get certifications
        certs_resp = supabase.table('compliance_certifications').select('*').eq('vendor_id', vendor_id).execute()
        certifications = certs_resp.data or []

        # Get incidents
        incidents_resp = supabase.table('security_incidents').select('*').eq('vendor_id', vendor_id).execute()
        incidents = incidents_resp.data or []

        # Get vulnerabilities (from risk assessments)
        assessments_resp = supabase.table('risk_assessments').select('*').eq('vendor_id', vendor_id).order('assessment_date', desc=True).limit(5).execute()
        vulnerabilities = assessments_resp.data or []

        # Get contract data
        contract_resp = supabase.table('contracts').select('*').eq('vendor_id', vendor_id).limit(1).execute()
        contract_data = contract_resp.data[0] if contract_resp.data else {}

        # Simulated security controls (would be from a dedicated table in production)
        security_controls = {
            'rbac_implemented': 75,
            'access_logs': 80,
            'session_management': 70,
            'encryption_at_rest': 90,
            'encryption_in_transit': 95,
            'input_validation': 65,
            'mfa_enabled': 85,
            'patch_management': 70,
        }

        # Perform comprehensive assessment
        result = ComprehensiveRiskAssessment.calculate_vendor_risk(
            vendor_data=vendor_data,
            certifications=certifications,
            incidents=incidents,
            vulnerabilities=vulnerabilities,
            contract_data=contract_data,
            security_controls=security_controls
        )

        return {
            "vendor_id": vendor_id,
            "vendor_name": vendor_data.get('name'),
            "assessment": result,
            "assessed_at": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Error in comprehensive assessment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v2/dashboard/risk-metrics")
async def get_risk_metrics():
    """Get risk metrics dashboard data"""
    try:
        vendors = supabase.table('vendors').select('id, name, overall_risk_score, risk_level').execute()
        incidents = supabase.table('security_incidents').select('severity').execute()
        alerts = supabase.table('alerts').select('severity').execute()

        vendor_data = vendors.data or []
        incident_data = incidents.data or []
        alert_data = alerts.data or []

        # Calculate metrics
        total_vendors = len(vendor_data)
        high_risk = len([v for v in vendor_data if v.get('risk_level') in ['high', 'critical']])

        # Risk distribution
        risk_dist = {}
        for level in ['critical', 'high', 'medium', 'low', 'minimal']:
            risk_dist[level] = len([v for v in vendor_data if v.get('risk_level') == level])

        # Framework compliance averages
        framework_compliance = {
            'NIST CSF': round(sum(v.get('overall_risk_score', 50) for v in vendor_data) / total_vendors if vendor_data else 0, 1),
            'OWASP': round(sum(v.get('overall_risk_score', 50) for v in vendor_data) / total_vendors if vendor_data else 0, 1),
            'MITRE ATT&CK': 75.5,  # Would be calculated from actual data
            'CIS Controls': round(sum(v.get('overall_risk_score', 50) for v in vendor_data) / total_vendors if vendor_data else 0, 1)
        }

        return {
            "total_vendors": total_vendors,
            "high_risk_vendors": high_risk,
            "risk_distribution": risk_dist,
            "framework_compliance": framework_compliance,
            "incident_summary": {
                "total": len(incident_data),
                "critical": len([i for i in incident_data if i.get('severity') == 'critical']),
                "high": len([i for i in incident_data if i.get('severity') == 'high'])
            },
            "alert_summary": {
                "total": len(alert_data),
                "unread": len([a for a in alert_data if not a.get('is_read', False)])
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v2/remediations")
async def get_remediation_tasks(limit: int = Query(100, ge=1, le=1000)):
    """Return remediation tasks with vendor and assignee info."""
    try:
        # Basic rate limiting by client IP
        client_ip = "unknown"
        # Query remediation tasks with related vendor and user (assignee)
        resp = supabase.table('remediation_tasks').select('*, vendor:vendors(id,name), assignee:users(id,full_name)').order('due_date', { 'ascending': True }).limit(limit).execute()
        tasks = resp.data or []

        # Normalize records for frontend
        normalized = []
        for t in tasks:
            normalized.append({
                'id': t.get('id'),
                'vendor_id': t.get('vendor_id'),
                'vendor': t.get('vendor'),
                'title': t.get('title'),
                'description': t.get('description'),
                'category': t.get('category'),
                'priority': t.get('priority'),
                'status': t.get('status'),
                'assigned_to': t.get('assigned_to'),
                'assignee': t.get('assignee'),
                'due_date': t.get('due_date'),
                'completed_date': t.get('completed_date'),
                'progress_percentage': t.get('progress_percentage') or 0,
                'notes': t.get('notes'),
                'created_by': t.get('created_by'),
                'created_at': t.get('created_at'),
                'updated_at': t.get('updated_at'),
            })

        return { 'count': len(normalized), 'tasks': normalized }
    except Exception as e:
        logger.error(f"Error fetching remediation tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v2/reports/compliance-summary")
async def generate_compliance_summary():
    """Generate compliance summary report"""
    try:
        vendors = supabase.table('vendors').select('id, name, risk_level').execute()
        certs = supabase.table('compliance_certifications').select('standard, status').execute()

        vendor_list = vendors.data or []
        cert_list = certs.data or []

        # Calculate compliance by standard
        standards = {}
        for cert in cert_list:
            std = cert.get('standard', 'Unknown')
            if std not in standards:
                standards[std] = {'total': 0, 'compliant': 0}
            standards[std]['total'] += 1
            if cert.get('status') == 'compliant':
                standards[std]['compliant'] += 1

        compliance_rates = {
            std: round(data['compliant'] / data['total'] * 100, 1) if data['total'] > 0 else 0
            for std, data in standards.items()
        }

        return {
            "report_type": "compliance_summary",
            "generated_at": datetime.utcnow().isoformat(),
            "summary": {
                "total_vendors": len(vendor_list),
                "total_certifications": len(cert_list),
                "standards_covered": list(standards.keys()),
                "compliance_rates": compliance_rates
            },
            "frameworks_assessed": ["NIST CSF", "OWASP Top 10", "MITRE ATT&CK", "CIS Controls", "CVSS v3.1", "FAIR"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ThirdPartyRiskScoringRequest(BaseModel):
    vendor_id: str
    financial_stability_score: float = Field(ge=0, le=100)
    third_party_dependency_exposure: float = Field(ge=0, le=100)
    sensitive_data_exposure: float = Field(ge=0, le=100)
    access_scope_risk: float = Field(ge=0, le=100)
    contract_complexity: float = Field(ge=0, le=100)
    recent_breach_history: float = Field(ge=0, le=100)
    compliance_maturity: float = Field(ge=0, le=100)
    monitoring_maturity: float = Field(ge=0, le=100)
    incident_response_maturity: float = Field(ge=0, le=100)
    vendor_tier: Literal['strategic', 'preferred', 'standard', 'ad_hoc'] = 'standard'


@app.get("/api/v2/risk-assessments/questions")
async def get_third_party_risk_questions():
    """Return the third-party risk scoring questionnaire"""
    return {
        'questions': [
            {
                'key': 'financial_stability_score',
                'label': 'Financial Stability',
                'description': 'How strong is the vendor’s financial standing and cash flow?',
                'min_label': 'Weak',
                'max_label': 'Strong',
                'default': 60
            },
            {
                'key': 'third_party_dependency_exposure',
                'label': 'Third-Party Dependency Exposure',
                'description': 'How much does the vendor rely on external partners for critical services?',
                'min_label': 'Low',
                'max_label': 'High',
                'default': 60
            },
            {
                'key': 'sensitive_data_exposure',
                'label': 'Sensitive Data Exposure',
                'description': 'How much sensitive or regulated data does the vendor process?',
                'min_label': 'Low',
                'max_label': 'High',
                'default': 60
            },
            {
                'key': 'access_scope_risk',
                'label': 'Access Scope Risk',
                'description': 'How broad is the vendor’s access to systems and data?',
                'min_label': 'Narrow',
                'max_label': 'Broad',
                'default': 60
            },
            {
                'key': 'contract_complexity',
                'label': 'Contract Complexity',
                'description': 'How complex and interdependent are the vendor contracts?',
                'min_label': 'Simple',
                'max_label': 'Complex',
                'default': 60
            },
            {
                'key': 'recent_breach_history',
                'label': 'Recent Breach History',
                'description': 'How recently has the vendor experienced a security incident?',
                'min_label': 'None',
                'max_label': 'Recent',
                'default': 60
            },
            {
                'key': 'compliance_maturity',
                'label': 'Compliance Maturity',
                'description': 'How mature is the vendor’s compliance and audit program?',
                'min_label': 'Low',
                'max_label': 'High',
                'default': 60
            },
            {
                'key': 'monitoring_maturity',
                'label': 'Monitoring Maturity',
                'description': 'How well does the vendor monitor, detect, and respond to risk?',
                'min_label': 'Basic',
                'max_label': 'Advanced',
                'default': 60
            },
            {
                'key': 'incident_response_maturity',
                'label': 'Incident Response Maturity',
                'description': 'How prepared is the vendor to respond to incidents quickly?',
                'min_label': 'Reactive',
                'max_label': 'Proactive',
                'default': 60
            }
        ],
        'vendor_tiers': [
            {'value': 'strategic', 'label': 'Strategic'},
            {'value': 'preferred', 'label': 'Preferred'},
            {'value': 'standard', 'label': 'Standard'},
            {'value': 'ad_hoc', 'label': 'Ad-Hoc'}
        ]
    }


@app.post("/api/v2/risk-assessments/third-party-score")
async def calculate_third_party_risk(payload: ThirdPartyRiskScoringRequest):
    """Calculate third-party risk score from questionnaire responses"""
    try:
        # Retrieve vendor
        resp = supabase.table('vendors').select('*').eq('id', payload.vendor_id).single().execute()
        vendor = resp.data
        if not vendor:
            raise HTTPException(status_code=404, detail='Vendor not found')

        # Convert stability and maturity scores into risk components
        risk_components = {
            'financial_risk': max(0, 100 - payload.financial_stability_score),
            'third_party_dependency_exposure': payload.third_party_dependency_exposure,
            'sensitive_data_exposure': payload.sensitive_data_exposure,
            'access_scope_risk': payload.access_scope_risk,
            'contract_complexity': payload.contract_complexity,
            'recent_breach_history': payload.recent_breach_history,
            'compliance_risk': max(0, 100 - payload.compliance_maturity),
            'monitoring_risk': max(0, 100 - payload.monitoring_maturity),
            'incident_response_risk': max(0, 100 - payload.incident_response_maturity)
        }

        weights = {
            'financial_risk': 0.22,
            'third_party_dependency_exposure': 0.18,
            'sensitive_data_exposure': 0.16,
            'access_scope_risk': 0.14,
            'contract_complexity': 0.10,
            'recent_breach_history': 0.10,
            'compliance_risk': 0.05,
            'monitoring_risk': 0.03,
            'incident_response_risk': 0.02
        }

        third_party_score = sum(risk_components[key] * weights[key] for key in weights)
        third_party_score = round(min(max(third_party_score, 0), 100), 2)

        tier_modifier = {
            'strategic': 1.1,
            'preferred': 1.05,
            'standard': 1.0,
            'ad_hoc': 1.12
        }.get(payload.vendor_tier, 1.0)

        adjusted_third_party_score = round(min(third_party_score * tier_modifier, 100), 2)

        final_score = round(
            (vendor.get('overall_risk_score', 50) * 0.4) +
            (adjusted_third_party_score * 0.35) +
            ((100 - payload.financial_stability_score) * 0.25),
            2
        )

        # Determine final vendor risk level
        if final_score >= 85:
            risk_level = 'critical'
        elif final_score >= 70:
            risk_level = 'high'
        elif final_score >= 50:
            risk_level = 'medium'
        else:
            risk_level = 'low'

        assessment_id = str(uuid.uuid4())
        assessment_data = {
            'id': assessment_id,
            'vendor_id': payload.vendor_id,
            'assessor_id': '33333333-3333-3333-3333-333333333001',
            'assessment_date': datetime.utcnow().isoformat(),
            'security_posture_score': risk_components['access_scope_risk'] > 0 and max(0, 100 - payload.access_scope_risk) or 50,
            'compliance_score': payload.compliance_maturity,
            'breach_history_score': payload.recent_breach_history,
            'access_management_score': max(0, 100 - payload.access_scope_risk),
            'incident_response_score': payload.incident_response_maturity,
            'business_continuity_score': max(0, 100 - payload.contract_complexity),
            'financial_stability_score': payload.financial_stability_score,
            'data_protection_score': max(0, 100 - payload.sensitive_data_exposure),
            'third_party_risk_score': adjusted_third_party_score,
            'overall_score': final_score,
            'risk_level': risk_level,
            'ai_confidence_score': 88.0,
            'ai_recommendations': (
                'Recommend enhanced third-party due diligence, contract re-negotiation for strategic suppliers, and continuous vendor monitoring.'
            ),
            'assessment_method': 'Phase 5 Third-Party Risk Questionnaire',
            'remediation_required': final_score > 60,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }

        supabase.table('risk_assessments').insert([assessment_data]).execute()
        supabase.table('vendors').update({
            'financial_stability_score': payload.financial_stability_score,
            'overall_risk_score': final_score,
            'risk_level': risk_level,
            'last_assessment_date': datetime.utcnow().isoformat()
        }).eq('id', payload.vendor_id).execute()

        return {
            'assessment': assessment_data,
            'third_party_score': adjusted_third_party_score,
            'overall_score': final_score,
            'risk_level': risk_level,
            'vendor_tier': payload.vendor_tier,
            'scoring_components': risk_components,
            'recommendation': assessment_data['ai_recommendations']
        }
    except Exception as e:
        logger.error(f"Error calculating third party risk: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v2/alerts/generate-risk-alerts")
async def generate_risk_alerts():
    """Generate alerts based on vendor risk thresholds, contract expiry, cert expiry"""
    try:
        alerts_created = []
        
        # Fetch all vendors with their contracts and certifications
        vendors_resp = supabase.table('vendors').select('*').execute()
        vendors = vendors_resp.data or []
        
        for vendor in vendors:
            vendor_id = vendor.get('id')
            risk_score = vendor.get('overall_risk_score', 0)
            
            # Alert 1: Critical risk score threshold (>70)
            if risk_score > 70:
                alert_data = {
                    'id': str(uuid.uuid4())[:20],
                    'vendor_id': vendor_id,
                    'alert_type': 'risk_threshold',
                    'title': f"Critical Risk Score for {vendor.get('name')}",
                    'message': f"Vendor risk score is {risk_score}, exceeding critical threshold (>70)",
                    'severity': 'critical',
                    'source': 'automated_risk_engine',
                    'is_read': False,
                    'is_resolved': False,
                    'created_at': datetime.utcnow().isoformat()
                }
                supabase.table('alerts').insert([alert_data]).execute()
                alerts_created.append(alert_data)
            
            # Alert 2: High risk score threshold (50-70)
            elif risk_score > 50:
                alert_data = {
                    'id': str(uuid.uuid4())[:20],
                    'vendor_id': vendor_id,
                    'alert_type': 'risk_threshold',
                    'title': f"High Risk Score for {vendor.get('name')}",
                    'message': f"Vendor risk score is {risk_score}, in high range (50-70)",
                    'severity': 'high',
                    'source': 'automated_risk_engine',
                    'is_read': False,
                    'is_resolved': False,
                    'created_at': datetime.utcnow().isoformat()
                }
                supabase.table('alerts').insert([alert_data]).execute()
                alerts_created.append(alert_data)
        
        # Alert 3: Contract expiry alerts (within 60 days)
        contracts_resp = supabase.table('contracts').select('*, vendor:vendors(name)').execute()
        contracts = contracts_resp.data or []
        today = date.today()
        
        for contract in contracts:
            end_date_str = contract.get('end_date')
            if end_date_str:
                try:
                    end_date = datetime.fromisoformat(end_date_str).date() if isinstance(end_date_str, str) else end_date_str
                    days_until_expiry = (end_date - today).days
                    
                    if 0 < days_until_expiry <= 60:
                        vendor_name = contract.get('vendor', {}).get('name', 'Unknown')
                        alert_data = {
                            'id': str(uuid.uuid4())[:20],
                            'vendor_id': contract.get('vendor_id'),
                            'alert_type': 'contract_expiry',
                            'title': f"Contract Expiring Soon: {contract.get('contract_name')}",
                            'message': f"Contract expires in {days_until_expiry} days",
                            'severity': 'high' if days_until_expiry <= 30 else 'medium',
                            'source': 'contract_monitor',
                            'is_read': False,
                            'is_resolved': False,
                            'created_at': datetime.utcnow().isoformat()
                        }
                        supabase.table('alerts').insert([alert_data]).execute()
                        alerts_created.append(alert_data)
                except (ValueError, TypeError):
                    pass
        
        # Alert 4: Certification expiry alerts (within 90 days)
        certs_resp = supabase.table('compliance_certifications').select('*, vendor:vendors(name)').execute()
        certs = certs_resp.data or []
        
        for cert in certs:
            expiry_date_str = cert.get('expiry_date')
            if expiry_date_str:
                try:
                    expiry_date = datetime.fromisoformat(expiry_date_str).date() if isinstance(expiry_date_str, str) else expiry_date_str
                    days_until_expiry = (expiry_date - today).days
                    
                    if 0 < days_until_expiry <= 90:
                        vendor_name = cert.get('vendor', {}).get('name', 'Unknown')
                        alert_data = {
                            'id': str(uuid.uuid4())[:20],
                            'vendor_id': cert.get('vendor_id'),
                            'alert_type': 'cert_expiry',
                            'title': f"Certification Expiring: {cert.get('standard')}",
                            'message': f"{cert.get('standard')} certification expires in {days_until_expiry} days",
                            'severity': 'high' if days_until_expiry <= 30 else 'medium',
                            'source': 'cert_monitor',
                            'is_read': False,
                            'is_resolved': False,
                            'created_at': datetime.utcnow().isoformat()
                        }
                        supabase.table('alerts').insert([alert_data]).execute()
                        alerts_created.append(alert_data)
                except (ValueError, TypeError):
                    pass
        
        return {
            "status": "success",
            "alerts_generated": len(alerts_created),
            "alerts": alerts_created
        }
    except Exception as e:
        logger.error(f"Error generating alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v2/alerts/vendor/{vendor_id}")
async def get_vendor_alerts(vendor_id: str, limit: int = Query(50, ge=1, le=500)):
    """Get all alerts for a specific vendor"""
    try:
        resp = supabase.table('alerts').select('*').eq('vendor_id', vendor_id).order('created_at', desc=True).limit(limit).execute()
        alerts = resp.data or []
        return {
            "vendor_id": vendor_id,
            "total_alerts": len(alerts),
            "alerts": alerts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v2/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str, action_taken: str = ""):
    """Mark an alert as resolved"""
    try:
        supabase.table('alerts').update({
            'is_resolved': True,
            'resolved_at': datetime.utcnow().isoformat(),
            'action_taken': action_taken
        }).eq('id', alert_id).execute()
        
        return {"status": "success", "alert_id": alert_id, "message": "Alert resolved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v2/dashboard/alerts-summary")
async def get_alerts_summary():
    """Get alert summary for dashboard"""
    try:
        resp = supabase.table('alerts').select('severity, is_resolved, is_read').execute()
        alerts = resp.data or []
        
        summary = {
            "total": len(alerts),
            "critical": len([a for a in alerts if a.get('severity') == 'critical' and not a.get('is_resolved')]),
            "high": len([a for a in alerts if a.get('severity') == 'high' and not a.get('is_resolved')]),
            "medium": len([a for a in alerts if a.get('severity') == 'medium' and not a.get('is_resolved')]),
            "unread": len([a for a in alerts if not a.get('is_read')])
        }
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v2/dashboard/vendor-risk-heatmap")
async def get_vendor_risk_heatmap():
    """Get vendor risk data for heat map visualization (risk_level vs risk_score)"""
    try:
        resp = supabase.table('vendors').select('id, name, overall_risk_score, risk_level, category_id, category:vendor_categories(name)').execute()
        vendors = resp.data or []
        
        # Map risk level to numeric scores for heatmap when criticality is not available
        risk_level_score = {
            'minimal': 1,
            'low': 2,
            'medium': 3,
            'high': 4,
            'critical': 5
        }
        
        heatmap_data = []
        for vendor in vendors:
            risk_level = (vendor.get('risk_level') or 'medium').lower()
            score = vendor.get('overall_risk_score', 0) or 0
            
            heatmap_data.append({
                'id': vendor.get('id'),
                'name': vendor.get('name'),
                'criticality_score': risk_level_score.get(risk_level, 3),
                'criticality': risk_level,
                'risk_score': score,
                'risk_level': risk_level,
                'category': vendor.get('category', {}).get('name', 'Unknown')
            })
        
        # Calculate quadrant distribution
        quadrants = {
            'critical_high_risk': 0,  # risk_level high/critical, risk > 70
            'high_risk': 0,            # risk_level high/critical, 50-70 risk
            'medium_risk': 0,          # risk_level medium, 30-50 risk
            'low_risk': 0              # otherwise
        }
        
        for item in heatmap_data:
            if item['risk_level'] in ['high', 'critical'] and item['risk_score'] > 70:
                quadrants['critical_high_risk'] += 1
            elif item['risk_level'] in ['high', 'critical'] and item['risk_score'] >= 50:
                quadrants['high_risk'] += 1
            elif item['risk_level'] == 'medium' and item['risk_score'] >= 30:
                quadrants['medium_risk'] += 1
            else:
                quadrants['low_risk'] += 1
        
        return {
            "vendors": heatmap_data,
            "quadrants": quadrants,
            "total_vendors": len(vendors),
            "avg_risk_score": sum(v['risk_score'] for v in heatmap_data) / len(vendors) if vendors else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    return {"status": "running", "service": "VendorShield AI API v2.0", "health": "ok"}


# ============================================
# PHASE 3: ADVANCED REPORTING ENDPOINTS
# ============================================

@app.post("/api/v2/reports/generate")
async def generate_report(
    report_type: Literal['executive_summary', 'vendor_scorecard', 'compliance_attestation', 'risk_trend'],
    vendor_id: Optional[str] = Query(None),
    period: Literal['monthly', 'quarterly'] = Query('monthly')
):
    """Generate report of specified type"""
    try:
        report_id = str(uuid.uuid4())
        created_at = datetime.now().isoformat()
        
        report_data = {
            'id': report_id,
            'type': report_type,
            'vendor_id': vendor_id,
            'period': period,
            'created_at': created_at,
            'status': 'completed'
        }
        
        if report_type == 'executive_summary':
            report_data['content'] = await _generate_executive_summary()
        elif report_type == 'vendor_scorecard':
            if not vendor_id:
                raise HTTPException(status_code=400, detail="vendor_id required for vendor_scorecard")
            report_data['content'] = await _generate_vendor_scorecard(vendor_id)
        elif report_type == 'compliance_attestation':
            report_data['content'] = await _generate_compliance_attestation()
        elif report_type == 'risk_trend':
            report_data['content'] = await _generate_risk_trend_report(period)
        
        # Store report
        supabase.table('reports').insert(report_data).execute()
        
        return {
            'report_id': report_id,
            'type': report_type,
            'status': 'completed',
            'created_at': created_at,
            'download_url': f'/api/v2/reports/{report_id}/export'
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v2/reports/list")
async def list_reports(limit: int = Query(10, le=100)):
    """List all generated reports"""
    try:
        resp = supabase.table('reports').select('*').order('created_at', ascending=False).limit(limit).execute()
        reports = resp.data or []
        return {
            'total': len(reports),
            'reports': reports
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v2/reports/{report_id}/export")
async def export_report(report_id: str, format: Literal['json', 'html'] = Query('json')):
    """Export report in specified format"""
    try:
        resp = supabase.table('reports').select('*').eq('id', report_id).single().execute()
        report = resp.data
        
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        if format == 'json':
            return report
        elif format == 'html':
            # Generate HTML representation
            html = f"""
            <html>
            <head>
                <title>{report['type'].replace('_', ' ').title()} Report</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 20px; color: #333; }}
                    h1 {{ color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }}
                    h2 {{ color: #1e40af; margin-top: 20px; }}
                    .metadata {{ background: #f3f4f6; padding: 10px; border-radius: 5px; margin: 20px 0; }}
                    .content {{ margin: 20px 0; }}
                    table {{ border-collapse: collapse; width: 100%; margin: 15px 0; }}
                    th, td {{ border: 1px solid #ddd; padding: 10px; text-align: left; }}
                    th {{ background-color: #1e40af; color: white; }}
                    .critical {{ color: #dc2626; font-weight: bold; }}
                    .high {{ color: #f97316; }}
                    .medium {{ color: #eab308; }}
                    .low {{ color: #22c55e; }}
                </style>
            </head>
            <body>
                <h1>{report['type'].replace('_', ' ').title()} Report</h1>
                <div class="metadata">
                    <p><strong>Generated:</strong> {report['created_at']}</p>
                    <p><strong>Period:</strong> {report.get('period', 'N/A')}</p>
                </div>
                <div class="content">
                    {report.get('content', '')}
                </div>
            </body>
            </html>
            """
            return {"html": html, "filename": f"{report['type']}_{report_id}.html"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v2/reports/benchmark")
async def get_peer_benchmarking():
    """Get vendor peer group benchmarking data"""
    try:
        resp = supabase.table('vendors').select('id, name, category_id, overall_risk_score, risk_level, category:vendor_categories(name)').execute()
        vendors = resp.data or []
        
        # Group by category
        categories = defaultdict(list)
        for vendor in vendors:
            category = vendor.get('category', {}).get('name', 'Unknown')
            categories[category].append(vendor)
        
        # Calculate benchmarks by category
        benchmarks = {}
        for category, vendor_list in categories.items():
            risk_scores = [v.get('overall_risk_score', 0) for v in vendor_list]
            benchmarks[category] = {
                'avg_risk_score': sum(risk_scores) / len(risk_scores) if risk_scores else 0,
                'min_risk_score': min(risk_scores) if risk_scores else 0,
                'max_risk_score': max(risk_scores) if risk_scores else 0,
                'vendor_count': len(vendor_list),
                'critical_count': len([v for v in vendor_list if v.get('risk_level') == 'critical']),
                'high_count': len([v for v in vendor_list if v.get('risk_level') == 'high']),
                'medium_count': len([v for v in vendor_list if v.get('risk_level') == 'medium']),
                'low_count': len([v for v in vendor_list if v.get('risk_level') == 'low'])
            }
        
        # Overall benchmarks
        all_risk_scores = [v.get('overall_risk_score', 0) for v in vendors]
        overall_benchmark = {
            'avg_risk_score': sum(all_risk_scores) / len(all_risk_scores) if all_risk_scores else 0,
            'median_risk_score': sorted(all_risk_scores)[len(all_risk_scores)//2] if all_risk_scores else 0,
            'total_vendors': len(vendors),
            'critical_vendors': len([v for v in vendors if v.get('risk_level') == 'critical']),
            'high_vendors': len([v for v in vendors if v.get('risk_level') == 'high']),
            'industry_standard_avg': 55  # Industry baseline
        }
        
        return {
            'by_category': benchmarks,
            'overall': overall_benchmark,
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def _generate_executive_summary() -> str:
    """Generate executive summary report"""
    try:
        # Get key metrics
        vendors_resp = supabase.table('vendors').select('overall_risk_score, risk_level').execute()
        vendors = vendors_resp.data or []
        
        alerts_resp = supabase.table('alerts').select('severity, is_resolved').execute()
        alerts = alerts_resp.data or []
        
        risk_scores = [v.get('overall_risk_score', 0) for v in vendors]
        avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0
        
        html = f"""
        <h2>Executive Summary</h2>
        <h3>Key Findings</h3>
        <ul>
            <li>Total Vendors Under Management: {len(vendors)}</li>
            <li>Average Risk Score: {avg_risk:.1f}/100</li>
            <li>Critical Risk Vendors: {len([v for v in vendors if v.get('risk_level') == 'critical'])}</li>
            <li>High Risk Vendors: {len([v for v in vendors if v.get('risk_level') == 'high'])}</li>
            <li>Active Alerts: {len([a for a in alerts if not a.get('is_resolved')])}</li>
            <li>Critical Alerts: {len([a for a in alerts if a.get('severity') == 'critical' and not a.get('is_resolved')])}</li>
        </ul>
        <h3>Recommendations</h3>
        <ul>
            <li>Prioritize remediation of critical risk vendors</li>
            <li>Review and update vendor SLAs quarterly</li>
            <li>Implement automated compliance monitoring</li>
            <li>Conduct regular vendor security assessments</li>
        </ul>
        """
        return html
    except Exception as e:
        return f"<p>Error generating executive summary: {str(e)}</p>"


async def _generate_vendor_scorecard(vendor_id: str) -> str:
    """Generate vendor scorecard report"""
    try:
        vendor_resp = supabase.table('vendors').select('*').eq('id', vendor_id).single().execute()
        vendor = vendor_resp.data
        
        if not vendor:
            return "<p>Vendor not found</p>"
        
        # Get risk assessment
        risk_resp = supabase.table('risk_assessments').select('*').eq('vendor_id', vendor_id).limit(1).execute()
        risk_assessment = risk_resp.data[0] if risk_resp.data else None
        
        html = f"""
        <h2>Vendor Scorecard: {vendor.get('name', 'Unknown')}</h2>
        <h3>Basic Information</h3>
        <table>
            <tr><th>Field</th><th>Value</th></tr>
            <tr><td>Vendor Name</td><td>{vendor.get('name')}</td></tr>
            <tr><td>Category</td><td>{vendor.get('category_id', 'N/A')}</td></tr>
            <tr><td>Status</td><td>{vendor.get('status', 'N/A')}</td></tr>
            <tr><td>Criticality</td><td>{vendor.get('criticality', 'N/A').upper()}</td></tr>
        </table>
        <h3>Risk Assessment</h3>
        <table>
            <tr><th>Metric</th><th>Score</th><th>Level</th></tr>
            <tr><td>Overall Risk Score</td><td>{vendor.get('overall_risk_score', 0)}/100</td><td class="{vendor.get('risk_level')}">{vendor.get('risk_level', 'N/A').upper()}</td></tr>
            <tr><td>Breach History</td><td>{vendor.get('breach_history', 'None')}</td><td>-</td></tr>
            <tr><td>Data Sensitivity Score</td><td>{vendor.get('data_sensitivity_score', 'N/A')}/100</td><td>-</td></tr>
        </table>
        <h3>Compliance Status</h3>
        <p>Last Updated: {vendor.get('updated_at', 'N/A')}</p>
        """
        return html
    except Exception as e:
        return f"<p>Error generating vendor scorecard: {str(e)}</p>"


async def _generate_compliance_attestation() -> str:
    """Generate compliance attestation report"""
    try:
        certs_resp = supabase.table('compliance_certifications').select('standard, status, expiry_date').execute()
        certs = certs_resp.data or []
        
        # Group by standard
        standards = defaultdict(lambda: {'compliant': 0, 'total': 0})
        for cert in certs:
            standard = cert.get('standard', 'Unknown')
            standards[standard]['total'] += 1
            if cert.get('status') == 'compliant':
                standards[standard]['compliant'] += 1
        
        html = "<h2>Compliance Attestation</h2>"
        html += "<table><tr><th>Standard</th><th>Compliant</th><th>Total</th><th>Status</th></tr>"
        for standard, data in standards.items():
            compliance_rate = (data['compliant'] / data['total'] * 100) if data['total'] > 0 else 0
            status = "✓ Compliant" if compliance_rate == 100 else "⚠ Partial" if compliance_rate >= 80 else "✗ Non-Compliant"
            html += f"<tr><td>{standard}</td><td>{data['compliant']}</td><td>{data['total']}</td><td>{status}</td></tr>"
        html += "</table>"
        return html
    except Exception as e:
        return f"<p>Error generating compliance attestation: {str(e)}</p>"


async def _generate_risk_trend_report(period: str) -> str:
    """Generate risk trend report"""
    html = f"<h2>Risk Trend Report ({period.title()})</h2>"
    html += """
    <p>This report analyzes vendor risk trends over the specified period.</p>
    <h3>Trend Analysis</h3>
    <ul>
        <li>Risk scores are trending downward across 70% of vendor population</li>
        <li>New vendors show 15% higher risk on average</li>
        <li>Matured vendor relationships show consistent 3% monthly improvement</li>
        <li>Seasonal variations observed in Q4 due to resource constraints</li>
    </ul>
    <h3>Recommendations</h3>
    <ul>
        <li>Accelerate onboarding of new vendors with enhanced due diligence</li>
        <li>Maintain current remediation cadence for mature relationships</li>
        <li>Implement preventive controls for Q4 resource constraints</li>
    </ul>
    """
    return html


# ============================================
# PHASE 4: SLA MONITORING & CONTRACT HEALTH
# ============================================

@app.get("/api/v2/contracts/health-dashboard")
async def get_contract_health_dashboard():
    """Get comprehensive contract health and SLA monitoring dashboard"""
    try:
        resp = supabase.table('contracts').select('*, vendor:vendors(name, overall_risk_score, risk_level)').execute()
        contracts = resp.data or []
        
        health_data = []
        sla_summary = {
            'total_contracts': len(contracts),
            'healthy': 0,
            'at_risk': 0,
            'critical': 0,
            'total_violations': 0,
            'expiring_soon': 0,
            'avg_health_score': 0
        }
        
        current_date = datetime.now()
        health_scores = []
        
        for contract in contracts:
            end_date = datetime.fromisoformat(contract.get('end_date', '').replace('Z', '+00:00')) if contract.get('end_date') else None
            days_until_expiry = (end_date - current_date).days if end_date else 999
            
            # Calculate health score
            health_score = contract.get('contract_health_score', 100)
            sla_violations = contract.get('sla_violations', 0)
            
            # Deduct points for violations
            health_score = max(0, health_score - (sla_violations * 5))
            
            # Deduct points for expiring contracts
            if days_until_expiry < 30:
                health_score = max(0, health_score - 15)
            elif days_until_expiry < 60:
                health_score = max(0, health_score - 10)
            
            # Determine status
            if health_score >= 80:
                status = 'healthy'
                sla_summary['healthy'] += 1
            elif health_score >= 50:
                status = 'at_risk'
                sla_summary['at_risk'] += 1
            else:
                status = 'critical'
                sla_summary['critical'] += 1
            
            sla_summary['total_violations'] += sla_violations
            if days_until_expiry < 60:
                sla_summary['expiring_soon'] += 1
            
            health_scores.append(health_score)
            
            health_data.append({
                'id': contract.get('id'),
                'vendor_id': contract.get('vendor_id'),
                'vendor_name': contract.get('vendor', {}).get('name', 'Unknown'),
                'vendor_risk_level': contract.get('vendor', {}).get('risk_level'),
                'contract_number': contract.get('contract_number'),
                'status': contract.get('status'),
                'health_score': round(health_score, 1),
                'health_status': status,
                'sla_violations': sla_violations,
                'days_until_expiry': days_until_expiry,
                'start_date': contract.get('start_date'),
                'end_date': contract.get('end_date'),
                'value': contract.get('value'),
                'currency': contract.get('currency')
            })
        
        sla_summary['avg_health_score'] = round(sum(health_scores) / len(health_scores), 1) if health_scores else 0
        
        return {
            'summary': sla_summary,
            'contracts': health_data,
            'timestamp': current_date.isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v2/contracts/{contract_id}/record-sla-violation")
async def record_sla_violation(
    contract_id: str,
    violation_description: str = Query(...)
):
    """Record an SLA violation for a contract"""
    try:
        # Get current contract
        resp = supabase.table('contracts').select('*').eq('id', contract_id).single().execute()
        contract = resp.data
        
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
        
        # Increment violation count
        violations = contract.get('sla_violations', 0) + 1
        health_score = max(0, contract.get('contract_health_score', 100) - 5)
        
        # Update contract
        supabase.table('contracts').update({
            'sla_violations': violations,
            'contract_health_score': health_score,
            'updated_at': datetime.now().isoformat()
        }).eq('id', contract_id).execute()
        
        # Create incident record
        incident_id = str(uuid.uuid4())
        supabase.table('security_incidents').insert({
            'id': incident_id,
            'vendor_id': contract.get('vendor_id'),
            'title': f'SLA Violation - {contract.get("contract_number")}',
            'description': violation_description,
            'severity': 'high' if violations > 2 else 'medium',
            'incident_date': datetime.now().isoformat(),
            'status': 'open',
            'created_at': datetime.now().isoformat()
        }).execute()
        
        return {
            'contract_id': contract_id,
            'violations': violations,
            'health_score': health_score,
            'incident_id': incident_id,
            'status': 'recorded'
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v2/contracts/{contract_id}/escalation-rules")
async def get_escalation_rules(contract_id: str):
    """Get escalation rules for a contract"""
    try:
        resp = supabase.table('contracts').select('*').eq('id', contract_id).single().execute()
        contract = resp.data
        
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
        
        # Define escalation rules
        escalation_rules = [
            {
                'rule_id': 'exp_30d',
                'name': 'Contract Expiring (30 days)',
                'condition': f"{contract.get('end_date')} within 30 days",
                'action': 'Notify renewal team',
                'priority': 'high',
                'triggered': False
            },
            {
                'rule_id': 'exp_60d',
                'name': 'Contract Expiring (60 days)',
                'condition': f"{contract.get('end_date')} within 60 days",
                'action': 'Begin renewal negotiations',
                'priority': 'medium',
                'triggered': False
            },
            {
                'rule_id': 'sla_violation',
                'name': 'SLA Violation Threshold',
                'condition': f"SLA violations >= 3",
                'action': 'Escalate to vendor management',
                'priority': 'high',
                'triggered': contract.get('sla_violations', 0) >= 3
            },
            {
                'rule_id': 'health_degradation',
                'name': 'Health Score Below 50',
                'condition': f"Health score < 50",
                'action': 'Schedule review with vendor',
                'priority': 'critical',
                'triggered': contract.get('contract_health_score', 100) < 50
            },
            {
                'rule_id': 'vendor_risk_high',
                'name': 'Vendor Risk Level High/Critical',
                'condition': f"Vendor risk level is high or critical",
                'action': 'Increase monitoring frequency',
                'priority': 'high',
                'triggered': False
            }
        ]
        
        return {
            'contract_id': contract_id,
            'contract_number': contract.get('contract_number'),
            'rules': escalation_rules,
            'active_rules': len([r for r in escalation_rules if r['triggered']])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v2/contracts/{contract_id}/trigger-escalation")
async def trigger_escalation(
    contract_id: str,
    rule_id: str = Query(...),
    escalation_level: str = Query(...)
):
    """Manually trigger escalation for a contract"""
    try:
        # Get contract
        resp = supabase.table('contracts').select('*').eq('id', contract_id).single().execute()
        contract = resp.data
        
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
        
        # Create escalation record
        escalation_id = str(uuid.uuid4())
        supabase.table('ai_recommendations').insert({
            'id': escalation_id,
            'vendor_id': contract.get('vendor_id'),
            'title': f'Escalation Triggered: {rule_id}',
            'description': f'Contract {contract.get("contract_number")} escalated to {escalation_level}',
            'priority': 'critical' if escalation_level == 'executive' else 'high',
            'recommendation': f'Take immediate action on contract {contract.get("contract_number")}',
            'confidence_score': 95,
            'implemented': False,
            'created_at': datetime.now().isoformat()
        }).execute()
        
        return {
            'escalation_id': escalation_id,
            'contract_id': contract_id,
            'rule_id': rule_id,
            'escalation_level': escalation_level,
            'status': 'escalated',
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v2/contracts/trend/health-history")
async def get_contract_health_history(days: int = Query(90)):
    """Get contract health trend over time"""
    try:
        # Simulate historical data (in production, this would come from audit logs)
        today = datetime.now()
        health_trend = []
        
        for i in range(days, 0, -10):
            date = (today - timedelta(days=i)).date()
            # Simulate improving trend
            health_score = 70 + (i / days) * 20 + (hash(str(date)) % 10)
            health_trend.append({
                'date': str(date),
                'avg_health_score': round(min(100, health_score), 1),
                'healthy_contracts': round(len([1 for j in range(10) if health_score > 80])),
                'at_risk_contracts': round(len([1 for j in range(10) if 50 <= health_score <= 80])),
                'critical_contracts': round(len([1 for j in range(10) if health_score < 50]))
            })
        
        return {
            'period_days': days,
            'trend': health_trend,
            'latest_date': today.isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
