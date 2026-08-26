import {
  EntitlementList,
  type EntitlementRow,
  type GatedItem,
} from '@/components/entitlements/EntitlementList';
import { Eyebrow, PageTitle, Rise } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import { entKeys, terms } from '@/lib/resolvers';
import type { VisibilityRule } from '@/lib/types';
import { requireArea } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function EntitlementsPage() {
  await requireArea('partners', '/organiser/entitlements');

  const db = await getDb();
  const t = terms(db);

  const rows: EntitlementRow[] = db.entitlements.map((entitlement) => ({
    key: entitlement.key,
    label: entitlement.label,
    partners: db.participations.filter((p) =>
      (p.addedEntitlements ?? []).includes(entitlement.key),
    ).length,
    surfaces: {
      products: db.products.map((p) => gated(p.id, p.name, p.visibility, entitlement.key)),
      content_pages: db.contentPages.map((p) =>
        gated(p.id, p.title, p.visibility, entitlement.key),
      ),
      files: db.files.map((f) => gated(f.id, f.name, f.visibility, entitlement.key)),
      // Field ids are composite, matching how form_fields rows are keyed.
      form_fields: db.forms.flatMap((form) =>
        form.fields
          .filter((f) => f.type !== 'section_heading' && f.type !== 'guidance')
          .map((field) => ({
            ...gated(`${form.id}__${field.key}`, field.label, field.visibility, entitlement.key),
            note: form.title,
          })),
      ),
      task_templates: db.taskTemplates.map((task) => {
        const keys = Array.isArray(task.requires)
          ? task.requires
          : task.requires
            ? [task.requires]
            : [];
        return {
          id: task.id,
          label: task.title,
          attached: keys.includes(entitlement.key),
        };
      }),
    },
  }));

  return (
    <Rise>
      <Eyebrow className="mb-2">Organiser</Eyebrow>
      <PageTitle>Entitlements</PageTitle>
      <p className="mt-2 mb-2 max-w-[68ch] text-[13.5px] leading-relaxed text-ink-3">
        The vocabulary the whole product is built on. An entitlement is something a{' '}
        {t.lower.partner} has bought or been granted — exhibition space, a meetings package,
        the right to order AV. Everything else asks the same question: does this{' '}
        {t.lower.partner} hold the right key?
      </p>
      <p className="mb-6 max-w-[68ch] text-[13px] leading-relaxed text-ink-4">
        Matching is <span className="text-ink-3">any-of</span>: an item gated by two
        entitlements is shown to a {t.lower.partner} holding either one, not both. You can
        edit gating from the item itself, or from here — expand a row to tick what it unlocks.
      </p>

      <EntitlementList rows={rows} />
    </Rise>
  );
}

/** Whether one item's rule currently carries this entitlement key. */
function gated(
  id: string,
  label: string,
  rule: VisibilityRule | undefined,
  key: string,
): GatedItem {
  return { id, label, attached: entKeys(rule).includes(key) };
}
