# 📐 Design & Engineering Tracking Module (Chandak Workspace)

Comprehensive design management, architectural drawing registers, CAD revisions, stage-gate consultant approvals, and site **Good For Construction (GFC)** release tracking for Chandak Group real estate developments.

---

## 🏗️ Core Capabilities

1. **Integrated Drawing Register**:
   - Central repository for all active projects (*Chandak Stella*, *Chandak Highscape City*, *Chandak GreenAir*, *Chandak 34 Park Estate*).
   - Segregation across 5 technical disciplines:
     - 🏛️ **Architectural** (Floor plans, elevations, section details, facade specs)
     - 🏗️ **Structural** (Raft foundation, column schedules, slab reinforcement, shear walls)
     - ⚡ **MEP** (HVAC ducting, electrical risers, plumbing layout, firefighting)
     - 🌿 **Landscape** (Podium gardens, storm-water grading, paving layouts)
     - 🛋️ **Interior & Finishing** (Clubhouse, sample flats, lobby detailing)

2. **Stage-Gate Revision & Approval Workflow**:
   - Lifecycle progression: `Draft / Submission` ➔ `Under Review` ➔ `Revision Requested` ➔ `Approved (GFC)` ➔ `Site Handed Over`.
   - Strict version numbering: `R0`, `R1`, `R2`, `R3`, through `R-GFC`.
   - Consultant markup attachment tracking and peer-review audits.

3. **GFC (Good For Construction) Site Handover**:
   - Digital stamping and QR-verifiable site execution authorization.
   - Physical drawing blueprint dispatch log and contractor receipt acknowledgment.

4. **External Consultant Directory**:
   - Directory of registered architects, structural designers, MEP consultants, and environmental planners with active SLA metrics and revision turnaround times.

---

## 📁 Module Directory Structure

```
Design_Tracking/
├── docs/
│   ├── DESIGN_TRACKING_PRD.md        # Detailed Product Requirements Document
│   └── ARCHITECTURE_GUIDE.md         # Database entities, API contracts & security roles
├── supabase/
│   └── migrations/
│       └── 20260912120000_design_tracking_core.sql # Schema definitions
└── src/
    ├── types/
    │   └── index.ts                  # Domain models & TypeScript interfaces
    ├── components/
    │   ├── DrawingRegister.tsx       # Filterable drawing table by discipline & status
    │   ├── UploadDrawingModal.tsx    # CAD/PDF upload & metadata tagging
    │   ├── ReviewApprovalModal.tsx   # Consultant review & GFC stamping dialog
    │   ├── GfcHandoverView.tsx       # Site handover release logs
    │   └── ConsultantDirectory.tsx   # Consultant directory & performance tracking
    ├── services/
    │   └── designService.ts          # Server actions & Supabase data layer
    └── mock/
        └── designMockData.ts         # High-fidelity Chandak project drawing registers
```

---

## 🔗 Integration with Next.js Host

The module is exposed in the main Chandak Workspace portal under `/design`:
- **Route Endpoint**: `app/design/[[...slug]]/page.tsx`
- **Host Component**: `components/design/DesignTrackingHost.tsx`
- **Module Code**: `DESIGN_TRACKING` in `public.multi_modules`
