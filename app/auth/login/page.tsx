'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (loading) return
    if (!email || !password) return setError('Please enter your email and password.')
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        window.location.href = '/dashboard'
      }
    } catch {
      setError('Something went wrong. Check your .env.local keys.')
      setLoading(false)
    }
  }

  return (
    <>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Welcome back</h2>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
          {error}
        </div>
      )}
      <div className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" disabled={loading} />
        </div>
        <div>
          <label className="label">Password</label>
          <input type="password" className="input" value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" disabled={loading}
            onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>
        <button onClick={handleLogin} disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign in'}
        </button>
      </div>
      <p className="text-center text-sm text-gray-500 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/auth/signup" className="text-brand-600 font-medium hover:underline">Sign up</Link>
      </p>
    </>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}