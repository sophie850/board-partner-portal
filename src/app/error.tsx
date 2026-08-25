'use client';

import { useEffect } from 'react';

/**
 * The last line of defence.
 *
 * A bare "a server error occurred" tells nobody anything, and on a
 * deployment whose configuration is still being finished it is
 * almost always a missing environment variable. So this says what
 * probably went wrong and where to look, and shows the real message
 * rather than hiding it — this is an internal operations tool, not a
 * public site where an error string could help an attacker.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  const looksLikeConfig =
    /supabase|fetch failed|not configured|SUPABASE|ENOTFOUND|allowlist/i.test(
      error.message,
    );

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-[560px]">
        <div className="mb-2 text-[11px] tracking-[0.16em] text-ink-4 uppercase">
          BOARD Partner Portal
        </div>
        <h1 className="text-[26px] leading-tight font-light text-ink">
          Something went wrong
        </h1>

        <p className="mt-4 text-[14px] leading-relaxed text-ink-3">
          {looksLikeConfig
            ? 'This looks like a configuration problem rather than a bug — most often a missing or incorrect environment variable.'
            : 'The page could not be rendered.'}
        </p>

        <div className="mt-5 rounded-xl border border-line-3 bg-panel px-[18px] py-4">
          <div className="text-[11px] tracking-[0.06em] text-ink-4 uppercase">
            What the server said
          </div>
          <p className="mt-2 font-mono text-[12.5px] leading-relaxed break-words text-ink-2">
            {error.message || 'No message was provided.'}
          </p>
          {error.digest && (
            <p className="mt-2 text-[11px] text-ink-4">Digest: {error.digest}</p>
          )}
        </div>

        {looksLikeConfig && (
          <div className="mt-4 rounded-xl border border-brand-line bg-brand-fill px-[18px] py-4 text-[13px] leading-relaxed text-ink-2">
            Check <span className="font-mono text-[12.5px]">/api/health</span> — it reports
            which variables are set and which tables can be read, without revealing any
            secret.
          </div>
        )}

        <button
          onClick={reset}
          className="mt-6 cursor-pointer rounded-pill bg-brand px-[18px] py-[11px] text-[13.5px] text-on-brand"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
