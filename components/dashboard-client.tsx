'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { AppShell } from '@/components/app-shell';
import { RecentActivity } from '@/components/recent-activity';
import { UploadDropzone } from '@/components/upload-dropzone';
import { uploadFiles } from '@/utils/api';
import { loadHistory, saveLast } from '@/utils/storage';
import type { HistoryItem } from '@/types';

export function DashboardClient() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState<Array<{ filename: string; preview: string }>>([]);

  const history = useMemo<HistoryItem[]>(() => loadHistory(), []);

  return (
    <AppShell active="dashboard">
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-container-max mx-auto space-y-8">
        <header className="mb-8">
          <h2 className="font-h1 text-h1 text-on-surface mb-2">Welcome back.</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Ready to refine some text today?
          </p>
        </header>

        <UploadDropzone
          onFiles={async (files) => {
            try {
              setBusy(true);
              const t = toast.loading('Extracting text...');
              const extracted = await uploadFiles(files);
              toast.dismiss(t);

              const first = extracted[0];
              const combined = extracted.map((x) => x.text).filter(Boolean).join('\n\n');
              if (!combined.trim()) {
                toast.error('No extractable text found in uploaded files');
                return;
              }

              setUploaded(
                extracted.map((x) => ({
                  filename: x.filename,
                  preview: x.text.slice(0, 180)
                }))
              );

              saveLast({
                filename:
                  extracted.length === 1 ? first.filename : `${first.filename} (+${extracted.length - 1})`,
                mode: 'conversational',
                originalText: combined,
                humanizedText: '',
                detect: undefined
              });

              toast.success('Text extracted. Opening Humanizer...');
              router.push('/process');
            } catch (e: any) {
              toast.error(e?.message || 'Upload failed');
            } finally {
              setBusy(false);
            }
          }}
        />

        {uploaded.length > 0 && (
          <section className="bg-surface-container rounded-xl border border-outline-variant p-6 shadow-[0_4px_10px_rgba(0,0,0,0.2)]">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-tertiary">description</span>
                <h3 className="font-label-sm text-label-sm text-on-surface">Uploaded Files</h3>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {uploaded.length} file(s)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uploaded.map((f) => (
                <div
                  key={f.filename}
                  className="bg-surface-container-low rounded-lg border border-outline-variant p-4"
                >
                  <div className="font-label-sm text-label-sm text-on-surface mb-2 truncate">
                    {f.filename}
                  </div>
                  <div className="text-xs text-on-surface-variant leading-relaxed max-h-16 overflow-hidden">
                    {f.preview || '—'}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section
          className="bg-surface-container rounded-xl border border-outline-variant p-6 shadow-[0_4px_10px_rgba(0,0,0,0.2)]"
          aria-busy={busy}
        >
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-tertiary">autorenew</span>
              <h3 className="font-label-sm text-label-sm text-on-surface">Processing</h3>
            </div>
            <span className="font-label-sm text-label-sm text-tertiary">{busy ? 'Working…' : 'Idle'}</span>
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
