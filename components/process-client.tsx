'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';

import type { DetectResult, HistoryItem, HumanizeMode } from '@/types';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { detectText, processText } from '@/utils/api';
import { renderDiffHumanized, renderDiffOriginal } from '@/utils/diff';
import { loadHistory, loadLast, pushHistory, saveLast } from '@/utils/storage';
import { BarCard, RingGauge } from '@/components/score-widgets';

function id() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function readabilityDelta(original: string, humanized: string) {
  const o = original.split(/\s+/).filter(Boolean).length;
  const h = humanized.split(/\s+/).filter(Boolean).length;
  if (!o || !h) return 0;

  const ratio = h / o;
  const delta = clamp((1 - ratio) * 100, -60, 60);
  return Math.round(Math.abs(delta));
}

function downloadTxt(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadPdf(filename: string, text: string) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, margin, margin);
  doc.save(filename);
}

export function ProcessClient() {
  const router = useRouter();
  const params = useSearchParams();
  const hid = params.get('hid');

  const [filename, setFilename] = useState('pasted_text.txt');
  const [mode, setMode] = useState<HumanizeMode>('conversational');
  const [originalText, setOriginalText] = useState('');
  const [humanizedText, setHumanizedText] = useState('');
  const [detectOriginal, setDetectOriginal] = useState<DetectResult | null>(null);
  const [detectHumanized, setDetectHumanized] = useState<DetectResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hid) {
      const item = loadHistory().find((x) => x.id === hid);
      if (item) {
        setFilename(item.filename || 'pasted_text.txt');
        setMode(item.mode);
        setOriginalText(item.originalText);
        setHumanizedText(item.humanizedText);
        setDetectHumanized(item.detect ?? null);
        return;
      }
    }

    const last = loadLast();
    if (last) {
      setFilename(last.filename || 'pasted_text.txt');
      setMode(last.mode);
      setOriginalText(last.originalText);
      setHumanizedText(last.humanizedText);
      setDetectHumanized(last.detect ?? null);
    }
  }, [hid]);

  const widgets = useMemo(() => {
    const humanConfidence = detectHumanized?.score ?? 0;
    const originalRisk = detectOriginal ? 100 - detectOriginal.score : 0;
    const improvement = humanizedText ? readabilityDelta(originalText, humanizedText) : 0;
    return { humanConfidence, originalRisk, improvement };
  }, [detectHumanized, detectOriginal, humanizedText, originalText]);

  async function runDetects(oText: string, hText: string) {
    const [o, h] = await Promise.all([detectText(oText), detectText(hText)]);
    setDetectOriginal(o);
    setDetectHumanized(h);
    return { original: o, humanized: h };
  }

  async function onHumanize() {
    if (!originalText.trim()) {
      toast.error('Add some text first');
      return;
    }

    try {
      setBusy(true);
      const t = toast.loading('Humanizing...');
      const res = await processText(originalText, mode);
      toast.dismiss(t);
      setHumanizedText(res.humanizedText);

      const dt = toast.loading('Estimating AI detection...');
      const detects = await runDetects(originalText, res.humanizedText);
      toast.dismiss(dt);

      const item: HistoryItem = {
        id: id(),
        createdAt: Date.now(),
        filename,
        mode,
        originalText,
        humanizedText: res.humanizedText,
        detect: detects.humanized
      };

      pushHistory(item);
      saveLast({
        filename,
        mode,
        originalText,
        humanizedText: res.humanizedText,
        detect: detects.humanized
      });

      toast.success('Done');
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!humanizedText) return;
    await navigator.clipboard.writeText(humanizedText);
    toast.success('Copied');
  }

  return (
    <AppShell active="humanizer">
      <main className="flex-1 md:ml-64 pt-0 p-4 md:p-8 lg:p-12 max-w-[1280px] mx-auto w-full">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-h1 text-h1 text-on-surface mb-2">Analysis Results</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Review the structural changes and detection scores.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setHumanizedText('');
                setDetectHumanized(null);
                setDetectOriginal(null);
                toast.success('Reset');
              }}
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Reset
            </Button>
            <Button
              onClick={() => {
                if (!humanizedText) {
                  toast.error('Nothing to download');
                  return;
                }
                downloadTxt('humanized.txt', humanizedText);
              }}
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Download
            </Button>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">
                Original Text
              </label>
              <textarea
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                placeholder="Paste your text here or upload from Dashboard."
                className="w-full min-h-[180px] resize-y rounded-xl bg-surface-container-low border border-outline-variant px-4 py-3 text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">Mode</label>
              <div className="grid grid-cols-1 gap-2">
                {(['formal', 'simple', 'conversational'] as HumanizeMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={
                      m === mode
                        ? 'px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/40 text-indigo-300 text-left'
                        : 'px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface-variant text-left hover:border-outline'
                    }
                  >
                    <div className="font-label-sm text-label-sm capitalize">{m}</div>
                    <div className="text-xs mt-1 opacity-80">
                      {m === 'formal'
                        ? 'Professional tone'
                        : m === 'simple'
                          ? 'Simpler sentences'
                          : 'Natural & friendly'}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <Button disabled={busy} onClick={onHumanize} className="w-full">
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    auto_awesome
                  </span>
                  {busy ? 'Working…' : 'Humanize'}
                </Button>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="w-full mt-2 px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors font-label-sm text-label-sm"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <RingGauge score={widgets.humanConfidence} />
          <BarCard title="Original AI Risk" value={widgets.originalRisk} color="error" />
          <BarCard title="Readability Improvement" value={widgets.improvement} color="tertiary" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:h-[600px]">
          <div className="glass-panel rounded-xl flex flex-col overflow-hidden border border-slate-800/50">
            <div className="bg-surface-container-low px-4 py-3 border-b border-slate-800/50 flex justify-between items-center">
              <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">description</span>
                Original Text
              </span>
              <span className="px-2 py-1 rounded bg-error-container/20 text-error text-[11px] font-bold tracking-wider uppercase border border-error/30">
                {detectOriginal?.label === 'Human' ? 'LOW RISK' : 'AI DETECTED'}
              </span>
            </div>
            <div className="p-6 overflow-y-auto font-body-md text-body-md text-on-surface-variant leading-relaxed whitespace-pre-wrap min-h-[280px] lg:min-h-0">
              {humanizedText ? renderDiffOriginal(originalText, humanizedText) : originalText || '—'}
            </div>
          </div>

          <div className="bg-surface-container-low rounded-xl flex flex-col overflow-hidden glow-border relative">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-50" />
            <div className="px-4 py-3 border-b border-primary/20 flex justify-between items-center bg-surface-container/50">
              <span className="font-label-sm text-label-sm text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  auto_awesome
                </span>
                Humanized Output
              </span>
              <span className="px-2 py-1 rounded bg-primary/10 text-primary text-[11px] font-bold tracking-wider uppercase border border-primary/30">
                {detectHumanized?.label
                  ? detectHumanized.label === 'Human'
                    ? 'HUMAN-LIKE'
                    : detectHumanized.label.toUpperCase()
                  : '—'}
              </span>
            </div>
            <div className="p-6 overflow-y-auto font-body-md text-body-md text-on-surface leading-relaxed whitespace-pre-wrap min-h-[280px] lg:min-h-0">
              {humanizedText
                ? renderDiffHumanized(originalText, humanizedText)
                : 'Humanized text will appear here.'}
            </div>
            <div className="mt-auto p-4 border-t border-slate-800/50 bg-surface-container-highest/50 flex justify-end gap-2">
              <button
                className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors"
                title="Copy to clipboard"
                onClick={copy}
                disabled={!humanizedText}
              >
                <span className="material-symbols-outlined text-[20px]">content_copy</span>
              </button>
              <button
                className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors"
                title="Export PDF"
                onClick={() => {
                  if (!humanizedText) {
                    toast.error('Nothing to export');
                    return;
                  }
                  downloadPdf('humanized.pdf', humanizedText);
                }}
                disabled={!humanizedText}
              >
                <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
