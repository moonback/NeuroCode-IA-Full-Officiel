import React, { useEffect, useState } from 'react';
/*
 * Import with @vite-ignore to prevent build issues
 */
// @ts-ignore - Importing PDF.js dynamically to work around Vite build issues
import { getDocument } from 'pdfjs-dist'; /* @vite-ignore */
// @ts-ignore - Importing PDF.js dynamically to work around Vite build issues
import { GlobalWorkerOptions } from 'pdfjs-dist'; /* @vite-ignore */

// Configure PDF.js worker dynamically based on environment
if (typeof window !== 'undefined' && !GlobalWorkerOptions.workerSrc) {
  // Running in browser - use dynamic import with vite-ignore
  try {
    // @ts-ignore - Using URL with import.meta is necessary but confuses TypeScript during build
    const pdfjsWorkerUrl = /* @vite-ignore */ new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;
    GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
  } catch (e) {
    // Fallback for environments where import.meta.url might not work
    console.warn('Failed to load PDF.js worker via URL, using CDN fallback', e);
    GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.js';
  }
}

interface FilePreviewProps {
  files: File[];
  imageDataList: string[];
  onRemove: (index: number) => void;
}

interface PDFThumbnailData {
  dataUrl: string;
  pageCount: number;
}

const FilePreview: React.FC<FilePreviewProps> = ({ files, imageDataList, onRemove }) => {
  const [pdfThumbnails, setPdfThumbnails] = useState<Record<string, PDFThumbnailData>>({});

  useEffect(() => {
    // Process PDF thumbnails
    const processPdfThumbnails = async () => {
      for (const file of files) {
        // Check if it's a PDF and doesn't have a thumbnail yet
        if (
          (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) &&
          !pdfThumbnails[file.name + file.lastModified]
        ) {
          try {
            // Load the PDF and generate thumbnail of the first page
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            const pageCount = pdf.numPages;

            // Render the first page as thumbnail
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.5 });

            // Create canvas for the thumbnail
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
              // Render page on canvas
              await page.render({
                canvasContext: context,
                viewport,
              }).promise;

              // Convert to dataURL
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

              // Save thumbnail
              setPdfThumbnails((prev) => ({
                ...prev,
                [file.name + file.lastModified]: {
                  dataUrl,
                  pageCount,
                },
              }));
            }
          } catch (error) {
            console.error('Error generating PDF thumbnail:', error);
          }
        }
      }
    };

    processPdfThumbnails();
  }, [files, pdfThumbnails]);

  if (!files || files.length === 0) {
    return null;
  }

  // Function to get the icon based on file type
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return 'i-ph:image';
    }

    const fileName = fileType.toLowerCase();

    if (fileName.includes('pdf') || fileName.endsWith('.pdf')) {
      return 'i-ph:file-pdf';
    }

    if (fileName.includes('docx') || fileName.endsWith('.docx')) {
      return 'i-ph:file-doc';
    }

    if (fileName.includes('text') || fileName.includes('txt') || fileName.endsWith('.txt')) {
      return 'i-ph:file-text';
    }

    if (fileName.endsWith('.md')) {
      return 'i-ph:file-text';
    }

    return 'i-ph:file-text';
  };

  // Function to check if a file is a PDF
  const isPdf = (file: File) => {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  };

  // Function to get a PDF thumbnail
  const getPdfThumbnail = (file: File) => {
    const key = file.name + file.lastModified;
    return pdfThumbnails[key];
  };

  return (
    <div className="flex flex-wrap overflow-x-auto -mt-2 gap-2">
      {files.map((file, index) => (
        <div key={file.name + file.size} className="relative mb-4">
          <div className="relative pt-4 pr-4">
            {imageDataList[index] === 'loading-image' ? (
              // Renders loading indicator for images in process
              <div className="flex flex-col items-center justify-center bg-bolt-elements-background-depth-3 rounded-md p-2 min-w-[100px] h-[80px]">
                <div className="i-svg-spinners:90-ring-with-bg text-bolt-elements-loader-progress text-xl animate-spin"></div>
                <div className="text-xs text-bolt-elements-textSecondary mt-1">Chargement...</div>
              </div>
            ) : imageDataList[index] && imageDataList[index] !== 'non-image' ? (
              // Renders image for already loaded image types
              <div className="flex flex-col gap-1">
                <img src={imageDataList[index]} alt={file.name} className="max-h-20" />
                <div className="text-xs text-bolt-elements-textSecondary text-center truncate">{file.name}</div>
              </div>
            ) : isPdf(file) && getPdfThumbnail(file) ? (
              // Renders PDF thumbnail
              <div className="flex flex-col items-center justify-center bg-bolt-elements-background-depth-3 rounded-md p-2 min-w-[100px]">
                <div className="relative">
                  <img
                    src={getPdfThumbnail(file)?.dataUrl}
                    alt={`${file.name} (page 1)`}
                    className="max-h-20 border border-gray-700 rounded"
                  />
                  <div className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-xs px-1 rounded-tl">
                    {getPdfThumbnail(file)?.pageCount || '?'} pages
                  </div>
                </div>
                <div className="text-xs text-bolt-elements-textSecondary mt-1 max-w-[100px] truncate">{file.name}</div>
                <div className="text-xs text-bolt-elements-textTertiary">{(file.size / 1024).toFixed(0)} KB</div>
              </div>
            ) : (
              // Renders icon for other file types
              <div className="flex flex-col items-center justify-center bg-bolt-elements-background-depth-3 rounded-md p-2 min-w-[100px] h-[80px]">
                <div className={`${getFileIcon(file.type)} w-6 h-6 text-bolt-elements-textSecondary`} />
                <div className="text-xs text-bolt-elements-textSecondary mt-1 max-w-[100px] truncate">{file.name}</div>
                <div className="text-xs text-bolt-elements-textTertiary">{(file.size / 1024).toFixed(0)} KB</div>
              </div>
            )}
            <button
              onClick={() => onRemove(index)}
              className="absolute top-1 right-1 z-10 bg-black rounded-full w-5 h-5 shadow-md hover:bg-gray-900 transition-colors flex items-center justify-center"
            >
              <div className="i-ph:x w-3 h-3 text-gray-200" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FilePreview;