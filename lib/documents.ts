export async function extractText(buffer: Buffer, fileName: string): Promise<string> {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') {
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(buffer)
    return data.text
  }
  if (ext === 'docx') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  if (ext === 'xlsx' || ext === 'xls') {
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    let text = ''
    for (const sheetName of workbook.SheetNames) {
      text += XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]) + '\n'
    }
    return text
  }
  return buffer.toString('utf-8')
}

export function chunkText(text: string, chunkSize = 800, overlap = 100): string[] {
  const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 20)
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if ((current + sentence).length > chunkSize && current.length > 0) {
      chunks.push(current.trim())
      const words = current.split(' ')
      current = words.slice(-Math.floor(overlap / 5)).join(' ') + ' ' + sentence + '. '
    } else {
      current += sentence + '. '
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks.filter(c => c.length > 50)
}

export function parseQuestionsFromText(text: string): string[] {
  const questions: string[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  for (const line of lines) {
    const isNumbered = /^(\d+[\.\)]\s*|Q\d+[\.:]\s*)/i.test(line)
    const isQuestion = line.endsWith('?')
    const cleaned = line.replace(/^(\d+[\.\)]\s*|Q\d+[\.:]\s*)/i, '').trim()
    if ((isNumbered || isQuestion) && cleaned.length > 10) {
      questions.push(cleaned)
    }
  }

  if (questions.length < 2) {
    return text.split('?')
      .map(s => s.trim().split('\n').pop()?.trim() + '?')
      .filter(s => s && s.length > 20 && s !== '?')
      .slice(0, 30)
  }
  return questions.slice(0, 30)
}