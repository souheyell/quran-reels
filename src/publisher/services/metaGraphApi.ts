export interface MetaTokenDebugResult {
  isValid: boolean;
  appId?: string;
  userId?: string;
  scopes: string[];
  missingScopes: string[];
  expiresAt?: string;
  error?: string;
}

export interface MetaPublishResponse {
  success: boolean;
  videoId?: string;
  postUrl?: string;
  errorMessage?: string;
  errorCategory?: 'PERMISSION_DENIED' | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'INVALID_VIDEO';
}

const REQUIRED_SCOPES = [
  'publish_video',
  'pages_manage_posts',
  'pages_show_list',
  'pages_read_engagement'
];

// In-memory binary file storage so video files uploaded via dropzone can be streamed directly to Meta
const BINARY_VIDEO_CACHE = new Map<string, Blob | File>();

export const cacheReelBinary = (reelId: string, file: Blob | File) => {
  BINARY_VIDEO_CACHE.set(reelId, file);
};

export const getReelBinary = (reelId: string): Blob | File | undefined => {
  return BINARY_VIDEO_CACHE.get(reelId);
};

/**
 * Formats URLs to route through the Vite dev server proxy to prevent browser CORS errors.
 */
export const formatMetaUrl = (url: string): string => {
  if (typeof window !== 'undefined') {
    if (url.startsWith('https://graph.facebook.com')) {
      return url.replace('https://graph.facebook.com', '/api-meta-graph');
    }
    if (url.startsWith('https://rupload.facebook.com')) {
      return url.replace('https://rupload.facebook.com', '/api-meta-rupload');
    }
  }
  return url;
};

/**
 * Validates a Page Access Token and checks for mandatory Reels publishing permissions.
 */
export const validateMetaAccessToken = async (
  pageAccessToken: string
): Promise<MetaTokenDebugResult> => {
  try {
    const rawUrl = `https://graph.facebook.com/v20.0/me/permissions?access_token=${encodeURIComponent(pageAccessToken)}`;
    const res = await fetch(formatMetaUrl(rawUrl));

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const errorMsg = errJson?.error?.message || `HTTP ${res.status}: Failed to verify token`;
      return {
        isValid: false,
        scopes: [],
        missingScopes: REQUIRED_SCOPES,
        error: errorMsg.includes('Session has expired')
          ? 'Token expired. Please generate a fresh token in Graph API Explorer.'
          : errorMsg,
      };
    }

    const json = await res.json();
    const grantedScopes: string[] = (json.data || [])
      .filter((p: { permission: string; status: string }) => p.status === 'granted')
      .map((p: { permission: string }) => p.permission);

    const missingScopes = REQUIRED_SCOPES.filter((s) => !grantedScopes.includes(s));

    return {
      isValid: missingScopes.length === 0,
      scopes: grantedScopes,
      missingScopes,
      expiresAt: 'Active',
    };
  } catch (err: any) {
    return {
      isValid: false,
      scopes: [],
      missingScopes: REQUIRED_SCOPES,
      error: err?.message || 'Network connection to Meta Graph API failed',
    };
  }
};

export interface CloudBridgeInfo {
  isCloudBridge: boolean;
  network?: string;
  sharedWipPath?: string;
}

export const checkCloudBridgeStatus = async (): Promise<CloudBridgeInfo> => {
  try {
    const res = await fetch('http://localhost:3001/api/status');
    if (res.ok) {
      const data = await res.json();
      return { isCloudBridge: Boolean(data.isCloudBridge), network: data.network, sharedWipPath: data.sharedWipPath };
    }
  } catch (_) {}
  return { isCloudBridge: false };
};

/**
 * Publishes a Video Reel directly to a Facebook Page via Meta Graph API v20.0.
 * Supports the 3-step Resumable Video Reels protocol with automatic fallback.
 */
export const publishReelToFacebook = async (
  pageId: string,
  pageAccessToken: string,
  videoInput: Blob | File | string,
  meta: {
    title: string;
    caption: string;
    scheduledPublishTime?: number; // Unix timestamp in seconds
    onProgress?: (progressPercent: number) => void;
  }
): Promise<MetaPublishResponse> => {
  try {
    if (!pageId || !pageAccessToken) {
      return {
        success: false,
        errorMessage: 'Missing Facebook Page ID or Page Access Token.',
        errorCategory: 'PERMISSION_DENIED',
      };
    }

    // Check if running in GitHub Codespaces with active Cloud Bridge (1 Gbps Datacenter link)
    try {
      const fileName = (typeof videoInput === 'object' && 'name' in videoInput) ? (videoInput as any).name : '';
      if (fileName) {
        const bridgeCheck = await fetch('http://localhost:3001/api/status').catch(() => null);
        if (bridgeCheck && bridgeCheck.ok) {
          const bridgeData = await bridgeCheck.json();
          if (bridgeData.isCloudBridge) {
            if (meta.onProgress) meta.onProgress(30);
            const bridgeRes = await fetch('http://localhost:3001/api/cloud-upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName,
                pageId,
                pageAccessToken,
                title: meta.title,
                caption: meta.caption,
                scheduledPublishTime: meta.scheduledPublishTime,
              }),
            });
            if (bridgeRes.ok) {
              const bridgeJson = await bridgeRes.json();
              if (bridgeJson.success) {
                if (meta.onProgress) meta.onProgress(100);
                return {
                  success: true,
                  videoId: bridgeJson.videoId,
                  postUrl: `https://facebook.com/reel/${bridgeJson.videoId}`,
                };
              }
            }
          }
        }
      }
    } catch (_) {
      // Continue to client-side fallback
    }

    if (meta.onProgress) meta.onProgress(10);

    // Retrieve raw binary video Blob
    let binaryPayload: Blob;
    if (typeof videoInput === 'string') {
      if (!videoInput.trim()) {
        return {
          success: false,
          errorMessage: 'No video file available for this reel. Please select or drop a valid MP4/MOV file.',
          errorCategory: 'INVALID_VIDEO',
        };
      }
      try {
        const mediaRes = await fetch(videoInput);
        if (!mediaRes.ok) {
          throw new Error(`HTTP ${mediaRes.status}`);
        }
        binaryPayload = await mediaRes.blob();
      } catch (fetchErr: any) {
        return {
          success: false,
          errorMessage: 'Could not read local video file (session or blob URL expired). Please re-upload or select the video file.',
          errorCategory: 'INVALID_VIDEO',
        };
      }
    } else {
      binaryPayload = videoInput;
    }

    if (!binaryPayload || binaryPayload.size < 1000) {
      return {
        success: false,
        errorMessage: 'Invalid or empty video payload. Please ensure a valid MP4/MOV video is attached.',
        errorCategory: 'INVALID_VIDEO',
      };
    }

    const fileSize = binaryPayload.size || 1024;
    if (meta.onProgress) meta.onProgress(20);

    // Step 1: Initialize the Video Reel session with provided token
    let currentToken = pageAccessToken;
    const rawStartUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(pageId)}/video_reels`;
    
    let startRes = await fetch(formatMetaUrl(rawStartUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        upload_phase: 'start',
        access_token: currentToken,
      }),
    });

    // If start failed with permission error, try resolving page token from user token
    if (!startRes.ok) {
      const errJson = await startRes.json().catch(() => ({}));
      const rawErrorMsg = errJson?.error?.message || '';

      if (rawErrorMsg.includes('Session has expired') || errJson?.error?.code === 190) {
        return {
          success: false,
          errorMessage: 'Your Meta Page Access Token has expired. Please copy a fresh token from Graph API Explorer (or extend it in the Token Debugger) and click Edit Token.',
          errorCategory: 'PERMISSION_DENIED',
        };
      }

      if (errJson?.error?.code === 200 || rawErrorMsg.includes('permission')) {
        try {
          const exchangeUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(pageId)}?fields=id,name,access_token&access_token=${encodeURIComponent(pageAccessToken)}`;
          const exRes = await fetch(formatMetaUrl(exchangeUrl));
          if (exRes.ok) {
            const exData = await exRes.json();
            if (exData.access_token) {
              currentToken = exData.access_token;
              // Retry start
              startRes = await fetch(formatMetaUrl(rawStartUrl), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  upload_phase: 'start',
                  access_token: currentToken,
                }),
              });
            }
          }
        } catch (_) {}
      }

      if (!startRes.ok) {
        // Fallback to direct video publish
        return await fallbackDirectVideoPublish(pageId, currentToken, binaryPayload, meta);
      }
    }

    const startData = await startRes.json();
    const videoId = startData.video_id;
    const rawUploadUrl = startData.upload_url;

    if (!videoId || !rawUploadUrl) {
      return await fallbackDirectVideoPublish(pageId, currentToken, binaryPayload, meta);
    }

    if (meta.onProgress) meta.onProgress(45);

    // Step 2: Binary Video Chunk Transfer to Ruploader (proxied)
    const uploadUrl = formatMetaUrl(rawUploadUrl);
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `OAuth ${currentToken}`,
        offset: '0',
        file_size: String(fileSize),
      },
      body: binaryPayload,
    });

    if (!uploadRes.ok) {
      // Fallback to direct video upload if ruploader encountered issues
      return await fallbackDirectVideoPublish(pageId, currentToken, binaryPayload, meta);
    }

    if (meta.onProgress) meta.onProgress(85);

    // Step 3: Finish and Dispatch Publication to Page Feed
    const finishParams: Record<string, any> = {
      upload_phase: 'finish',
      access_token: currentToken,
      video_id: videoId,
      video_state: meta.scheduledPublishTime ? 'SCHEDULED' : 'PUBLISHED',
      description: meta.caption,
      title: meta.title,
    };

    if (meta.scheduledPublishTime) {
      // Meta requires scheduled_publish_time to be between 10 mins and 75 days in the future
      const minScheduledSecs = Math.floor(Date.now() / 1000) + 12 * 60;
      finishParams.scheduled_publish_time = Math.max(meta.scheduledPublishTime, minScheduledSecs);
    }

    const finishRes = await fetch(formatMetaUrl(rawStartUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(finishParams),
    });

    if (!finishRes.ok) {
      const finErr = await finishRes.json().catch(() => ({}));
      const subcode = finErr?.error?.error_subcode;
      const userMsg = finErr?.error?.error_user_msg || finErr?.error?.message;
      const finMsg = userMsg 
        ? `${userMsg}${subcode ? ` (Subcode ${subcode})` : ''}`
        : `HTTP ${finishRes.status}: Failed to finalize Reel publication on Page`;
      return {
        success: false,
        videoId,
        errorMessage: finMsg,
        errorCategory: 'PERMISSION_DENIED',
      };
    }

    if (meta.onProgress) meta.onProgress(100);

    return {
      success: true,
      videoId,
      postUrl: `https://facebook.com/reel/${videoId}`,
    };
  } catch (err: any) {
    return {
      success: false,
      errorMessage: err?.message || 'Network exception connecting to Meta Graph API.',
      errorCategory: 'NETWORK_ERROR',
    };
  }
};

/**
 * Direct Video Publish Fallback (POST /{pageId}/videos) using FormData
 */
async function fallbackDirectVideoPublish(
  pageId: string,
  pageAccessToken: string,
  videoBlob: Blob,
  meta: {
    title: string;
    caption: string;
    scheduledPublishTime?: number;
    onProgress?: (progressPercent: number) => void;
  }
): Promise<MetaPublishResponse> {
  try {
    if (meta.onProgress) meta.onProgress(50);
    const formData = new FormData();
    formData.append('source', videoBlob, 'quran_reel.mp4');
    formData.append('title', meta.title);
    formData.append('description', meta.caption);
    formData.append('published', meta.scheduledPublishTime ? 'false' : 'true');
    formData.append('access_token', pageAccessToken);

    if (meta.scheduledPublishTime) {
      formData.append('scheduled_publish_time', String(meta.scheduledPublishTime));
    }

    const rawUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(pageId)}/videos`;
    const res = await fetch(formatMetaUrl(rawUrl), {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errMsg = err?.error?.message || `HTTP ${res.status}: Failed to publish video to Facebook Page`;
      return {
        success: false,
        errorMessage: errMsg.includes('Session has expired')
          ? 'Your Meta Page Access Token has expired. Please generate a fresh token in Graph API Explorer.'
          : errMsg,
        errorCategory: 'PERMISSION_DENIED',
      };
    }

    const data = await res.json();
    if (meta.onProgress) meta.onProgress(100);

    return {
      success: true,
      videoId: data.id,
      postUrl: `https://facebook.com/${data.id}`,
    };
  } catch (err: any) {
    return {
      success: false,
      errorMessage: err?.message || 'Failed direct fallback video publish',
      errorCategory: 'NETWORK_ERROR',
    };
  }
}

export interface MetaFetchedPage {
  id: string; // Numeric Page ID
  name: string;
  category: string;
  followersCount: number;
  avatarUrl: string;
  accessToken: string;
  tasks?: string[];
  instagramBusinessAccount?: {
    id: string;
    username: string;
    name?: string;
    profilePic?: string;
  };
}

/**
 * Resolves any connected Instagram Business account linked to the Facebook Page.
 */
export const fetchPageInstagramAccount = async (
  pageId: string,
  pageAccessToken: string
): Promise<{ id: string; username: string; name?: string; profilePic?: string } | null> => {
  try {
    const rawUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(pageId)}?fields=instagram_business_account{id,username,name,profile_picture_url}&access_token=${encodeURIComponent(pageAccessToken)}`;
    const res = await fetch(formatMetaUrl(rawUrl));
    if (!res.ok) return null;
    const json = await res.json();
    const ig = json.instagram_business_account;
    if (!ig?.id) return null;
    return {
      id: ig.id,
      username: ig.username || '',
      name: ig.name,
      profilePic: ig.profile_picture_url,
    };
  } catch {
    return null;
  }
};

export interface InstagramPublishParams {
  igUserId: string;
  accessToken: string;
  caption: string;
  reelId: string;
  videoUrl?: string;
  videoInput?: Blob | File | string;
  onProgress?: (progress: number) => void;
}

/**
 * Publishes a Reel to Instagram via Meta Graph API Instagram Content Publishing API.
 */
export const publishInstagramReel = async (
  params: InstagramPublishParams
): Promise<MetaPublishResponse> => {
  const { igUserId, accessToken, caption, reelId, videoUrl, videoInput, onProgress } = params;
  
  // Resolve raw binary from videoInput, in-memory cache, or fetchable URL
  let binary: Blob | File | undefined = undefined;
  if (videoInput instanceof Blob) {
    binary = videoInput;
  } else if (reelId) {
    binary = getReelBinary(reelId);
  }

  const effectiveUrl = (typeof videoInput === 'string' && videoInput) ? videoInput : videoUrl;

  // Fallback: recover binary if effectiveUrl is a valid blob or stream
  if (!binary && effectiveUrl && (effectiveUrl.startsWith('blob:') || effectiveUrl.startsWith('http') || effectiveUrl.startsWith('/api/fs'))) {
    try {
      const res = await fetch(effectiveUrl);
      if (res.ok) {
        const b = await res.blob();
        if (b.size >= 1000) binary = b;
      }
    } catch (_) {}
  }

  try {
    if (!igUserId) {
      throw new Error('No Instagram Business Account ID found. Please link an Instagram Professional account to your Facebook Page.');
    }

    if (onProgress) onProgress(15);

    let creationId = '';

    if (binary && binary.size >= 1000) {
      // 1. Initialize Resumable upload session for IG Reel
      const initUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(igUserId)}/media`;
      const initRes = await fetch(formatMetaUrl(initUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'REELS',
          upload_type: 'resumable',
          caption,
          access_token: accessToken,
        }),
      });

      if (!initRes.ok) {
        const errJson = await initRes.json().catch(() => ({}));
        const errMsg = errJson?.error?.error_user_msg || errJson?.error?.message || 'Failed to initialize Instagram Reel upload session';
        throw new Error(`Instagram session error: ${errMsg}`);
      }

      const initData = await initRes.json();
      creationId = initData.id;
      const uploadUri = initData.uri;

      if (!uploadUri) {
        throw new Error('Instagram did not return a valid upload URI.');
      }

      if (onProgress) onProgress(40);

      // 2. Stream video binary to Instagram rupload endpoint
      const uploadRes = await fetch(formatMetaUrl(uploadUri), {
        method: 'POST',
        headers: {
          Authorization: `OAuth ${accessToken}`,
          offset: '0',
          file_size: String(binary.size),
          'Content-Type': 'application/octet-stream',
        },
        body: binary,
      });

      if (!uploadRes.ok) {
        const upErr = await uploadRes.json().catch(() => ({}));
        const upMsg = upErr?.debug_info?.message || upErr?.error?.message || `HTTP ${uploadRes.status}: Failed to stream video to Instagram rupload`;
        throw new Error(`Instagram upload error: ${upMsg}`);
      }

      if (onProgress) onProgress(75);
    } else if (effectiveUrl && !effectiveUrl.startsWith('blob:') && !effectiveUrl.startsWith('/api/fs')) {
      // Direct remote URL container (public HTTP/HTTPS only)
      const urlEndpoint = `https://graph.facebook.com/v20.0/${encodeURIComponent(igUserId)}/media`;
      const res = await fetch(formatMetaUrl(urlEndpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'REELS',
          video_url: effectiveUrl,
          caption,
          access_token: accessToken,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson?.error?.error_user_msg || errJson?.error?.message || 'Failed to create Instagram media container';
        throw new Error(`Instagram container error: ${errMsg}`);
      }

      const data = await res.json();
      creationId = data.id;
      if (onProgress) onProgress(75);
    } else {
      throw new Error('Video binary missing or expired. Please re-upload or drop the video file into the studio.');
    }

    // 3. Poll container status until FINISHED (up to 30 attempts, 2.5s each = ~75s)
    if (onProgress) onProgress(80);
    let isFinished = false;
    let pollErrorMsg = '';

    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 2500));
      const pct = Math.min(94, 80 + Math.floor(attempt * 0.5));
      if (onProgress) onProgress(pct);

      try {
        const statusRes = await fetch(
          formatMetaUrl(`https://graph.facebook.com/v20.0/${creationId}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`)
        );
        if (statusRes.ok) {
          const statusJson = await statusRes.json();
          const statusCode = statusJson.status_code;

          if (statusCode === 'FINISHED') {
            isFinished = true;
            break;
          } else if (statusCode === 'ERROR') {
            pollErrorMsg = statusJson.status || 'Instagram media processing encountered an error';
            throw new Error(pollErrorMsg);
          } else if (statusCode === 'EXPIRED') {
            throw new Error('Instagram media container upload session expired');
          }
          // IN_PROGRESS: continue polling
        }
      } catch (err: any) {
        if (pollErrorMsg) throw err;
      }
    }

    if (!isFinished) {
      throw new Error(
        pollErrorMsg || 'Instagram video transcoding took longer than 75 seconds. The video is still processing on Meta servers. Please wait a moment before trying to publish again.'
      );
    }

    if (onProgress) onProgress(95);

    // 4. Publish Container
    const publishUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(igUserId)}/media_publish`;
    const pubRes = await fetch(formatMetaUrl(publishUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: accessToken,
      }),
    });

    if (!pubRes.ok) {
      const pubErr = await pubRes.json().catch(() => ({}));
      const pubMsg = pubErr?.error?.error_user_msg || pubErr?.error?.message || 'Failed to publish Instagram Reel';
      throw new Error(`Instagram publish error: ${pubMsg}`);
    }

    const pubData = await pubRes.json();
    if (onProgress) onProgress(100);

    return {
      success: true,
      videoId: pubData.id,
      postUrl: `https://instagram.com/reel/${pubData.id}`,
    };
  } catch (err: any) {
    return {
      success: false,
      errorMessage: err?.message || 'Failed to publish Instagram Reel',
      errorCategory: 'NETWORK_ERROR',
    };
  }
};

/**
 * Fetches all Facebook Pages administered by the user account via /me/accounts.
 */
export const fetchMetaUserPages = async (
  userAccessToken: string
): Promise<{ success: boolean; pages: MetaFetchedPage[]; error?: string }> => {
  try {
    const rawUrl = `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token,category,followers_count,picture,tasks,instagram_business_account{id,username,name,profile_picture_url}&limit=100&access_token=${encodeURIComponent(userAccessToken)}`;
    const res = await fetch(formatMetaUrl(rawUrl));

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errMsg = err?.error?.message || `HTTP ${res.status}: Failed to fetch accounts`;
      return {
        success: false,
        pages: [],
        error: errMsg.includes('Session has expired')
          ? 'Your User Access Token has expired. Please grab a fresh token in Graph API Explorer.'
          : errMsg,
      };
    }

    const data = await res.json();
    const rawPages = (data?.data || []) as any[];

    const pages: MetaFetchedPage[] = rawPages.map((p) => {
      const ig = p.instagram_business_account;
      return {
        id: p.id,
        name: p.name,
        category: p.category || 'Digital Media',
        followersCount: p.followers_count || 0,
        avatarUrl: p.picture?.data?.url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&auto=format&fit=crop&q=80',
        accessToken: p.access_token || '',
        tasks: p.tasks || [],
        instagramBusinessAccount: ig?.id
          ? {
              id: ig.id,
              username: ig.username || '',
              name: ig.name,
              profilePic: ig.profile_picture_url,
            }
          : undefined,
      };
    });

    return {
      success: true,
      pages,
    };
  } catch (err: any) {
    return {
      success: false,
      pages: [],
      error: err?.message || 'Network error fetching pages from Meta Graph API',
    };
  }
};
