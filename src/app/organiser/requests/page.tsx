import { NotBuiltYet } from '@/components/ui/NotBuiltYet';

export default function Page() {
  return (
    <NotBuiltYet
      title="Requests"
      summary="The request inbox: filter by type, partner, owner and status, with threaded comments, attachments and full status history."
      meanwhile="Two seeded requests are in the database."
    />
  );
}
