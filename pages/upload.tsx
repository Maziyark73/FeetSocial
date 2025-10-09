import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase, createPost } from '../lib/supabase';
import Uploader from '../components/Uploader';
import type { UploadFileResponse } from '../components/Uploader';

export default function Upload() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadFileResponse[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    isVault: false,
    vaultPrice: '',
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user: currentUser } } = await (supabase as any).auth.getUser();
        if (!currentUser) {
          router.push('/login');
          return;
        }
        setUser(currentUser);
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleFileUpload = useCallback((files: UploadFileResponse[]) => {
    setUploadedFiles(files);
    setError('');
  }, []);

  const handleFileError = useCallback((error: Error) => {
    setError(error.message);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one file');
      return;
    }

    if (!formData.title.trim()) {
      setError('Please enter a title');
      return;
    }

    if (formData.isVault && (!formData.vaultPrice || parseFloat(formData.vaultPrice) <= 0)) {
      setError('Please enter a valid vault price');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const file = uploadedFiles[0];
      const isVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|avi|mkv|webm)$/i);
      const tags = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean);

      console.log('Upload file info:', {
        name: file.name,
        type: file.type,
        isVideo,
        url: file.url
      });

      // Create post
      const postData: any = {
        user_id: user.id,
        title: formData.title,
        description: formData.description || null,
        tags: tags,
        is_vault: formData.isVault,
        vault_price: formData.isVault ? Math.round(parseFloat(formData.vaultPrice) * 100) : null,
        media_type: isVideo ? 'video' : 'image',
        image_url: isVideo ? file.url : file.url, // For videos, store URL temporarily until Mux processes
      };

      console.log('Creating post with data:', postData);

      const post = await createPost(postData);

      if (!post || !post.id) {
        throw new Error('Failed to create post - no post ID returned');
      }

      // If video, process with Mux (optional - will fail gracefully if Mux not configured)
      if (isVideo) {
        try {
          await fetch('/api/mux/process-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileUrl: file.url,
              userId: user.id,
              postId: post.id,
              title: formData.title,
              description: formData.description,
            }),
          });
        } catch (muxError) {
          console.warn('Mux processing failed (optional):', muxError);
          // Continue anyway - video will be available but not processed
        }
      }

      // Redirect to home feed
      router.push('/');
    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to upload. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Upload Content - FeetSocial</title>
      </Head>
      
      <div className="min-h-screen bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h1 className="text-3xl font-bold text-white mb-6">Upload Content</h1>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Media
                </label>
                <Uploader
                  onUploadComplete={handleFileUpload}
                  onUploadError={handleFileError}
                  maxFiles={1}
                />
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                        <div className="flex items-center space-x-3">
                          {file.type.startsWith('image/') && (
                            <img src={file.url} alt={file.name} className="w-16 h-16 object-cover rounded" />
                          )}
                          <div>
                            <p className="text-white text-sm">{file.name}</p>
                            <p className="text-gray-400 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="text-red-500 hover:text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter a catchy title"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Describe your content..."
                />
              </div>

              {/* Tags */}
              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="feet, soles, toes"
                />
              </div>

              {/* Vault Settings */}
              <div className="border-t border-gray-700 pt-6">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="isVault"
                    checked={formData.isVault}
                    onChange={(e) => setFormData({ ...formData, isVault: e.target.checked })}
                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="isVault" className="ml-2 text-sm font-medium text-gray-300">
                    Make this paid vault content
                  </label>
                </div>

                {formData.isVault && (
                  <div>
                    <label htmlFor="vaultPrice" className="block text-sm font-medium text-gray-300 mb-2">
                      Price (USD)
                    </label>
                    <input
                      type="number"
                      id="vaultPrice"
                      value={formData.vaultPrice}
                      onChange={(e) => setFormData({ ...formData, vaultPrice: e.target.value })}
                      min="0.01"
                      step="0.01"
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="5.00"
                      required={formData.isVault}
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || uploadedFiles.length === 0}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

