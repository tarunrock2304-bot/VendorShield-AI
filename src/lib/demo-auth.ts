import { User, UserRole } from '../types';

export interface LoginCredentials {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface DemoAccount extends LoginCredentials {
  id: string;
  roleLabel: string;
  status: 'Active' | 'Inactive';
  last_login: string;
  created_at: string;
  updated_at: string;
}

const ACCOUNTS_STORAGE_KEY = 'vendorshield-demo-accounts';

export const DEFAULT_DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'USR-001',
    fullName: 'Admin User',
    email: 'admin@vendorshield.ai',
    password: 'admin123',
    role: 'admin',
    roleLabel: 'Admin',
    status: 'Active',
    last_login: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'USR-002',
    fullName: 'Analyst User',
    email: 'analyst@vendorshield.ai',
    password: 'analyst123',
    role: 'analyst',
    roleLabel: 'Analyst',
    status: 'Active',
    last_login: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'USR-003',
    fullName: 'Auditor User',
    email: 'auditor@vendorshield.ai',
    password: 'auditor123',
    role: 'auditor',
    roleLabel: 'Auditor',
    status: 'Active',
    last_login: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const getStoredAccounts = (): DemoAccount[] => {
  try {
    const stored = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_DEMO_ACCOUNTS;
    }
    const parsed = JSON.parse(stored) as DemoAccount[];
    if (!Array.isArray(parsed) || parsed.some((item) => !item.email || !item.password || !item.role)) {
      return DEFAULT_DEMO_ACCOUNTS;
    }
    return parsed;
  } catch (error) {
    console.error('Failed to read stored demo accounts:', error);
    return DEFAULT_DEMO_ACCOUNTS;
  }
};

export const saveStoredAccounts = (accounts: DemoAccount[]) => {
  window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
};

export const findMatchingAccount = (credentials: LoginCredentials): DemoAccount | undefined => {
  return getStoredAccounts().find(
    (account) =>
      account.fullName.toLowerCase() === credentials.fullName.trim().toLowerCase() &&
      account.email.toLowerCase() === credentials.email.toLowerCase() &&
      account.password === credentials.password &&
      account.role === credentials.role,
  );
};

export const buildUserFromAccount = (account: DemoAccount): User => ({
  id: `demo-${account.role}-${account.id}`,
  email: account.email,
  password: account.password,
  full_name: account.fullName,
  role: account.role,
  department: account.role === 'admin' ? 'Security Leadership' : 'Security Operations',
  is_active: account.status === 'Active',
  last_login: new Date().toISOString(),
  created_at: account.created_at,
  updated_at: new Date().toISOString(),
});

export const createAccountId = (accounts: DemoAccount[]) => {
  const maxNumber = accounts
    .map((acct) => parseInt(acct.id.replace(/[^0-9]/g, ''), 10))
    .filter((n) => !Number.isNaN(n))
    .reduce((max, current) => Math.max(max, current), 0);
  return `USR-${String(maxNumber + 1).padStart(3, '0')}`;
};
