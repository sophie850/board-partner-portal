'use client';

import { clsx } from 'clsx';
import { Check, Copy, Download } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { FileUpload } from '@/components/ui/FileUpload';
import {
  Button,
  Callout,
  Eyebrow,
  Help,
  Label,
  Panel,
  TextArea,
  TextInput,
} from '@/components/ui/primitives';
import type { MarketingSettings } from '@/lib/types';
import {
  PROMOTE_BACKGROUNDS,
  PROMOTE_FORMATS,
  PROMOTE_TAGLINE,
  PROMOTE_URL,
  type PromoteCopy,
} from '@/lib/promote';

import { saveMarketing, useCompanyLogo } from '@/app/portal/[partnerId]/promote/actions';
import { downloadGraphic, drawGraphic, type GraphicConfig } from './renderGraphic';

/* ============================================================
   Promote

   Co-branded graphics a partner can post, with copy derived from
   what they actually bought. The preview is drawn by the same code
   that produces the download, so nothing can look right on screen
   and wrong in the file.
   ============================================================ */

export function Promote({
  partnerId,
  partnerName,
  companyLogo,
  logoOverride,
  saved,
  suggested,
}: {
  partnerId: string;
  partnerName: string;
  /** The logo on the organisation's profile, if they have one. */
  companyLogo: string;
  /** Set when the partner chose a different logo for this event. */
  logoOverride: string | null;
  saved: Partial<PromoteCopy> & { format?: string; bg?: string };
  suggested: PromoteCopy;
}) {
  const [format, setFormat] = useState(saved.format ?? 'square');
  const [bg, setBg] = useState(saved.bg ?? PROMOTE_BACKGROUNDS[3]);
  const [copy, setCopy] = useState<PromoteCopy>({
    eyebrow: saved.eyebrow ?? suggested.eyebrow,
    headline: saved.headline ?? suggested.headline,
    sub: saved.sub ?? suggested.sub,
    detail: saved.detail ?? suggested.detail,
    caption: saved.caption ?? suggested.caption,
  });

  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const logo = logoOverride ?? companyLogo;
  const usingCompany = logoOverride === null && Boolean(companyLogo);

  const spec = PROMOTE_FORMATS.find((f) => f.key === format) ?? PROMOTE_FORMATS[0];

  const config: GraphicConfig = {
    format,
    width: spec.width,
    height: spec.height,
    background: bg,
    logoUrl: logo,
    eyebrow: copy.eyebrow,
    headline: copy.headline,
    sub: copy.sub,
    detail: copy.detail,
    tagline: PROMOTE_TAGLINE,
    url: PROMOTE_URL,
  };

  /*
   * Every change is persisted, quietly. A partner who edits a
   * headline and comes back a week later should find their headline,
   * not the suggestion again — and there is nothing here worth
   * making them press Save for.
   */
  const persist = useCallback(
    (patch: Partial<MarketingSettings>) => {
      startTransition(async () => {
        const result = await saveMarketing(partnerId, patch);
        if (!result.ok) setError(result.error);
      });
    },
    [partnerId],
  );

  function setField(key: keyof PromoteCopy, value: string) {
    setCopy((c) => ({ ...c, [key]: value }));
  }

  function reset() {
    setCopy(suggested);
    persist({
      eyebrow: suggested.eyebrow,
      headline: suggested.headline,
      sub: suggested.sub,
      detail: suggested.detail,
      caption: suggested.caption,
    });
  }

  async function download() {
    setError(null);
    setBusy(true);
    try {
      const name = `${partnerName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-board-${format}.png`;
      await downloadGraphic(config, name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The image could not be created.');
    } finally {
      setBusy(false);
    }
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(copy.caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('Your browser would not let the caption be copied. Select it and copy manually.');
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      {/* ---------------- controls ---------------- */}
      <div className="flex min-w-0 max-w-[400px] flex-[1_1_340px] flex-col gap-6">
        {error && <Callout tone="warn">{error}</Callout>}

        <section>
          <Eyebrow className="mb-3 tracking-[0.12em]">Format</Eyebrow>
          <div className="grid grid-cols-2 gap-2">
            {PROMOTE_FORMATS.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setFormat(f.key);
                  persist({ format: f.key });
                }}
                aria-pressed={f.key === format}
                className={clsx(
                  'cursor-pointer rounded-xl border px-[14px] py-[12px] text-left',
                  f.key === format
                    ? 'border-brand bg-brand-fill text-ink'
                    : 'border-line-3 bg-panel text-ink-3 hover:border-line-4',
                )}
              >
                <div className="text-[13.5px]">{f.label}</div>
                <div className="mt-[3px] text-[10.5px] tracking-[0.03em] text-ink-4">
                  {f.width} × {f.height}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <Eyebrow className="mb-3 tracking-[0.12em]">Your logo</Eyebrow>
          <div className="flex flex-wrap items-center gap-3">
            {logo && (
              <div
                className="h-[52px] w-[110px] shrink-0 rounded-lg border border-line-3 bg-[#050608] bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: `url('${logo}')` }}
              />
            )}
            <div className="min-w-[180px] flex-1">
              <FileUpload
                purpose="image"
                folder="partner-logos"
                compact
                label={companyLogo ? 'Upload a different logo' : 'Upload logo'}
                onUploaded={(f) => {
                  setError(null);
                  persist({ logoOverride: f.url });
                  // The saved value is what the next render reads;
                  // reloading here would lose unsaved copy edits.
                  window.location.reload();
                }}
              />
            </div>
          </div>

          <div className="mt-[10px] flex flex-wrap items-center gap-3 text-[11.5px] text-ink-4">
            <span>
              {usingCompany
                ? 'Using your company logo'
                : logo
                  ? 'Using an uploaded logo'
                  : 'No logo yet'}
            </span>
            {!usingCompany && companyLogo && (
              <button
                onClick={() =>
                  startTransition(async () => {
                    await useCompanyLogo(partnerId);
                    window.location.reload();
                  })
                }
                className="cursor-pointer border-none bg-transparent p-0 text-accent hover:underline"
              >
                Use company logo
              </button>
            )}
          </div>
          <Help>PNG with a transparent background works best.</Help>
        </section>

        <section>
          <Eyebrow className="mb-3 tracking-[0.12em]">Background</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {PROMOTE_BACKGROUNDS.map((src) => (
              <button
                key={src}
                onClick={() => {
                  setBg(src);
                  persist({ bg: src });
                }}
                aria-label="Use this background"
                aria-pressed={bg === src}
                className={clsx(
                  'h-[38px] w-[58px] cursor-pointer rounded-lg border-2 bg-cover bg-center p-0',
                  bg === src ? 'border-accent' : 'border-transparent',
                )}
                style={{ backgroundImage: `url('${src}')` }}
              />
            ))}
            <button
              onClick={() => {
                setBg('black');
                persist({ bg: 'black' });
              }}
              aria-label="Solid black"
              aria-pressed={bg === 'black'}
              className={clsx(
                'h-[38px] w-[58px] cursor-pointer rounded-lg border-2 bg-black p-0',
                bg === 'black' ? 'border-accent' : 'border-transparent',
              )}
            />
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <Eyebrow className="tracking-[0.12em]">Copy</Eyebrow>
            <button
              onClick={reset}
              className="cursor-pointer border-none bg-transparent p-0 text-[12px] text-accent hover:underline"
            >
              Reset to suggested
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {(
              [
                ['eyebrow', 'Eyebrow'],
                ['headline', 'Headline'],
                ['sub', 'Subhead'],
                ['detail', 'Detail line'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label htmlFor={`p-${key}`}>{label}</Label>
                <TextInput
                  id={`p-${key}`}
                  value={copy[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  onBlur={() => persist({ [key]: copy[key] })}
                />
              </div>
            ))}
          </div>

          <Help>
            The BOARD lockup, event dates and “{PROMOTE_TAGLINE}” are fixed on every graphic.
          </Help>
        </section>
      </div>

      {/* ---------------- preview and caption ---------------- */}
      <div className="flex min-w-[300px] flex-[2_1_400px] flex-col gap-4">
        <Panel className="flex flex-col items-center gap-4 px-[26px] py-[26px]">
          <Preview config={config} />
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-[11px] tracking-[0.04em] text-ink-4">
              {spec.width} × {spec.height} px
            </span>
            <Button onClick={download} disabled={busy}>
              <Download size={14} /> {busy ? 'Preparing…' : 'Download PNG'}
            </Button>
          </div>
        </Panel>

        <Panel className="px-[20px] py-[18px]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-[13px] text-ink">Suggested post caption</span>
            <Button size="sm" variant="ghost" onClick={copyCaption}>
              {copied ? (
                <>
                  <Check size={13} /> Copied
                </>
              ) : (
                <>
                  <Copy size={13} /> Copy
                </>
              )}
            </Button>
          </div>
          <TextArea
            rows={8}
            value={copy.caption}
            onChange={(e) => setField('caption', e.target.value)}
            onBlur={() => persist({ caption: copy.caption })}
          />
        </Panel>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   The live preview
   --------------------------------------------------------------- */

function Preview({ config }: { config: GraphicConfig }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        if (document.fonts?.ready) await document.fonts.ready;
        const canvas = await drawGraphic(config);
        if (cancelled || !host.current) return;

        // Scaled by CSS rather than drawn small, so the preview is
        // the export rather than an approximation of it.
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        canvas.style.display = 'block';
        canvas.style.borderRadius = '12px';

        host.current.replaceChildren(canvas);
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [config]);

  const cap = config.format === 'story' ? 'max-w-[320px]' : 'max-w-[560px]';

  return (
    <div className={clsx('w-full', cap)}>
      <div ref={host} aria-label="Preview of the graphic" />
      {failed && (
        <p className="mt-3 text-[12.5px] text-warn">
          The preview could not be drawn in this browser. The download may still work.
        </p>
      )}
    </div>
  );
}
