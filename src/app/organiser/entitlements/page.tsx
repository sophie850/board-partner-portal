import { NotBuiltYet } from '@/components/ui/NotBuiltYet';

export default function Page() {
  return (
    <NotBuiltYet
      title="Entitlements"
      summary="The master vocabulary, with live usage counts and the reverse editor for attaching an entitlement to products, pages, form fields and tasks in bulk."
      meanwhile="You can already gate a page by entitlement from the page itself, in Content."
    />
  );
}
