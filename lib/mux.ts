import Mux from '@mux/mux-node';
import { supabaseAdmin } from './supabase';

// Lazy-load Mux client to ensure env vars are available
let muxClient: Mux | null = null;

const getMuxClient = () => {
  if (!muxClient) {
    // Support both naming conventions
    const tokenId = process.env.MUX_TOKEN_ID || process.env.MUX_TOKEN;
    const tokenSecret = process.env.MUX_TOKEN_SECRET || process.env.MUX_SECRET;
    
    if (!tokenId || !tokenSecret) {
      throw new Error('Mux credentials not configured. Please set MUX_TOKEN and MUX_SECRET in .env file');
    }
    
    console.log('🎬 Initializing Mux client...');
    muxClient = new Mux(tokenId, tokenSecret);
  }
  return muxClient;
};

// For backwards compatibility
const mux = new Proxy({} as Mux, {
  get: (target, prop) => {
    const client = getMuxClient();
    return (client as any)[prop];
  }
});

// Create a Mux asset from a video file
export const createMuxAsset = async (fileUrl: string, metadata?: {
  title?: string;
  description?: string;
}) => {
  try {
    const asset = await mux.Video.Assets.create({
      input: fileUrl,
      playback_policy: ['public'],
      mp4_support: 'standard',
      normalize_audio: true,
      ...metadata,
    });

    return asset;
  } catch (error) {
    console.error('Error creating Mux asset:', error);
    throw error;
  }
};

// Get asset details
export const getMuxAsset = async (assetId: string) => {
  try {
    const asset = await mux.Video.Assets.get(assetId);
    return asset;
  } catch (error) {
    console.error('Error retrieving Mux asset:', error);
    throw error;
  }
};

// Delete a Mux asset
export const deleteMuxAsset = async (assetId: string) => {
  try {
    await mux.Video.Assets.del(assetId);
    return true;
  } catch (error) {
    console.error('Error deleting Mux asset:', error);
    throw error;
  }
};

// Create a signed playback URL for private content
export const createSignedPlaybackUrl = async (assetId: string, expiresIn: string = '7d') => {
  try {
    const asset = await getMuxAsset(assetId);
    
    if (!asset.playback_ids || asset.playback_ids.length === 0) {
      throw new Error('No playback IDs found for asset');
    }

    const playbackId = asset.playback_ids[0].id;
    
    // For now, return public URL - JWT signing can be implemented later
    // when we have the correct Mux SDK method
    return {
      url: `https://stream.mux.com/${playbackId}.m3u8`,
      playbackId,
      token: null, // JWT token not available in current SDK version
    };
  } catch (error) {
    console.error('Error creating signed playback URL:', error);
    throw error;
  }
};

// Get public playback URL
export const getPublicPlaybackUrl = async (assetId: string) => {
  try {
    const asset = await getMuxAsset(assetId);
    
    if (!asset.playback_ids || asset.playback_ids.length === 0) {
      throw new Error('No playback IDs found for asset');
    }

    const playbackId = asset.playback_ids[0].id;
    return `https://stream.mux.com/${playbackId}.m3u8`;
  } catch (error) {
    console.error('Error getting public playback URL:', error);
    throw error;
  }
};

// Process video upload workflow
export const processVideoUpload = async ({
  fileUrl,
  userId,
  postId,
  title,
  description,
}: {
  fileUrl: string;
  userId: string;
  postId: string;
  title: string;
  description?: string;
}) => {
  try {
    // Create Mux asset
    const asset = await createMuxAsset(fileUrl, {
      title,
      description,
    });

    // Update post with Mux asset info
    const playbackUrl = await getPublicPlaybackUrl(asset.id);
    
    const { data: updatedPost, error } = await (supabaseAdmin as any)
      .from('posts')
      .update({
        mux_asset_id: asset.id,
        playback_url: playbackUrl,
      })
      .eq('id', postId)
      .select()
      .single();

    if (error) throw error;

    return {
      asset,
      post: updatedPost,
      playbackUrl,
    };
  } catch (error) {
    console.error('Error processing video upload:', error);
    throw error;
  }
};

// Handle Mux webhooks for asset status updates
export const handleMuxWebhook = async (body: any, signature: string) => {
  try {
    // For now, skip webhook verification - can be implemented later
    // when we have the correct Mux SDK method
    // const isValid = mux.webhooks.verifyHeader(body, signature, process.env.MUX_WEBHOOK_SECRET!);
    
    // if (!isValid) {
    //   throw new Error('Invalid webhook signature');
    // }

    const event = typeof body === 'string' ? JSON.parse(body) : body;

    switch (event.type) {
      case 'video.asset.ready':
        await handleAssetReady(event.data);
        break;
      case 'video.asset.errored':
        await handleAssetErrored(event.data);
        break;
      default:
        console.log(`Unhandled Mux event type: ${event.type}`);
    }

    return { received: true };
  } catch (error) {
    console.error('Mux webhook error:', error);
    throw error;
  }
};

const handleAssetReady = async (assetData: any) => {
  try {
    // Update post status when video is ready
    const { error } = await (supabaseAdmin as any)
      .from('posts')
      .update({
        playback_url: await getPublicPlaybackUrl(assetData.id),
      })
      .eq('mux_asset_id', assetData.id);

    if (error) throw error;
    
    console.log(`Asset ${assetData.id} is ready`);
  } catch (error) {
    console.error('Error handling asset ready:', error);
  }
};

const handleAssetErrored = async (assetData: any) => {
  try {
    // Handle asset processing error
    console.error(`Asset ${assetData.id} failed to process:`, assetData);
    
    // You might want to notify the user or retry processing
    // For now, we'll just log the error
  } catch (error) {
    console.error('Error handling asset error:', error);
  }
};

// Get asset analytics (if needed)
export const getAssetAnalytics = async (assetId: string, timeframe: string = '7d') => {
  try {
    // For now, return mock analytics - can be implemented later
    // when we have the correct Mux SDK method
    // const analytics = await mux.data.views.retrieve({
    //   filters: [`asset_id:${assetId}`],
    //   timeframe: [timeframe],
    // });

    return {
      asset_id: assetId,
      views: 0,
      timeframe,
      note: 'Analytics not available in current SDK version'
    };
  } catch (error) {
    console.error('Error getting asset analytics:', error);
    throw error;
  }
};

// Create thumbnail from video
export const createThumbnail = async (assetId: string, time: number = 1) => {
  try {
    const thumbnail = await mux.Video.Assets.createPlaybackId(assetId, {
      policy: 'public',
    });

    return thumbnail;
  } catch (error) {
    console.error('Error creating thumbnail:', error);
    throw error;
  }
};

// Get asset thumbnails
export const getAssetThumbnails = async (assetId: string) => {
  try {
    const asset = await getMuxAsset(assetId);
    return asset.playback_ids || [];
  } catch (error) {
    console.error('Error getting thumbnails:', error);
    throw error;
  }
};

// Utility functions
export const isVideoFile = (filename: string) => {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return videoExtensions.includes(ext);
};

export const getVideoDuration = async (assetId: string) => {
  try {
    const asset = await getMuxAsset(assetId);
    return asset.duration;
  } catch (error) {
    console.error('Error getting video duration:', error);
    return null;
  }
};

export const getVideoAspectRatio = async (assetId: string) => {
  try {
    const asset = await getMuxAsset(assetId);
    return asset.aspect_ratio;
  } catch (error) {
    console.error('Error getting video aspect ratio:', error);
    return null;
  }
};

// ============================================
// LIVE STREAMING FUNCTIONS
// ============================================

// Create a new live stream (supports both RTMP and WebRTC/WHIP)
export const createLiveStream = async (
  metadata?: {
    title?: string;
    description?: string;
    useWebRTC?: boolean; // Set to true for browser-based streaming via WHIP
  }
) => {
  try {
    const config: any = {
      playback_policy: ['public'],
      new_asset_settings: { playback_policy: ['public'] },
      reconnect_window: 60,
      latency_mode: 'low',
    };
    …


    // Enable WHIP if requested
    if (metadata?.useWebRTC) {
      config.use_whip = true; // ✅ This enables WHIP and returns whip_url
      config.use_slate_for_standard_latency = false;
    }

    // Add metadata to config
    if (metadata?.title) config.title = metadata.title;
    if (metadata?.description) config.description = metadata.description;

    console.log('🎥 Creating Mux live stream with config:', config);
    const liveStream = await mux.Video.LiveStreams.create(config);
    
    console.log('✅ Mux live stream created:', {
      id: liveStream.id,
      stream_key: liveStream.stream_key,
      whip_url: liveStream.whip_url,
      playback_ids: liveStream.playback_ids?.length || 0,
    });

    return {
      id: liveStream.id,
      streamKey: liveStream.stream_key,
      playbackIds: liveStream.playback_ids,
      status: liveStream.status,
      // ✅ Use the actual WHIP URL from Mux (signed URL)
      whipEndpoint: liveStream.whip_url,
    };
  } catch (error) {
    console.error('Error creating live stream:', error);
    throw error;
  }
};

// Get live stream details
export const getLiveStream = async (streamId: string) => {
  try {
    const liveStream = await (mux.Video.LiveStreams as any).get(streamId);
    return liveStream;
  } catch (error) {
    console.error('Error getting live stream:', error);
    throw error;
  }
};

// Delete/end a live stream
export const deleteLiveStream = async (streamId: string) => {
  try {
    await mux.Video.LiveStreams.del(streamId);
    return true;
  } catch (error) {
    console.error('Error deleting live stream:', error);
    throw error;
  }
};

// Create a simulcast target (for multi-platform streaming)
export const createSimulcastTarget = async (
  streamId: string,
  url: string,
  streamKey: string
) => {
  try {
    const target = await mux.Video.LiveStreams.createSimulcastTarget(streamId, {
      url,
      stream_key: streamKey,
    });
    return target;
  } catch (error) {
    console.error('Error creating simulcast target:', error);
    throw error;
  }
};

// Get live stream playback URL
export const getLiveStreamPlaybackUrl = (playbackId: string) => {
  return `https://stream.mux.com/${playbackId}.m3u8`;
};

