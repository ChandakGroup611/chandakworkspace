import type { CustomField } from "./data";

// Shared by server and client components.
/** Tooltip for a custom field: its help, formula or Excel column. */
export function fieldTitle(f: CustomField) {
  return [f.help, f.field_type === "formula" ? `= ${f.formula}` : null, f.input_source === "excel" ? `From Excel column "${f.excel_header}"` : null]
    .filter(Boolean).join(" · ") || undefined;
}
