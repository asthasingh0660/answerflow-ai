import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ProjectHub from './ProjectHub'

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!project) return notFound()

  const { data: refDocs } = await supabase
    .from('reference_documents')
    .select('*')
    .eq('project_id', params.id)
    .order('uploaded_at', { ascending: false })

  const { data: questionnaires } = await supabase
    .from('questionnaires')
    .select('*')
    .eq('project_id', params.id)
    .order('uploaded_at', { ascending: false })

  const { data: runs } = await supabase
    .from('runs')
    .select('*')
    .eq('project_id', params.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <Link href="/projects"
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> All Projects
      </Link>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        {project.description && <p className="text-gray-500 mt-1">{project.description}</p>}
      </div>
      <ProjectHub
        project={project}
        initialRefDocs={refDocs ?? []}
        initialQuestionnaires={questionnaires ?? []}
        initialRuns={runs ?? []}
      />
    </div>
  )
}