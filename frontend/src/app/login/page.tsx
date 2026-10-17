'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Radio, AlertCircle } from 'lucide-react';

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background-secondary p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle variant="dropdown" />
      </div>

      <div className="w-full max-w-sm space-y-4">
        {/* Brand header */}
        <div className="text-center space-y-1.5">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-foreground tracking-tight">
            <div className="flex h-7 w-7 items-center justify-center rounded-[5px] bg-primary text-primary-foreground font-mono text-xs font-bold">
              <Radio className="h-4 w-4" />
            </div>
            <span className="text-lg font-mono font-semibold">VestiNex</span>
          </Link>
          <p className="text-xs text-foreground-secondary">Incident Intelligence & Deployment Monitoring</p>
        </div>

        {/* Login Card */}
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="space-y-1 pb-3">
            <CardTitle className="text-base font-semibold text-foreground">Sign In</CardTitle>
            <CardDescription className="text-xs text-foreground-secondary">
              Access the failure investigation workspace and telemetry streams.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {error && (
              <div className="rounded-[5px] border border-status-error-border bg-status-error-bg p-2.5 text-xs text-status-error-text flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-status-error" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@vestinex.io"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-8 text-xs font-medium mt-1"
              >
                {loading ? 'Authenticating...' : 'Sign In to Workspace'}
              </Button>
            </form>

            {process.env.NODE_ENV !== 'production' && (
              <>
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
                    <span className="bg-card px-2 text-foreground-muted">Fast Demo Access</span>
                  </div>
                </div>

                {/* Quick Demo Access Buttons */}
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin@vestinex.io')}
                    className="flex flex-col items-start rounded border border-border bg-surface/50 p-2 text-left hover:bg-surface hover:border-foreground-muted transition-colors cursor-pointer"
                  >
                    <span className="font-medium text-foreground text-[11px]">Platform Lead</span>
                    <span className="text-[10px] text-primary font-mono truncate max-w-full">admin@vestinex.io</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('dev@vestinex.io')}
                    className="flex flex-col items-start rounded border border-border bg-surface/50 p-2 text-left hover:bg-surface hover:border-foreground-muted transition-colors cursor-pointer"
                  >
                    <span className="font-medium text-foreground text-[11px]">Staff SRE</span>
                    <span className="text-[10px] text-foreground-secondary font-mono truncate max-w-full">dev@vestinex.io</span>
                  </button>
                </div>
              </>
            )}

            <div className="text-center pt-1 text-xs text-foreground-secondary">
              Need a new account?{' '}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Create Account
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
