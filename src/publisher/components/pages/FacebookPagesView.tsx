import React, { useState } from 'react';
import { 
  Plus, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck, 
  Film, 
  Trash2,
  Key,
  CloudDownload,
  ExternalLink
} from 'lucide-react';
import type { FacebookPage } from '../../types';
import { useStudio } from '../../context/StudioContext';
import { Button } from '../shared';
import { EditPageModal } from './EditPageModal';

const InstagramIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export const FacebookPagesView: React.FC = () => {
  const { 
    pages, 
    reconnectPage, 
    refreshPageInstagramAccount,
    disconnectPage, 
    deletePage,
    setConnectPageModalOpen,
    setFetchPagesModalOpen,
    setActiveTab
  } = useStudio();

  const [editingPage, setEditingPage] = useState<FacebookPage | null>(null);
  const [syncingPageId, setSyncingPageId] = useState<string | null>(null);
  const tokenWarningPages = pages.filter((p) => p.status === 'TOKEN_WARNING');

  const handleSyncInstagram = async (pageId: string) => {
    setSyncingPageId(pageId);
    await refreshPageInstagramAccount(pageId);
    setSyncingPageId(null);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-pro text-[10px] px-2 py-0.5 rounded font-mono font-bold">
              META INTEGRATION
            </span>
            <span className="text-xs font-mono text-on-surface-variant">
              Page Permissions & Graph API
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            Connected Facebook Pages
          </h1>
          <p className="text-sm text-on-surface-variant font-mono mt-1">
            Manage page publishing tokens, video publishing permissions, and distribution queues.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            icon={<CloudDownload className="w-4 h-4 text-primary" />}
            onClick={() => setFetchPagesModalOpen(true)}
            className="border-primary/30 hover:border-primary"
          >
            Fetch from Meta
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setConnectPageModalOpen(true)}
            className="shadow-gold-glow"
          >
            + Connect Page
          </Button>
        </div>
      </div>

      {/* Proactive Token Expiration Alert */}
      {tokenWarningPages.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-serif font-bold text-white">
                Facebook Page Access Token Expiring Soon
              </h4>
              <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                Page <strong className="text-white">"{tokenWarningPages[0].name}"</strong> has an access token expiring in <strong>{tokenWarningPages[0].tokenExpiryDays} days</strong>. Renew now to prevent video publish disruption.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => reconnectPage(tokenWarningPages[0].id)}
            className="shrink-0 shadow-gold-glow"
          >
            Refresh Token & Permissions
          </Button>
        </div>
      )}

      {/* Pages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pages.map((page) => {
          const isHealthy = page.status === 'CONNECTED';
          return (
            <div
              key={page.id}
              className={`glass-panel p-6 rounded-3xl border transition-all duration-200 flex flex-col justify-between ${
                isHealthy
                  ? 'border-white/10 hover:border-primary/40'
                  : 'border-amber-500/30 bg-amber-500/5'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={page.avatarUrl}
                      alt={page.name}
                      className="w-14 h-14 rounded-2xl object-cover border border-white/20 shadow-lg"
                    />
                    <div>
                      <h3 className="font-serif font-bold text-white text-base">
                        {page.name}
                      </h3>
                      <p className="text-xs font-mono text-primary mt-0.5">
                        {page.handle}
                      </p>
                      <span className="text-[11px] text-on-surface-variant">
                        {page.category}
                      </span>
                    </div>
                  </div>

                  {isHealthy ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      CONNECTED
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      TOKEN WARNING
                    </span>
                  )}
                </div>

                {/* Stats Breakdown */}
                <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-black/40 border border-white/10 font-mono text-xs mb-4">
                  <div>
                    <span className="text-[10px] text-on-surface-variant/70">AUDIENCE</span>
                    <p className="text-white font-bold mt-0.5">
                      {(page.followersCount / 1000).toFixed(0)}K
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-primary">QUEUED</span>
                    <p className="text-primary font-bold mt-0.5">{page.queuedCount} Reels</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-secondary">TODAY</span>
                    <p className="text-secondary font-bold mt-0.5">{page.publishedTodayCount} Reels</p>
                  </div>
                </div>

                {/* Permissions checklist */}
                <div className="space-y-1.5 text-xs font-mono text-on-surface-variant mb-6">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
                      <span>publish_video & reels_manage</span>
                    </span>
                    <span className={page.hasPermissions ? 'text-secondary' : 'text-amber-400'}>
                      {page.hasPermissions ? 'Active' : 'Needs Scope'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Token Expiration</span>
                    <span className={page.tokenExpiryDays > 10 ? 'text-white' : 'text-amber-400 font-bold'}>
                      {page.tokenExpiryDays} days remaining
                    </span>
                  </div>
                </div>

                {/* Linked Instagram Profile */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/30 via-pink-950/20 to-black/40 border border-pink-500/30 mb-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {page.instagramBusinessAccount?.profilePic ? (
                        <img
                          src={page.instagramBusinessAccount.profilePic}
                          alt={page.instagramBusinessAccount.username}
                          className="w-10 h-10 rounded-xl object-cover border border-pink-400/40 shadow-sm shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                          <InstagramIcon className="w-5 h-5" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-mono font-bold text-pink-400">
                            Instagram Profile
                          </span>
                          {page.instagramBusinessAccount && (
                            <span className="px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 text-[9px] font-mono font-bold border border-pink-500/30">
                              Connected
                            </span>
                          )}
                        </div>

                        {page.instagramBusinessAccount ? (
                          <>
                            <a
                              href={`https://instagram.com/${page.instagramBusinessAccount.username}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-white font-bold text-xs hover:text-pink-300 transition-colors flex items-center gap-1 truncate"
                            >
                              @{page.instagramBusinessAccount.username}
                              <ExternalLink className="w-3 h-3 text-pink-400/80 shrink-0" />
                            </a>
                            {page.instagramBusinessAccount.name && (
                              <p className="text-[10px] text-on-surface-variant truncate font-sans">
                                {page.instagramBusinessAccount.name}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-[11px] text-on-surface-variant font-mono">
                            No IG profile detected
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSyncInstagram(page.id)}
                      disabled={syncingPageId === page.id}
                      className="px-2.5 py-1.5 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-pink-300 hover:text-white text-[11px] font-mono flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50"
                      title="Scan Meta Graph API for connected Instagram Account"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncingPageId === page.id ? 'animate-spin' : ''}`} />
                      <span>{page.instagramBusinessAccount ? 'Sync IG' : 'Detect IG'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => page.status === 'DISCONNECTED' ? deletePage(page.id) : disconnectPage(page.id)}
                  className="text-on-surface-variant hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  {page.status === 'DISCONNECTED' ? 'Remove' : 'Disconnect'}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Key className="w-3.5 h-3.5" />}
                    onClick={() => setEditingPage(page)}
                  >
                    Edit Token
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Film className="w-3.5 h-3.5" />}
                    onClick={() => setActiveTab('queue')}
                  >
                    View Queue
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <EditPageModal page={editingPage} onClose={() => setEditingPage(null)} />
    </div>
  );
};
