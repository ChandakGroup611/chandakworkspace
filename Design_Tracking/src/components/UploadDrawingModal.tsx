"use client";

import React, { useState, useRef, useEffect } from "react";
import { DesignDiscipline, DrawingItem } from "../types";
import { DesignMasterStore } from "../services/designMasterStore";
import { 
  Upload, 
  FileText, 
  Building2, 
  Tag, 
  Save, 
  Eye, 
  Download, 
  Trash2, 
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Pencil
} from "lucide-react";
import { RecordModeProvider, RecordFieldset, type RecordMode } from "@/components/ui/record";
import { TransactionFormLayout } from "./DesignTransactionLayout";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { toast } from "react-toastify";
import { fetchDmacSetupAction, submitNewDrawingAction, type DmacSetup } from "@/lib/actions/dmac-drawings";

interface UploadDrawingModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the new drawing's register id once it is registered (and R0 submitted). */
  onDrawingUploaded: (drawingRef: string) => void;
  /** Record standard: the saved drawing, for view / edit in this same form. */
  drawing?: DrawingItem | null;
  /** create (default) · view (read-only) · edit (details only; file and revision change through Review) */
  recordMode?: RecordMode;
  onDrawingUpdated?: (drawing: DrawingItem) => void;
  /** View mode: switch to edit. */
  onEdit?: () => void;
  /** View / edit mode: open the attached source file. */
  onOpenFile?: (drawing: DrawingItem) => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const UploadDrawingModal: React.FC<UploadDrawingModalProps> = ({
  isOpen,
  onClose,
  onDrawingUploaded,
  drawing = null,
  recordMode = "create",
  onDrawingUpdated,
  onEdit,
  onOpenFile
}) => {
  const projects = DesignMasterStore.getUserAccessibleProjects();
  const d = recordMode === "create" ? null : drawing;
  const isCreate = recordMode === "create";
  const [code, setCode] = useState(d?.code || "");
  const [referenceNumber, setReferenceNumber] = useState(d?.referenceNumber || "");
  const [title, setTitle] = useState(d?.title || "");
  const [discipline, setDiscipline] = useState<DesignDiscipline>((d?.discipline as DesignDiscipline) || "Architectural");
  const [project, setProject] = useState(d?.project || projects[0]?.name || "");
  const [revision, setRevision] = useState(d?.revision || "R0");
  const [consultant, setConsultant] = useState(d?.consultant || "");
  const [subPackage, setSubPackage] = useState(d?.subPackage || "");
  const [drawingType, setDrawingType] = useState(d?.drawingType || "");
  const [drawingDate, setDrawingDate] = useState(d?.drawingDate || "");
  const [description, setDescription] = useState(d?.description || "");
  const [fileSize, setFileSize] = useState(d?.fileSize || "");
  const [fileTypeLabel, setFileTypeLabel] = useState(d?.fileType || "");
  const [submitting, setSubmitting] = useState(false);

  // Review-loop fields (create only): where the sheet sits and when it is due
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [setup, setSetup] = useState<DmacSetup | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [buildingId, setBuildingId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [floorIds, setFloorIds] = useState<string[]>([]);
  const [plannedSubmission, setPlannedSubmission] = useState("");
  const [plannedApproval, setPlannedApproval] = useState("");

  useEffect(() => {
    if (!isCreate || !projectId) return;
    let live = true;
    setSetup(null);
    setSetupError(null);
    fetchDmacSetupAction(projectId).then((res) => {
      if (!live) return;
      if (!res.success) { setSetupError(res.error); return; }
      setSetup(res.data);
      const firstTower = res.data.buildings.find((b) => b.code !== "GEN") || res.data.buildings[0];
      setBuildingId(firstTower?.id || "");
      setFloorIds([]);
      const match = res.data.departments.find((dep) => dep.name.toLowerCase().startsWith(discipline.toLowerCase().slice(0, 4)));
      setDepartmentId((cur) => (res.data.departments.some((x) => x.id === cur) ? cur : match?.id || res.data.departments[0]?.id || ""));
    });
    return () => { live = false; };
  }, [isCreate, projectId]);

  const masterState = DesignMasterStore.getState();
  const activeDept = setup?.departments.find((dep) => dep.id === departmentId);
  const subPackageOptions = (masterState.packages || []).filter((pkg) => {
    if (!activeDept) return true;
    const dName = activeDept.name.toLowerCase();
    const dCode = activeDept.code.toLowerCase();
    return (
      pkg.disciplineName.toLowerCase().includes(dName) ||
      dName.includes(pkg.disciplineName.toLowerCase()) ||
      pkg.packageCode.toLowerCase().startsWith(dCode)
    );
  });
  const scopedConsultants = (masterState.consultants || []).filter((c) => {
    const matchesProject = !projectId || !c.activeProjects?.length || c.activeProjects.includes(projectId);
    if (!matchesProject) return false;
    if (!activeDept) return true;
    const dName = activeDept.name.toLowerCase();
    return (
      String(c.category || "").toLowerCase().includes(dName) ||
      (c.categories || []).some((x) => x.toLowerCase().includes(dName)) ||
      (c.expertise || []).some((x) => x.toLowerCase().includes(dName))
    );
  });
  const consultantOptions = scopedConsultants.length > 0 ? scopedConsultants : (masterState.consultants || []);

  const building = setup?.buildings.find((b) => b.id === buildingId);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Staged local file state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (file: File | null) => {
    setUploadError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (!file) {
      setSelectedFile(null);
      setFileSize("");
      setFileTypeLabel("");
      return;
    }
    setSelectedFile(file);
    const formatted = formatBytes(file.size);
    setFileSize(formatted);
    const ext = file.name.split(".").pop()?.toUpperCase() || "";
    setFileTypeLabel(file.type ? `${ext ? `${ext} · ` : ""}${file.type}` : ext || "Unknown");
    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);

    // Auto-fill drawing sheet title if empty
    if (!title.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setTitle(baseName);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handlePreviewFile = () => {
    if (previewUrl) {
      window.open(previewUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownloadStagedFile = () => {
    if (previewUrl && selectedFile) {
      const a = document.createElement("a");
      a.href = previewUrl;
      a.download = selectedFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (recordMode === "view") { onEdit?.(); return; }
    if (!title.trim() || (!isCreate && !code.trim())) return;

    // Edit: details only. The sheet code, revision and file change through Review / a new revision.
    if (recordMode === "edit" && d) {
      onDrawingUpdated?.({
        ...d,
        title: title.trim(),
        discipline,
        project: project || d.project,
        consultant: consultant.trim() || d.consultant,
        subPackage: subPackage.trim() || undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        drawingDate: drawingDate || undefined,
        drawingType: drawingType || undefined,
        fileSize: d.fileSize,
        description: description.trim() || undefined,
      });
      onClose();
      return;
    }

    if (!selectedFile) { setUploadError("Attach the drawing sheet for R0."); return; }
    if (!departmentId || !buildingId) { setUploadError("Pick the building and discipline."); return; }
    if (referenceNumber.trim().length > 100) { setUploadError("Reference number cannot exceed 100 characters."); return; }
    if (referenceNumber.trim() && !/^[a-zA-Z0-9\-_/. ]+$/.test(referenceNumber.trim())) {
      setUploadError("Reference number can only contain letters, numbers, spaces, and - _ / .");
      return;
    }

    setSubmitting(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("projectId", projectId);
      fd.append("buildingId", buildingId);
      fd.append("departmentId", departmentId);
      fd.append("floorIds", JSON.stringify(floorIds));
      if (floorIds[0]) fd.append("primaryFloorId", floorIds[0]);
      fd.append("title", title.trim());
      if (referenceNumber.trim()) fd.append("referenceNumber", referenceNumber.trim());
      if (subPackage.trim()) fd.append("subPackage", subPackage.trim());
      if (drawingType) fd.append("drawingType", drawingType);
      if (drawingDate) fd.append("drawingDate", drawingDate);
      fd.append("plannedSubmissionDate", plannedSubmission);
      fd.append("plannedApprovalDate", plannedApproval);
      fd.append("consultantName", consultant.trim());
      fd.append("changeSummary", description.trim());
      fd.append("file", selectedFile);

      const res = await submitNewDrawingAction(fd);
      if (!res.success) throw new Error(res.error);
      if (res.data.submitted) {
        toast.success(`${res.data.drawingNumber} registered and R0 sent for review.`);
      } else {
        toast.warning(`${res.data.drawingNumber} is registered, but R0 wasn't submitted: ${res.data.submitError}. Open it from the register to submit the file.`);
      }
      onDrawingUploaded(res.data.drawingRef);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSubmitting(false);
      onClose();
    } catch (err: any) {
      console.error("Drawing upload error:", err);
      setUploadError(err.message || "An error occurred while uploading drawing.");
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedFile(null);
    setCode("");
    setReferenceNumber("");
    setTitle("");
    setDiscipline("Architectural");
    setRevision("R0");
    setConsultant("");
    setSubPackage("");
    setDrawingType("");
    setDrawingDate("");
    setDescription("");
    setFileSize("");
    setFileTypeLabel("");
    setUploadError(null);
  };

  return (
    <RecordModeProvider mode={recordMode}>
    <TransactionFormLayout
      title={isCreate ? "Upload drawing sheet" : recordMode === "edit" ? `Edit drawing · ${d?.code ?? ""}` : `${d?.code ?? "Drawing"} · ${d?.title ?? ""}`}
      badge={isCreate ? "Drawing Register Transaction" : recordMode === "edit" ? "Editing" : d?.status ?? "Viewing"}
      category="Design Tracking"
      icon={Upload}
      iconBg="bg-success-soft text-success-text border-success-border"
      description="Register new CAD, DWG, DXF, STEP, or PDF revision into the official drawing control register."
      breadcrumbs={[
        { label: "Drawing Register", onClick: onClose },
        { label: isCreate ? "Upload drawing sheet" : d?.code ?? "Drawing" }
      ]}
      onBack={onClose}
      backLabel="Back to Drawing Register"
      onReset={isCreate ? handleReset : undefined}
      onSave={recordMode === "view" && !onEdit ? undefined : handleSubmit}
      saveLabel={isCreate ? "Register and submit R0" : recordMode === "edit" ? "Save changes" : "Edit"}
      saveIcon={recordMode === "view" ? Pencil : Save}
      isSubmitting={submitting}
      isSaveDisabled={isCreate ? !title.trim() || !selectedFile || !buildingId || !departmentId : !code.trim() || !title.trim()}
    >
      <RecordFieldset className="space-y-6 max-w-4xl">
        {uploadError && (
          <div className="p-3.5 rounded-lg border border-danger-border bg-danger-soft text-danger-text text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Section 1: Project & Discipline Specs */}
        <AppCard className="border-border shadow-xs">
          <AppCardHeader className="bg-surface/50 border-b border-border pb-3">
            <AppCardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-success-text" />
              <span>Project & discipline classification</span>
            </AppCardTitle>
          </AppCardHeader>
          <AppCardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Target project *</label>
                <select
                  value={isCreate ? projectId : project}
                  disabled={!isCreate}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    setProject(projects.find((p) => p.id === e.target.value)?.name || "");
                  }}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-primary font-semibold"
                >
                  {projects.map(p => (
                    <option key={p.id} value={isCreate ? p.id : p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Engineering discipline *</label>
                {isCreate ? (
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-semibold cursor-pointer"
                  >
                    {(setup?.departments || []).map((dep) => (
                      <option key={dep.id} value={dep.id}>{dep.name} ({dep.code})</option>
                    ))}
                  </select>
                ) : (
                <select
                  value={discipline}
                  onChange={(e) => setDiscipline(e.target.value as DesignDiscipline)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-semibold cursor-pointer"
                >
                  <option value="Architectural">Architectural (General Arrangement)</option>
                  <option value="Structural">Structural (RCC & Steel)</option>
                  <option value="MEP">MEP (mech / elec / plumbing / HVAC)</option>
                  <option value="Civil">Civil / infrastructure & site grading</option>
                  <option value="Façade">Façade & curtain wall detailing</option>
                  <option value="Landscape">Landscape & hardscape works</option>
                  <option value="Interior">Interior / common area finishes</option>
                  <option value="BIM">BIM & 3d clash coordination</option>
                </select>
                )}
              </div>
            </div>
            {isCreate && setupError && (
              <div className="p-2.5 rounded-lg border border-warning-border bg-warning-soft/60 text-warning-text text-xs">
                {setupError}
              </div>
            )}
            {isCreate && setup?.reviewWarning && (
              <div className="p-2.5 rounded-lg border border-warning-border bg-warning-soft/60 text-warning-text text-xs">
                {setup.reviewWarning}
              </div>
            )}
            {isCreate && setup && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Building / tower *</label>
                    <select
                      value={buildingId}
                      onChange={(e) => { setBuildingId(e.target.value); setFloorIds([]); }}
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground font-semibold cursor-pointer"
                    >
                      {setup.buildings.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Planned submission</label>
                    <input type="date" value={plannedSubmission} onChange={(e) => setPlannedSubmission(e.target.value)}
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Planned approval</label>
                    <input type="date" value={plannedApproval} min={plannedSubmission || undefined} onChange={(e) => setPlannedApproval(e.target.value)}
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground" />
                  </div>
                </div>
                {building && building.floors.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Floors this sheet covers <span className="font-normal text-muted-foreground">(first ticked is the primary floor; pick several for a typical-floor sheet)</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[...building.floors].reverse().map((f) => {
                        const on = floorIds.includes(f.id);
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setFloorIds((cur) => (on ? cur.filter((x) => x !== f.id) : [...cur, f.id]))}
                            className={`h-7 px-2.5 rounded-md border text-[11px] font-mono font-semibold cursor-pointer ${
                              on ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {f.code}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </AppCardContent>
        </AppCard>

        {/* Section 2: Drawing Identity & Revision Details */}
        <AppCard className="border-border shadow-xs">
          <AppCardHeader className="bg-surface/50 border-b border-border pb-3">
            <AppCardTitle className="text-sm font-semibold flex items-center gap-2">
              <Tag className="h-4 w-4 text-success-text" />
              <span>Drawing sheet identification</span>
            </AppCardTitle>
          </AppCardHeader>
          <AppCardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Drawing number
                </label>
                <input
                  type="text"
                  value={isCreate ? "" : code}
                  disabled
                  readOnly
                  placeholder="Auto-generated on upload"
                  className="w-full h-10 rounded-lg border border-border bg-sunken px-3 text-xs text-muted-foreground font-mono disabled:opacity-80 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Reference number <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  maxLength={100}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. EXT-REF-2026-01"
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Revision *</label>
                <input
                  type="text"
                  required
                  value={isCreate ? "R0" : revision}
                  disabled
                  readOnly
                  placeholder="e.g. R0, R1"
                  className="w-full h-10 rounded-lg border border-border bg-sunken px-3 text-xs text-muted-foreground font-mono disabled:opacity-80 cursor-not-allowed"
                />
              </div>
            </div>
            {recordMode === "edit" && (
              <p className="text-[11px] text-muted-foreground">
                Drawing number and revision are fixed once registered. A new revision or file goes through Review.
              </p>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Drawing title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Tower 1 - typical floor architectural general arrangement plan"
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Drawing type</label>
                <select
                  value={drawingType}
                  onChange={(e) => setDrawingType(e.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">Select type (optional)</option>
                  <option value="General Arrangement">General Arrangement</option>
                  <option value="Detail Drawing">Detail Drawing</option>
                  <option value="Shop Drawing">Shop Drawing</option>
                  <option value="Section / Elevation">Section / Elevation</option>
                  <option value="Schematic">Schematic</option>
                  <option value="As-Built">As-Built</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Sub-package</label>
                {subPackageOptions.length > 0 ? (
                  <select
                    value={subPackage}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSubPackage(val);
                      const matched = subPackageOptions.find((p) => (p.subPackageName || p.packageName) === val);
                      if (matched?.defaultConsultant && !consultant.trim()) {
                        setConsultant(matched.defaultConsultant);
                      }
                    }}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="">Select sub-package (optional)</option>
                    {subPackageOptions.map((p) => {
                      const label = p.subPackageName || p.packageName;
                      return (
                        <option key={p.id} value={label}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={subPackage}
                    onChange={(e) => setSubPackage(e.target.value)}
                    placeholder="e.g. Podium / Core / Facade"
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Drawing date</label>
                <input
                  type="date"
                  value={drawingDate}
                  onChange={(e) => setDrawingDate(e.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Consultant / firm author</label>
                {consultantOptions.length > 0 ? (
                  <select
                    value={consultant}
                    onChange={(e) => setConsultant(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="">Select consultant (optional)</option>
                    {consultantOptions.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} {c.category ? `(${c.category})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={consultant}
                    onChange={(e) => setConsultant(e.target.value)}
                    placeholder="e.g. Hafeez contractor / MEP design partners"
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground block">File metadata</span>
                <div className="min-h-10 rounded-lg border border-border bg-sunken px-3 py-2 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono">
                    {fileSize ? `File Size: ${fileSize}` : "File size will be calculated after file selection"}
                  </span>
                  {fileTypeLabel && (
                    <span className="text-[11px] font-mono text-foreground">{fileTypeLabel}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Revision change summary & markup notes</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail key structural revisions, grid changes, clash resolution fixes…"
                className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </AppCardContent>
        </AppCard>

        {/* Section 3: Interactive File Attachment Dropzone with Zero Blind Uploads */}
        <AppCard className="border-border shadow-xs">
          <AppCardHeader className="bg-surface/50 border-b border-border pb-3">
            <AppCardTitle className="text-sm font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-success-text" />
                <span>Digital CAD / PDF file attachment</span>
              </div>
              <span className="text-[11px] font-normal text-muted-foreground">
                Supported: PDF, DWG, DXF, ZIP, PNG, JPG, TIFF (up to 28 MB)
              </span>
            </AppCardTitle>
          </AppCardHeader>
          <AppCardContent className="p-5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.dwg,.dxf,.zip,.png,.jpg,.jpeg,.tif,.tiff"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileChange(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            {!isCreate ? (
              <div className="p-4 rounded-lg border border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-success-soft text-success-text flex items-center justify-center shrink-0 border border-success-border">
                    <Paperclip className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">
                      {d?.fileName || (d?.fileUrl ? "Attached drawing file" : "No file attached")}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      {d?.fileSize || "—"} · Rev {d?.revision} · submitted {d?.submittedDate}
                    </div>
                  </div>
                </div>
                {d?.fileUrl && onOpenFile && (
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); onOpenFile(d); }}
                    className="h-8 px-2.5 rounded-lg border border-border bg-background hover:bg-surface-hover text-foreground text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Open file</span>
                  </a>
                )}
              </div>
            ) : !selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
                className={`p-8 rounded-lg border-2 border-dashed transition-all text-center space-y-3 cursor-pointer ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/10 bg-muted/5"
                }`}
              >
                <div className="h-12 w-12 rounded-lg bg-success-soft text-success-text flex items-center justify-center mx-auto border border-success-border">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Click to browse or drag and drop drawing file
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Stored privately with a SHA-256 checksum • Up to 28 MB
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-success-soft text-success-text flex items-center justify-center shrink-0 border border-success-border">
                    <Paperclip className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate select-all">
                      {selectedFile.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-2 mt-0.5">
                      <span>{fileSize}</span>
                      <span>•</span>
                      <span className="text-success-text flex items-center gap-0.5 font-semibold">
                        <CheckCircle2 className="h-3 w-3" /> Ready for upload
                      </span>
                    </div>
                  </div>
                </div>

                {/* Staged File Action Buttons (Mandatory Zero Blind Upload Verification) */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handlePreviewFile}
                    className="h-8 px-2.5 rounded-lg border border-border bg-background hover:bg-surface-hover text-foreground text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="View staged document in preview"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadStagedFile}
                    className="h-8 px-2.5 rounded-lg border border-border bg-background hover:bg-surface-hover text-foreground text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Download staged document"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>

                  <button aria-label="Remove selected file"
                    type="button"
                    onClick={() => handleFileChange(null)}
                    className="h-8 w-8 rounded-lg hover:bg-danger-soft text-muted-foreground hover:text-danger-text inline-flex items-center justify-center transition-colors cursor-pointer"
                    title="Remove selected file"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </AppCardContent>
        </AppCard>
      </RecordFieldset>
    </TransactionFormLayout>
    </RecordModeProvider>
  );
};

