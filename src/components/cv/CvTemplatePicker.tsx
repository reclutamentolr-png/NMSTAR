'use client'

import { useTranslations } from 'next-intl'
import { CV_TEMPLATES, type CvTemplate } from '@/lib/cv'
import { Check } from 'lucide-react'

const PREVIEW_SHAPE: Record<CvTemplate, React.ReactNode> = {
  minimal: (
    <div className="w-full h-full p-2 space-y-1">
      <div className="h-2 w-2/3 bg-gray-300 rounded" />
      <div className="h-1.5 w-1/3 bg-[var(--gold)]/60 rounded" />
      <div className="h-1 w-full bg-gray-100 rounded mt-2" />
      <div className="h-1 w-full bg-gray-100 rounded" />
      <div className="h-1 w-2/3 bg-gray-100 rounded" />
    </div>
  ),
  classic: (
    <div className="w-full h-full p-2 flex flex-col items-center space-y-1">
      <div className="h-2 w-1/2 bg-gray-300 rounded" />
      <div className="h-1.5 w-1/3 bg-[var(--gold)]/60 rounded" />
      <div className="h-px w-1/3 bg-[var(--gold)] my-1" />
      <div className="h-1 w-full bg-gray-100 rounded" />
      <div className="h-1 w-2/3 bg-gray-100 rounded" />
    </div>
  ),
  sidebar: (
    <div className="w-full h-full flex">
      <div className="w-1/3 h-full bg-[var(--ink)]" />
      <div className="flex-1 p-2 space-y-1">
        <div className="h-2 w-2/3 bg-gray-300 rounded" />
        <div className="h-1 w-full bg-gray-100 rounded mt-2" />
        <div className="h-1 w-2/3 bg-gray-100 rounded" />
      </div>
    </div>
  ),
}

export default function CvTemplatePicker({ value, onChange }: { value: CvTemplate; onChange: (t: CvTemplate) => void }) {
  const t = useTranslations('kumaniCv')

  return (
    <div className="grid grid-cols-3 gap-3">
      {CV_TEMPLATES.map((template) => (
        <button
          key={template}
          type="button"
          onClick={() => onChange(template)}
          className={`relative rounded-xl border-2 overflow-hidden transition-all ${
            value === template ? 'border-[var(--gold)]' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="h-20 bg-white">{PREVIEW_SHAPE[template]}</div>
          <div className={`px-2 py-1.5 text-xs font-medium text-center ${value === template ? 'bg-[var(--gold-pale)] text-[var(--ink)]' : 'bg-gray-50 text-gray-600'}`}>
            {t(`template_${template}`)}
          </div>
          {value === template && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[var(--gold)] flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white" />
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
