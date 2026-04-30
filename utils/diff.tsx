import React from 'react';
import { diff_match_patch } from 'diff-match-patch';

export function renderDiffOriginal(original: string, humanized: string) {
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(original, humanized);
  dmp.diff_cleanupSemantic(diffs);

  return (
    <>
      {diffs.map(([op, text], idx) => {
        if (op === 0) return <span key={idx}>{text}</span>;
        if (op === -1)
          return (
            <span
              key={idx}
              className="bg-error/20 text-error-container px-1 rounded border-b border-error/50"
            >
              {text}
            </span>
          );
        return null;
      })}
    </>
  );
}

export function renderDiffHumanized(original: string, humanized: string) {
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(original, humanized);
  dmp.diff_cleanupSemantic(diffs);

  return (
    <>
      {diffs.map(([op, text], idx) => {
        if (op === 0) return <span key={idx}>{text}</span>;
        if (op === 1)
          return (
            <span key={idx} className="text-secondary border-b border-secondary/40 pb-[1px]">
              {text}
            </span>
          );
        return null;
      })}
    </>
  );
}
