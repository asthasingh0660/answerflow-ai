import Groq from 'groq-sdk'

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export function generateEmbedding(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/)
  const embedding = new Array(1536).fill(0)
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    for (let j = 0; j < word.length; j++) {
      const idx = (word.charCodeAt(j) * (i + 1) * (j + 1)) % 1536
      embedding[idx] += 1 / (i + 1)
    }
  }
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
  return magnitude > 0 ? embedding.map(v => v / magnitude) : embedding
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-10)
}

export async function generateAnswer(
  question: string,
  context: string,
): Promise<{ answer: string; confidence: number }> {
  const prompt = `You are an expert at answering questionnaires based on provided reference documents.

REFERENCE CONTEXT:
${context}

QUESTION: ${question}

Instructions:
- Answer ONLY based on the reference context above.
- If the context does not contain enough information, respond with exactly: "Not found in references."
- Be concise and factual. Do not make up information.

Answer:`

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 400,
  })

  const answer = completion.choices[0]?.message?.content?.trim() || 'Not found in references.'
  const isNotFound = answer.toLowerCase().includes('not found in references')
  const confidence = isNotFound ? 0 : Math.min(0.95, 0.5 + (context.length / 2000) * 0.45)
  return { answer, confidence }
}