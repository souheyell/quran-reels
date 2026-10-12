import React, { useState, useEffect } from 'react';
import { 
  X, 
  CloudDownload, 
  Search, 
  RefreshCw, 
  Users, 
  ArrowRight,
  Lock,
  Key
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Button } from '../shared';
import { fetchMetaUserPages, type MetaFetchedPage } from '../../services/metaGraphApi';
import { USER_META_CONFIG } from '../../data/mockData';

export const FetchPagesModal: React.FC = () => {
  const { 
    fetchPagesModalOpen, 
    setFetchPagesModalOpen, 
    importFetchedPages, 
    pages: currentPages,
    showToast 
  } = useStudio();

  const [userToken, setUserToken] = useState(USER_META_CONFIG.userAccessToken);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchedPages, setFetchedPages] = useState<MetaFetchedPage[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-fetch when modal opens if we don't have pages yet
  useEffect(() => {
    if (fetchPagesModalOpen && fetchedPages.length === 0 && userToken) {
      handleFetch();
    }
  }, [fetchPagesModalOpen]);

  if (!fetchPagesModalOpen) return null;

  const handleFetch = async () => {
    if (!userToken.trim()) {
      showToast('Please enter a User Access Token first', 'warning');
      return;
    }

    setIsFetching(true);
    setErrorMessage(null);

    const result = await fetchMetaUserPages(userToken.trim());
    setIsFetching(false);

    if (result.success && result.pages) {
      setFetchedPages(result.pages);
      // Select all by default
      const allIds = new Set(result.pages.map((p) => p.id));
      setSelectedIds(allIds);
      showToast(`Discovered ${result.pages.length} Facebook Page${result.pages.length > 1 ? 's' : ''} from Meta!`, 'success');
    } else {
      setErrorMessage(result.error || 'Failed to fetch pages from Meta Graph API');
      showToast(result.error || 'Failed to fetch pages', 'error');
    }
  };

  const toggleSelectPage = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPages.map((p) => p.id)));
    }
  };

  const handleImport = () => {
    const toImport = fetchedPages.filter((p) => selectedIds.has(p.id));
    if (toImport.length === 0) {
      showToast('Please select at least one page to import', 'warning');
      return;
    }

    importFetchedPages(toImport, fetchedPages);
  };

  const filteredPages = fetchedPages.filter((p) => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.includes(searchQuery) ||
    (p.instagramBusinessAccount?.username && p.instagramBusinessAccount.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="glass-panel-elevated bg-[#051424]/95 border-white/15 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-obsidian-modal border ring-1 ring-primary/20 space-y-6 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-black font-bold flex items-center justify-center shadow-gold-glow">
              <CloudDownload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-white text-lg">
                Fetch Facebook Pages from Meta
              </h3>
              <p className="text-xs font-mono text-on-surface-variant">
                Direct Sync via Graph API v20.0 (/me/accounts)
              </p>
            </div>
          </div>

          <button
            onClick={() => setFetchPagesModalOpen(false)}
            className="p-2 text-on-surface-variant hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Token Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono text-on-surface-variant flex items-center gap-1.5 font-bold uppercase text-[10px]">
              <Key className="w-3.5 h-3.5 text-primary" />
              User Access Token with pages_show_list
            </label>
            <span className="text-[10px] font-mono text-primary/80">
              App ID: {USER_META_CONFIG.appId} (Live Mode)
            </span>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="password"
                value={userToken}
                onChange={(e) => setUserToken(e.target.value)}
                placeholder="Enter User Access Token (EAA...)"
                className="w-full bg-black/40 border border-white/15 focus:border-primary text-white rounded-xl px-4 py-2.5 outline-none font-mono text-xs pr-10"
              />
              <Lock className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={isFetching}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />}
              onClick={handleFetch}
              className="shrink-0 font-mono shadow-gold-glow"
            >
              Fetch Pages
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-start gap-2">
            <span className="font-bold">Error:</span> {errorMessage}
          </div>
        )}

        {/* Fetched Pages List */}
        {fetchedPages.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter pages by name, category, ID..."
                  className="w-full bg-black/40 border border-white/10 text-white rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-primary/50"
                />
              </div>

              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-mono text-primary hover:underline shrink-0"
              >
                {selectedIds.size === filteredPages.length ? 'Deselect All' : 'Select All'} ({selectedIds.size}/{filteredPages.length})
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredPages.map((page) => {
                const isSelected = selectedIds.has(page.id);
                const isAlreadyConnected = currentPages.some(
                  (cp) => cp.pageNumericId === page.id
                );

                return (
                  <div
                    key={page.id}
                    onClick={() => toggleSelectPage(page.id)}
                    className={`p-3 rounded-2xl border transition-all duration-150 flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-white/10 bg-black/20 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by parent div
                        className="w-4 h-4 rounded border-white/30 text-primary accent-primary cursor-pointer"
                      />
                      <img
                        src={page.avatarUrl}
                        alt={page.name}
                        className="w-10 h-10 rounded-full object-cover border border-white/15 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-serif font-bold text-white text-sm truncate">
                            {page.name}
                          </h4>
                          {isAlreadyConnected && (
                            <span className="badge-pro text-[9px] px-1.5 py-0.2 rounded font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">
                              Connected
                            </span>
                          )}
                          {page.instagramBusinessAccount && (
                            <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-300 border border-pink-500/30 text-[9px] font-mono font-bold flex items-center gap-1">
                              📸 @{page.instagramBusinessAccount.username}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-mono text-on-surface-variant">
                          <span>{page.category}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {page.followersCount.toLocaleString()}
                          </span>
                          <span>•</span>
                          <span className="text-white/40">ID: {page.id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 pl-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Token Ready
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFetchPagesModalOpen(false)}
              className="px-3 py-1.5 text-xs font-mono text-on-surface-variant hover:text-white transition-colors"
            >
              Cancel
            </button>
            {fetchedPages.length > 0 && selectedIds.size < fetchedPages.length && (
              <span className="text-[10px] font-mono text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                ⚠ {fetchedPages.length - selectedIds.size} unselected page(s) will be pruned from selectors
              </span>
            )}
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={selectedIds.size === 0}
            onClick={handleImport}
            icon={<ArrowRight className="w-4 h-4" />}
            className="shadow-gold-glow"
          >
            Import {selectedIds.size} Page{selectedIds.size !== 1 ? 's' : ''} to Studio
          </Button>
        </div>

      </div>
    </div>
  );
};
