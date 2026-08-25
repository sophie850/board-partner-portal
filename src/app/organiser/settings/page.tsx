import { NotBuiltYet } from '@/components/ui/NotBuiltYet';

export default function Page() {
  return (
    <NotBuiltYet
      title="Event settings"
      summary="Event profile, terminology, team access, email templates with the dev outbox, and event lifecycle including duplication."
      meanwhile="Terminology and currency already drive the whole interface from the seeded event record."
    />
  );
}
