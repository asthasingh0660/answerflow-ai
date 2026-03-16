'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function NewProjectPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) return setError('Project name is required')
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return (window.location.href = '/auth/login')

    const { data, error } = await supabase
      .from('projects')
      .insert({ name: name.trim(), description: description.trim(), user_id: user.id })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = `/projects/${data.id}`
    }
  }

  return (
    <div className="p-8 max-w-xl">
      <Link href="/projects" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to projects
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">New Project</h1>
      <p className="text-gray-500 mb-8">A project holds your reference documents and questionnaires.</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>
      )}

      <div className="space-y-5">
        <div>
          <label className="label">Project Name *</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. CloudPulse Security Review 2025"
            onKeyDown={e => e.key === 'Enter' && handleCreate()} />
        </div>
        <div>
          <label className="label">Description <span className="text-gray-400">(optional)</span></label>
          <textarea className="input resize-none h-24" value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Brief description of this questionnaire project..." />
        </div>
        <div className="flex gap-3 pt-2">
          <Link href="/projects" className="btn-secondary">Cancel</Link>
          <button onClick={handleCreate} disabled={loading || !name.trim()} className="btn-primary flex items-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  )
}