import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import VendorManagement from './pages/VendorManagement';
import RiskAssessment from './pages/RiskAssessment';
import Compliance from './pages/Compliance';
import Contracts from './pages/Contracts';
import Threats from './pages/Threats';
import Remediation from './pages/Remediation';
import Copilot from './pages/Copilot';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import { User, UserRole } from './types';
import {
  LoginCredentials,
  buildUserFromAccount,
  findMatchingAccount,
  getStoredAccounts,
} from './lib/demo-auth';

interface LoginCredentials {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (credentials: LoginCredentials) => Promise<{ success: boolean; message?: string }>;
  signOut: () => Promise<void>;
}

const AUTH_STORAGE_KEY = 'vendorshield-demo-user';

const buildUser = (credentials: LoginCredentials): User => {
  const matchedAccount = findMatchingAccount(credentials);

  return buildUserFromAccount(
    matchedAccount ?? {
      ...credentials,
      id: 'USR-000',
      roleLabel: credentials.role === 'admin' ? 'Admin' : credentials.role === 'analyst' ? 'Analyst' : 'Auditor',
      status: 'Active',
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  );
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ success: false }),
  signOut: async () => {},
});

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-slate-600 font-medium">Loading VendorShield AI...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RequireRole({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-slate-600 font-medium">Loading VendorShield AI...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser) as User);
      } catch (error) {
        console.error('Failed to parse stored auth user:', error);
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }

    setLoading(false);
  }, []);

  const authValue = useMemo<AuthContextType>(() => {
    const signIn = async (credentials: LoginCredentials) => {
      const matchedAccount = findMatchingAccount(credentials);

      if (!matchedAccount) {
        return {
          success: false,
          message: 'Invalid demo credentials. Use one of the demo accounts shown on the login page.',
        };
      }

      if (!credentials.fullName.trim()) {
        return {
          success: false,
          message: 'Please enter your full name exactly as shown in the demo credentials.',
        };
      }

      const nextUser = buildUser(credentials);
      setUser(nextUser);
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));

      return { success: true };
    };

    const signOut = async () => {
      setUser(null);
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    };

    return {
      user,
      loading,
      signIn,
      signOut,
    };
  }, [loading, user]);

  return (
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="vendors" element={<VendorManagement />} />
            <Route path="risk-assessment" element={<RiskAssessment />} />
            <Route path="compliance" element={<Compliance />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="threats" element={<Threats />} />
            <Route path="remediation" element={<Remediation />} />
            <Route path="copilot" element={<Copilot />} />
            <Route path="reports" element={<Reports />} />
            <Route
              path="user-management"
              element={
                <RequireRole allowedRoles={['admin']}>
                  <UserManagement />
                </RequireRole>
              }
            />
          </Route>
          <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
          <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export default App;
