'use client';

import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { cn } from '@/lib/cn';

export function UploadDropzone({
  onFiles
}: {
  onFiles: (files: File[]) => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const pick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      const files = Array.from(fileList || []);
      if (!files.length) return;

      const allowed = new Set(['pdf', 'docx', 'txt', 'md']);
      const invalid = files.find((f) => !allowed.has(f.name.split('.').pop()?.toLowerCase() || ''));
      if (invalid) {
        toast.error(`Unsupported file: ${invalid.name}`);
        return;
      }

      await onFiles(files);
    },
    [onFiles]
  );

  return (
    <section className="bg-surface-container rounded-xl border border-outline-variant p-4 sm:p-8 shadow-[0_4px_10px_rgba(0,0,0,0.2)] backdrop-blur-md relative overflow-hidden group hover:border-primary transition-colors duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-50 z-0 pointer-events-none" />

      <div
        className={cn(
          'relative z-10 flex flex-col items-center justify-center text-center p-6 sm:p-12 border-2 border-dashed rounded-lg transition-all duration-300',
          dragOver
            ? 'border-primary/60 bg-primary/5 shadow-[0_0_30px_rgba(192,193,255,0.25)]'
            : 'border-outline-variant bg-surface-container-low group-hover:bg-primary/5 group-hover:border-primary/50'
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
        }}
        onDrop={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          await handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(192,193,255,0.15)] group-hover:shadow-[0_0_30px_rgba(192,193,255,0.3)] transition-shadow">
          <span className="material-symbols-outlined text-4xl text-primary">cloud_upload</span>
        </div>
        <h3 className="font-h2 text-h2 text-on-surface mb-2">Drag & Drop your text file here</h3>
        <p className="font-body-md text-body-md text-on-surface-variant mb-6 max-w-md">
          Or browse your device to upload. Supported formats: .txt, .docx, .pdf, .md up to 50MB.
        </p>
        <button
          type="button"
          onClick={pick}
          className="bg-surface-bright text-on-surface font-label-sm text-label-sm py-2 px-6 rounded-full border border-outline-variant hover:border-primary hover:text-primary transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">folder_open</span>
          Browse Files
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.md,.docx,.pdf"
          multiple
          className="hidden"
          onChange={async (e) => {
            const input = e.currentTarget;
            const files = input.files;
            await handleFiles(files);
            if (input) input.value = '';
          }}
        />
      </div>
    </section>
  );
}
