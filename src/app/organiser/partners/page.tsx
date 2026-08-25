import { NotBuiltYet } from '@/components/ui/NotBuiltYet';

export default function Page() {
  return (
    <NotBuiltYet
      title="Partners"
      summary="The searchable partner list, with per-partner Summary, Preview and Configure. Configure is where a partner's package, entitlements, deadlines and requested files are set."
      meanwhile="The three seeded partners are already in the database, so nothing is lost by this arriving later."
    />
  );
}
