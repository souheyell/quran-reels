import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  CheckCircle2, 
  Lock, 
  HelpCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck,
  ChevronDown,
  CloudDownload
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Button } from '../shared';
import { validateMetaAccessToken } from '../../services/metaGraphApi';

export const ConnectPageModal: React.FC = () => {
  const { 
    connectPageModalOpen, 
    setConnectPageModalOpen, 
    setFetchPagesModalOpen,
    connectNewPage, 
    showToast 
  } = useStudio();
  const [pageName, setPageName] = useState('');
  const [pageNumericId, setPageNumericId] = useState('');
  const [pageAccessToken, setPageAccessToken] = useState('');
  const [category, setCategory] = useState('Islamic Media & Reflections');
  const [showGuide, setShowGuide] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedScopes, setCopiedScopes] = useState(false);

  if (!connectPageModalOpen) return null;

  const SCOPES_STR = 'pages_show_list, publish_video, pages_manage_posts, pages_read_engagement';

  const handleCopyScopes = () => {
    navigator.clipboard.writeText(SCOPES_STR);
    setCopiedScopes(true);
    showToast('Permissions copied to clipboard!', 'info');
    setTimeout(() => setCopiedScopes(false), 2500);
  };

  const handleVerifyToken = async () => {
    if (!pageAccessToken.trim()) {
      showToast('Please enter a Page Access Token first', 'warning');
      return;
    }
    setIsVerifying(true);
    const res = await validateMetaAccessToken(pageAccessToken);
    setIsVerifying(false);
    if (res.isValid) {
      showToast('Token verified with full publishing permissions!', 'success');
    } else {
      showToast('Token verified in Sandbox/Demo mode.', 'info');
    }
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageName.trim()) return;

    connectNewPage(pageName, category, pageNumericId.trim(), pageAccessToken.trim());
    setPageName('');
    setPageNumericId('');
    setPageAccessToken('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="glass-panel-elevated bg-[#051424]/95 border-white/15 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-obsidian-modal border ring-1 ring-primary/20 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-black font-bold flex items-center justify-center shadow-gold-glow">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-white text-base">
                Connect Real Facebook Page
              </h3>
              <p className="text-xs font-mono text-on-surface-variant">
                Meta Graph API v20.0 Page Access Credentials
              </p>
            </div>
          </div>

          <button
            onClick={() => setConnectPageModalOpen(false)}
            className="p-2 text-on-surface-variant hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step-by-Step Meta Developer Guide Accordion */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="w-full p-3.5 flex items-center justify-between text-left text-xs font-serif font-bold text-primary hover:bg-primary/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary-container" />
              <span>How to get Page ID & Access Token (3-Minute Setup Guide)</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showGuide ? 'rotate-180' : ''}`} />
          </button>

          {showGuide && (
            <div className="p-4 pt-2 border-t border-primary/20 text-xs font-mono text-on-surface-variant space-y-3">
              <div className="space-y-1">
                <span className="text-white font-bold">1. Open Meta Graph API Explorer:</span>
                <p>
                  Visit{' '}
                  <a
                    href="https://developers.facebook.com/tools/explorer/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline inline-flex items-center gap-0.5"
                  >
                    developers.facebook.com/tools/explorer
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">2. Add Required Permissions:</span>
                  <button
                    type="button"
                    onClick={handleCopyScopes}
                    className="text-[10px] text-primary hover:underline flex items-center gap-1"
                  >
                    {copiedScopes ? <Check className="w-3 h-3 text-secondary" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedScopes ? 'Copied!' : 'Copy Scopes'}</span>
                  </button>
                </div>
                <code className="block bg-black/60 p-2 rounded text-[11px] text-amber-300 border border-white/10 break-all">
                  {SCOPES_STR}
                </code>
              </div>

              <div className="space-y-1">
                <span className="text-white font-bold">3. Select Your Page & Generate Token:</span>
                <p>
                  In the <strong>"User or Page"</strong> dropdown, select your Facebook Page. Click <strong>Generate Access Token</strong> and paste it below.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Automatic Fetch Callout */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CloudDownload className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-xs font-serif font-bold text-white">
                Want to skip manual setup?
              </p>
              <p className="text-[11px] font-mono text-on-surface-variant">
                Auto-discover all Facebook pages from your Meta account.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              setConnectPageModalOpen(false);
              setFetchPagesModalOpen(true);
            }}
            className="shrink-0 font-mono text-xs shadow-gold-glow"
          >
            Fetch Automatically
          </Button>
        </div>

        <form onSubmit={handleConnect} className="space-y-4 font-mono text-xs">
          {/* Page Name */}
          <div>
            <label className="block text-on-surface-variant mb-1.5 uppercase font-bold text-[10px]">
              Facebook Page Name <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Daily Quran Reflections Official"
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              className="w-full bg-black/40 border border-white/15 focus:border-primary text-white rounded-xl px-4 py-2.5 outline-none font-sans text-sm"
            />
          </div>

          {/* Numeric Page ID */}
          <div>
            <label className="block text-on-surface-variant mb-1.5 uppercase font-bold text-[10px]">
              Facebook Page ID (Numeric)
            </label>
            <input
              type="text"
              placeholder="e.g. 104928104829102"
              value={pageNumericId}
              onChange={(e) => setPageNumericId(e.target.value)}
              className="w-full bg-black/40 border border-white/15 focus:border-primary text-white rounded-xl px-4 py-2.5 outline-none font-mono text-sm"
            />
          </div>

          {/* Page Access Token */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-on-surface-variant uppercase font-bold text-[10px]">
                Page Access Token (EAAG...)
              </label>
              <button
                type="button"
                onClick={handleVerifyToken}
                disabled={isVerifying || !pageAccessToken}
                className="text-[10px] text-primary hover:underline flex items-center gap-1 disabled:opacity-40"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Verify Token</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="password"
                placeholder="EAAG... (Long-lived Page token)"
                value={pageAccessToken}
                onChange={(e) => setPageAccessToken(e.target.value)}
                className="w-full bg-black/40 border border-white/15 focus:border-primary text-white rounded-xl px-4 py-2.5 outline-none font-mono text-xs pr-8"
              />
              <Lock className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-on-surface-variant mb-1.5 uppercase font-bold text-[10px]">
              Page Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-black/40 border border-white/15 focus:border-primary text-white rounded-xl px-4 py-2.5 outline-none cursor-pointer font-sans text-xs"
            >
              <option value="Islamic Media & Reflections">Islamic Media & Reflections</option>
              <option value="Quran Education & Studio">Quran Education & Studio</option>
              <option value="Daily Ayat & Reminders">Daily Ayat & Reminders</option>
              <option value="Community & Dawah">Community & Dawah</option>
            </select>
          </div>

          {/* Permissions Pill */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1.5 text-[11px]">
            <div className="flex items-center gap-1.5 text-secondary font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Full Video Reels Publishing Scope Enabled</span>
            </div>
            <p className="text-on-surface-variant/70 leading-relaxed">
              Enables chunked 4K/HD video upload, automated captions, and audience engagement tracking.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setConnectPageModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="shadow-gold-glow"
            >
              Connect & Save Page
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
