import { Wordmark } from '@/components/ui/Wordmark';

import { UnlockForm } from './UnlockForm';

export const metadata = {
  title: 'BOARD Partner Portal',
};

/**
 * The passphrase screen.
 *
 * Uses the same split layout as the eventual sign-in screen — full
 * bleed BOARD gradient on the left, a narrow panel on the right — so
 * swapping the passphrase for magic links is a change of the panel,
 * not a redesign.
 */
export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div className="flex h-dvh items-stretch overflow-hidden">
      {/* brand panel — permanently dark in both themes */}
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
            Partner Portal
          </div>
          <h1 className="max-w-[16ch] text-[34px] leading-[1.12] font-light tracking-[-0.01em] text-board-off-white uppercase">
            Take your seat at the table
          </h1>
          <p className="mt-4 max-w-[38ch] text-[14px] leading-relaxed text-[#9AA1AD]">
            Manage your participation in BOARD Monaco 2027 — tasks, forms, orders and
            everything the team needs from you, in one place.
          </p>
        </div>

        <div className="relative text-[11px] tracking-[0.04em] text-[#6B7280]">
          Grimaldi Forum, Monaco · 22–24 March 2027
        </div>
      </div>

      {/* form panel */}
      <div className="flex w-[460px] max-w-full shrink-0 flex-col justify-center overflow-y-auto bg-inset px-12 py-11 max-[860px]:w-full max-[460px]:px-[22px]">
        <UnlockForm next={next} error={error} />
      </div>
    </div>
  );
}
