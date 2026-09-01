'use client'

import { useState } from 'react'
import { 
  User, 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Users,
  Crown,
  TreePine,
  Zap,
  TrendingUp,
  Award
} from 'lucide-react'
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
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([rootNode.id]))

  // ✅ FIX: Filtra i null prima di creare il Set
  const expandAll = () => {
    const parentIds = descendants
      .map(d => d.parent_id)
      .filter((id): id is string => id !== null)
    setExpandedNodes(new Set([...parentIds, rootNode.id]))
  }

  const collapseAll = () => {
    setExpandedNodes(new Set([rootNode.id]))
  }

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const getChildren = (parentId: string) => {
    return descendants.filter(d => d.parent_id === parentId)
  }

  const getNodeDisplayName = (node: MatrixNode) => {
    if (node.first_name || node.last_name) {
      return `${node.first_name || ''} ${node.last_name || ''}`.trim()
    }
    return node.username || 'Utente'
  }

  const getLevelColor = (level: number) => {
    const colors = [
      'from-indigo-500 to-purple-600', // Root
      'from-blue-500 to-cyan-600',     // Livello 1
      'from-green-500 to-emerald-600', // Livello 2
      'from-orange-500 to-amber-600',  // Livello 3
      'from-pink-500 to-rose-600',     // Livello 4
      'from-gray-500 to-slate-600',    // Livello 5+
    ]
    return colors[Math.min(level - 1, colors.length - 1)]
  }

  const getLevelBadge = (level: number) => {
    const badges = [
      { icon: Crown, label: 'ROOT', color: 'bg-indigo-100 text-indigo-700' },
      { icon: Zap, label: 'L1', color: 'bg-blue-100 text-blue-700' },
      { icon: TrendingUp, label: 'L2', color: 'bg-green-100 text-green-700' },
      { icon: Award, label: 'L3', color: 'bg-orange-100 text-orange-700' },
      { icon: Users, label: 'L4', color: 'bg-pink-100 text-pink-700' },
      { icon: Users, label: 'L5', color: 'bg-gray-100 text-gray-700' },
    ]
    return badges[Math.min(level - 1, badges.length - 1)]
  }

  const renderNode = (node: MatrixNode) => {
    const children = getChildren(node.id)
    const isExpanded = expandedNodes.has(node.id)
    const hasChildren = children.length > 0
    const isRoot = node.id === rootNode.id
    const levelBadge = getLevelBadge(node.level)
    const LevelIcon = levelBadge.icon

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Card del nodo */}
        <div className="relative group">
          <div 
            className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
              isRoot 
                ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-400 shadow-lg hover:shadow-xl' 
                : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md'
            }`}
            onClick={() => hasChildren && toggleNode(node.id)}
          >
            {/* Avatar con gradiente per livello */}
            <div className={`relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br ${getLevelColor(node.level)} shadow-md`}>
              {isRoot ? <Crown className="w-6 h-6 text-white" /> : <User className="w-6 h-6 text-white" />}
              
              {/* Badge posizione */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-700">
                {node.position}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-gray-900 truncate text-lg">
                  {getNodeDisplayName(node)}
                </span>
                {isRoot && (
                  <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">
                    TU
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
                  {node.referral_code || 'N/A'}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${levelBadge.color}`}>
                  <LevelIcon className="w-3 h-3" />
                  {levelBadge.label}
                </span>
              </div>
            </div>

            {/* Azioni */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {node.referral_code && (
                <div onClick={(e) => e.stopPropagation()}>
                  <CopyButton text={`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/ref/${node.referral_code}`} />
                </div>
              )}
              {hasChildren && (
                <div className={`p-1.5 rounded-full transition-all ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bambini con linee di connessione */}
        {hasChildren && isExpanded && (
          <div className="relative mt-8">
            {/* Linea verticale dal parent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gradient-to-b from-gray-300 to-gray-200"></div>
            
            {/* Container figli */}
            <div className="relative flex items-start justify-center gap-6 pt-8">
              {/* Linea orizzontale che connette i figli */}
              {children.length > 1 && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 bg-gray-300" 
                     style={{ 
                       width: `calc(100% - ${100 / children.length}%)`,
                       maxWidth: '100%'
                     }}>
                </div>
              )}
              
              {children.map((child, index) => (
                <div key={child.id} className="relative flex flex-col items-center">
                  {/* Linea verticale dal connector orizzontale al child */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gray-300"></div>
                  
                  {/* Nodo figlio */}
                  <div className="transform transition-all duration-300 hover:scale-105">
                    {renderNode(child)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con statistiche */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg">
            <TreePine className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm text-gray-500">Nodi nella downline</div>
            <div className="text-2xl font-bold text-gray-900">{descendants.length}</div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-4 py-2 bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-lg text-sm font-medium text-gray-700 flex items-center gap-2 transition-all"
          >
            <ChevronDown className="w-4 h-4" />
            Espandi tutto
          </button>
          <button
            onClick={collapseAll}
            className="px-4 py-2 bg-white border border-gray-200 hover:border-gray-400 hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700 flex items-center gap-2 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
            Comprimi tutto
          </button>
        </div>
      </div>

      {/* Albero */}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-8 overflow-x-auto">
        <div className="min-w-max flex justify-center">
          {renderNode(rootNode)}
        </div>

        {descendants.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-indigo-600" />
            </div>
            <p className="text-gray-700 font-semibold text-lg mb-1">La tua matrice è vuota</p>
            <p className="text-gray-500 text-sm">Invita il tuo primo affiliato per iniziare a crescere!</p>
          </div>
        )}
      </div>

      {/* Legenda livelli */}
      <div className="flex flex-wrap gap-3 justify-center">
        {[
          { level: 1, label: 'Root', color: 'bg-indigo-500' },
          { level: 2, label: 'Livello 1', color: 'bg-blue-500' },
          { level: 3, label: 'Livello 2', color: 'bg-green-500' },
          { level: 4, label: 'Livello 3', color: 'bg-orange-500' },
          { level: 5, label: 'Livello 4', color: 'bg-pink-500' },
          { level: 6, label: 'Livello 5+', color: 'bg-gray-500' },
        ].map(item => (
          <div key={item.level} className="flex items-center gap-2 text-xs text-gray-600">
            <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}