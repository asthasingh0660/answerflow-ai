'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSignup() {
    if (loading) return
    if (!email || !password) return setError('Please fill in all fields.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        // If email confirmation is OFF, sign in directly
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (!loginError) {
          window.location.href = '/dashboard'
        } else {
          setSuccess(true)
          setLoading(false)
        }
      }
    } catch {
      setError('Something went wrong. Check your .env.local keys.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">📧</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-gray-500 text-sm">Click the confirmation link then come back to sign in.</p>
        <Link href="/auth/login" className="btn-primary inline-block mt-6">Back to login</Link>
      </div>
    )
  }

  return (
    <>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Create your account</h2>
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
            placeholder="Min 6 characters" disabled={loading}
            onKeyDown={e => e.key === 'Enter' && handleSignup()} />
        </div>
        <button onClick={handleSignup} disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create account'}
        </button>
      </div>
      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
      </p>
    </>
  )
}