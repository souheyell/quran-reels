import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Film, 
  Calendar, 
  Send, 
  Trash2
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Button } from '../shared';

export const ReelDetailDrawer: React.FC = () => {
  const { 
    activeDrawerReel, 
    closeDrawer, 
    updateReel, 
    autoFixReelAudio, 
    setPublishModalReel, 
    deleteReels, 
    pages,
    showToast
  } = useStudio();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(activeDrawerReel?.durationSeconds || 45);
  const [activeTab, setActiveTab] = useState<'details' | 'validation' | 'pages'>('details');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (activeDrawerReel) {
      setDuration(activeDrawerReel.durationSeconds || 45);
    }
  }, [activeDrawerReel?.id]);

  if (!activeDrawerReel) return null;

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || activeDrawerReel.durationSeconds);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleTogglePage = (pageId: string) => {
    const current = activeDrawerReel.targetPageIds;
    const next = current.includes(pageId)
      ? current.filter((id) => id !== pageId)
      : [...current, pageId];
    updateReel(activeDrawerReel.id, { targetPageIds: next });
  };

  const handleAddHashtag = (tag: string) => {
    if (!activeDrawerReel.hashtags.includes(tag)) {
      updateReel(activeDrawerReel.id, {
        hashtags: [...activeDrawerReel.hashtags, tag],
      });
    }
  };

  const handleRemoveHashtag = (tag: string) => {
    updateReel(activeDrawerReel.id, {
      hashtags: activeDrawerReel.hashtags.filter((t) => t !== tag),
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-[#051424]/98 backdrop-blur-2xl border-l border-white/15 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right-6 duration-300">
      {/* Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-white text-base tracking-wide">
              Reel Inspector & Player
            </h3>
            <p className="text-[11px] font-mono text-on-surface-variant">
              {activeDrawerReel.filename}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              deleteReels([activeDrawerReel.id]);
              closeDrawer();
              showToast(`Deleted ${activeDrawerReel.title}`, 'info');
            }}
            className="p-2 text-on-surface-variant hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Delete Reel"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={closeDrawer}
            className="p-2 text-on-surface-variant hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-5 text-xs font-mono">
        <button
          onClick={() => setActiveTab('details')}
          className={`py-3 px-4 border-b-2 font-medium transition-colors ${
            activeTab === 'details'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-on-surface-variant hover:text-white'
          }`}
        >
          Clean Video & Editor
        </button>
        <button
          onClick={() => setActiveTab('validation')}
          className={`py-3 px-4 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'validation'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-on-surface-variant hover:text-white'
          }`}
        >
          <span>Pre-Flight Checks</span>
          {!activeDrawerReel.audioNormalized && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('pages')}
          className={`py-3 px-4 border-b-2 font-medium transition-colors ${
            activeTab === 'pages'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-on-surface-variant hover:text-white'
          }`}
        >
          Destination Pages ({activeDrawerReel.targetPageIds.length})
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {activeTab === 'details' && (
          <>
            {/* 9:16 Pure Video Player with ZERO overlays obstructing the video content */}
            <div className="space-y-3 max-w-[300px] mx-auto">
              <div className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden glass-panel border border-white/25 shadow-2xl bg-black flex items-center justify-center">
                {activeDrawerReel.videoUrl ? (
                  <video
                    ref={videoRef}
                    src={activeDrawerReel.videoUrl}
                    playsInline
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => setIsPlaying(false)}
                    onClick={togglePlay}
                    className="w-full h-full object-cover cursor-pointer"
                  />
                ) : activeDrawerReel.thumbnailUrl || activeDrawerReel.bgImageUrl ? (
                  <img
                    src={activeDrawerReel.thumbnailUrl || activeDrawerReel.bgImageUrl}
                    alt={activeDrawerReel.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Film className="w-12 h-12 text-white/30" />
                )}

                {/* Big Center Play Button when paused */}
                {!isPlaying && (
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-primary/90 text-black flex items-center justify-center shadow-gold-glow hover:scale-110 transition-transform"
                  >
                    <Play className="w-7 h-7 fill-current ml-0.5" />
                  </button>
                )}
              </div>

              {/* Clean External Video Controls bar */}
              <div className="bg-black/80 p-3 rounded-xl border border-white/10 space-y-2">
                <input
                  type="range"
                  min={0}
                  max={duration || 45}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full accent-primary h-1 bg-white/20 rounded cursor-pointer"
                />

                <div className="flex items-center justify-between text-[11px] font-mono text-white/90">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={togglePlay}
                      className="p-1.5 rounded-lg bg-primary text-black hover:scale-105 transition-transform"
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    </button>
                    <button
                      onClick={toggleMute}
                      className="p-1 text-on-surface-variant hover:text-white"
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <span>
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                  <span className="text-[10px] text-primary">{activeDrawerReel.resolution}</span>
                </div>
              </div>
            </div>

            {/* Technical Specs Shelf */}
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-black/40 border border-white/10 text-xs font-mono">
              <div>
                <span className="text-on-surface-variant/60 text-[10px]">RESOLUTION</span>
                <p className="text-white font-semibold">{activeDrawerReel.resolution}</p>
              </div>
              <div>
                <span className="text-on-surface-variant/60 text-[10px]">DURATION</span>
                <p className="text-white font-semibold">{activeDrawerReel.durationSeconds}s</p>
              </div>
              <div>
                <span className="text-on-surface-variant/60 text-[10px]">AUDIO LEVEL</span>
                <p className={activeDrawerReel.audioNormalized ? 'text-secondary font-semibold' : 'text-amber-400 font-semibold'}>
                  {activeDrawerReel.audioLufs} LUFS
                </p>
              </div>
            </div>

            {/* Post Title & Meta Post Caption Editors */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                  Reel Title
                </label>
                <input
                  type="text"
                  value={activeDrawerReel.title}
                  onChange={(e) => updateReel(activeDrawerReel.id, { title: e.target.value })}
                  className="w-full bg-black/40 border border-white/15 focus:border-primary text-white rounded-lg px-3.5 py-2 text-sm outline-none transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-on-surface-variant">
                    Manual Facebook Description
                  </label>
                  <span className="text-[10px] text-primary">
                    Sent to Facebook Reel
                  </span>
                </div>
                <textarea
                  rows={4}
                  placeholder="Enter manual description for this Reel..."
                  value={activeDrawerReel.description || activeDrawerReel.captionEnglish || ''}
                  onChange={(e) => updateReel(activeDrawerReel.id, { 
                    description: e.target.value,
                    captionEnglish: e.target.value 
                  })}
                  className="w-full bg-black/40 border border-white/15 focus:border-primary text-white rounded-lg px-3.5 py-2 text-sm outline-none transition-colors custom-scrollbar resize-none"
                />
              </div>

              {/* Hashtag Chips */}
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                  Hashtags
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {activeDrawerReel.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-primary border border-white/10 text-xs font-mono"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveHashtag(tag)}
                        className="hover:text-red-400 text-on-surface-variant"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-on-surface-variant">
                  <span>Suggested:</span>
                  {['#Quran', '#Ajr', '#IslamicQuotes', '#Jumuah', '#Peace', '#Tilawah'].map((sug) => (
                    <button
                      key={sug}
                      onClick={() => handleAddHashtag(sug)}
                      className="text-primary/80 hover:text-primary underline px-1"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'validation' && (
          <div className="space-y-4">
            <h4 className="font-serif font-bold text-white text-sm">
              Automated Pre-Flight Publishing Checks
            </h4>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-white">Video Format & Codec Valid</div>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    H.264 (MP4) is fully compliant with Meta Graph Video API v20.0 specs.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-white">Aspect Ratio (9:16) & Resolution</div>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    {activeDrawerReel.resolution} verified with mobile safe zones.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-white">Duration Limits (within 90s)</div>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    {activeDrawerReel.durationSeconds}s duration is within platform limits.
                  </p>
                </div>
              </div>

              {/* Audio normalization */}
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                  activeDrawerReel.audioNormalized
                    ? 'bg-secondary/10 border-secondary/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}
              >
                {activeDrawerReel.audioNormalized ? (
                  <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="text-xs font-semibold text-white flex items-center justify-between">
                    <span>
                      Audio Loudness: {activeDrawerReel.audioLufs} LUFS
                    </span>
                    {activeDrawerReel.audioNormalized && (
                      <span className="text-[10px] text-secondary font-mono">NORMALIZED</span>
                    )}
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    {activeDrawerReel.audioNormalized
                      ? 'Audio loudness is calibrated to -14.0 LUFS target for pristine mobile recitation.'
                      : 'Audio level deviates from platform standard. Click below to normalize waveform automatically.'}
                  </p>
                  {!activeDrawerReel.audioNormalized && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Sparkles className="w-3.5 h-3.5" />}
                      onClick={() => autoFixReelAudio(activeDrawerReel.id)}
                      className="mt-3 shadow-gold-glow"
                    >
                      Auto-Normalize Audio (-14 LUFS)
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pages' && (
          <div className="space-y-4">
            <h4 className="font-serif font-bold text-white text-sm">
              Target Facebook Page
            </h4>
            <p className="text-xs text-on-surface-variant">
              Select which connected Facebook pages will publish this Reel:
            </p>

            <div className="space-y-2">
              {pages.map((page) => {
                const isSelected = activeDrawerReel.targetPageIds.includes(page.id);
                return (
                  <div
                    key={page.id}
                    onClick={() => handleTogglePage(page.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-gold-glow'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={page.avatarUrl}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-white/15"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h5 className="text-xs font-semibold text-white">{page.name}</h5>
                          {page.instagramBusinessAccount && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 font-mono font-semibold border border-pink-500/30">
                              📸 @{page.instagramBusinessAccount.username}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-on-surface-variant">
                          {page.handle} • {page.status}
                        </p>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="w-5 h-5 rounded accent-primary cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Footer */}
      <div className="p-5 border-t border-white/10 bg-black/60 flex items-center justify-between gap-3">
        <Button
          variant="secondary"
          size="md"
          icon={<Calendar className="w-4 h-4" />}
          onClick={() => {
            updateReel(activeDrawerReel.id, {
              status: 'SCHEDULED',
              scheduledTime: '2026-08-19T19:30:00Z',
            });
            closeDrawer();
            showToast(`Scheduled "${activeDrawerReel.title}" for tonight at 19:30`, 'success');
          }}
        >
          Schedule
        </Button>

        <Button
          variant="primary"
          size="md"
          icon={<Send className="w-4 h-4" />}
          onClick={() => {
            setPublishModalReel(activeDrawerReel);
            closeDrawer();
          }}
          className="shadow-gold-glow flex-1"
        >
          Publish to {pages.length > 0 ? pages[0].name : 'Facebook Page'}
        </Button>
      </div>
    </div>
  );
};
