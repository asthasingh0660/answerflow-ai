import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { extractText, chunkText, parseQuestionsFromText } from '@/lib/documents'
import { generateEmbedding } from '@/lib/groq'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  const projectId = formData.get('projectId') as string
  const type = formData.get('type') as 'reference' | 'questionnaire'

  if (!file || !projectId || !type)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const service = createServiceClient()
  const buffer = Buffer.from(await file.arrayBuffer())
  const storagePath = `${user.id}/${projectId}/${type}/${Date.now()}-${file.name}`

  // Upload to storage
  const { error: storageError } = await service.storage
    .from('documents')
    .upload(storagePath, buffer, { contentType: file.type })

  if (storageError)
    return NextResponse.json({ error: storageError.message }, { status: 500 })

  // Extract text
  let text = ''
  try { text = await extractText(buffer, file.name) }
  catch { text = buffer.toString('utf-8') }

  // Trim text to avoid timeout on huge files
  text = text.slice(0, 50000)

  if (type === 'reference') {
    const { data: doc, error } = await service
      .from('reference_documents')
      .insert({ project_id: projectId, file_name: file.name, storage_path: storagePath })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Chunk and embed — limit to 20 chunks max to stay fast
    const chunks = chunkText(text).slice(0, 20)
    const rows = chunks.map((content, i) => ({
      reference_document_id: doc.id,
      project_id: projectId,
      content,
      embedding: JSON.stringify(generateEmbedding(content)),
      chunk_index: i,
    }))

    if (rows.length > 0) {
      await service.from('document_chunks').insert(rows)
    }

    return NextResponse.json({ doc })

  } else {
    const { data: doc, error } = await service
      .from('questionnaires')
      .insert({ project_id: projectId, file_name: file.name, storage_path: storagePath })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const questions = parseQuestionsFromText(text)
    if (questions.length > 0) {
      await service.from('questions').insert(
        questions.map((q, i) => ({
          questionnaire_id: doc.id,
          project_id: projectId,
          question_text: q,
          order_index: i,
        }))
      )
    }

    return NextResponse.json({ doc })
  }
}
