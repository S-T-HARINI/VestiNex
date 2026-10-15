'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Radio, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userEmail: string) => {
    setEmail(userEmail);
    setPassword('password123');
    setError('');
    setLoading(true);

    try {
      await login(userEmail, 'password123');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 selection:bg-indigo-500/20">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-white tracking-tight">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 shadow-md shadow-indigo-500/20">
              <Radio className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-mono">VestiNex</span>
          </Link>
          <p className="text-xs text-slate-400">Incident Intelligence & Deployment Monitoring</p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-800 bg-slate-900/70 shadow-2xl backdrop-blur-md">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-bold text-white">Sign In</CardTitle>
            <CardDescription className="text-xs">
              Access the failure investigation workspace and telemetry streams.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md border border-red-500/30 bg-red-950/30 p-2.5 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@vestinex.io"
                  required
                  className="bg-slate-950 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-slate-950 text-xs"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-xs font-medium h-9">
                {loading ? 'Authenticating...' : 'Sign In to Workspace'}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
                <span className="bg-slate-900 px-2 text-slate-500">Fast Demo Access</span>
              </div>
            </div>

            {/* Quick Demo Access Buttons */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@vestinex.io')}
                className="flex flex-col items-start rounded border border-slate-800 bg-slate-950/70 p-2 text-left hover:border-indigo-500/50 hover:bg-slate-900 transition-colors"
              >
                <span className="font-semibold text-slate-200 text-[11px]">Platform Lead</span>
                <span className="text-[10px] text-indigo-400 font-mono">admin@vestinex.io</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('dev@vestinex.io')}
                className="flex flex-col items-start rounded border border-slate-800 bg-slate-950/70 p-2 text-left hover:border-indigo-500/50 hover:bg-slate-900 transition-colors"
              >
                <span className="font-semibold text-slate-200 text-[11px]">Staff SRE</span>
                <span className="text-[10px] text-cyan-400 font-mono">dev@vestinex.io</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('lead@vestinex.io')}
                className="flex flex-col items-start rounded border border-slate-800 bg-slate-950/70 p-2 text-left hover:border-indigo-500/50 hover:bg-slate-900 transition-colors"
              >
                <span className="font-semibold text-slate-200 text-[11px]">Backend Architect</span>
                <span className="text-[10px] text-emerald-400 font-mono">lead@vestinex.io</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('viewer@vestinex.io')}
                className="flex flex-col items-start rounded border border-slate-800 bg-slate-950/70 p-2 text-left hover:border-indigo-500/50 hover:bg-slate-900 transition-colors"
              >
                <span className="font-semibold text-slate-200 text-[11px]">Observer (Read-Only)</span>
                <span className="text-[10px] text-slate-400 font-mono">viewer@vestinex.io</span>
              </button>
            </div>

            <div className="text-center pt-2 text-xs text-slate-400">
              Need a new account?{' '}
              <Link href="/register" className="text-indigo-400 hover:underline">
                Create Account
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
