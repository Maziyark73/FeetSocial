import Mux from '@mux/mux-node';
import { supabaseAdmin } from './supabase';

const mux = new Mux(
  process.env.MUX_TOKEN_ID!,
  process.env.MUX_TOKEN_SECRET!
);

// Create a Mux asset from a video file
export const createMuxAsset = async (fileUrl: string, metadata?: {
  title?: string;
  description?: string;
}) => {
  try {
    const asset = await mux.video.assets.create({
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
    const asset = await mux.video.assets.retrieve(assetId);
    return asset;
  } catch (error) {
    console.error('Error retrieving Mux asset:', error);
    throw error;
  }
};

// Delete a Mux asset
export const deleteMuxAsset = async (assetId: string) => {
  try {
    await mux.video.assets.del(assetId);
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
    const token = mux.jwt.signPlaybackId(playbackId, {
      keyId: process.env.MUX_SIGNING_KEY_ID!,
      keySecret: process.env.MUX_SIGNING_KEY_SECRET!,
      expiration: expiresIn,
    });

    return {
      url: `https://stream.mux.com/${playbackId}.m3u8?token=${token}`,
      playbackId,
      token,
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
    
    const { data: updatedPost, error } = await supabaseAdmin
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
    // Verify webhook signature (you'll need to implement this based on Mux docs)
    const isValid = mux.webhooks.verifyHeader(body, signature, process.env.MUX_WEBHOOK_SECRET!);
    
    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    const event = JSON.parse(body);

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
    const { error } = await supabaseAdmin
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
    const analytics = await mux.data.views.retrieve({
      filters: [`asset_id:${assetId}`],
      timeframe: [timeframe],
    });

    return analytics;
  } catch (error) {
    console.error('Error getting asset analytics:', error);
    throw error;
  }
};

// Create thumbnail from video
export const createThumbnail = async (assetId: string, time: number = 1) => {
  try {
    const thumbnail = await mux.video.assets.createThumbnail(assetId, {
      time: time,
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
    const thumbnails = await mux.video.assets.listThumbnails(assetId);
    return thumbnails;
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

