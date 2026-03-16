import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, FolderOpen, ArrowRight } from 'lucide-react'

export default async function ProjectsPage() {
  const supabase = createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('*, runs(id, answered_count, not_found_count, created_at)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">Each project holds your reference docs and questionnaires.</p>
        </div>
        <Link href="/projects/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Project
        </Link>
      </div>

      {!projects?.length ? (
        <div className="card p-16 text-center">
          <FolderOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold text-lg">No projects yet</p>
          <p className="text-gray-400 mt-2 mb-6">Create a project to upload documents and generate answers</p>
          <Link href="/projects/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create your first project
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project: any) => {
            const latestRun = project.runs?.sort((a: any, b: any) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0]
            return (
              <Link key={project.id} href={`/projects/${project.id}`}
                className="card p-5 flex items-center justify-between hover:shadow-md transition-shadow group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{project.name}</h3>
                    {project.description && (
                      <p className="text-gray-500 text-sm">{project.description}</p>
                    )}
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-gray-400">{project.runs?.length ?? 0} runs</span>
                      {latestRun && (
                        <span className="text-xs text-green-600">✓ {latestRun.answered_count} answered</span>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-brand-500 transition-colors" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}