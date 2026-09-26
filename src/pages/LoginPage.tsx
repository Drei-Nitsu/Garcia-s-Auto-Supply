import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Wrench } from 'lucide-react';
import { supabase, errorMessage } from '@/lib/supabase';
import { STORE_NAME } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'At least 6 characters'),
  fullName: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [serverError, setServerError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: FormValues) => {
    setServerError(null);
    setInfo(null);
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password });
      if (error) setServerError(errorMessage(error));
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: v.email,
        password: v.password,
        options: { data: { full_name: v.fullName || v.email.split('@')[0] } },
      });
      if (error) setServerError(errorMessage(error));
      else if (!data.session) setInfo('Check your email to confirm your account, then sign in.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-6 flex items-center gap-2">
          <Wrench className="h-6 w-6 text-brand-600" />
          <div>
            <h1 className="text-lg font-bold text-slate-800">{STORE_NAME}</h1>
            <p className="text-xs text-slate-500">POS & Inventory</p>
          </div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="label">Full name</label>
              <input className="input" {...register('fullName')} />
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" autoComplete="current-password" {...register('password')} />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>
          {serverError && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{serverError}</p>}
          {info && <p className="rounded-lg bg-green-50 p-2 text-sm text-green-700">{info}</p>}
          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="mt-4 w-full text-center text-xs text-slate-500 hover:text-brand-600"
        >
          {mode === 'signin' ? 'New staff member? Create an account' : 'Already have an account? Sign in'}
        </button>
        <p className="mt-3 text-center text-[11px] text-slate-400">The first account created becomes the store admin.</p>
      </div>
    </div>
  );
}
