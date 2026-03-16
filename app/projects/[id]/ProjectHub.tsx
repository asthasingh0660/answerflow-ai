'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Upload, FileText, Play, CheckCircle, XCircle, Loader2, History } from 'lucide-react'

interface Props {
  project: any
  initialRefDocs: any[]
  initialQuestionnaires: any[]
  initialRuns: any[]
}

export default function ProjectHub({ project, initialRefDocs, initialQuestionnaires, initialRuns }: Props) {
  const [refDocs, setRefDocs] = useState(initialRefDocs)
  const [questionnaires, setQuestionnaires] = useState(initialQuestionnaires)
  const [runs, setRuns] = useState(initialRuns)
  const [uploadingRef, setUploadingRef] = useState(false)
  const [uploadingQ, setUploadingQ] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processMsg, setProcessMsg] = useState('')
  const [progress, setProgress] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [doneQuestions, setDoneQuestions] = useState(0)
  const [error, setError] = useState('')

  async function uploadFile(file: File, type: 'reference' | 'questionnaire') {
    const setter = type === 'reference' ? setUploadingRef : setUploadingQ
    setter(true)
    setError('')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('projectId', project.id)
    formData.append('type', type)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Upload failed')
      } else {
        if (type === 'reference') setRefDocs(prev => [data.doc, ...prev])
        else setQuestionnaires(prev => [data.doc, ...prev])
      }
    } catch {
      setError('Upload failed. Please try again.')
    }
    setter(false)
  }

  async function handleProcess() {
    const questionnaire = questionnaires[0]
    if (!questionnaire) return setError('Please upload a questionnaire first')
    if (!refDocs.length) return setError('Please upload at least one reference document')

    setProcessing(true)
    setError('')
    setProgress(5)
    setProcessMsg('Starting...')
    setDoneQuestions(0)
    setTotalQuestions(0)

    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, questionnaireId: questionnaire.id }),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Processing failed')
        setProcessing(false)
        setProgress(0)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let runId = ''
      let total = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n').filter(Boolean)
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const msg = JSON.parse(line.slice(6))

              if (msg.message) {
                setProcessMsg(msg.message)

                // Parse "Answering question X of Y"
                const match = msg.message.match(/question (\d+) of (\d+)/)
                if (match) {
                  const current = parseInt(match[1])
                  total = parseInt(match[2])
                  setTotalQuestions(total)
                  setDoneQuestions(current)
                  // Progress: 10% loading + 85% for questions + 5% finishing
                  setProgress(10 + Math.round((current / total) * 85))
                } else if (msg.message.includes('Loading')) {
                  setProgress(10)
                } else if (msg.message.includes('Done')) {
                  setProgress(100)
                }
              }

              if (msg.runId) runId = msg.runId
              if (msg.run) setRuns(prev => [msg.run, ...prev])
              if (msg.error) setError(msg.error)
            } catch {}
          }
        }
      }

      setProcessing(false)
      if (runId) window.location.href = `/projects/${project.id}/runs/${runId}`
    } catch {
      setError('Processing failed. Please try again.')
      setProcessing(false)
      setProgress(0)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-5">
        {/* Reference Documents */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Reference Documents</h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{refDocs.length} files</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">Source-of-truth documents. Upload PDFs, DOCX, or TXT.</p>

          <label className={`flex flex-col items-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors mb-4 ${uploadingRef ? 'border-brand-300 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50'}`}>
            {uploadingRef
              ? <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
              : <Upload className="w-5 h-5 text-gray-400" />}
            <span className="text-xs text-gray-500">
              {uploadingRef ? 'Processing document...' : 'Click to upload'}
            </span>
            {uploadingRef && (
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <div className="bg-brand-500 h-1.5 rounded-full animate-pulse w-3/4" />
              </div>
            )}
            <input type="file" className="hidden" accept=".pdf,.docx,.txt,.xlsx"
              disabled={uploadingRef}
              onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], 'reference')} />
          </label>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {refDocs.map((doc: any) => (
              <div key={doc.id} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="truncate flex-1">{doc.file_name}</span>
                <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Questionnaire */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Questionnaire</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">Upload your questionnaire. Numbered questions are auto-detected.</p>

          <label className={`flex flex-col items-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors mb-4 ${uploadingQ ? 'border-brand-300 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50'}`}>
            {uploadingQ
              ? <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
              : <Upload className="w-5 h-5 text-gray-400" />}
            <span className="text-xs text-gray-500">
              {uploadingQ ? 'Parsing questions...' : 'Click to upload'}
            </span>
            {uploadingQ && (
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <div className="bg-brand-500 h-1.5 rounded-full animate-pulse w-1/2" />
              </div>
            )}
            <input type="file" className="hidden" accept=".pdf,.docx,.txt,.xlsx"
              disabled={uploadingQ}
              onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], 'questionnaire')} />
          </label>

          {questionnaires[0] && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              <FileText className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
              <span className="truncate flex-1">{questionnaires[0].file_name}</span>
              <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            </div>
          )}
        </div>
      </div>

      {/* Generate */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">Generate Answers</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {processing
                ? processMsg
                : 'AI will retrieve relevant content and generate grounded answers with citations.'}
            </p>
          </div>
          <button onClick={handleProcess}
            disabled={processing || !questionnaires.length || !refDocs.length}
            className="btn-primary flex items-center gap-2 flex-shrink-0">
            {processing
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              : <><Play className="w-4 h-4" /> Generate Answers</>}
          </button>
        </div>

        {/* Progress bar */}
        {processing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{processMsg}</span>
              {totalQuestions > 0 && (
                <span className="font-medium text-brand-600">
                  {doneQuestions} / {totalQuestions} questions
                </span>
              )}
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-brand-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 text-right">{progress}% complete</div>
          </div>
        )}
      </div>

      {/* Run History */}
      {runs.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Run History</h2>
          </div>
          <div className="space-y-2">
            {runs.map((run: any) => (
              <Link key={run.id} href={`/projects/${project.id}/runs/${run.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-brand-50 transition-colors">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(run.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {run.total_questions} questions · {run.answered_count} answered · {run.not_found_count} not found
                    </p>
                  </div>
                </div>
                <span className="text-xs text-brand-600 font-medium">View →</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}