'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  avatarUrl?: string | null;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  repoUrl?: string | null;
  environment: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';
  status: 'ACTIVE' | 'ARCHIVED';
  role?: string;
  memberCount?: number;
  deploymentCount?: number;
  incidentCount?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const res = await api.getMe();
      if (res?.user) {
        setUser(res.user);
        const projRes = await api.getProjects();
        if (projRes?.projects) {
          setProjects(projRes.projects);
          if (projRes.projects.length > 0 && !activeProject) {
            setActiveProject(projRes.projects[0]);
          }
        }
      }
    } catch (err) {
      // Not authenticated, that is fine
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const login = async (email: string, password: string) => {
    setProjects([]);
    setActiveProject(null);
    const res = await api.login({ email, password });
    if (res.user) {
      setUser(res.user);
      const projRes = await api.getProjects();
      if (projRes?.projects) {
        setProjects(projRes.projects);
        setActiveProject(projRes.projects[0] || null);
      } else {
        setProjects([]);
        setActiveProject(null);
      }
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setProjects([]);
    setActiveProject(null);
    const res = await api.register({ name, email, password });
    if (res.user) {
      setUser(res.user);
      const projRes = await api.getProjects();
      if (projRes?.projects) {
        setProjects(projRes.projects);
        setActiveProject(projRes.projects[0] || null);
      } else {
        setProjects([]);
        setActiveProject(null);
      }
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setProjects([]);
      setActiveProject(null);
    }
  };

  const refreshProjects = async () => {
    try {
      const res = await api.getProjects();
      if (res.projects) {
        setProjects(res.projects);
        if (activeProject) {
          const updated = res.projects.find((p: Project) => p.id === activeProject.id);
          if (updated) setActiveProject(updated);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        projects,
        activeProject,
        setActiveProject,
        login,
        register,
        logout,
        refreshProjects,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
