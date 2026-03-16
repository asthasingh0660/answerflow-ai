import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateEmbedding, cosineSimilarity, generateAnswer } from '@/lib/groq'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, questionnaireId } = await req.json()
  const service = createServiceClient()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {}
      }

      try {
        send({ message: 'Loading questions...' })

        const { data: questions, error: qErr } = await service
          .from('questions').select('*')
          .eq('questionnaire_id', questionnaireId)
          .order('order_index')

        if (qErr) {
          send({ error: `DB error loading questions: ${qErr.message}` })
          controller.close()
          return
        }

        if (!questions?.length) {
          send({ error: 'No questions found in questionnaire. Check the file was parsed correctly.' })
          controller.close()
          return
        }

        send({ message: `Found ${questions.length} questions. Loading reference documents...` })

        const { data: chunks, error: cErr } = await service
          .from('document_chunks')
          .select('id, content, embedding, reference_document_id')
          .eq('project_id', projectId)

        if (cErr) {
          send({ error: `DB error loading chunks: ${cErr.message}` })
          controller.close()
          return
        }

        if (!chunks?.length) {
          send({ error: 'No document chunks found. Try re-uploading your reference documents.' })
          controller.close()
          return
        }

        send({ message: `Loaded ${chunks.length} chunks. Creating run...` })

        const { data: refDocs } = await service
          .from('reference_documents')
          .select('id, file_name')
          .eq('project_id', projectId)

        const refDocMap = Object.fromEntries((refDocs ?? []).map(d => [d.id, d.file_name]))

        const { data: run, error: runErr } = await service.from('runs').insert({
          project_id: projectId,
          questionnaire_id: questionnaireId,
          model_used: 'llama-3.3-70b-versatile',
          total_questions: questions.length,
          answered_count: 0,
          not_found_count: 0,
        }).select().single()

        if (runErr) {
          send({ error: `Failed to create run: ${runErr.message}` })
          controller.close()
          return
        }

        let answeredCount = 0, notFoundCount = 0

        for (let i = 0; i < questions.length; i++) {
          const question = questions[i]
          send({ message: `Answering question ${i + 1} of ${questions.length}...` })

          try {
            const qEmbedding = generateEmbedding(question.question_text)
            const scored = chunks.map(chunk => {
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

            if (isNotFound) notFoundCount++
            else answeredCount++

            await service.from('answers').insert({
              question_id: question.id,
              run_id: run.id,
              project_id: projectId,
              generated_answer: answer,
              citations: isNotFound ? [] : citations,
              evidence_snippets: isNotFound ? [] : snippets,
              confidence: isNotFound ? 0 : confidence,
              not_found: isNotFound,
            })
          } catch (qError: any) {
            send({ error: `Failed on question ${i + 1}: ${qError.message}` })
            controller.close()
            return
          }
        }

        await service.from('runs')
          .update({ answered_count: answeredCount, not_found_count: notFoundCount })
          .eq('id', run.id)

        send({
          message: 'Done!',
          runId: run.id,
          run: { ...run, answered_count: answeredCount, not_found_count: notFoundCount }
        })

      } catch (err: any) {
        send({ error: `Unexpected error: ${err.message}` })
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}