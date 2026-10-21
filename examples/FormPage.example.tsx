"use client";

/**
 * REFERENCE LAYOUT for create/edit pages and large drawers: Register Vehicle, New Requirement,
 * Masters, Settings. Presentation only — keep the page's form library (react-hook-form, etc.),
 * validation and submit handler; just render through FormSection / FormGrid / FormField.
 */
import React from "react";
import { AppButton } from "@/components/ui/AppButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { FormSection, FormGrid, FormField, AppSelect, AppTextarea, AppSwitch, ChoiceRow, FormActions } from "@/components/ui/form/Form";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { InlineAlert } from "@/components/ui/feedback/States";

export function FormPageExample() {
  const [files, setFiles] = React.useState<File[]>([]);
  const [remind, setRemind] = React.useState(true);
  const [notes, setNotes] = React.useState("");
  return (
    <form className="mx-auto max-w-4xl space-y-5" onSubmit={(e) => e.preventDefault()} noValidate>
      <PageHeader
        title="Register vehicle"
        description="Add a company vehicle so it can be assigned to trips and tracked for insurance and service."
        breadcrumbs={[{ label: "Vehicle Desk", href: "/vehicle" }, { label: "Vehicle inventory", href: "/vehicle/inventory" }, { label: "Register vehicle" }]}
      />
      <InlineAlert tone="danger" title="2 fields need attention">Registration number and insurance expiry are required.</InlineAlert>

      <FormSection title="Vehicle" description="As printed on the registration certificate (RC).">
        <FormGrid cols={2}>
          <FormField label="Registration number" required error="Enter the registration number, e.g. MH 12 AB 1234.">
            <input className="h-[var(--control-h)] w-full px-3 text-[13.5px]" placeholder="MH 12 AB 1234" />
          </FormField>
          <FormField label="Vehicle type" required>
            <AppSelect defaultValue="suv"><option value="sedan">Sedan</option><option value="suv">SUV</option><option value="pickup">Pickup</option></AppSelect>
          </FormField>
          <FormField label="Make and model">
            <input className="h-[var(--control-h)] w-full px-3 text-[13.5px]" defaultValue="Mahindra XUV700" />
          </FormField>
          <FormField label="Fuel" hint="Used for mileage reports.">
            <AppSelect defaultValue="diesel"><option value="diesel">Diesel</option><option value="petrol">Petrol</option><option value="ev">Electric</option></AppSelect>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Insurance">
        <FormGrid cols={3}>
          <FormField label="Insurer"><input className="h-[var(--control-h)] w-full px-3 text-[13.5px]" defaultValue="ICICI Lombard" /></FormField>
          <FormField label="Policy number"><input className="h-[var(--control-h)] w-full px-3 text-[13.5px]" defaultValue="3001/2345/6789" /></FormField>
          <FormField label="Expiry date" required error="Pick the policy end date."><input type="date" className="h-[var(--control-h)] w-full px-3 text-[13.5px]" /></FormField>
          <FormField label="Policy document" full hint="PDF or image, up to 10 MB.">
            <div><FileDropzone accept=".pdf,.jpg,.png" files={files} onFilesChange={setFiles} /></div>
          </FormField>
        </FormGrid>
        <div className="mt-4 space-y-1 border-t border-border pt-4">
          <AppSwitch checked={remind} onCheckedChange={setRemind} label="Remind before expiry" description="Emails the fleet admin 30 and 7 days before the policy ends." />
          <ChoiceRow label="Vehicle is pool car" description="Any approved employee can book it from Trips." />
        </div>
      </FormSection>

      <FormSection title="Notes">
        <FormField label="Remarks" full>
          <AppTextarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} showCount placeholder="Anything the driver or admin should know" />
        </FormField>
      </FormSection>

      <FormActions>
        <AppButton variant="ghost">Cancel</AppButton>
        <AppButton variant="secondary">Save as draft</AppButton>
        <AppButton type="submit">Register vehicle</AppButton>
      </FormActions>
    </form>
  );
}
