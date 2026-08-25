import { NotBuiltYet } from '@/components/ui/NotBuiltYet';

export default function Page() {
  return (
    <NotBuiltYet
      title="Suppliers"
      summary="Supplier records, notification emails, Zapier webhook URL, routing key and masked webhook secret, plus default approval behaviour."
      meanwhile="Webhook secrets are stored server-side and are never sent to a browser."
    />
  );
}
