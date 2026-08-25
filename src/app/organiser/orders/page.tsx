import { NotBuiltYet } from '@/components/ui/NotBuiltYet';

export default function Page() {
  return (
    <NotBuiltYet
      title="Orders & webhooks"
      summary="Parent orders and their per-supplier splits, approval and quote handling, and the webhook delivery log with manual resend."
      meanwhile="Outbound webhook delivery is not wired up yet, so nothing will be sent to suppliers in the meantime."
    />
  );
}
