import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import RunReview from './RunReview'

export default async function RunPage({ params }: { params: { id: string; runId: string } }) {
  const supabase = createClient()

  const { data: run } = await supabase
    .from('runs')
    .select('*')
    .eq('id', params.runId)
    .single()

  if (!run) return notFound()

  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', params.id)
    .single()

  const { data: answers } = await supabase
    .from('answers')
    .select('*, questions(question_text, order_index)')
    .eq('run_id', params.runId)

  const sorted = (answers ?? []).sort(
    (a: any, b: any) => (a.questions?.order_index ?? 0) - (b.questions?.order_index ?? 0)
  )

  return (
    <div className="p-8">
      <Link href={`/projects/${params.id}`}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> {project?.name ?? 'Project'}
      </Link>
      <RunReview
        run={run}
        answers={sorted}
        projectId={params.id}
        runId={params.runId}
      />
    </div>
  )
}