import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateEmbedding, cosineSimilarity, generateAnswer } from '@/lib/groq'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { answerId, questionId, projectId } = await req.json()
  const service = createServiceClient()

  const { data: question } = await service
    .from('questions').select('*').eq('id', questionId).single()
  if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

  const { data: chunks } = await service
    .from('document_chunks')
    .select('id, content, embedding, reference_document_id')
    .eq('project_id', projectId)

  const { data: refDocs } = await service
    .from('reference_documents')
    .select('id, file_name').eq('project_id', projectId)

  const refDocMap = Object.fromEntries((refDocs ?? []).map(d => [d.id, d.file_name]))
  const qEmbedding = generateEmbedding(question.question_text)

  const scored = (chunks ?? []).map(chunk => {
    let emb: number[]
    try { emb = typeof chunk.embedding === 'string' ? JSON.parse(chunk.embedding) : chunk.embedding }
    catch { emb = [] }
    return { ...chunk, similarity: emb.length ? cosineSimilarity(qEmbedding, emb) : 0 }
  })
  scored.sort((a, b) => b.similarity - a.similarity)
  const top = scored.slice(0, 4)

  const context = top.map(c => c.content).join('\n\n---\n\n')
  const citations = Array.from(new Set(top.map(c => refDocMap[c.reference_document_id] ?? 'Unknown')))
  const snippets = top.map(c => c.content.slice(0, 200) + '...')

  const { answer, confidence } = await generateAnswer(question.question_text, context)
  const isNotFound = answer.toLowerCase().includes('not found in references')

  const { data: updated } = await service
    .from('answers')
    .update({
      generated_answer: answer,
      edited_answer: null,
      citations: isNotFound ? [] : citations,
      evidence_snippets: isNotFound ? [] : snippets,
      confidence: isNotFound ? 0 : confidence,
      not_found: isNotFound,
    })
    .eq('id', answerId)
    .select().single()

  return NextResponse.json({ answer: updated })
}