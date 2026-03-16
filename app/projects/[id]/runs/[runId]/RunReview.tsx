'use client'

import { useState } from 'react'
import { Download, RefreshCw, Edit3, Check, X, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface Props {
  run: any
  answers: any[]
  projectId: string
  runId: string
}

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = pct >= 70
    ? 'text-green-700 bg-green-50 border-green-200'
    : pct >= 40
    ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
    : 'text-red-700 bg-red-50 border-red-200'
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${color}`}>
      {pct}% confidence
    </span>
  )
}

export default function RunReview({ run, answers: initialAnswers, projectId, runId }: Props) {
  const [answers, setAnswers] = useState(initialAnswers)
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const answered = answers.filter(a => !a.not_found).length
  const notFound = answers.filter(a => a.not_found).length
  const coverage = answers.length ? Math.round((answered / answers.length) * 100) : 0

  function startEdit(answer: any) {
    setEditing(answer.id)
    setEditText(answer.edited_answer || answer.generated_answer)
  }

  async function saveEdit(answerId: string) {
    setSaving(answerId)
    await fetch('/api/answers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answerId, editedAnswer: editText }),
    })
    setAnswers(prev => prev.map(a => a.id === answerId ? { ...a, edited_answer: editText } : a))
    setSaving(null)
    setEditing(null)
  }

  async function regenerate(answer: any) {
    setRegenerating(answer.id)
    const res = await fetch('/api/answers/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answerId: answer.id,
        questionId: answer.question_id,
        projectId,
        runId,
      }),
    })
    const data = await res.json()
    if (data.answer) {
      setAnswers(prev => prev.map(a => a.id === answer.id ? { ...a, ...data.answer } : a))
    }
    setRegenerating(null)
  }

  async function handleExport() {
    setExporting(true)
    const res = await fetch(`/api/export?runId=${runId}&projectId=${projectId}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const disposition = res.headers.get('content-disposition') ?? ''
    a.download = disposition.split('filename="')[1]?.replace('"', '') ?? 'answers.docx'
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Answers</h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date(run.created_at).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>
        <button onClick={handleExport} disabled={exporting}
          className="btn-primary flex items-center gap-2">
          {exporting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Exporting...</>
            : <><Download className="w-4 h-4" /> Export DOCX</>}
        </button>
      </div>

      {/* Coverage Summary */}
      <div className="card p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Coverage Summary</h2>
        <div className="flex gap-6 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-gray-700">{answers.length}</span>
            </div>
            <span className="text-sm text-gray-600">Total Questions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-green-700">{answered}</span>
            </div>
            <span className="text-sm text-gray-600">Answered with Citations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-red-600">{notFound}</span>
            </div>
            <span className="text-sm text-gray-600">Not Found in References</span>
          </div>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${coverage}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1">{coverage}% coverage</p>
      </div>

      {/* Answers */}
      <div className="space-y-3">
        {answers.map((answer, idx) => {
          const displayAnswer = answer.edited_answer || answer.generated_answer
          const isEditing = editing === answer.id
          const isExpanded = expanded === answer.id
          const isRegenerating = regenerating === answer.id
          const citations: string[] = answer.citations ?? []
          const snippets: string[] = answer.evidence_snippets ?? []

          return (
            <div key={answer.id}
              className={`card overflow-hidden ${answer.not_found ? 'border-red-100' : ''}`}>
              {/* Question */}
              <div className="p-4 flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5 ${answer.not_found ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-700'}`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm leading-relaxed">
                    {answer.questions?.question_text}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!answer.not_found && answer.confidence > 0 && (
                    <ConfidenceBadge score={answer.confidence} />
                  )}
                  {answer.not_found && (
                    <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Not found
                    </span>
                  )}
                  {answer.edited_answer && (
                    <span className="text-xs text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                      Edited
                    </span>
                  )}
                </div>
              </div>

              {/* Answer */}
              <div className="px-4 pb-4 pl-14">
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea value={editText} onChange={e => setEditText(e.target.value)}
                      className="input resize-none h-28 text-sm" autoFocus />
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(answer.id)} disabled={saving === answer.id}
                        className="btn-primary text-xs flex items-center gap-1 py-1.5">
                        <Check className="w-3 h-3" />
                        {saving === answer.id ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => setEditing(null)}
                        className="btn-secondary text-xs flex items-center gap-1 py-1.5">
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className={`text-sm leading-relaxed ${answer.not_found ? 'text-red-500 italic' : 'text-gray-700'}`}>
                    {displayAnswer}
                  </p>
                )}

                {/* Citations */}
                {!answer.not_found && citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {citations.map((c: string, i: number) => (
                      <span key={i} className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full border border-brand-100 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> {c}
                      </span>
                    ))}
                  </div>
                )}

                {/* Evidence snippets */}
                {snippets.length > 0 && (
                  <div className="mt-2">
                    <button onClick={() => setExpanded(isExpanded ? null : answer.id)}
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {isExpanded ? 'Hide' : 'Show'} evidence snippets
                    </button>
                    {isExpanded && (
                      <div className="mt-2 space-y-2">
                        {snippets.map((s: string, i: number) => (
                          <div key={i} className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5 border-l-2 border-brand-200 italic">
                            &quot;{s}&quot;
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {!isEditing && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => startEdit(answer)}
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                    <button onClick={() => regenerate(answer)} disabled={isRegenerating}
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
                      <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                      {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom export */}
      <div className="mt-8 text-center">
        <button onClick={handleExport} disabled={exporting}
          className="btn-primary inline-flex items-center gap-2">
          <Download className="w-4 h-4" />
          {exporting ? 'Generating...' : 'Export Completed Questionnaire (DOCX)'}
        </button>
        <p className="text-xs text-gray-400 mt-2">Downloads a Word document with all questions, answers and citations</p>
      </div>
    </div>
  )
}