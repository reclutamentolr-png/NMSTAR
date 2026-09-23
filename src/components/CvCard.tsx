'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from '@/components/LocalizedLink'
import { FileUser, Trash2, LoaderCircle } from 'lucide-react'
import { deleteCv } from '@/app/actions/cv'

type Cv = {
  id: string
  title: string
  full_name: string
  role_title: string | null
  template: string
  updated_at: string
}

export default function CvCard({ cv, fromDashboardSuffix = '' }: { cv: Cv; fromDashboardSuffix?: string }) {
  const t = useTranslations('kumaniCv')
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(t('deleteConfirm'))) return
    setDeleting(true)
    const result = await deleteCv(cv.id)
    if (result.success) {
      router.refresh()
    } else {
      alert(t(result.message))
      setDeleting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-[var(--gold-pale)] text-[var(--gold)] flex items-center justify-center shrink-0">
        <FileUser className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{cv.title}</h3>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {cv.full_name}
          {cv.role_title ? ` · ${cv.role_title}` : ''}
        </p>
      </div>

      <Link
        href={`/marketplace/kumani-cv/${cv.id}${fromDashboardSuffix}`}
        className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all shrink-0"
      >
        {t('details')}
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        title={t('deleteCv')}
        className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-all shrink-0 disabled:opacity-50"
      >
        {deleting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>
    </div>
  )
}
