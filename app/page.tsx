import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 flex items-center justify-center p-4">
      <div className="text-center text-white max-w-2xl">
        <div className="mb-6 inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-sm font-medium">
          ✦ AI-Powered Questionnaire Automation
        </div>
        <h1 className="text-5xl font-bold mb-4 leading-tight">
          Answer questionnaires<br />
          <span className="text-brand-100">in seconds, not hours.</span>
        </h1>
        <p className="text-brand-100 text-lg mb-8 leading-relaxed">
          Upload your reference documents and questionnaires. AnswerFlow AI retrieves
          relevant content, generates grounded answers with citations, and exports a completed document.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/auth/signup"
            className="bg-white text-brand-700 hover:bg-brand-50 font-semibold px-6 py-3 rounded-xl transition-colors">
            Get Started Free
          </Link>
          <Link href="/auth/login"
            className="border border-white/40 hover:bg-white/10 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
            Sign In
          </Link>
        </div>
        <div className="mt-16 grid grid-cols-3 gap-8 text-brand-100">
          {[
            { icon: '📄', label: 'Upload Documents', desc: 'PDF, DOCX, TXT supported' },
            { icon: '🤖', label: 'AI Answers', desc: 'Grounded in your references' },
            { icon: '📤', label: 'Export', desc: 'Download completed questionnaire' },
          ].map(f => (
            <div key={f.label} className="text-center">
              <div className="text-3xl mb-2">{f.icon}</div>
              <div className="font-semibold text-white">{f.label}</div>
              <div className="text-sm mt-1">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}