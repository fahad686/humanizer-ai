'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import type { DetectResult, DocumentDetectResult, HistoryItem, HumanizeMode } from '@/types';
import type { ParsedDocument } from '@/types/document';
import { AppShell } from '@/components/app-shell';
import { AiDetectionPanel } from '@/components/ai-detection-panel';
import { BlockSelector } from '@/components/block-selector';
import { DocumentStructurePreview } from '@/components/document-structure-preview';
import { WorkflowStepper } from '@/components/mobile-nav';
import { HumanizeActionsPanel } from '@/components/humanize-actions-panel';
import { ResultsSummaryPanel } from '@/components/results-summary-panel';
import { Button } from '@/components/ui/button';
import { defaultHumanizeBlockIds } from '@/lib/block-selection';
import { blocksToReadableText } from '@/lib/document-utils';
import { detectDocument, detectText, exportDocumentFile, humanizeDocument, processText } from '@/utils/api';
import { loadSourcePdfBase64 } from '@/utils/source-pdf-db';
import { renderDiffHumanized, renderDiffOriginal } from '@/utils/diff';
import { loadHistory, loadLast, loadParsedDocument, pushHistory, saveLast } from '@/utils/storage';
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
  const [detectBusy, setDetectBusy] = useState(false);
  const [parsedDocument, setParsedDocument] = useState<ParsedDocument | null>(null);
  const [humanizedDocument, setHumanizedDocument] = useState<ParsedDocument | null>(null);
  const [documentDetection, setDocumentDetection] = useState<DocumentDetectResult | null>(null);
  const [detectionBefore, setDetectionBefore] = useState<DocumentDetectResult | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [showDiff, setShowDiff] = useState(false);
  const [showPasteText, setShowPasteText] = useState(false);
  const autoAnalyzedRef = useRef<string | null>(null);

  const runDocumentDetection = useCallback(async (doc: ParsedDocument) => {
    try {
      setDetectBusy(true);
      const t = toast.loading('Analyzing AI content per block...');
      const result = await detectDocument(doc);
      toast.dismiss(t);
      setDocumentDetection(result);
      setDetectOriginal({
        score: result.humanContentPercent,
        label: result.overall.label,
        details: result.overall.details
      });
      saveLast({
        filename: doc.filename,
        mode,
        originalText: doc.plainText,
        humanizedText,
        detect: {
          score: result.humanContentPercent,
          label: result.overall.label,
          details: result.overall.details
        },
        document: doc,
        documentDetection: result
      });
      toast.success(`${result.aiContentPercent}% AI content detected`);
      return result;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Analysis failed';
      toast.error(message);
      return null;
    } finally {
      setDetectBusy(false);
    }
  }, [humanizedText, mode]);

  useEffect(() => {
    if (hid) {
      const item = loadHistory().find((x) => x.id === hid);
      if (item) {
        setFilename(item.filename || 'pasted_text.txt');
        setMode(item.mode);
        setOriginalText(item.originalText);
        setHumanizedText(item.humanizedText);
        setDetectHumanized(item.detect ?? null);
        setParsedDocument(item.document ?? null);
        setHumanizedDocument(item.humanizedDocument ?? null);
        setDocumentDetection(item.documentDetection ?? null);
        setDetectionBefore(item.detectionBefore ?? null);
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
      setParsedDocument(last.document ?? loadParsedDocument());
      setHumanizedDocument(last.humanizedDocument ?? null);
      setDocumentDetection(last.documentDetection ?? null);
      setDetectionBefore(last.detectionBefore ?? null);
      if (last.documentDetection) {
        setDetectOriginal({
          score: last.documentDetection.humanContentPercent,
          label: last.documentDetection.overall.label,
          details: last.documentDetection.overall.details
        });
      }
      return;
    }

    setParsedDocument(loadParsedDocument());
  }, [hid]);

  useEffect(() => {
    if (!parsedDocument) return;
    if (documentDetection) return;
    if (autoAnalyzedRef.current === parsedDocument.filename) return;
    autoAnalyzedRef.current = parsedDocument.filename;
    void runDocumentDetection(parsedDocument);
  }, [parsedDocument, documentDetection, runDocumentDetection]);

  useEffect(() => {
    if (!documentDetection || humanizedDocument) return;
    setSelectedBlockIds(new Set(defaultHumanizeBlockIds(documentDetection)));
  }, [documentDetection, humanizedDocument]);

  const workflowStep = useMemo(() => {
    if (!parsedDocument) return 'upload' as const;
    if (!documentDetection) return 'analyze' as const;
    if (!humanizedDocument) return 'humanize' as const;
    return 'export' as const;
  }, [parsedDocument, documentDetection, humanizedDocument]);

  const originalForCompare = useMemo(
    () =>
      parsedDocument
        ? blocksToReadableText(parsedDocument.blocks)
        : originalText,
    [parsedDocument, originalText]
  );

  const humanizedForCompare = useMemo(
    () =>
      humanizedDocument
        ? blocksToReadableText(humanizedDocument.blocks)
        : humanizedText,
    [humanizedDocument, humanizedText]
  );

  const originalAiPercent =
    detectionBefore?.aiContentPercent ?? documentDetection?.aiContentPercent ?? null;

  const textsUnchanged =
    Boolean(humanizedForCompare) &&
    Boolean(originalForCompare) &&
    originalForCompare.trim() === humanizedForCompare.trim();

  const showMobileCta =
    Boolean(parsedDocument) && Boolean(documentDetection) && !humanizedDocument && !busy;

  const widgets = useMemo(() => {
    const humanConfidence = detectHumanized?.score ?? 0;
    const originalRisk = detectionBefore
      ? detectionBefore.aiContentPercent
      : documentDetection
        ? documentDetection.aiContentPercent
        : detectOriginal
          ? 100 - detectOriginal.score
          : 0;
    const improvement = humanizedForCompare
      ? readabilityDelta(originalForCompare, humanizedForCompare)
      : 0;
    return { humanConfidence, originalRisk, improvement };
  }, [detectHumanized, detectOriginal, detectionBefore, documentDetection, humanizedForCompare, originalForCompare]);

  async function runDetects(oText: string, hText: string) {
    const [o, h] = await Promise.all([detectText(oText), detectText(hText)]);
    setDetectOriginal(o);
    setDetectHumanized(h);
    return { original: o, humanized: h };
  }

  async function onHumanizeAiBlocks() {
    if (!parsedDocument || !documentDetection) {
      toast.error('Run AI analysis first');
      return;
    }

    if (selectedBlockIds.size === 0) {
      toast.error('Select at least one block to humanize');
      return;
    }

    const beforeSnapshot = documentDetection;

    try {
      setBusy(true);
      const t = toast.loading(`Humanizing ${selectedBlockIds.size} selected blocks...`);
      const result = await humanizeDocument({
        document: parsedDocument,
        detection: documentDetection,
        mode,
        blockIds: Array.from(selectedBlockIds)
      });
      toast.dismiss(t);

      setDetectionBefore(beforeSnapshot);
      setHumanizedDocument(result.document);
      setOriginalText(parsedDocument.plainText);
      setHumanizedText(result.plainText);

      const dt = toast.loading('Re-analyzing humanized document...');
      const newDetection = await detectDocument(result.document);
      toast.dismiss(dt);
      setDocumentDetection(newDetection);
      setDetectOriginal({
        score: beforeSnapshot.humanContentPercent,
        label: beforeSnapshot.overall.label,
        details: beforeSnapshot.overall.details
      });
      setDetectHumanized({
        score: newDetection.humanContentPercent,
        label: newDetection.overall.label,
        details: newDetection.overall.details
      });

      saveLast({
        filename: parsedDocument.filename,
        mode,
        originalText: parsedDocument.plainText,
        humanizedText: result.plainText,
        detect: {
          score: newDetection.humanContentPercent,
          label: newDetection.overall.label,
          details: newDetection.overall.details
        },
        document: parsedDocument,
        humanizedDocument: result.document,
        documentDetection: newDetection,
        detectionBefore: beforeSnapshot
      });

      toast.success(
        `Humanized ${result.humanizedBlockCount} blocks · preserved ${result.preservedBlockCount}` +
          (result.failedBlockCount ? ` · ${result.failedBlockCount} failed` : '')
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Humanization failed';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function onExport(format: 'docx' | 'pdf' | 'txt') {
    const doc = humanizedDocument ?? parsedDocument;
    if (!doc) {
      toast.error('No document to export');
      return;
    }

    try {
      setBusy(true);
      const t = toast.loading(`Exporting ${format.toUpperCase()}...`);
      try {
        const sourcePdfBase64 =
          format === 'pdf' && doc.format === 'pdf' && !doc.sourcePdfKey
            ? await loadSourcePdfBase64()
            : null;
        const blob = await exportDocumentFile(doc, format, {
          sourcePdfBase64,
          pdfLayout: 'pagewise'
        });
        const base = doc.filename.replace(/\.[^.]+$/, '') || 'document';
        downloadBlob(blob, `${base}_humanized.${format}`);
        toast.success(
          format === 'pdf' && doc.format === 'pdf'
            ? 'Download started · clean page-wise PDF'
            : 'Download started'
        );
      } finally {
        toast.dismiss(t);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Export failed';
      toast.error(message);
    } finally {
      setBusy(false);
    }
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
        detect: detects.humanized,
        document: parsedDocument ?? undefined,
        humanizedDocument: humanizedDocument ?? undefined,
        documentDetection: documentDetection ?? undefined
      };

      pushHistory(item);
      saveLast({
        filename,
        mode,
        originalText,
        humanizedText: res.humanizedText,
        detect: detects.humanized,
        document: parsedDocument ?? undefined,
        humanizedDocument: humanizedDocument ?? undefined,
        documentDetection: documentDetection ?? undefined
      });

      toast.success('Done');
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    const text = humanizedDocument?.plainText ?? humanizedText;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast.success('Copied');
  }

  return (
    <AppShell active="humanizer">
      <main
        className={`flex-1 w-full min-w-0 max-w-[1280px] mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 space-y-4 sm:space-y-6 ${showMobileCta ? 'pb-24 md:pb-8' : ''}`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-h1 text-2xl sm:text-h1 text-on-surface mb-1 sm:mb-2">Analysis Results</h1>
            <p className="font-body-md text-sm sm:text-body-md text-on-surface-variant">
              {parsedDocument
                ? 'Analyze AI content, humanize flagged blocks, then export.'
                : 'Upload a document or paste text to begin.'}
            </p>
          </div>
          {humanizedForCompare && (
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setHumanizedText('');
                  setHumanizedDocument(null);
                  setDetectHumanized(null);
                  if (detectionBefore) {
                    setDocumentDetection(detectionBefore);
                    setDetectionBefore(null);
                  }
                  setShowDiff(false);
                  toast.success('Reset');
                }}
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Reset
              </Button>
            </div>
          )}
        </div>

        {parsedDocument && (
          <div className="bg-surface-container-low rounded-xl border border-outline-variant p-3 sm:p-4 overflow-x-auto">
            <WorkflowStepper step={workflowStep} />
          </div>
        )}

        {parsedDocument ? (
          <div className="space-y-4 sm:space-y-6">
            <AiDetectionPanel
              detection={documentDetection}
              busy={detectBusy}
              onAnalyze={() => parsedDocument && runDocumentDetection(parsedDocument)}
            />
            {documentDetection && !humanizedDocument && (
              <BlockSelector
                document={parsedDocument}
                detection={documentDetection}
                selectedIds={selectedBlockIds}
                onChange={setSelectedBlockIds}
              />
            )}
            <HumanizeActionsPanel
              document={parsedDocument}
              detection={documentDetection}
              humanizedDocument={humanizedDocument}
              mode={mode}
              busy={busy}
              selectedCount={selectedBlockIds.size}
              onModeChange={setMode}
              onHumanizeAiBlocks={onHumanizeAiBlocks}
              onExport={onExport}
            />
            {humanizedDocument && (
              <ResultsSummaryPanel
                detectionBefore={detectionBefore}
                detectionAfter={documentDetection}
                humanizedDocument={humanizedDocument}
              />
            )}
            <DocumentStructurePreview
              document={humanizedDocument ?? parsedDocument}
              detection={documentDetection}
            />
          </div>
        ) : (
          <div className="glass-panel rounded-xl p-4 sm:p-6">
            <p className="text-sm text-on-surface-variant mb-4">
              No document loaded. Upload a PDF or DOCX from the{' '}
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="text-primary hover:underline"
              >
                Dashboard
              </button>
              .
            </p>
            <button
              type="button"
              onClick={() => setShowPasteText((v) => !v)}
              className="text-sm text-primary hover:underline"
            >
              {showPasteText ? 'Hide paste text' : 'Or paste text manually'}
            </button>
            {showPasteText && (
              <div className="mt-4 space-y-3">
                <textarea
                  value={originalText}
                  onChange={(e) => setOriginalText(e.target.value)}
                  placeholder="Paste your text here..."
                  className="w-full min-h-[160px] resize-y rounded-xl bg-surface-container-low border border-outline-variant px-4 py-3 text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                />
                <Button disabled={busy} onClick={onHumanize} className="w-full min-h-[48px]">
                  Humanize Text
                </Button>
              </div>
            )}
          </div>
        )}

        {parsedDocument && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
              <RingGauge score={widgets.humanConfidence} />
              <BarCard title="Original AI Risk" value={widgets.originalRisk} color="error" />
              <BarCard title="Readability Improvement" value={widgets.improvement} color="tertiary" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {humanizedForCompare && (
                <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3">
                  {textsUnchanged ? (
                    <p className="text-sm text-tertiary">
                      No visible text changes — the API may have returned identical wording. Try a different tone or
                      re-select blocks.
                    </p>
                  ) : (
                    <p className="text-sm text-on-surface-variant">
                      {humanizedDocument?.blocks.filter((b) => b.wasHumanized).length ?? 0} blocks rewritten
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowDiff((v) => !v)}
                    className="text-sm text-primary hover:underline min-h-[44px] px-2"
                  >
                    {showDiff ? 'Show full text' : 'Highlight changes'}
                  </button>
                </div>
              )}

              <div className="glass-panel rounded-xl flex flex-col overflow-hidden border border-slate-800/50 min-h-[280px] lg:min-h-[400px] lg:max-h-[560px]">
                <div className="bg-surface-container-low px-3 sm:px-4 py-3 border-b border-slate-800/50 flex justify-between items-center gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-[16px] shrink-0">description</span>
                    Original
                  </span>
                  <span className="px-2 py-1 rounded bg-error-container/20 text-error text-[10px] sm:text-[11px] font-bold tracking-wider uppercase border border-error/30 shrink-0">
                    {originalAiPercent != null
                      ? `${originalAiPercent}% AI`
                      : detectOriginal?.label === 'Human'
                        ? 'LOW RISK'
                        : 'AI DETECTED'}
                  </span>
                </div>
                <div className="p-4 sm:p-6 overflow-y-auto font-body-md text-sm sm:text-body-md text-on-surface-variant leading-relaxed whitespace-pre-wrap flex-1">
                  {humanizedForCompare && showDiff
                    ? renderDiffOriginal(originalForCompare, humanizedForCompare)
                    : originalForCompare || '—'}
                </div>
              </div>

              <div className="bg-surface-container-low rounded-xl flex flex-col overflow-hidden glow-border relative min-h-[280px] lg:min-h-[400px] lg:max-h-[560px]">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-50" />
                <div className="px-3 sm:px-4 py-3 border-b border-primary/20 flex justify-between items-center gap-2 bg-surface-container/50">
                  <span className="font-label-sm text-label-sm text-primary flex items-center gap-2 truncate">
                    <span
                      className="material-symbols-outlined text-[16px] shrink-0"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      auto_awesome
                    </span>
                    Humanized
                  </span>
                  <span className="px-2 py-1 rounded bg-primary/10 text-primary text-[10px] sm:text-[11px] font-bold tracking-wider uppercase border border-primary/30 shrink-0">
                    {humanizedForCompare
                      ? detectHumanized?.label === 'Human'
                        ? 'HUMAN-LIKE'
                        : detectHumanized?.label?.toUpperCase() ?? 'DONE'
                      : 'PENDING'}
                  </span>
                </div>
                <div className="p-4 sm:p-6 overflow-y-auto font-body-md text-sm sm:text-body-md text-on-surface leading-relaxed whitespace-pre-wrap flex-1">
                  {humanizedForCompare
                    ? showDiff
                      ? renderDiffHumanized(originalForCompare, humanizedForCompare)
                      : humanizedForCompare
                    : 'Click “Humanize Selected Blocks” above to rewrite flagged sections.'}
                </div>
                {humanizedForCompare && (
                  <div className="p-3 sm:p-4 border-t border-slate-800/50 bg-surface-container-highest/50 flex justify-end gap-2">
                    <button
                      type="button"
                      className="p-2.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Copy"
                      onClick={copy}
                    >
                      <span className="material-symbols-outlined text-[20px]">content_copy</span>
                    </button>
                    <button
                      type="button"
                      className="p-2.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Export"
                      onClick={() => onExport('docx')}
                    >
                      <span className="material-symbols-outlined text-[20px]">download</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {showMobileCta && (
          <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden p-4 bg-surface-container/95 backdrop-blur-xl border-t border-outline-variant safe-bottom">
            <Button onClick={onHumanizeAiBlocks} disabled={busy || detectBusy || selectedBlockIds.size === 0} className="w-full min-h-[52px]">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                auto_awesome
              </span>
              Humanize {selectedBlockIds.size} Selected Block{selectedBlockIds.size === 1 ? '' : 's'}
            </Button>
          </div>
        )}
      </main>
    </AppShell>
  );
}
