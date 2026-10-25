"use client";

/**
 * Model picture library manager (admins and fleet managers only).
 *
 * Lists every make + model in the fleet and its approved picture. For a model, the admin picks a
 * freely licensed photo suggested from Wikimedia Commons or uploads the manufacturer's official
 * picture, can mirror it so every car faces the same way, previews the standardised result on the
 * studio stage, and approves it. From then on every vehicle of that model shows that picture.
 *
 * Standardising: the vehicle is cut out in high quality in this browser (hqCutout), then the
 * server places it on the standard 1600 x 900 canvas (same size, same baseline for every model).
 * If the in-browser cut-out isn't possible, the server's standard cut-out is used instead.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Check, FlipHorizontal2, ImagePlus, Images, Loader2, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppButton } from "@/components/ui/AppButton";
import { confirmAction } from "@/components/ui/feedback/confirm";
import { modelKey } from "@/lib/vehicle/model-key";
import { VehicleBrandLogo } from "./VehicleBrandLogo";
import { STAGE_INK, StudioPicture, refreshModelLibrary, useModelLibrary, type LibraryItem } from "./VehicleRender";
import { cutOutInBrowser } from "./hqCutout";

type FleetVehicle = { id: string; make?: string | null; model?: string | null; variant?: string | null };
type ModelRow = { key: string; make: string; model: string; count: number; item: LibraryItem | null };
type Candidate = { thumb: string; full: string; title: string; page: string; credit: string; width: number; height: number };
type Choice = { kind: "commons"; c: Candidate } | { kind: "upload"; file: File };

/** Header button: shows only for people who may manage pictures; badge = models without a picture. */
export function ModelPicturesButton({ vehicles }: { vehicles: FleetVehicle[] }) {
  const lib = useModelLibrary();
  const [open, setOpen] = useState(false);
  const rows = useFleetModels(vehicles, lib?.items);
  // pictures are made automatically when a picture service is configured; this screen is only the manual fallback
  if (!lib?.canManage || lib.autoFill) return null;
  const missing = rows.filter((r) => !r.item).length;
  return (
    <>
      <AppButton type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="h-8 gap-1.5 px-2.5 text-xs font-semibold" title="Set the standard picture for each vehicle model">
        <Images className="h-3.5 w-3.5" aria-hidden />
        <span>Model pictures</span>
        {missing > 0 && <span className="rounded-full bg-warning-soft px-1.5 text-[11px] font-semibold text-warning-text" aria-label={`${missing} models without a picture`}>{missing}</span>}
      </AppButton>
      {open && <ModelPicturesDialog open={open} onOpenChange={setOpen} rows={rows} />}
    </>
  );
}

function useFleetModels(vehicles: FleetVehicle[], items?: Map<string, LibraryItem>): ModelRow[] {
  return useMemo(() => {
    const map = new Map<string, ModelRow>();
    for (const v of vehicles) {
      if (!v.model) continue;
      const key = modelKey(v.make, v.model);
      const row = map.get(key) || { key, make: v.make || "", model: v.model, count: 0, item: items?.get(key) || null };
      row.count++;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => Number(!!a.item) - Number(!!b.item) || `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`));
  }, [vehicles, items]);
}

function ModelPicturesDialog({ open, onOpenChange, rows }: { open: boolean; onOpenChange: (o: boolean) => void; rows: ModelRow[] }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(rows[0]?.key || null);
  const [filter, setFilter] = useState("");
  const selected = rows.find((r) => r.key === selectedKey) || null;
  const shown = rows.filter((r) => `${r.make} ${r.model}`.toLowerCase().includes(filter.trim().toLowerCase()));
  const done = rows.filter((r) => r.item).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(860px,92vh)] max-w-[1180px] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Model pictures</DialogTitle>
          <DialogDescription>
            One standard picture per model, used for every vehicle of that model. {done} of {rows.length} models have a picture.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)]">
          {/* models */}
          <div className="flex min-h-0 flex-col border-b border-border md:border-b-0 md:border-r">
            <div className="p-3">
              <label className="relative block">
                <span className="sr-only">Find a model</span>
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden />
                <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a model" className="theme-input-structural h-8 w-full rounded-md border border-border bg-surface pl-8 pr-2 text-[13px]" />
              </label>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" role="listbox" aria-label="Vehicle models">
              {shown.map((r) => (
                <li key={r.key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={r.key === selectedKey}
                    onClick={() => setSelectedKey(r.key)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${r.key === selectedKey ? "bg-accent-soft" : "hover:bg-surface-hover"}`}
                  >
                    <VehicleBrandLogo brand={r.make} model={r.model} size={22} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-heading">{r.make} {r.model}</span>
                      <span className="block text-[12px] text-muted">{r.count} {r.count === 1 ? "vehicle" : "vehicles"}</span>
                    </span>
                    {r.item ? (
                      <span className="rounded-full border border-success-border bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success-text">Set</span>
                    ) : (
                      <span className="rounded-full border border-warning-border bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning-text">Missing</span>
                    )}
                  </button>
                </li>
              ))}
              {!shown.length && <li className="px-3 py-6 text-center text-[13px] text-muted">No models match.</li>}
            </ul>
          </div>
          {/* editor */}
          <div className="min-h-0 overflow-y-auto">
            {selected ? <ModelEditor key={selected.key} row={selected} /> : <div className="p-10 text-center text-[13px] text-muted">Choose a model.</div>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModelEditor({ row }: { row: ModelRow }) {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [candErr, setCandErr] = useState<string | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [flip, setFlip] = useState(false);
  const [highQuality, setHighQuality] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [fraction, setFraction] = useState<number | undefined>();
  const [preview, setPreview] = useState<{ url: string; token: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadCandidates = () => {
    setCandidates(null); setCandErr(null);
    fetch(`/api/vehicle/model-image/candidates?make=${encodeURIComponent(row.make)}&model=${encodeURIComponent(row.model)}`, { credentials: "same-origin" })
      .then(async (r) => { if (!r.ok) throw new Error(await r.text()); return r.json(); })
      .then((j) => setCandidates(j.items || []))
      .catch((e) => { setCandidates([]); setCandErr(e instanceof Error ? e.message : "Couldn't load suggestions"); });
  };
  useEffect(loadCandidates, [row.make, row.model]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  const pick = (c: Choice) => { setChoice(c); setPreview(null); };

  const prepare = async () => {
    if (!choice) return;
    setPreview(null); setFraction(undefined);
    try {
      // 1. the source picture
      setBusy("Getting the picture…");
      let source: Blob;
      if (choice.kind === "upload") source = choice.file;
      else {
        const r = await fetch(`/api/vehicle/model-image/source?url=${encodeURIComponent(choice.c.full)}`, { credentials: "same-origin" });
        if (!r.ok) throw new Error(await r.text());
        source = await r.blob();
      }
      // 2. high-quality cut-out in this browser (skipped for pictures that are already transparent)
      let toSend: Blob = source;
      const transparent = source.type === "image/png" || source.type === "image/webp" ? await hasTransparency(source) : false;
      if (highQuality && !transparent) {
        try {
          toSend = await cutOutInBrowser(source, (step, f) => { setBusy(step); setFraction(f); });
        } catch (e) {
          console.warn("[model pictures] in-browser cut-out failed, using the server's", e);
          toast.info("High-quality cut-out isn't available on this computer; using the standard one.");
          toSend = source;
        }
      }
      // 3. standard canvas on the server
      setBusy("Placing it on the standard canvas…"); setFraction(undefined);
      const form = new FormData();
      form.append("file", new File([toSend], toSend.type === "image/png" ? "picture.png" : choice.kind === "upload" ? choice.file.name : "picture.jpg", { type: toSend.type || "image/jpeg" }));
      if (flip) form.append("flip", "1");
      if (choice.kind === "commons") { form.append("credit", choice.c.credit); form.append("page", choice.c.page); form.append("origin", "commons"); }
      const res = await fetch("/api/vehicle/model-image/preview", { method: "POST", body: form, credentials: "same-origin" });
      if (!res.ok) throw new Error(await res.text());
      const token = res.headers.get("X-Preview-Token") || "";
      setPreview({ url: URL.createObjectURL(await res.blob()), token });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't prepare the picture");
    } finally {
      setBusy(null); setFraction(undefined);
    }
  };

  const approve = async () => {
    if (!preview) return;
    setBusy("Saving…");
    try {
      const res = await fetch("/api/vehicle/model-image", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: preview.token, make: row.make, model: row.model }),
      });
      if (!res.ok) throw new Error(await res.text());
      await refreshModelLibrary();
      toast.success(`Picture set for ${row.make} ${row.model} (${row.count} ${row.count === 1 ? "vehicle" : "vehicles"})`);
      setPreview(null); setChoice(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save the picture");
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!(await confirmAction({ title: "Remove this picture?", description: `${row.make} ${row.model} vehicles will show the brand placeholder until a new picture is set.`, confirmLabel: "Remove", tone: "danger" }))) return;
    setBusy("Removing…");
    try {
      const res = await fetch(`/api/vehicle/model-image?key=${encodeURIComponent(row.key)}`, { method: "DELETE", credentials: "same-origin" });
      if (!res.ok) throw new Error(await res.text());
      await refreshModelLibrary();
      toast.success("Picture removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove the picture");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* current / preview */}
      <section className="grid gap-4 lg:grid-cols-2">
        <figure className="flex flex-col gap-2">
          <figcaption className="text-[12.5px] font-semibold text-muted">Current picture</figcaption>
          <StudioPicture src={row.item?.url || null} className="aspect-[16/9] w-full rounded-lg border border-border" label={`${row.make} ${row.model}`} />
          <div className="flex min-h-7 items-center justify-between gap-2 text-[12px] text-muted">
            <span className="truncate">{row.item ? (row.item.credit || "Uploaded by your team") : "No picture yet: vehicles show the brand placeholder."}</span>
            {row.item && (
              <AppButton variant="ghost" size="sm" className="h-7 text-danger-text hover:bg-danger-soft" onClick={remove} disabled={!!busy} leftIcon={<Trash2 className="h-3.5 w-3.5" />}>
                Remove
              </AppButton>
            )}
          </div>
        </figure>
        <figure className="flex flex-col gap-2">
          <figcaption className="text-[12.5px] font-semibold text-muted">New picture</figcaption>
          <div className="relative">
            <StudioPicture src={preview?.url || null} className="aspect-[16/9] w-full rounded-lg border border-border" label="Preview" />
            {!preview && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-[13px]" style={{ color: STAGE_INK.muted }}>
                {busy ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                    <span role="status">{busy}</span>
                    {fraction !== undefined && (
                      <span className="h-1.5 w-48 overflow-hidden rounded-full" style={{ background: STAGE_INK.border }}>
                        <span className="block h-full rounded-full bg-theme-btn-primary transition-[width]" style={{ width: `${Math.round(fraction * 100)}%` }} />
                      </span>
                    )}
                  </>
                ) : (
                  <span>{choice ? "Ready. Prepare it to see the result." : "Upload the official picture below (recommended), or pick a free photo."}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AppButton variant="secondary" size="sm" className="h-8" onClick={() => { setFlip((f) => !f); setPreview(null); }} aria-pressed={flip} leftIcon={<FlipHorizontal2 className="h-3.5 w-3.5" />} disabled={!!busy}>
              {flip ? "Mirrored" : "Mirror"}
            </AppButton>
            <label className="inline-flex items-center gap-1.5 text-[12.5px] text-foreground">
              <input type="checkbox" checked={highQuality} onChange={(e) => { setHighQuality(e.target.checked); setPreview(null); }} disabled={!!busy} className="h-3.5 w-3.5 accent-[var(--theme-btn-primary)]" />
              High-quality edges
            </label>
            <span className="flex-1" />
            {preview ? (
              <AppButton variant="primary" size="sm" className="h-8" onClick={approve} disabled={!!busy} leftIcon={<Check className="h-3.5 w-3.5" />}>
                Use for {row.count} {row.count === 1 ? "vehicle" : "vehicles"}
              </AppButton>
            ) : (
              <AppButton variant="primary" size="sm" className="h-8" onClick={prepare} disabled={!choice || !!busy} isLoading={!!busy}>
                Prepare picture
              </AppButton>
            )}
          </div>
        </figure>
      </section>

      <p className="rounded-md border border-border bg-sunken px-3 py-2 text-[12.5px] text-muted">
        For the cleanest result use a <strong className="font-semibold text-foreground">front three-quarter or side view</strong> of the whole car with a plain background and
        no number plate showing, such as the manufacturer&apos;s press or configurator picture. Use <em>Mirror</em> so every car faces the same way.
      </p>

      {/* upload */}
      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] font-semibold text-heading">Upload the official picture</h3>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) { if (f.size > 10 * 1024 * 1024) toast.error("Use a picture under 10 MB"); else pick({ kind: "upload", file: f }); } e.target.value = ""; }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && /^image\/(jpeg|png|webp)$/.test(f.type)) pick({ kind: "upload", file: f }); else toast.error("Use a JPG, PNG or WebP picture"); }}
          className={`flex items-center gap-3 rounded-lg border border-dashed px-4 py-3 text-left transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${choice?.kind === "upload" ? "border-theme-btn-primary bg-accent-soft" : "border-border-active bg-sunken"}`}
        >
          {choice?.kind === "upload" ? <ImagePlus className="h-5 w-5 text-theme-btn-primary" aria-hidden /> : <Upload className="h-5 w-5 text-muted" aria-hidden />}
          <span className="min-w-0 flex-1 text-[13px]">
            <span className="block truncate font-medium text-heading">{choice?.kind === "upload" ? choice.file.name : "Drop a picture here or choose a file"}</span>
            <span className="block text-[12px] text-muted">JPG, PNG or WebP, up to 10 MB. A transparent PNG is used as it is.</span>
          </span>
        </button>
      </section>

      {/* suggestions */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-heading">Or use a free photo <span className="font-normal text-muted">(Wikimedia Commons: lower quality than official pictures)</span></h3>
          <AppButton variant="ghost" size="sm" className="h-7" onClick={loadCandidates} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>Refresh</AppButton>
        </div>
        {candidates === null ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[4/3] animate-pulse rounded-md bg-sunken" />)}
          </div>
        ) : candidates.length ? (
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
            {candidates.map((c) => {
              const on = choice?.kind === "commons" && choice.c.full === c.full;
              return (
                <li key={c.full}>
                  <button
                    type="button"
                    onClick={() => pick({ kind: "commons", c })}
                    aria-pressed={on}
                    title={`${c.title}\n${c.credit}`}
                    className={`group block w-full overflow-hidden rounded-md border bg-surface text-left transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${on ? "border-theme-btn-primary ring-2 ring-theme-btn-primary/30" : "border-border hover:border-border-active"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.thumb} alt={c.title} loading="lazy" referrerPolicy="no-referrer" className="aspect-[4/3] w-full object-cover" />
                    <span className="block truncate px-2 py-1.5 text-[11.5px] text-muted">{c.width}×{c.height} · {c.credit}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-md border border-border px-3 py-4 text-center text-[13px] text-muted">
            {candErr ? `Couldn't load suggestions: ${candErr}` : "No suitable photos found for this model. Upload the official picture instead."}
          </p>
        )}
      </section>
    </div>
  );
}

async function hasTransparency(blob: Blob): Promise<boolean> {
  try {
    const bmp = await createImageBitmap(blob);
    const c = document.createElement("canvas"); c.width = 96; c.height = 54;
    const g = c.getContext("2d", { willReadFrequently: true })!;
    g.drawImage(bmp, 0, 0, 96, 54); bmp.close?.();
    const d = g.getImageData(0, 0, 96, 54).data;
    let clear = 0; for (let i = 3; i < d.length; i += 4) if (d[i] < 16) clear++;
    return clear / (96 * 54) > 0.08;
  } catch { return false; }
}

export default ModelPicturesButton;
