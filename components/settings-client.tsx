'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import type { HumanizeMode } from '@/types';
import { fetchHealth, type HealthStatus } from '@/utils/api';
import { clearHistory, clearLast, clearParsedDocument } from '@/utils/storage';
import { clearSourcePdf } from '@/utils/source-pdf-db';
import { cn } from '@/lib/cn';

const MODE_KEY = 'humanizer.defaultMode.v1';

export function SettingsClient() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [defaultMode, setDefaultMode] = useState<HumanizeMode>('conversational');

  useEffect(() => {
    const stored = window.localStorage.getItem(MODE_KEY);
    if (stored === 'formal' || stored === 'simple' || stored === 'conversational') {
      setDefaultMode(stored);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const status = await fetchHealth();
        setHealth(status);
      } catch {
        setHealth(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function saveMode(mode: HumanizeMode) {
    setDefaultMode(mode);
    window.localStorage.setItem(MODE_KEY, mode);
    toast.success('Default tone saved');
  }

  function onClearData() {
    clearHistory();
    clearLast();
    clearParsedDocument();
    void clearSourcePdf();
    toast.success('Local data cleared');
  }

  const apiOk = health?.huggingface.configured && health?.huggingface.reachable;

  return (
    <AppShell active="settings">
      <main className="flex-1 w-full min-w-0 max-w-[720px] mx-auto px-4 py-4 sm:px-6 sm:py-8 space-y-6">
        <div>
          <h1 className="font-h1 text-2xl sm:text-h1 text-on-surface mb-2">Settings</h1>
          <p className="text-sm text-on-surface-variant">API status, defaults, and local data.</p>
        </div>

        <section className="bg-surface-container rounded-xl border border-outline-variant p-4 sm:p-6 space-y-4">
          <h2 className="font-h2 text-h2 text-on-surface">API Status</h2>
          {loading ? (
            <p className="text-sm text-on-surface-variant">Checking…</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface-container-low border border-outline-variant">
                <span className="text-sm text-on-surface">Hugging Face</span>
                <span
                  className={cn(
                    'text-xs font-bold uppercase px-2 py-1 rounded border',
                    apiOk
                      ? 'text-tertiary border-tertiary/30'
                      : health?.huggingface.configured
                        ? 'text-tertiary border-tertiary/30'
                        : 'text-error border-error/30'
                  )}
                >
                  {!health?.huggingface.configured
                    ? 'Not configured'
                    : health.huggingface.reachable
                      ? 'Connected'
                      : 'Key set · unreachable'}
                </span>
              </div>
              {health && (
                <div className="text-xs text-on-surface-variant space-y-1">
                  <p>Detect: {health.models.detect}</p>
                  <p>Paraphrase: {health.models.paraphrase}</p>
                </div>
              )}
              {!health?.huggingface.configured && (
                <p className="text-sm text-on-surface-variant">
                  Add <code className="text-primary">HUGGINGFACE_API_KEY</code> to{' '}
                  <code className="text-primary">.env.local</code> and restart the dev server.
                </p>
              )}
            </div>
          )}
        </section>

        <section className="bg-surface-container rounded-xl border border-outline-variant p-4 sm:p-6 space-y-4">
          <h2 className="font-h2 text-h2 text-on-surface">Default Tone</h2>
          <div className="grid grid-cols-3 gap-2">
            {(['formal', 'simple', 'conversational'] as HumanizeMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => saveMode(m)}
                className={cn(
                  'px-2 py-2.5 rounded-xl text-xs sm:text-sm capitalize min-h-[44px] transition-colors',
                  m === defaultMode
                    ? 'bg-indigo-500/10 border border-indigo-500/40 text-indigo-300'
                    : 'bg-surface-container-low border border-outline-variant text-on-surface-variant hover:border-outline'
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-surface-container rounded-xl border border-outline-variant p-4 sm:p-6 space-y-4">
          <h2 className="font-h2 text-h2 text-on-surface">Local Data</h2>
          <p className="text-sm text-on-surface-variant">
            Clears history, last session, and the cached parsed document from this browser.
          </p>
          <Button variant="outline" onClick={onClearData} className="min-h-[44px]">
            <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
            Clear local data
          </Button>
        </section>
      </main>
    </AppShell>
  );
}
