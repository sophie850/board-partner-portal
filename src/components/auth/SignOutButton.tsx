import { LogOut } from 'lucide-react';

/**
 * Sign out.
 *
 * A real form posting to the route, rather than a button calling
 * fetch: it works before hydration, and a POST cannot be triggered
 * by a prefetch or an email client following links.
 */
export function SignOutButton({
  variant = 'nav',
}: {
  variant?: 'nav' | 'quiet';
}) {
  return (
    <form action="/api/auth/signout" method="post" className="contents">
      <button
        type="submit"
        className={
          variant === 'nav'
            ? 'flex w-full cursor-pointer items-center gap-[10px] rounded-md border-none bg-transparent px-3 py-[9px] text-left text-[13px] text-ink-4 hover:bg-chip hover:text-ink'
            : 'inline-flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-[13px] text-ink-3 hover:text-ink'
        }
      >
        <LogOut size={variant === 'nav' ? 16 : 14} />
        Sign out
      </button>
    </form>
  );
}
