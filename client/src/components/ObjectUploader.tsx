import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
    objectPath?: string;
  }>;
  onComplete?: (result: { successful: Array<{ uploadURL: string; name: string; objectPath: string }> }) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * A file upload component that renders as a button and provides a modal interface for
 * file management.
 * 
 * Features:
 * - Renders as a customizable button that opens a file upload modal
 * - Provides a modal interface for:
 *   - File selection
 *   - File preview
 *   - Upload progress tracking
 *   - Upload status display
 * 
 * The component uses Uppy under the hood to handle all file upload functionality.
 * All file management features are automatically handled by the Uppy dashboard modal.
 * 
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files allowed to be uploaded
 *   (default: 1)
 * @param props.maxFileSize - Maximum file size in bytes (default: 10MB)
 * @param props.onGetUploadParameters - Function to get upload parameters (method and URL).
 *   Typically used to fetch a presigned URL from the backend server for direct-to-S3
 *   uploads.
 * @param props.onComplete - Callback function called when upload is complete. Typically
 *   used to make post-upload API calls to update server state and set object ACL
 *   policies.
 * @param props.buttonClassName - Optional CSS class name for the button
 * @param props.children - Content to be rendered inside the button
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const successful: Array<{ uploadURL: string; name: string; objectPath: string }> = [];

    try {
      const fileArray = Array.from(files);
      for (let i = 0; i < Math.min(fileArray.length, maxNumberOfFiles); i++) {
        const file = fileArray[i];
        
        if (file.size > maxFileSize) {
          console.warn(`File ${file.name} is too large (${file.size} bytes)`);
          continue;
        }

        const uploadParams = await onGetUploadParameters();
        const { url, objectPath } = uploadParams;
        
        const response = await fetch(url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
        });

        if (response.ok) {
          successful.push({
            uploadURL: url.split('?')[0], // Remove query parameters to get clean URL
            name: file.name,
            objectPath: objectPath || url.split('?')[0], // Use objectPath if available, fallback to clean URL
          });
        }
      }

      onComplete?.({ successful });
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      await processFiles(files);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (files) {
      await processFiles(files);
    }
  };


  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        multiple={maxNumberOfFiles > 1}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        accept="*/*"
      />
      <div
        className={`cursor-pointer transition-colors ${
          isDragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted hover:border-primary'
        } ${buttonClassName || ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        {isUploading ? (
          <div className="flex items-center justify-center space-x-2 p-6">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>업로드 중...</span>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}