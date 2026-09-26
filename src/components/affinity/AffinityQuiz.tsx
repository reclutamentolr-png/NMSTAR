'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import { AFFINITY_QUESTIONS } from '@/lib/affinity'

// Le 20 domande, una alla volta. Alla fine restituisce le risposte (indice
// 0/1/2 per domanda): la mappa si calcola fuori, le risposte non si salvano.
export default function AffinityQuiz({ onComplete }: { onComplete: (answers: number[]) => void }) {
  const t = useTranslations('affinity')
  const [answers, setAnswers] = useState<number[]>([])
  const index = answers.length
  const total = AFFINITY_QUESTIONS.length
  const question = AFFINITY_QUESTIONS[Math.min(index, total - 1)]

  const choose = (choice: number) => {
    const next = [...answers, choice]
    if (next.length === total) onComplete(next)
    else setAnswers(next)
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
        <span>{t('questionOf', { n: index + 1, total })}</span>
        {index > 0 && (
          <button type="button" onClick={() => setAnswers(answers.slice(0, -1))} className="flex items-center gap-1 hover:text-[var(--ink)]">
            <ArrowLeft className="h-3.5 w-3.5" /> {t('back')}
          </button>
        )}
      </div>
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] transition-all" style={{ width: `${(index / total) * 100}%` }} />
      </div>

      <h2 className="mb-5 text-center text-xl font-bold text-[var(--ink)] sm:text-2xl">{t(`${question.id}.text`)}</h2>
      <div className="space-y-3">
        {(['a', 'b', 'c'] as const).map((key, choice) => (
          <button
            key={`${question.id}-${key}`}
            type="button"
            onClick={() => choose(choice)}
            className="w-full rounded-xl border-2 border-[var(--gold)]/25 bg-white px-5 py-4 text-left font-medium text-[var(--ink)] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--gold)] hover:shadow-md"
          >
            {t(`${question.id}.${key}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
