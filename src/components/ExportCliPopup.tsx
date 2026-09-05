import React, { useState, useEffect, useRef } from 'react'

export interface ExportCliPopupProps {
  result: {
    path: string
    folderPath?: string
    cliCommand?: string
    message?: string
  } | null
  onClose: () => void
  onToggleDisable?: (disabled: boolean) => void
}

type CornerPosition = 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left'

export const STORAGE_KEY_CLI_POPUP_DISABLED = 'quran_reels_cli_popup_disabled'
export const STORAGE_KEY_CLI_POPUP_MINIMIZED = 'quran_reels_cli_popup_minimized'
export const STORAGE_KEY_CLI_POPUP_CORNER = 'quran_reels_cli_popup_corner'
export const STORAGE_KEY_CLI_POPUP_AUTOCLOSE = 'quran_reels_cli_popup_autoclose'

export function isCliPopupDisabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(STORAGE_KEY_CLI_POPUP_DISABLED) === 'true'
  } catch {
    return false
  }
}

export function setCliPopupDisabled(disabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY_CLI_POPUP_DISABLED, disabled ? 'true' : 'false')
  } catch {
    // Ignore
  }
}

export const ExportCliPopup: React.FC<ExportCliPopupProps> = ({
  result,
  onClose,
  onToggleDisable,
}) => {
  if (!result || !result.cliCommand) return null

  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_CLI_POPUP_MINIMIZED) === 'true'
    } catch {
      return false
    }
  })

  const [corner, setCorner] = useState<CornerPosition>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CLI_POPUP_CORNER) as CornerPosition
      if (saved && ['bottom-right', 'top-right', 'bottom-left', 'top-left'].includes(saved)) {
        return saved
      }
    } catch {
      // Ignore
    }
    return 'bottom-right'
  })

  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [copiedField, setCopiedField] = useState<'cmd' | 'path' | null>(null)

  const [autoClose, setAutoClose] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CLI_POPUP_AUTOCLOSE)
      return saved === null ? true : saved === 'true'
    } catch {
      return true
    }
  })

  const [progressPct, setProgressPct] = useState<number>(100)
  const [isHovered, setIsHovered] = useState(false)
  const [isDisabledForever, setIsDisabledForever] = useState<boolean>(() => isCliPopupDisabled())

  const containerRef = useRef<HTMLDivElement>(null)
  const dragOffsetRef = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 })
  const timerRef = useRef<number | null>(null)

  // Save minimized state
  const handleToggleMinimized = () => {
    const next = !isMinimized
    setIsMinimized(next)
    try {
      localStorage.setItem(STORAGE_KEY_CLI_POPUP_MINIMIZED, next ? 'true' : 'false')
    } catch {
      // Ignore
    }
  }

  // Cycle corner position
  const handleCycleCorner = () => {
    setCoords(null)
    const corners: CornerPosition[] = ['bottom-right', 'top-right', 'top-left', 'bottom-left']
    const nextIndex = (corners.indexOf(corner) + 1) % corners.length
    const nextCorner = corners[nextIndex]
    setCorner(nextCorner)
    try {
      localStorage.setItem(STORAGE_KEY_CLI_POPUP_CORNER, nextCorner)
    } catch {
      // Ignore
    }
  }

  // Toggle "Never show popup again"
  const handleToggleDisabled = (disabled: boolean) => {
    setIsDisabledForever(disabled)
    setCliPopupDisabled(disabled)
    if (onToggleDisable) onToggleDisable(disabled)
    if (disabled) {
      setTimeout(() => onClose(), 600)
    }
  }

  // Toggle auto-close timer
  const handleToggleAutoClose = () => {
    const next = !autoClose
    setAutoClose(next)
    try {
      localStorage.setItem(STORAGE_KEY_CLI_POPUP_AUTOCLOSE, next ? 'true' : 'false')
    } catch {
      // Ignore
    }
  }

  // Auto-close countdown (10 seconds)
  useEffect(() => {
    if (!autoClose || isHovered || isDragging) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    const totalMs = 10000
    const stepMs = 100
    let elapsed = (100 - progressPct) * (totalMs / 100)

    timerRef.current = window.setInterval(() => {
      elapsed += stepMs
      const remainingPct = Math.max(0, 100 - (elapsed / totalMs) * 100)
      setProgressPct(remainingPct)
      if (remainingPct <= 0) {
        if (timerRef.current) clearInterval(timerRef.current)
        onClose()
      }
    }, stepMs)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [autoClose, isHovered, isDragging, onClose, progressPct])

  // Reset timer on new result
  useEffect(() => {
    setProgressPct(100)
  }, [result])

  // Dragging handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, a, code')) return
    e.preventDefault()
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    dragOffsetRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    }
    setIsDragging(true)
    try {
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // Ignore
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const x = Math.max(10, Math.min(window.innerWidth - 150, e.clientX - dragOffsetRef.current.offsetX))
    const y = Math.max(10, Math.min(window.innerHeight - 60, e.clientY - dragOffsetRef.current.offsetY))
    setCoords({ x, y })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false)
      try {
        ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {
        // Ignore
      }
    }
  }

  const handleCopy = (text: string, type: 'cmd' | 'path') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {})
      setCopiedField(type)
      setTimeout(() => setCopiedField(null), 2500)
    }
  }

  // Calculate position styles
  const positionStyles: React.CSSProperties = coords
    ? {
        position: 'fixed',
        left: `${coords.x}px`,
        top: `${coords.y}px`,
      }
    : corner === 'top-right'
      ? { position: 'fixed', top: '72px', right: '24px' }
      : corner === 'top-left'
        ? { position: 'fixed', top: '72px', left: '24px' }
        : corner === 'bottom-left'
          ? { position: 'fixed', bottom: '24px', left: '24px' }
          : { position: 'fixed', bottom: '24px', right: '24px' }

  // ── 1. MINIMIZED / COMPACT PILL MODE ──
  if (isMinimized) {
    return (
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          ...positionStyles,
          zIndex: 1000,
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.96) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '24px',
          padding: '5px 12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          animation: 'toastSlideUp 0.2s ease-out',
        }}
        title="Drag to reposition • Click ⤢ to expand"
      >
        <span style={{ fontSize: '0.85rem' }}>🚀</span>
        <span style={{ fontWeight: 600, fontSize: '0.76rem', color: '#38bdf8' }}>
          Reel Saved
        </span>
        <button
          type="button"
          onClick={() => handleCopy(result.cliCommand || '', 'cmd')}
          className="btn-copy-code"
          style={{ padding: '3px 8px', fontSize: '0.72rem' }}
          title="Copy ready-to-run CLI Command"
        >
          {copiedField === 'cmd' ? '✅ Copied!' : '📋 CLI'}
        </button>
        <button
          type="button"
          onClick={() => handleCopy(result.path, 'path')}
          className="btn-copy-code"
          style={{ padding: '3px 8px', fontSize: '0.72rem', background: 'rgba(255,255,255,0.08)' }}
          title="Copy File Path"
        >
          {copiedField === 'path' ? '✅ Copied!' : '📁 Path'}
        </button>
        <button
          type="button"
          onClick={handleCycleCorner}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', padding: '0 2px' }}
          title={`Move elsewhere (${corner})`}
        >
          📍
        </button>
        <button
          type="button"
          onClick={handleToggleMinimized}
          style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.9rem', padding: '0 2px' }}
          title="Expand card"
        >
          ⤢
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem', padding: '0 2px' }}
          title="Close popup"
        >
          ✕
        </button>
      </div>
    )
  }

  // ── 2. EXPANDED RESIZABLE MODE ──
  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...positionStyles,
        width: '420px',
        minWidth: '280px',
        maxWidth: '650px',
        minHeight: '140px',
        resize: 'both',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.96) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.5)',
        borderRadius: '12px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.75)',
        zIndex: 1000,
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'toastSlideUp 0.25s ease-out',
      }}
    >
      {/* Draggable Header Bar */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
        title="Drag header to move anywhere on screen"
      >
        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ cursor: 'grab', color: '#64748b' }}>⋮⋮</span> 🚀 Reel Exported &amp; Saved
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={handleCycleCorner}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.72rem',
              padding: '2px 5px',
            }}
            title={`Move corner (Current: ${corner})`}
          >
            📍 Move
          </button>
          <button
            type="button"
            onClick={handleToggleMinimized}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#cbd5e1',
              cursor: 'pointer',
              fontSize: '0.85rem',
              padding: '0 4px',
            }}
            title="Minimize to tiny pill"
          >
            —
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '0.95rem',
              padding: '0 4px',
            }}
            title="Close popup"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#94a3b8' }}>
            <span>📁 <strong>Saving Location:</strong></span>
            <button
              type="button"
              onClick={() => handleCopy(result.path, 'path')}
              style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.72rem', padding: 0 }}
            >
              {copiedField === 'path' ? '✅ Copied' : '📋 Copy Path'}
            </button>
          </div>
          <div
            style={{
              background: 'rgba(0,0,0,0.5)',
              padding: '4px 8px',
              borderRadius: '6px',
              marginTop: '2px',
              fontFamily: 'monospace',
              fontSize: '0.73rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: '#a5f3fc',
            }}
            title={result.path}
          >
            {result.path}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#94a3b8' }}>
            <span>💻 <strong>Bulk Uploader CLI Command:</strong></span>
            <button
              type="button"
              onClick={() => handleCopy(result.cliCommand || '', 'cmd')}
              style={{ background: 'transparent', border: 'none', color: '#fbbf24', cursor: 'pointer', fontSize: '0.72rem', padding: 0 }}
            >
              {copiedField === 'cmd' ? '✅ Copied' : '📋 Copy Command'}
            </button>
          </div>
          <div
            style={{
              background: 'rgba(0,0,0,0.5)',
              padding: '5px 8px',
              borderRadius: '6px',
              marginTop: '2px',
              fontFamily: 'monospace',
              fontSize: '0.73rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: '#fbbf24',
            }}
            title={result.cliCommand}
          >
            {result.cliCommand}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
          <button
            type="button"
            className="btn-copy-code"
            style={{ flex: 1, padding: '5px 8px', textAlign: 'center' }}
            onClick={() => handleCopy(result.cliCommand || '', 'cmd')}
          >
            {copiedField === 'cmd' ? '✅ Copied Command!' : '📋 Copy CLI Command'}
          </button>
          <button
            type="button"
            className="btn-copy-code"
            style={{ flex: 1, padding: '5px 8px', textAlign: 'center', background: 'rgba(255,255,255,0.08)' }}
            onClick={() => handleCopy(result.path, 'path')}
          >
            {copiedField === 'path' ? '✅ Copied Path!' : '📁 Copy File Path'}
          </button>
        </div>

        {/* Footer Settings Row: Don't show again & Auto-close */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 'auto',
            paddingTop: '6px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            fontSize: '0.71rem',
            color: '#64748b',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }} title="Disable floating popup completely">
            <input
              type="checkbox"
              checked={isDisabledForever}
              onChange={(e) => handleToggleDisabled(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Don't show popup on export</span>
          </label>

          <button
            type="button"
            onClick={handleToggleAutoClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: autoClose ? '#94a3b8' : '#475569',
              cursor: 'pointer',
              fontSize: '0.71rem',
              padding: 0,
            }}
            title="Auto-close card after 10s"
          >
            {autoClose ? '⏱️ Auto-close (10s)' : '⏸️ Keep open'}
          </button>
        </div>
      </div>

      {/* Auto-close Progress Line */}
      {autoClose && (
        <div
          style={{
            height: '2px',
            width: `${progressPct}%`,
            background: 'linear-gradient(90deg, #6366f1 0%, #38bdf8 100%)',
            transition: 'width 0.1s linear',
          }}
        />
      )}
    </div>
  )
}
