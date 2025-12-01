'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (user) {
      router.replace('/dashboard/');
    }
  }, [router, user]);

  const isFormValid = useMemo(() => {
    return formData.email.trim() !== '' && formData.password.trim() !== '';
  }, [formData.email, formData.password]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const result = await login(formData.email.trim(), formData.password);
      if (!result.success) {
        setErrorMessage(result.message || 'Account not found. Please check your email or contact the administrator.');
        return;
      }

      router.replace('/dashboard/');
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb] px-4 py-8 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="mx-auto w-full max-w-md">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-foreground">Sign in to your account</h1>
          <p className="text-sm text-text-muted">
            Contact your administrator to obtain account access.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 w-full max-w-md space-y-4 rounded-[30px] border border-surface-border bg-white p-6 shadow-[0_15px_45px_rgba(99,101,185,0.12)]"
          noValidate
        >
          <div className="space-y-3">
            <label className="sr-only" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="Email address"
              className="w-full rounded-[22px] border border-surface-border bg-white px-4 py-3 text-sm text-foreground shadow-[0_2px_6px_rgba(99,101,185,0.05)] focus:border-[#6365b9] focus:outline-none focus:ring-2 focus:ring-[#6365b9]/30"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-3">
            <label className="sr-only" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              className="w-full rounded-[22px] border border-surface-border bg-white px-4 py-3 text-sm text-foreground shadow-[0_2px_6px_rgba(99,101,185,0.05)] focus:border-[#6365b9] focus:outline-none focus:ring-2 focus:ring-[#6365b9]/30"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={4}
            />
          </div>

          {errorMessage && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="flex w-full items-center justify-center rounded-full bg-[#6365b9] py-3 text-sm font-semibold text-white shadow-[0_20px_45px_rgba(99,101,185,0.35)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#6365b9]/40 disabled:shadow-none"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
