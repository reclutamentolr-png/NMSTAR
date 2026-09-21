'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { PlusCircle, Trash2, ChevronRight, ChevronDown, MapPin, LoaderCircle } from 'lucide-react'
import { createLocation, deleteLocation } from '@/app/actions/findo'
import { buildLocationTree, type FindoLocation, type FindoLocationNode } from '@/lib/findo'

function LocationNode({ node, depth }: { node: FindoLocationNode; depth: number }) {
  const t = useTranslations('findo')
  const router = useRouter()
  const [expanded, setExpanded] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleAddChild = async () => {
    if (!newName.trim()) return
    setSaving(true)
    const result = await createLocation(newName.trim(), node.id, 'Home')
    setSaving(false)
    if (result.success) {
      setNewName('')
      setAdding(false)
      router.refresh()
    } else {
      alert(t(result.message))
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('deleteLocationConfirm'))) return
    setDeleting(true)
    const result = await deleteLocation(node.id)
    if (result.success) {
      router.refresh()
    } else {
      alert(t(result.message))
      setDeleting(false)
    }
  }

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div className="flex items-center gap-2 py-1.5 group">
        {node.children.length > 0 ? (
          <button onClick={() => setExpanded((v) => !v)} className="text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="text-sm font-medium text-gray-800">{node.name}</span>
        <button
          onClick={() => setAdding((v) => !v)}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-amber-600 transition-opacity"
          title={t('addSubLocation')}
        >
          <PlusCircle className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity disabled:opacity-50"
          title={t('deleteLocation')}
        >
          {deleting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>

      {adding && (
        <div className="flex items-center gap-2 mb-2" style={{ marginLeft: 24 }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('locationNamePlaceholder')}
            className="px-2 py-1 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            autoFocus
          />
          <button
            onClick={handleAddChild}
            disabled={saving || !newName.trim()}
            className="px-2 py-1 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {t('add')}
          </button>
        </div>
      )}

      {expanded && node.children.map((child) => <LocationNode key={child.id} node={child} depth={depth + 1} />)}
    </div>
  )
}

export default function FindoLocationTree({ locations }: { locations: FindoLocation[] }) {
  const t = useTranslations('findo')
  const router = useRouter()
  const [newRootName, setNewRootName] = useState('')
  const [saving, setSaving] = useState(false)
  const tree = buildLocationTree(locations)

  const handleAddRoot = async () => {
    if (!newRootName.trim()) return
    setSaving(true)
    const result = await createLocation(newRootName.trim(), null, 'Home')
    setSaving(false)
    if (result.success) {
      setNewRootName('')
      router.refresh()
    } else {
      alert(t(result.message))
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8">
      {tree.length > 0 ? (
        <div className="mb-4">
          {tree.map((node) => (
            <LocationNode key={node.id} node={node} depth={0} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 mb-4">{t('noLocationsYet')}</p>
      )}

      <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
        <input
          type="text"
          value={newRootName}
          onChange={(e) => setNewRootName(e.target.value)}
          placeholder={t('newRootLocationPlaceholder')}
          className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          onClick={handleAddRoot}
          disabled={saving || !newRootName.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
        >
          <PlusCircle className="w-4 h-4" />
          {t('addRootLocation')}
        </button>
      </div>
    </div>
  )
}
