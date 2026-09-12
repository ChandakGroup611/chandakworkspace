# Product Requirements Document (PRD): Design & Engineering Tracking Module
## Based on: Chandak Group — EY Tender Design Tracker R2

**Document Version**: 2.0.0  
**Source Reference**: `D:\adios\Design_Tracking\EY Tender Design tracker R2.xlsx`  
**Target Organization**: Chandak Group — Digital Real Estate & Construction Engineering  
**Module Identifier**: `DESIGN_TRACKING`  
**Classification**: Enterprise Core Module  

---

## 1. Executive Summary & Objective

The **Design & Engineering Tracking** module digitizes the real-world **EY Tender Design Tracker R2** spreadsheet used by Chandak Group project directors, design managers, and procurement teams.

It tracks tender design packages, stage-gate deliverables, 30/60-day look-ahead execution requirements, and statutory authority liaisoning onboarding across all **11 Chandak Development Projects** and their **24 individual towers/wings**.

---

## 2. Chandak Development Projects & Tower Wings Matrix

The system tracks design packages across 11 key Chandak developments:

| Project Name | Towers / Wings | Type / Phase |
| :--- | :--- | :--- |
| **JB NAGAR** | `SOCIETY`, `SALE - DEF` | Society Rehab & Sale Towers |
| **KRIPANAGAR** | `PLOT-A`, `PLOT-B` | Master Planned Plots |
| **CHEMBUR** | `SALE 1,2,7,8`, `REHAB-4` | Multi-Wing Sale & Rehab |
| **KALINA-1** | `REHAB 1`, `SOCIETY`, `COMMERCIAL` | Integrated Mixed-Use |
| **KALINA-2** | `REHAB`, `COMMERCIAL` | Commercial & Rehab Wings |
| **RBD TOWER-E** | `SALE` | Luxury High-Rise Sale |
| **NISCHAY** | `PTC`, `HOSTEL` | Transit Camp & Hostel Wings |
| **MERU** | `REHAB`, `COMMERCIAL` | Mixed Commercial & Rehab |
| **VANRAI** | `SOCIETY`, `SALE` | Society & Sale Towers |
| **KANHERI** | `SOCIETY`, `SALE`, `REHAB`, `COMMERCIAL` | Mega Quad-Wing Development |
| **WORLI** | `SRA`, `SALE` | SRA Scheme & Prime Sale |

---

## 3. Work Packages & Engineering Disciplines

The tracker covers 65 individual design & tender packages across 7 major engineering disciplines:

### 3.1 Civil, Structural & Geotechnical
- **Soil Investigation**: Bore log & Geotechnical soil investigation report.
- **Geotechnical Works**: Shore Piling Works, Foundation Rock Anchoring, Inclined Rock Anchoring.
- **Structural Works**: Excavation Drawings, Core & Shell works, Blockwork, Expansion Joint systems, Mivan Formwork engineering, Post-Tensioned (PT) slab works.

### 3.2 MEP & Environmental Services
- **Plumbing**: Internal & external plumbing works, Plumbing pump schedules.
- **Electrical**: HT/LT distribution works, Electrical main panels, Electrical infra substation works, Aviation warning lights, Solar photovoltaic panels, DG set backup power.
- **Fire Life Safety**: Fire fighting circuits, Fire Alarm & Public Address (PA) system, Fire pump installation.
- **HVAC**: Mechanical ventilation and basement HVAC exhaust ducting.
- **Specialist Building Systems**: Lightning Protection System (LPS), BMS / CCTV / Access control, Storm Water Drainage (SWD), Organic Waste Composter (OWC), Sewage Treatment Plant (STP).

### 3.3 Vertical Transportation & Parking
- Passenger lifts & escalators (speed, cab interiors, shaft specs).
- Mechanical puzzle & stack car parking systems.

### 3.4 Facade Engineering
- Aluminium windows & glazing systems (BOQ & structural wind load).
- Exterior fins & GRC (Glass Reinforced Concrete) architectural cladding.
- Balcony & terrace glass railing systems.

### 3.5 Architectural & Civil Finishing
- Core architectural layouts & door window schedules.
- Flooring, tiling & dado material specs.
- Internal & external painting schemes.
- MS & SS railings (Window/Staircase).
- CP & sanitary fixture schedules.
- Parking & ramp VDF/Tremix flooring.
- Lift lobby finishings.

### 3.6 Interior & Amenity Detailing
- Clubhouse & amenity spaces.
- Double-height entrance lobbies.
- Decorative lighting, loose furniture & artefacts.
- Sales experience centre & show apartments.

### 3.7 Landscape Architecture
- Podium gardens & ground landscape grading.
- Compound wall, main security gates, and internal concrete roads.

### 3.8 High-Rise & Specialist Advisory Studies
- Traffic impact analysis & internal circulation.
- Flood risk analysis & finished floor level recommendations.
- IGBC Green Building compliance.
- MOEF / SEAC Environmental Clearance compliance.
- High Rise Committee (HRC) clearances (>180m height).
- Boundary layer wind tunnel testing (>180m height).
- Geotechnical & Structural third-party peer review (>120m height).

---

## 4. Key Functional Views

### 4.1 Master Tender Design Matrix
- Real-time cross-tabulation of all 65 packages against 24 project towers.
- Frozen work package column with horizontal scrolling.
- Filtering by Project, Engineering Discipline, and Package Status.
- Statuses:
  - 🟢 **Received**: Tender drawing & BOQ released.
  - 🟡 **In Progress / Onboard**: Consultant onboarded, drafting on-track.
  - 🔴 **Pending / Action Required**: Tender blocked, urgent consultant intervention required.
  - 🔵 **Target Date**: Specific target milestone (e.g. `30-Aug`, `10-Sep`).
  - ⚪ **Not Applicable (NA)**: Scope not applicable to the specific wing.

### 4.2 30-Day & 60-Day Look-Ahead Dashboard
- Grouped by Project & Tower to highlight immediate tender roadblocks.
- Clear urgency badges distinguishing 30-day critical items from 60-day forecasts.

### 4.3 Statutory Liaisoning & NOC Matrix
- Onboarding status of 25 statutory authorities and consultants across all projects.
- Tracks: Liaisoning Architect, RERA, TPQA, Site Supervisor, PMC, Tree NOC, Surveyor, Civil Aviation, Borewell, Road NOC, Railway NOC, CRZ, CFO Fire, Revenue & Valuation, Electric & HT Line.

### 4.4 5-Stage Design Milestone Roadmap
1. **Stage 1: Feasibility** (Surveyor, Liaison Architect, Revenue, NOC analysis).
2. **Stage 2: Concept Design Freeze (20-30%)** (Architect, Green Building, Environment, Traffic, Flood).
3. **Stage 3: Design Basis Freeze (30-40%)** (Geotechnical report, Structural DBR, MEP concept).
4. **Stage 4: Tender Design & BOQ Freeze (60-70%)** (Tender packages, BOQ, specifications).
5. **Stage 5: Good For Construction (GFC) (100%)** (Execution blueprints, shop drawing approvals).
