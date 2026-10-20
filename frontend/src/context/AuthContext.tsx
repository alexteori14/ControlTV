import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/index.js';
import { authApi } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_ADMIN_USER: User = {
  id: 'admin-local',
  username: 'admin',
  role: 'ADMIN',
  email: 'admin@controltv.lan',
  fullName: 'Operador NOC',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user] = useState<User | null>(DEFAULT_ADMIN_USER);
  const [token] = useState<string | null>('direct-access-token');

  const login = async (_username: string, _password: string): Promise<boolean> => {
    return true;
  };

  const logout = () => {
    // Login disabled: direct access mode
  };

  const hasRole = (_roles: UserRole[]): boolean => {
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: true,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
