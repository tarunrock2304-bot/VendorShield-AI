# VendorShield AI 🛡️

VendorShield AI is a comprehensive enterprise-grade third-party risk management (TPRM) and vendor compliance platform. It enables organizations to assess, monitor, and mitigate cybersecurity risks across their vendor supply chain, ensuring compliance with global security frameworks.

---

## 🚀 Application Features & Cybersecurity Framework Alignment

Below is a detailed mapping of the features available in VendorShield AI and the specific cybersecurity frameworks and controls they align with:

| Feature Component | Description | Cybersecurity Framework Alignment | Implementation Purpose |
| :--- | :--- | :--- | :--- |
| **Dashboard** | Centralized cockpit displaying executive risk posture, vendor compliance trends, outstanding remediation tasks, and active threat indicators. | <ul><li>**NIST CSF:** Identify (ID.AM, ID.RA)</li><li>**SOC 2:** Security (CC6.1, CC6.6)</li></ul> | Aggregates high-level metrics to provide continuous monitoring and visual evidence of vendor risk profiles. |
| **Vendor Management** | Profile, tier (Critical/High/Medium/Low), and catalog vendor details, contact info, and security scorecards. | <ul><li>**ISO 27001:** A.15 (Supplier Relationships)</li><li>**CIS Control 15:** Service Provider Management</li></ul> | Validates that third-party vendors meet organizational security requirements and maintains an inventory of service providers. |
| **Risk Assessment** | Create, schedule, and evaluate vendor security questionnaires. Identify vulnerabilities prior to onboarding. | <ul><li>**NIST CSF:** Risk Assessment (ID.RA)</li><li>**SOC 2:** Risk Assessment (CC3.1 - CC3.4)</li></ul> | Evaluates vendor cybersecurity practices against organizational risk appetites and policies. |
| **Remediation Tracker** | Generate, assign, and track corrective action plans (CAPs) for vendors who fall short on compliance controls. | <ul><li>**NIST CSF:** Respond (RS.RP, RS.AN) & Recover</li><li>**CIS Control 18:** Incident Response & Management</li></ul> | Facilitates collaborative tracking of security gap resolution between the host organization and the vendor. |
| **Compliance & Auditing** | Track compliance against standards (NIST CSF, ISO 27001, SOC 2, PCI DSS) and manage audit-ready evidence. | <ul><li>**ISO 27001:** A.18 (Compliance)</li><li>**SOC 2:** Trust Services Criteria (Security, Confidentiality)</li></ul> | Simplifies preparation for regulatory compliance and external audits by archiving evidence logs. |
| **Threat & Monitoring Center** | Real-time threat feed, active vulnerabilities, and event logging tailored to vendor-specific domains. | <ul><li>**NIST CSF:** Detect (DE.AE, DE.CM)</li><li>**MITRE ATT&CK:** Adversary Tactics & Techniques mapping</li></ul> | Tracks emerging threat signals and correlates them with vendor profiles to enable early prevention and defense. |
| **Contracts & SLAs** | Review, store, and analyze vendor contracts, service agreements, and security addendums. | <ul><li>**ISO 27001:** A.15.1.2 (Addressing Security Within Supplier Agreements)</li></ul> | Ensures that security requirements are legally binding and SLA thresholds are monitored. |
| **VendorShield Copilot** | AI-driven assistant that answers vendor compliance questions and suggests remediation actions. | <ul><li>**NIST CSF:** Protect (PR.AT) & Respond (RS.AN)</li></ul> | Provides natural language guidance based on policy documentation and cybersecurity standards. |
| **User & Role Management** | Role-Based Access Control (RBAC) to manage permissions for Admins, Auditors, and Vendors. | <ul><li>**ISO 27001:** A.9 (Access Control)</li><li>**CIS Control 3:** Data Protection / Access Control</li></ul> | Restricts access to sensitive compliance and vulnerability data based on the principle of least privilege. |

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS & PostCSS
- **Routing**: React Router DOM v7
- **Icons**: Lucide React
- **Charts**: Recharts (for risk & compliance telemetry)
- **Database Client**: Supabase JS SDK

### Backend
- **Framework**: Python FastAPI
- **Web Server**: Uvicorn
- **Database**: Supabase / PostgreSQL (migrations included)

---

## ⚙️ Getting Started

Follow these steps to run the application locally:

### 1. Prerequisites
Ensure you have the following installed:
- Node.js (v18 or higher)
- Python 3.12+
- Git

### 2. Frontend Setup
Navigate to the root directory and install dependencies:
```bash
npm install
```
Start the development server:
```bash
npm run dev
```
The frontend will run at `http://localhost:5173`.

### 3. Backend Setup
Navigate to the `backend` directory:
```bash
cd backend
```
Create a virtual environment and activate it:
```bash
python -m venv .venv
# On Windows:
.\.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate
```
Install the required packages:
```bash
pip install -r requirements.txt
```
Run the FastAPI development server:
```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
The backend API documentation will be available at `http://localhost:8000/docs`.

---

## 🔒 Cybersecurity Frameworks Integrated

The platform directly aligns with and helps track the following frameworks:
- **NIST CSF**: Covers Identify (Asset Management, Risk Assessment), Protect (Information Protection Processes), Detect (Security Continuous Monitoring), and Respond (Response Planning).
- **ISO/IEC 27001**: Aids in managing compliance controls under Supplier Relationships (A.15), Information Security Incident Management (A.16), and Compliance (A.18).
- **CIS Controls**: Focused on CIS Control 15 (Service Provider Management) and CIS Control 18 (Incident Response and Management).
- **MITRE ATT&CK**: Offers mapping to techniques to classify and respond to active threat vectors in the threat center.
- **SOC 2 Type II**: Supports audit readiness for the Trust Services Criteria (specifically Security and Confidentiality categories).
- **PCI DSS**: Pre-configured compliance checklist for vendors handling cardholder data.