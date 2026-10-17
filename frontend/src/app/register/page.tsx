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

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(name, email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
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
        <div className="text-center space-y-1.5">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-foreground tracking-tight">
            <div className="flex h-7 w-7 items-center justify-center rounded-[5px] bg-primary text-primary-foreground font-mono text-xs font-bold">
              <Radio className="h-4 w-4" />
            </div>
            <span className="text-lg font-mono font-semibold">VestiNex</span>
          </Link>
          <p className="text-xs text-foreground-secondary">Incident Intelligence & Deployment Monitoring</p>
        </div>

        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="space-y-1 pb-3">
            <CardTitle className="text-base font-semibold text-foreground">Create Account</CardTitle>
            <CardDescription className="text-xs text-foreground-secondary">
              Set up your engineer profile to join failure investigation teams.
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
                <label className="text-xs font-medium text-foreground">Full Name</label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Morgan Reed"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Engineering Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="m.reed@vestinex.io"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-8 text-xs font-medium mt-1"
              >
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </Button>
            </form>

            <div className="text-center pt-1 text-xs text-foreground-secondary">
              Already registered?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
