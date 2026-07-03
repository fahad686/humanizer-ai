'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { AppShell } from '@/components/app-shell';
import { DocumentStructurePreview } from '@/components/document-structure-preview';
import { RecentActivity } from '@/components/recent-activity';
import { UploadDropzone } from '@/components/upload-dropzone';
import { uploadFiles } from '@/utils/api';
import { loadHistory, saveLast, saveParsedDocument } from '@/utils/storage';
import { saveSourcePdf } from '@/utils/source-pdf-db';
import type { HistoryItem } from '@/types';
import type { ParsedDocument } from '@/types/document';

export function DashboardClient() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [parsedDocument, setParsedDocument] = useState<ParsedDocument | null>(null);

  const history = useMemo<HistoryItem[]>(() => loadHistory(), []);

  return (
    <AppShell active="dashboard">
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto w-full max-w-container-max mx-auto space-y-6 sm:space-y-8">
        <header>
          <h2 className="font-h1 text-2xl sm:text-h1 text-on-surface mb-2">Welcome back.</h2>
          <p className="font-body-lg text-sm sm:text-body-lg text-on-surface-variant">
            Upload a book or document — we preserve structure, images, and layout metadata.
          </p>
        </header>

        <UploadDropzone
          onFiles={async (files) => {
            try {
              setBusy(true);
              const t = toast.loading('Parsing document structure...');
              const { document } = await uploadFiles(files);
              toast.dismiss(t);

              if (!document.plainText.trim() && document.metadata.imageCount === 0) {
                toast.error('No extractable content found in uploaded files');
                return;
              }

              setParsedDocument(document);

              if (files[0]?.name.toLowerCase().endsWith('.pdf')) {
                await saveSourcePdf(files[0]);
              }

              saveParsedDocument(document);
              saveLast({
                filename: document.filename,
                mode: 'conversational',
                originalText: document.plainText,
                humanizedText: '',
                detect: undefined,
                document
              });

              toast.success(
                `Parsed ${document.blocks.length} blocks · ${document.metadata.imageCount} images · ${document.pageCount} pages`
              );
              router.push('/process');
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : 'Upload failed';
              toast.error(message);
            } finally {
              setBusy(false);
            }
          }}
        />

        {parsedDocument && <DocumentStructurePreview document={parsedDocument} />}

        <section
          className="bg-surface-container rounded-xl border border-outline-variant p-6 shadow-[0_4px_10px_rgba(0,0,0,0.2)]"
          aria-busy={busy}
        >
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-tertiary">autorenew</span>
              <h3 className="font-label-sm text-label-sm text-on-surface">Processing</h3>
            </div>
            <span className="font-label-sm text-label-sm text-tertiary">{busy ? 'Parsing…' : 'Idle'}</span>
          </div>
          <div className="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all"
              style={{ width: busy ? '65%' : '0%' }}
            />
          </div>
        </section>

        <RecentActivity items={history} />

        <section id="history" className="bg-surface-container rounded-xl border border-outline-variant p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-h2 text-h2 text-on-surface">History</h3>
            <a className="text-primary hover:text-inverse-primary font-label-sm text-label-sm" href="/process">
              Open Humanizer
            </a>
          </div>
          <div className="text-sm text-on-surface-variant">
            Your last results are saved locally in your browser.
          </div>
        </section>

        <section id="settings" className="bg-surface-container rounded-xl border border-outline-variant p-6">
          <h3 className="font-h2 text-h2 text-on-surface mb-2">Settings</h3>
          <div className="text-sm text-on-surface-variant">
            Add your HuggingFace key in <span className="text-on-surface">.env.local</span> before running.
          </div>
        </section>
      </main>
    </AppShell>
  );
}
