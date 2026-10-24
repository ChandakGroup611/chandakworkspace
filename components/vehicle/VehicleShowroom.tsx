"use client";
/* ui-audit-allow hex-literal: the number plate and stage ink are fixed colours so they read on the studio stage in every theme */
/* ui-audit-allow rgb-literal: studio stage shadows and ink are fixed so they read the same in every theme */

/**
 * Showroom view of the fleet: one vehicle at a time on a studio stage (which adapts to the car's
 * paint, not to the app theme), its key facts and compliance status on the right, and a strip of
 * every vehicle below to jump between them. Arrow keys move between vehicles.
 * Presentation only: it reads the same vehicle records the list and grid use.
 */
import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, FileCheck, Edit2 } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { formatDate } from "@/components/ui/data";
import { VehicleRender, VehicleStage, STAGE_INK } from "./VehicleRender";
import { VehicleBrandLogo } from "./VehicleBrandLogo";
import { isElectricFuel } from "./vehicleQuickPicks";

export type ShowroomVehicle = {
  id: string;
  registration_number: string;
  make?: string | null;
  model?: string | null;
  variant?: string | null;
  year?: number | string | null;
  category?: string | null;
  paint_color?: string | null;
  image_url?: string | null;
  fuel_type?: string | null;
  transmission?: string | null;
  seating_capacity?: number | string | null;
  status?: string | null;
  odometer_km?: number | null;
  insurance_expiry_date?: string | null;
  own_insurance_expiry_date?: string | null;
  puc_expiry_date?: string | null;
  fitness_expiry_date?: string | null;
  next_service_due_date?: string | null;
  next_service_due_odometer?: number | null;
  battery_warranty_expiry_date?: string | null;
  battery_warranty_status?: string | null;
  has_roadside_assistance?: boolean;
  has_hsrp_plate?: boolean;
  assignedDriver?: { full_name?: string | null } | null;
  compliance?: { pucExpiry?: string | null; insuranceExpiry?: string | null } | null;
};

type Tone = "ok" | "warn" | "bad" | "neutral";
const CHIP: Record<Tone, string> = {
  ok: "border-success-border bg-success-soft text-success-text",
  warn: "border-warning-border bg-warning-soft text-warning-text",
  bad: "border-danger-border bg-danger-soft text-danger-text",
  neutral: "border-border bg-sunken text-muted",
};

function expiryState(date?: string | null): { value: string; chip: string; tone: Tone } {
  if (!date) return { value: "Not on file", chip: "Missing", tone: "neutral" };
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return { value: "Not on file", chip: "Missing", tone: "neutral" };
  const days = Math.ceil((t - Date.now()) / 86400000);
  if (days < 0) return { value: formatDate(date), chip: `Expired ${-days}d ago`, tone: "bad" };
  if (days <= 30) return { value: formatDate(date), chip: `${days}d left`, tone: "warn" };
  return { value: formatDate(date), chip: "Valid", tone: "ok" };
}

const STATUS_LABEL: Record<string, string> = { IN_STOCK: "Available", IN_SERVICE: "On route", MAINTENANCE: "In workshop", RESERVED: "Reserved" };

function StatusTile({ label, value, chip, tone }: { label: string; value: string; chip: string; tone: Tone }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-border bg-surface p-3">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="truncate text-[13.5px] font-semibold tabular-nums text-heading">{value}</div>
      <span className={`self-start rounded-full border px-2 py-0.5 text-[11px] font-medium ${CHIP[tone]}`}>{chip}</span>
    </div>
  );
}

export function VehicleShowroom<T extends ShowroomVehicle>({
  vehicles,
  docCount,
  onOpen,
  onEdit,
}: {
  vehicles: T[];
  /** number of documents on file for a vehicle */
  docCount: (v: T) => number;
  /** open the vehicle's full details, on a given tab */
  onOpen: (v: T, tab: "OVERVIEW" | "DOCS") => void;
  /** present only when the user may edit vehicles */
  onEdit?: (v: T) => void;
}) {
  const [index, setIndex] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);
  const count = vehicles.length;
  const i = count ? Math.min(index, count - 1) : 0;
  const v = vehicles[i];

  // keep the selected thumbnail in view
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-idx="${i}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [i]);

  if (!v) return null;
  const go = (d: number) => setIndex((n) => (Math.min(n, count - 1) + d + count) % count);
  const ev = isElectricFuel(v.fuel_type);
  const name = `${v.make || ""} ${v.model || ""}`.trim() || "Vehicle";
  const meta = [v.variant, v.year, v.fuel_type, v.transmission, v.seating_capacity ? `${v.seating_capacity} seats` : null].filter(Boolean).join(" · ");

  const insurance = expiryState(v.insurance_expiry_date || v.own_insurance_expiry_date || v.compliance?.insuranceExpiry);
  const puc = ev ? { value: "Electric vehicle", chip: "Not needed", tone: "neutral" as Tone } : expiryState(v.puc_expiry_date || v.compliance?.pucExpiry);
  const commercial = /COMMERCIAL|BUS/i.test(v.category || "");
  // fitness certificates are for commercial vehicles (private ones only after 15 years)
  const fitness = !v.fitness_expiry_date && !commercial ? { value: "Not on file", chip: "Not required", tone: "neutral" as Tone } : expiryState(v.fitness_expiry_date);
  const fourth = ev
    ? { label: "Battery warranty", ...expiryState(v.battery_warranty_expiry_date) }
    : v.next_service_due_date
      ? { label: "Next service", ...expiryState(v.next_service_due_date), chip: expiryState(v.next_service_due_date).tone === "ok" ? "Scheduled" : expiryState(v.next_service_due_date).chip }
      : v.next_service_due_odometer
        ? { label: "Next service", value: `${Number(v.next_service_due_odometer).toLocaleString("en-IN")} km`, chip: Number(v.odometer_km || 0) >= Number(v.next_service_due_odometer) ? "Due now" : `In ${(Number(v.next_service_due_odometer) - Number(v.odometer_km || 0)).toLocaleString("en-IN")} km`, tone: (Number(v.odometer_km || 0) >= Number(v.next_service_due_odometer) ? "bad" : "ok") as Tone }
        : { label: "Next service", value: "Not scheduled", chip: "Missing", tone: "neutral" as Tone };
  const docs = docCount(v);
  const extras = [v.has_roadside_assistance ? "RSA" : null, v.has_hsrp_plate ? "HSRP" : null].filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Stage: fixed studio colours, independent of theme */}
        <div
          tabIndex={0}
          role="group"
          aria-roledescription="carousel"
          aria-label={`${name}, ${v.registration_number}, ${i + 1} of ${count}`}
          onKeyDown={(e) => { if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); } else if (e.key === "ArrowRight") { e.preventDefault(); go(1); } }}
          className="relative rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <VehicleStage
            vehicle={v}
            className="h-[440px] rounded-xl border border-border"
            top={
              <div className="flex items-center justify-between gap-2 px-4 pt-3.5">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium" style={{ background: "rgba(255,255,255,0.7)", color: STAGE_INK.text, border: `1px solid ${STAGE_INK.border}` }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: v.status === "MAINTENANCE" ? "#b45309" : v.status === "IN_SERVICE" ? "#15803d" : "#1d4ed8" }} aria-hidden />
                  {STATUS_LABEL[v.status || ""] || v.status || "—"}
                </span>
                <span className="text-[12px] tabular-nums" style={{ color: STAGE_INK.muted }}>{i + 1} / {count}</span>
              </div>
            }
          >
            <div className="flex flex-col items-center gap-1.5 px-4 pb-4 text-center">
              <Plate number={v.registration_number} ev={ev} />
              <div className="mt-1 flex items-center gap-2 text-[22px] font-bold leading-tight" style={{ color: STAGE_INK.text }}>
                <VehicleBrandLogo brand={v.make} model={v.model} size={22} />
                <span>{name}</span>
              </div>
              {meta && <div className="text-[13px]" style={{ color: STAGE_INK.muted }}>{meta}</div>}
            </div>
          </VehicleStage>
          {count > 1 && (
            <div className="pointer-events-none absolute inset-x-3 top-[42%] flex -translate-y-1/2 items-center justify-between">
              {([[-1, ChevronLeft, "Previous vehicle"], [1, ChevronRight, "Next vehicle"]] as const).map(([d, Icon, label]) => (
                <button
                  key={d}
                  type="button"
                  aria-label={label}
                  title={label}
                  onClick={() => go(d)}
                  className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-shadow hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ background: STAGE_INK.button, color: STAGE_INK.text, border: `1px solid ${STAGE_INK.border}` }}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Facts: themed */}
        <div className="flex min-w-0 flex-col gap-3">
          <dl className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-surface">
            {[
              ["Odometer", v.odometer_km ? `${Number(v.odometer_km).toLocaleString("en-IN")} km` : "—"],
              ["Fuel", v.fuel_type || "—"],
              ["Driver", v.assignedDriver?.full_name || "Unassigned"],
            ].map(([k, val]) => (
              <div key={k} className="min-w-0 px-3 py-2.5">
                <dt className="text-[12px] text-muted">{k}</dt>
                <dd className="truncate text-[13.5px] font-semibold tabular-nums text-heading" title={val}>{val}</dd>
              </div>
            ))}
          </dl>
          <div className="grid grid-cols-2 gap-2.5">
            <StatusTile label="Insurance" {...insurance} />
            <StatusTile label="PUC" {...puc} />
            <StatusTile label="Fitness" {...fitness} />
            <StatusTile {...fourth} />
            <StatusTile label="Documents" value={`${docs} on file`} chip={docs ? "Open to view" : "None yet"} tone={docs ? "ok" : "neutral"} />
            <StatusTile label="RSA & HSRP" value={extras.length ? extras.join(" + ") : "Neither"} chip={extras.length === 2 ? "Both active" : extras.length ? "Partly" : "Not active"} tone={extras.length === 2 ? "ok" : extras.length ? "warn" : "neutral"} />
          </div>
          <div className="mt-auto flex flex-wrap gap-2">
            <AppButton variant="primary" className="flex-1" onClick={() => onOpen(v, "OVERVIEW")} leftIcon={<Eye className="h-4 w-4" />}>
              Open full details
            </AppButton>
            <AppButton variant="secondary" onClick={() => onOpen(v, "DOCS")} leftIcon={<FileCheck className="h-4 w-4" />}>
              Documents
            </AppButton>
            {onEdit && (
              <AppButton variant="ghost" size="icon" aria-label={`Edit ${v.registration_number}`} title="Edit" onClick={() => onEdit(v)}>
                <Edit2 className="h-4 w-4" />
              </AppButton>
            )}
          </div>
        </div>
      </div>

      {/* Strip of every vehicle */}
      {count > 1 && (
        <div ref={stripRef} className="flex gap-2.5 overflow-x-auto pb-1.5" role="listbox" aria-label="Vehicles">
          {vehicles.map((x, n) => (
            <button
              key={x.id}
              type="button"
              role="option"
              aria-selected={n === i}
              data-idx={n}
              onClick={() => setIndex(n)}
              title={`${x.make || ""} ${x.model || ""} · ${x.registration_number}`}
              className={`flex w-36 shrink-0 flex-col overflow-hidden rounded-lg border bg-surface text-left transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${n === i ? "border-theme-btn-primary ring-2 ring-theme-btn-primary/30" : "border-border hover:border-border-active"}`}
            >
              <VehicleRender vehicle={x} className="h-20 w-full" />
              <span className="truncate px-2 pt-1.5 text-[12px] font-semibold text-heading">{x.make} {x.model}</span>
              <span className="truncate px-2 pb-1.5 font-mono text-[11.5px] text-muted">{x.registration_number}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Indian HSRP-style plate; white plate (green for EVs), fixed colours so it reads on the stage. */
function Plate({ number, ev }: { number: string; ev: boolean }) {
  return (
    <span
      className="inline-flex items-stretch overflow-hidden rounded-md font-mono text-[17px] font-bold tracking-[0.12em]"
      style={{ background: ev ? "#0f7a3a" : "#ffffff", color: ev ? "#ffffff" : "#111111", border: "2px solid #111111", boxShadow: "0 2px 6px rgba(0,0,0,0.18)" }}
    >
      <span className="flex flex-col items-center justify-center px-1.5 text-[9px] tracking-normal" style={{ background: "#1f3d99", color: "#ffffff" }}>IND</span>
      <span className="px-3 py-1">{number}</span>
    </span>
  );
}

/** Studio stage for the top of the vehicle details screen. */
export function VehicleDossierStage({ vehicle }: { vehicle: ShowroomVehicle }) {
  const ev = isElectricFuel(vehicle.fuel_type);
  const name = `${vehicle.make || ""} ${vehicle.model || ""}`.trim() || "Vehicle";
  const meta = [vehicle.variant, vehicle.year, vehicle.fuel_type, vehicle.transmission].filter(Boolean).join(" · ");
  return (
    <VehicleStage vehicle={vehicle} className="h-[300px] rounded-xl border border-border">
      <div className="flex flex-wrap items-end justify-between gap-3 px-5 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[20px] font-bold leading-tight" style={{ color: STAGE_INK.text }}>
            <VehicleBrandLogo brand={vehicle.make} model={vehicle.model} size={20} />
            <span className="truncate">{name}</span>
          </div>
          {meta && <div className="mt-0.5 text-[13px]" style={{ color: STAGE_INK.muted }}>{meta}</div>}
        </div>
        <Plate number={vehicle.registration_number} ev={ev} />
      </div>
    </VehicleStage>
  );
}

export default VehicleShowroom;
