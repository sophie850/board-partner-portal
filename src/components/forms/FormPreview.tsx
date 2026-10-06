"use client";

import { Eye, Lock } from "lucide-react";
import { useMemo, useState } from "react";

import { assignKeys } from "@/components/forms/FieldListEditor";
import { FieldRenderer } from "@/components/forms/FieldRenderer";
import { Eyebrow, Panel } from "@/components/ui/primitives";
import {
  conditionHolds,
  fmtDate,
  NO_DATE_LABEL,
  visibilityLabel,
} from "@/lib/resolvers";
import type {
  Entitlement,
  FieldValue,
  FormField,
  FormValues,
  Partner,
  VisibilityRule,
} from "@/lib/types";

/* ============================================================
   The form, as a partner will meet it

   Rendered through the same FieldRenderer the portal uses, and the
   same conditionHolds the filler uses, so what is shown here is not
   a drawing of the form — it is the form, minus the ability to send
   it anywhere.

   One deliberate departure. A field gated by an entitlement is shown
   rather than hidden, with a note saying who gets it. Hiding it
   would mean the author could only ever preview the subset they
   happen to match, and the question they most need answered is
   "does this read properly for the partner who sees everything".
   ============================================================ */

export function FormPreview({
  title,
  category,
  description,
  dueDate,
  assign,
  fields,
  existingFields,
  entitlements,
  partners,
}: {
  title: string;
  category: string;
  description: string;
  dueDate: string;
  assign: VisibilityRule;
  fields: FormField[];
  /** The saved fields, so keys stay stable for ones that already exist. */
  existingFields: FormField[];
  entitlements: Entitlement[];
  partners: Partner[];
}) {
  /*
   * Keys are derived on save, so a field added a moment ago has none
   * yet — and a condition refers to a field by key. Deriving them the
   * same way saving does is what makes "show this only when that
   * answer is yes" work in the preview at all.
   */
  const keyed = useMemo(
    () => assignKeys(fields, existingFields),
    [fields, existingFields],
  );

  const [values, setValues] = useState<FormValues>({});

  const visible = useMemo(
    () => keyed.filter((f) => conditionHolds(f, values)),
    [keyed, values],
  );

  function setValue(key: string, v: FieldValue) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  const audience = visibilityLabel({ partners, entitlements }, assign);

  return (
    <Panel inset className="mb-6 px-[26px] pt-[22px] pb-[30px]">
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line-2 pb-4">
        <Eyebrow tone="accent" className="tracking-[0.14em]">
          <span className="inline-flex items-center gap-[6px]">
            <Eye size={13} /> Partner preview
          </span>
        </Eyebrow>
        <span className="text-[11.5px] text-ink-4">
          Nothing here is saved, and nothing can be submitted. Goes to:{" "}
          {audience}.
        </span>
      </div>

      <div className="mx-auto max-w-[620px]">
        {category && <Eyebrow className="mb-2">{category}</Eyebrow>}

        <h1 className="text-[26px] leading-tight font-light text-ink">
          {title || "Untitled form"}
        </h1>

        {description && (
          <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
            {description}
          </p>
        )}

        <div className="mt-3 mb-8 text-[12px] text-ink-4">
          {dueDate ? `Due ${fmtDate(dueDate)}` : NO_DATE_LABEL}
        </div>

        {keyed.length === 0 ? (
          <p className="text-[13px] text-ink-4">
            Nothing to preview yet — add a field.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {visible.map((field) => (
              <div key={field.key}>
                {field.visibility && field.visibility.type !== "all" && (
                  <div className="mb-[6px] inline-flex items-center gap-[5px] rounded-pill border border-line-4 px-[9px] py-[3px] text-[10.5px] tracking-[0.04em] text-ink-4 uppercase">
                    <Lock size={10} />
                    {visibilityLabel(
                      { partners, entitlements },
                      field.visibility,
                    )}
                  </div>
                )}
                <FieldRenderer
                  field={field}
                  value={values[field.key] ?? null}
                  onChange={(v) => setValue(field.key, v)}
                  uploadFolder="preview"
                />
              </div>
            ))}
          </div>
        )}

        {keyed.length > visible.length && (
          <p className="mt-7 border-t border-line-2 pt-4 text-[11.5px] text-ink-4">
            {keyed.length - visible.length} field
            {keyed.length - visible.length === 1 ? "" : "s"} hidden by a
            condition, and will appear as the answers above change — exactly as
            they will for a partner.
          </p>
        )}
      </div>
    </Panel>
  );
}
