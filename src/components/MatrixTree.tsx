'use client'

import { useState } from 'react'
import { User, ChevronDown, ChevronRight, Crown, Users } from 'lucide-react'
import CopyButton from './CopyButton'

type MatrixNode = {
  id: string
  user_id: string
  parent_id: string | null
  path: string
  level: number
  position: number
  depth: number
  created_at: string
  username?: string
  first_name?: string
  last_name?: string
  referral_code?: string
  country_code?: string
}

type MatrixTreeProps = {
  rootNode: MatrixNode
  descendants: MatrixNode[]
}

export default function MatrixTree({ rootNode, descendants }: MatrixTreeProps) {
  // ✅ Espandi automaticamente root + tutti i nodi fino al livello 3
// Così Marco (root) vede Pino e Mario (L1), e Mario vede Maria Jose (L2)
const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
  const initial = new Set<string>([rootNode.id])
  descendants
    .filter(d => d.level <= 3) // Espande root (1), figli (2) e nipoti (3)
    .forEach(d => initial.add(d.id))
  return initial
})

  // Trova i figli diretti di un nodo
  const getChildren = (parentId: string) => {
    return descendants.filter(d => d.parent_id === parentId)
  }

  // Toggle espansione
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }

  // Renderizza un singolo nodo
  const renderNode = (node: MatrixNode, depth: number = 0) => {
    const children = getChildren(node.id)
    const isExpanded = expandedNodes.has(node.id)
    const hasChildren = children.length > 0
    const isRoot = node.id === rootNode.id

    return (
      <div key={node.id} style={{ marginLeft: depth > 0 ? `${depth * 40}px` : 0 }} className="mb-4">
        {/* Card Nodo */}
        <div 
          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
            hasChildren ? 'cursor-pointer hover:shadow-md' : ''
          } ${
            isRoot 
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 border-indigo-600 text-white shadow-lg' 
              : 'bg-white border-gray-200 hover:border-indigo-300'
          }`}
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          {/* Icona */}
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            isRoot ? 'bg-white/20' : 'bg-gradient-to-br from-blue-500 to-cyan-600'
          }`}>
            {isRoot ? <Crown className="w-6 h-6" /> : <User className="w-6 h-6 text-white" />}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg truncate">
                {node.first_name} {node.last_name}
              </span>
              {isRoot && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                  TU
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                isRoot ? 'bg-white/20' : 'bg-gray-100 text-gray-700'
              }`}>
                {node.referral_code}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                isRoot ? 'bg-white/20' : 'bg-blue-100 text-blue-700'
              }`}>
                L{node.level - 1}
              </span>
              {hasChildren && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isRoot ? 'bg-white/20' : 'bg-green-100 text-green-700'
                }`}>
                  {children.length} figli
                </span>
              )}
            </div>
          </div>

          {/* Freccia espansione */}
          {hasChildren && (
            <div className={`p-2 rounded-full ${isRoot ? 'bg-white/20' : 'bg-gray-100'}`}>
              {isExpanded ? (
                <ChevronDown className={`w-5 h-5 ${isRoot ? 'text-white' : 'text-gray-600'}`} />
              ) : (
                <ChevronRight className={`w-5 h-5 ${isRoot ? 'text-white' : 'text-gray-600'}`} />
              )}
            </div>
          )}

          {/* Copy Button */}
          {node.referral_code && !isRoot && (
            <div onClick={(e) => e.stopPropagation()}>
              <CopyButton text={`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/ref/${node.referral_code}`} />
            </div>
          )}
        </div>

        {/* Figli */}
        {hasChildren && isExpanded && (
          <div className="mt-4 pt-4 border-l-2 border-gray-200 ml-6">
            {children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            
          </div>
        </div>
      </div>

      {/* Albero Semplificato */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
        {descendants.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Nessun affiliato ancora</p>
            <p className="text-sm text-gray-500 mt-1">Invita il primo membro del tuo team!</p>
          </div>
        ) : (
          <div>
            {renderNode(rootNode)}
          </div>
        )}
      </div>

         
    </div>
  )
}