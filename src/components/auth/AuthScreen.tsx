import { Wordmark } from '@/components/ui/Wordmark';

/* ============================================================
   The signed-out shell

   Full-bleed BOARD gradient on the left, a narrow panel on the
   right. Shared by the sign-in screen, the passphrase gate and the
   refusal page so the way in and the way out look like one product.

   The left panel is pinned dark in both themes — the contrast rule
   only holds if the ground stays dark under it.
   ============================================================ */

export function AuthScreen({
  eyebrow,
  headline,
  blurb,
  footer,
  children,
}: {
  eyebrow: string;
  headline: string;
  blurb: string;
  footer: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh items-stretch overflow-hidden">
      <div className="bp-on-dark relative flex flex-1 flex-col justify-between overflow-hidden bg-black p-11 max-[860px]:hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-50"
          style={{ backgroundImage: "url('/assets/board-bg-2.png')" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(120deg, rgba(0,0,0,0.82), rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.7))',
          }}
        />

        <div className="relative flex h-6 items-center text-board-off-white">
          <Wordmark size={26} />
        </div>

        <div className="relative">
          <div className="mb-4 text-[11px] tracking-[0.2em] text-board-aqua uppercase">
            {eyebrow}
          </div>
          <h1 className="max-w-[16ch] text-[34px] leading-[1.12] font-light tracking-[-0.01em] text-board-off-white uppercase">
            {headline}
          </h1>
          <p className="mt-4 max-w-[38ch] text-[14px] leading-relaxed text-[#9AA1AD]">
            {blurb}
          </p>
        </div>

        <div className="relative text-[11px] tracking-[0.04em] text-[#6B7280]">{footer}</div>
      </div>

      <div className="flex w-[460px] max-w-full shrink-0 flex-col justify-center overflow-y-auto bg-inset px-12 py-11 max-[860px]:w-full max-[460px]:px-[22px]">
        {children}
      </div>
    </div>
  );
}
