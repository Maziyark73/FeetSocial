import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { UploadFileResponse } from '@uploadthing/react';
import { formatFileSize, isImageFile, isVideoFile } from '../utils/helpers';
import { supabase } from '../lib/supabase';

interface UploaderProps {
  onUploadComplete: (files: UploadFileResponse[]) => void;
  onUploadError: (error: Error) => void;
  maxFiles?: number;
  maxSize?: number;
  acceptedFileTypes?: string[];
  disabled?: boolean;
}

export default function Uploader({
  onUploadComplete,
  onUploadError,
  maxFiles = 1,
  maxSize = 100 * 1024 * 1024, // 100MB
  acceptedFileTypes = ['image/*', 'video/*'],
  disabled = false,
}: UploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled || uploading) return;

      setUploading(true);
      setUploadProgress(0);

      try {
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);

        // Use Supabase Storage for file upload
        const uploadPromises = acceptedFiles.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
          const filePath = `uploads/${fileName}`;

          const { data, error } = await supabase.storage
            .from('media')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (error) {
            throw error;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('media')
            .getPublicUrl(filePath);

          return {
            url: publicUrl,
            name: file.name,
            size: file.size,
            type: file.type,
            key: filePath,
          } as UploadFileResponse;
        });

        const results = await Promise.all(uploadPromises);
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        setTimeout(() => {
          onUploadComplete(results);
          setUploading(false);
          setUploadProgress(0);
        }, 500);
      } catch (error) {
        console.error('Upload error:', error);
        onUploadError(error as Error);
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [onUploadComplete, onUploadError, disabled, uploading]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept: acceptedFileTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    disabled: disabled || uploading,
  });

  const fileRejectionErrors = fileRejections.map(({ file, errors }) => ({
    file: file.name,
    errors: errors.map(e => e.message),
  }));

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-purple-400 bg-purple-50/10' 
            : 'border-gray-600 hover:border-purple-400 hover:bg-gray-800/20'
          }
          ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div className="space-y-4">
            <div className="mx-auto h-12 w-12 text-purple-400">
              <svg className="animate-spin h-full w-full" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">Uploading...</p>
              <div className="mt-2 bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-400 mt-1">{uploadProgress}%</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg
                className="mx-auto h-full w-full"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">
                {isDragActive ? 'Drop files here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Images and videos up to {formatFileSize(maxSize)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, GIF, MP4, MOV, AVI, MKV, WEBM
              </p>
            </div>
          </div>
        )}
      </div>

      {fileRejectionErrors.length > 0 && (
        <div className="mt-4 space-y-2">
          {fileRejectionErrors.map((rejection, index) => (
            <div key={index} className="bg-red-900/50 border border-red-700 rounded-md p-3">
              <p className="text-red-200 font-medium text-sm">{rejection.file}</p>
              <ul className="text-red-300 text-xs mt-1 space-y-1">
                {rejection.errors.map((error, errorIndex) => (
                  <li key={errorIndex}>• {error}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Preview component for uploaded files
interface FilePreviewProps {
  files: UploadFileResponse[];
  onRemove: (index: number) => void;
}

export function FilePreview({ files, onRemove }: FilePreviewProps) {
  return (
    <div className="space-y-4">
      {files.map((file, index) => (
        <div key={index} className="relative bg-gray-800 rounded-lg p-4">
          <button
            onClick={() => onRemove(index)}
            className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 rounded-full text-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex items-center space-x-3">
            {isImageFile(file.name) ? (
              <img
                src={file.url}
                alt={file.name}
                className="w-16 h-16 object-cover rounded-lg"
              />
            ) : isVideoFile(file.name) ? (
              <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            ) : (
              <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{file.name}</p>
              <p className="text-gray-400 text-sm">{formatFileSize(file.size)}</p>
              {isVideoFile(file.name) && (
                <p className="text-purple-400 text-xs">Video processing...</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

