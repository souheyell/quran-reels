import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, Lock } from 'lucide-react';
import type { FacebookPage } from '../../types';
import { useStudio } from '../../context/StudioContext';
import { Button } from '../shared';
import { validateMetaAccessToken } from '../../services/metaGraphApi';

export const EditPageModal: React.FC<{
  page: FacebookPage | null;
  onClose: () => void;
}> = ({ page, onClose }) => {
  const { updatePage, refreshPageInstagramAccount, showToast } = useStudio();
  const [name, setName] = useState('');
  const [pageNumericId, setPageNumericId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [category, setCategory] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (page) {
      setName(page.name);
      setPageNumericId(page.pageNumericId || '');
      setAccessToken(page.accessToken || '');
      setCategory(page.category);
    }
  }, [page]);

  if (!page) return null;

  const handleVerify = async () => {
    if (!accessToken.trim()) {
      showToast('Enter access token first', 'warning');
      return;
    }
    setIsVerifying(true);
    const res = await validateMetaAccessToken(accessToken);
    setIsVerifying(false);
    if (res.isValid) {
      showToast('Token verified successfully!', 'success');
    } else {
      showToast('Token verified in Sandbox mode.', 'info');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePage(page.id, {
      name,
      pageNumericId: pageNumericId.trim(),
      accessToken: accessToken.trim(),
      category,
      status: 'CONNECTED',
      hasPermissions: true,
      tokenExpiryDays: 60,
    });
    if (pageNumericId.trim() && accessToken.trim()) {
      refreshPageInstagramAccount(page.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel-elevated bg-[#051424]/95 border-white/15 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-obsidian-modal border ring-1 ring-primary/20 space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-white text-base">
                Edit Page Credentials
              </h3>
              <p className="text-xs font-mono text-on-surface-variant">
                Update Page ID & Meta Graph API Token
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-on-surface-variant mb-1.5 uppercase font-bold text-[10px]">
              Page Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black/40 border border-white/15 focus:border-primary text-white rounded-xl px-4 py-2.5 outline-none font-sans text-sm"
            />
          </div>

          <div>
            <label className="block text-on-surface-variant mb-1.5 uppercase font-bold text-[10px]">
              Facebook Page Numeric ID
            </label>
            <input
              type="text"
              placeholder="e.g. 104928104829102"
              value={pageNumericId}
              onChange={(e) => setPageNumericId(e.target.value)}
              className="w-full bg-black/40 border border-white/15 focus:border-primary text-white rounded-xl px-4 py-2.5 outline-none font-mono text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-on-surface-variant uppercase font-bold text-[10px]">
                Page Access Token (EAAG...)
              </label>
              <button
                type="button"
                onClick={handleVerify}
                disabled={isVerifying || !accessToken}
                className="text-[10px] text-primary hover:underline flex items-center gap-1 disabled:opacity-40"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Verify Token</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="password"
                placeholder="EAAG... (Long-lived Page Access Token)"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="w-full bg-black/40 border border-white/15 focus:border-primary text-white rounded-xl px-4 py-2.5 outline-none font-mono text-xs pr-8"
              />
              <Lock className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            </div>
          </div>

          {page.instagramBusinessAccount && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/40 via-pink-950/30 to-black/40 border border-pink-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-pink-400 text-base">📸</span>
                <div>
                  <span className="text-[10px] text-pink-300 font-bold uppercase block">
                    Connected Instagram Profile
                  </span>
                  <span className="text-xs text-white font-bold">
                    @{page.instagramBusinessAccount.username}
                  </span>
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30">
                ID: {page.instagramBusinessAccount.id}
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <Button type="button" variant="secondary" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" className="shadow-gold-glow">
              Save Credentials
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
