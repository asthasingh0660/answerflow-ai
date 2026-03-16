import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, FolderOpen, CheckCircle, FileQuestion } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(6)

  const { data: runs } = await supabase
    .from('runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  const totalAnswered = runs?.reduce((a, r) => a + (r.answered_count || 0), 0) ?? 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''} 👋
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s an overview of your projects.</p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Total Projects', value: projects?.length ?? 0, icon: FolderOpen, color: 'text-brand-600 bg-brand-50' },
          { label: 'Runs Completed', value: runs?.length ?? 0, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
          { label: 'Questions Answered', value: totalAnswered, icon: FileQuestion, color: 'text-purple-600 bg-purple-50' },
        ].map(stat => (
          <div key={stat.label} className="card p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
        <Link href="/projects/new" className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> New Project
        </Link>
      </div>

      {!projects?.length ? (
        <div className="card p-12 text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No projects yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first project to get started</p>
          <Link href="/projects/new"
            className="btn-primary inline-flex items-center gap-2 mt-4 text-sm">
            <Plus className="w-4 h-4" /> Create Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {projects.map((project: any) => (
            <Link key={project.id} href={`/projects/${project.id}`}
              className="card p-5 hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-gray-900">{project.name}</h3>
              {project.description && (
                <p className="text-gray-500 text-sm mt-1 line-clamp-2">{project.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-3">
                {new Date(project.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}