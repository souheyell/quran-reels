import { useState, useEffect, useMemo } from 'react'
import type { ReelConfig } from '../types'
import {
  encodeRecipe,
  decodeRecipe,
  computeShortHash,
  generateRecipeSummary,
  type SavedRecipe,
  type DecodedRecipe,
} from '../lib/recipeEngine'
import {
  getSavedRecipes,
  saveRecipeToVault,
  deleteSavedRecipe,
  getGenerationHistory,
  clearGenerationHistory,
} from '../lib/storage'

interface RecipeModalProps {
  isOpen: boolean
  onClose: () => void
  currentConfig: ReelConfig
  currentReciterId?: string
  currentEditionId?: string
  onRestoreRecipe: (recipe: DecodedRecipe) => Promise<void> | void
}

type TabType = 'current' | 'history' | 'vault' | 'import'

export function RecipeModal({
  isOpen,
  onClose,
  currentConfig,
  currentReciterId,
  currentEditionId,
  onRestoreRecipe,
}: RecipeModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('current')
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [customName, setCustomName] = useState('')
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [importInput, setImportInput] = useState('')
  const [importError, setImportError] = useState<string | null>(null)

  const [vaultList, setVaultList] = useState<SavedRecipe[]>([])
  const [historyList, setHistoryList] = useState<SavedRecipe[]>([])

  // Refresh lists on open
  useEffect(() => {
    if (isOpen) {
      setVaultList(getSavedRecipes())
      setHistoryList(getGenerationHistory())
      setCopiedCode(false)
      setCopiedLink(false)
      setSavedSuccess(false)
      setImportError(null)
    }
  }, [isOpen])

  // Compute live current recipe code and hash
  const currentCode = useMemo(() => {
    return encodeRecipe(currentConfig, currentReciterId, currentEditionId)
  }, [currentConfig, currentReciterId, currentEditionId])

  const currentShortHash = useMemo(() => {
    return computeShortHash(currentCode)
  }, [currentCode])

  const currentSummary = useMemo(() => {
    return generateRecipeSummary({
      surah: currentConfig.verses[0]?.surah,
      startAyat: currentConfig.verses[0]?.ayat,
      ayahCount: currentConfig.verses.length,
      reciterId: currentReciterId,
      config: currentConfig,
    })
  }, [currentConfig, currentReciterId])

  if (!isOpen) return null

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentCode).then(() => {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    })
  }

  const handleCopyLink = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('recipe', currentCode)
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    })
  }

  const handleSaveToVault = () => {
    const title = customName.trim() || currentSummary
    const saved: SavedRecipe = {
      id: `rcp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: title,
      code: currentCode,
      shortHash: currentShortHash,
      createdAt: Date.now(),
      surah: currentConfig.verses[0]?.surah || 2,
      startAyat: currentConfig.verses[0]?.ayat || 255,
      ayahCount: currentConfig.verses.length || 1,
      reciterId: currentReciterId || currentConfig.verses[0]?.reciterId || 'ar.alafasy',
      editionId: currentEditionId || currentConfig.verses[0]?.editionId || 'en.sahih',
      secondaryEditionId: currentConfig.text.secondaryEditionId,
      config: currentConfig,
    }

    saveRecipeToVault(saved)
    setVaultList(getSavedRecipes())
    setSavedSuccess(true)
    setCustomName('')
    setTimeout(() => setSavedSuccess(false), 2500)
  }

  const handleDeleteFromVault = (id: string) => {
    deleteSavedRecipe(id)
    setVaultList(getSavedRecipes())
  }

  const handleClearHistory = () => {
    if (window.confirm('Clear all recent generation snapshots?')) {
      clearGenerationHistory()
      setHistoryList([])
    }
  }

  const handleImportSubmit = () => {
    setImportError(null)
    const decoded = decodeRecipe(importInput)
    if (!decoded) {
      setImportError('Invalid recipe code, link, or JSON format. Please verify and try again.')
      return
    }

    onRestoreRecipe(decoded)
    onClose()
  }

  const handleRestoreSaved = (saved: SavedRecipe) => {
    const decoded: DecodedRecipe = {
      version: 1,
      name: saved.name,
      createdAt: saved.createdAt,
      surah: saved.surah,
      startAyat: saved.startAyat,
      ayahCount: saved.ayahCount,
      reciterId: saved.reciterId,
      editionId: saved.editionId,
      secondaryEditionId: saved.secondaryEditionId,
      config: saved.config,
    }
    onRestoreRecipe(decoded)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content recipe-modal"
        style={{ maxWidth: '640px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🔖</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Recipe Codes &amp; Generation Vault</h2>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Restore, save, and share high-quality creative generations
              </span>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="recipe-tabs-bar" style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.6rem', marginBottom: '1rem' }}>
          <button
            type="button"
            className={`chip ${activeTab === 'current' ? 'active' : ''}`}
            onClick={() => setActiveTab('current')}
          >
            📋 Current Recipe
          </button>
          <button
            type="button"
            className={`chip ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            🕒 History ({historyList.length})
          </button>
          <button
            type="button"
            className={`chip ${activeTab === 'vault' ? 'active' : ''}`}
            onClick={() => setActiveTab('vault')}
          >
            ⭐ Vault ({vaultList.length})
          </button>
          <button
            type="button"
            className={`chip ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
          >
            📥 Import Code
          </button>
        </div>

        <div className="recipe-modal-body">
          {/* ── TAB 1: CURRENT RECIPE ────────────────────────────── */}
          {activeTab === 'current' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: 600 }}>
                    Active Generation Seed
                  </span>
                  <span className="recipe-hash-badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'monospace' }}>
                    {currentShortHash}
                  </span>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.3rem' }}>
                  {currentSummary}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  🎙️ {currentReciterId?.split('-')[0].replace('_', ' ') || 'Alafasy'} · 📐 {currentConfig.aspectRatio} · 🎥 {currentConfig.motion.type.replace('kenburns-', '')} · ⏱️ {currentConfig.countdown?.enabled ? currentConfig.countdown.style : 'No timer'}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCopyCode}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                >
                  {copiedCode ? '✅ Code Copied!' : '📋 Copy Recipe Code'}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleCopyLink}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                >
                  {copiedLink ? '✅ Link Copied!' : '🔗 Copy Share Link'}
                </button>
              </div>

              {/* Save to Vault Section */}
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.8rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '0.4rem' }}>
                  ⭐ Save to Favorites Vault
                </span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text"
                    placeholder="Custom preset name (e.g. Amber Medina Night)"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    style={{ flex: 1, padding: '0.45rem 0.65rem', fontSize: '0.82rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#ffffff' }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSaveToVault}
                    style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                  >
                    {savedSuccess ? '✅ Saved!' : '💾 Save'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: RECENT GENERATIONS HISTORY ─────────────────── */}
          {activeTab === 'history' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Auto-saved snapshots from your recent creations
                </span>
                {historyList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Clear History
                  </button>
                )}
              </div>

              {historyList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.85rem' }}>
                  No generation history yet. Generating reels will automatically create snapshot checkpoints here.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', maxHeight: '360px', overflowY: 'auto' }}>
                  {historyList.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '8px',
                        padding: '0.65rem 0.8rem',
                        gap: '0.6rem',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.35rem', borderRadius: '4px', color: '#fbbf24' }}>
                            {item.shortHash}
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.name}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                          🎙️ {item.reciterId?.split('-')[0].replace('_', ' ')} · {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleRestoreSaved(item)}
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem', whiteSpace: 'nowrap' }}
                      >
                        🔄 Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: SAVED FAVORITES VAULT ──────────────────────── */}
          {activeTab === 'vault' && (
            <div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 0.8rem' }}>
                Your custom saved recipes and favorite creative presets.
              </p>

              {vaultList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.85rem' }}>
                  Your Favorites Vault is empty. Click "Save to Favorites Vault" on the Current Recipe tab to store presets.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', maxHeight: '360px', overflowY: 'auto' }}>
                  {vaultList.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        padding: '0.65rem 0.8rem',
                        gap: '0.6rem',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                            {item.shortHash}
                          </span>
                          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.name}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                          Surah {item.surah}:{item.startAyat} · 🎙️ {item.reciterId?.split('-')[0].replace('_', ' ')}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => handleRestoreSaved(item)}
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem' }}
                        >
                          🔄 Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFromVault(item.id)}
                          title="Delete from Vault"
                          style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '6px', padding: '0.35rem 0.5rem', cursor: 'pointer' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 4: IMPORT RECIPE CODE ─────────────────────────── */}
          {activeTab === 'import' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                Paste a Recipe Code, Shareable Link, or JSON configuration:
              </span>

              <textarea
                rows={4}
                placeholder="Paste code (e.g. eyJ2ZXJzaW9uIjoxLCJuYW1lIjoi...) or URL (?recipe=...)"
                value={importInput}
                onChange={(e) => {
                  setImportInput(e.target.value)
                  setImportError(null)
                }}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />

              {importError && (
                <div style={{ color: '#ef4444', fontSize: '0.78rem', padding: '0.4rem 0.6rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>
                  ⚠️ {importError}
                </div>
              )}

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleImportSubmit}
                disabled={!importInput.trim()}
                style={{ alignSelf: 'flex-end', fontSize: '0.85rem', padding: '0.5rem 1.2rem' }}
              >
                ⚡ Restore Recipe
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
