'use client'

import { useState, useRef, useCallback } from 'react'
import { ZoomIn, ZoomOut, Move, RotateCcw } from 'lucide-react'

type MatrixViewerProps = {
  children: React.ReactNode
}

export default function MatrixViewer({ children }: MatrixViewerProps) {
  const [scale, setScale] = useState(0.6) // Zoom iniziale al 60% per vedere più nodi
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 1.5))
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.3))
  
  const handleReset = () => {
    setScale(0.6)
    setPosition({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // Avvia il trascinamento SOLO se si clicca sullo sfondo, non sui nodi
    if (e.target === containerRef.current) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      })
    }
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }, [isDragging, dragStart])

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault() // Previene lo scroll della pagina
    const delta = e.deltaY > 0 ? -0.05 : 0.05
    setScale(prev => Math.max(0.3, Math.min(1.5, prev + delta)))
  }, [])

  return (
    <div className="relative w-full">
            {/* Controlli Zoom */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2">
        <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 rounded transition-colors" aria-label="Zoom In">
          <ZoomIn className="w-5 h-5 text-gray-700" />
        </button>
        <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100 rounded transition-colors" aria-label="Zoom Out">
          <ZoomOut className="w-5 h-5 text-gray-700" />
        </button>
        <button onClick={handleReset} className="p-2 hover:bg-gray-100 rounded transition-colors" aria-label="Reset Vista">
          <RotateCcw className="w-5 h-5 text-gray-700" />
        </button>
        <div className="border-t border-gray-200 pt-2 flex justify-center">
          <Move className="w-5 h-5 text-gray-400" aria-label="Trascina per muoverti" />
        </div>
        <div className="text-xs text-gray-500 text-center font-mono">
          {Math.round(scale * 100)}%
        </div>
      </div>

      {/* Area di visualizzazione con Pan e Zoom */}
      <div
        ref={containerRef}
        className="relative w-full h-[600px] overflow-hidden bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          className="absolute inset-0 flex items-center justify-center transition-transform duration-200 ease-out"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center'
          }}
        >
          {/* Padding extra per permettere di trascinare l'albero senza che tocchi i bordi */}
          <div className="p-20">
            {children}
          </div>
        </div>

        {/* Istruzioni */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 pointer-events-none z-10">
          <p>🖱️ Trascina lo sfondo per muoverti • Rotella mouse per zoom</p>
        </div>
      </div>
    </div>
  )
}