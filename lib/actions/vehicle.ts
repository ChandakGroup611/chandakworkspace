"use server";

/**
 * ==============================================================================
 * Vehicle / FleetDesk Module — Server Actions Backend Layer
 * 
 * Strict Architectural Isolation Rules:
 * 1. Independent domain — ZERO dependency on Workspace Module tables or rules.
 * 2. ONLY shared foundation is User Master + IAM for authentication & authorization.
 * 3. Bounded, optimized queries with database-side filtering and no N+1 query patterns.
 * 4. All operations are module-local; no global workspace refresh triggers.
 * ==============================================================================
 */

import { getCachedUser } from "@/lib/auth/cached-user";
import { supabaseAdmin } from "@/lib/supabase/service_role";

async function getAuthenticatedUser() {
  try {
    const { user } = await getCachedUser();
    return user || null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------------------
// Types & Contracts
// ------------------------------------------------------------------------------

export interface VehicleDashboardStats {
  totalVehicles: number;
  availableVehicles: number;
  onRouteVehicles: number;
  inMaintenanceVehicles: number;
  activeDrivers: number;
  activeTrips: number;
}

export interface VehicleRecord {
  id: string;
  category: string;
  make: string;
  model: string;
  variant: string;
  registration_number: string;
  status: string;
  odometer_km: number;
  paint_color?: string | null;
  image_url?: string | null;
  nickname?: string | null;
  has_roadside_assistance?: boolean;
  has_hsrp_plate?: boolean;
  created_at?: string;
  assignedDriver?: {
    id: string;
    full_name: string;
    phone: string;
  } | null;
  compliance?: {
    pucExpiry?: string | null;
    insuranceExpiry?: string | null;
  };
}

export interface DriverRecord {
  id: string;
  full_name: string;
  license_number: string;
  license_expiry_date: string;
  phone: string;
  is_active: boolean;
  assigned_vehicle_id?: string | null;
  emergency_contact?: string | null;
  experience_years?: number;
}

export interface TripRecord {
  id: string;
  trip_code?: string;
  vehicle_id: string;
  vehicle_reg?: string;
  driver_id: string;
  driver_name?: string;
  traveler_name: string;
  purpose: string;
  origin: string;
  destination: string;
  planned_start_time: string;
  planned_end_time: string;
  plan_date: string;
  status: string;
  created_at?: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  vehicle_reg?: string;
  service_type: string;
  service_center: string;
  service_date: string;
  odometer_km: number;
  cost: number;
  next_service_due_date?: string | null;
  status?: string;
  created_at?: string;
}

// ------------------------------------------------------------------------------
// 1. Dashboard KPI Aggregations (Single-query parallel database counts)
// ------------------------------------------------------------------------------

export async function fetchVehicleDashboardStats(): Promise<{
  success: boolean;
  stats: VehicleDashboardStats;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return {
        success: false,
        stats: {
          totalVehicles: 0,
          availableVehicles: 0,
          onRouteVehicles: 0,
          inMaintenanceVehicles: 0,
          activeDrivers: 0,
          activeTrips: 0
        },
        error: "Unauthenticated request"
      };
    }

    // Run parallel count queries on indexed status columns
    const [
      totalRes,
      availableRes,
      inServiceRes,
      maintenanceVehiclesRes,
      driversRes,
      tripsRes
    ] = await Promise.all([
      supabaseAdmin.from("vehicles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "IN_STOCK"),
      supabaseAdmin.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "IN_SERVICE"),
      supabaseAdmin.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "MAINTENANCE"),
      supabaseAdmin.from("drivers").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabaseAdmin.from("trip_plans").select("*", { count: "exact", head: true }).eq("status", "IN_PROGRESS")
    ]);

    return {
      success: true,
      stats: {
        totalVehicles: totalRes.count || 0,
        availableVehicles: availableRes.count || 0,
        onRouteVehicles: inServiceRes.count || 0,
        inMaintenanceVehicles: maintenanceVehiclesRes.count || 0,
        activeDrivers: driversRes.count || 0,
        activeTrips: tripsRes.count || 0
      }
    };
  } catch (err: any) {
    console.error("[vehicle-actions] fetchVehicleDashboardStats error:", err);
    return {
      success: false,
      stats: {
        totalVehicles: 0,
        availableVehicles: 0,
        onRouteVehicles: 0,
        inMaintenanceVehicles: 0,
        activeDrivers: 0,
        activeTrips: 0
      },
      error: err.message || "Failed to load vehicle dashboard statistics"
    };
  }
}

// ------------------------------------------------------------------------------
// 2. Vehicles Fleet Query & CRUD
// ------------------------------------------------------------------------------

export async function fetchVehiclesList(params?: {
  search?: string;
  status?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  success: boolean;
  vehicles: VehicleRecord[];
  totalCount: number;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { success: false, vehicles: [], totalCount: 0, error: "Unauthenticated" };
    }

    const page = Math.max(1, params?.page || 1);
    const pageSize = Math.min(50, Math.max(1, params?.pageSize || 25));
    const offset = (page - 1) * pageSize;

    let query = supabaseAdmin
      .from("vehicles")
      .select(`
        id,
        category,
        make,
        model,
        variant,
        registration_number,
        status,
        odometer_km,
        paint_color,
        image_url,
        nickname,
        has_roadside_assistance,
        has_hsrp_plate,
        created_at
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (params?.status && params.status !== "ALL") {
      query = query.eq("status", params.status);
    }

    if (params?.category && params.category !== "ALL") {
      query = query.eq("category", params.category);
    }

    if (params?.search && params.search.trim()) {
      const s = params.search.trim();
      query = query.or(`registration_number.ilike.%${s}%,make.ilike.%${s}%,model.ilike.%${s}%`);
    }

    const { data: rawVehicles, count, error } = await query;
    if (error) {
      console.error("[vehicle-actions] fetchVehiclesList error:", error);
      return { success: false, vehicles: [], totalCount: 0, error: error.message };
    }

    const vehiclesList = (rawVehicles || []) as VehicleRecord[];
    if (vehiclesList.length === 0) {
      return { success: true, vehicles: [], totalCount: count || 0 };
    }

    // Controlled Batch Lookup: Drivers assigned to these vehicles (eliminates N+1)
    const vehicleIds = vehiclesList.map((v) => v.id);
    const { data: driversData } = await supabaseAdmin
      .from("drivers")
      .select("id, full_name, phone, assigned_vehicle_id")
      .in("assigned_vehicle_id", vehicleIds)
      .eq("is_active", true);

    const driverMap = new Map<string, { id: string; full_name: string; phone: string }>();
    (driversData || []).forEach((d) => {
      if (d.assigned_vehicle_id) {
        driverMap.set(d.assigned_vehicle_id, {
          id: d.id,
          full_name: d.full_name,
          phone: d.phone
        });
      }
    });

    // Merge driver assignments
    const enrichedVehicles = vehiclesList.map((v) => ({
      ...v,
      assignedDriver: driverMap.get(v.id) || null
    }));

    return {
      success: true,
      vehicles: enrichedVehicles,
      totalCount: count || 0
    };
  } catch (err: any) {
    console.error("[vehicle-actions] fetchVehiclesList exception:", err);
    return { success: false, vehicles: [], totalCount: 0, error: err.message };
  }
}

export interface VehiclePortalLookupResult {
  registration_number: string;
  make: string;
  model: string;
  variant: string;
  category: "CAR" | "BIKE" | "COMMERCIAL" | "BUS";
  vin_chassis_number?: string;
  engine_number?: string;
  registration_date?: string;
  paint_color?: string;
  nickname?: string;
  rto_office?: string;
  state?: string;
  rto_code?: string;
  fuel_type?: string;
  odometer_km?: number;
  source: string;
}

// Built-in verified RTO portal registry cache for enterprise vehicles (from Chandak Fleet Master)
const RTO_PORTAL_REGISTRY: Record<string, Partial<VehiclePortalLookupResult>> = {
  // Chandak Corporate Fleet (PUC & Insurance Master)
  "MH02DS1934": {
    make: "Toyota",
    model: "Corolla Altis",
    variant: "1.8G Executive",
    category: "CAR",
    paint_color: "#475569",
    nickname: "Saroj Sales — Toyota Altis",
    rto_office: "MH-02 (Mumbai West / Andheri RTO)",
    fuel_type: "Petrol",
    vin_chassis_number: "MBJ53REH206502093",
    engine_number: "2ZR Y099631"
  },
  "MH02DZ7162": {
    make: "Honda",
    model: "City",
    variant: "i-VTEC V",
    category: "CAR",
    paint_color: "#64748b",
    nickname: "Saroj Sales — Honda City Grey",
    rto_office: "MH-02 (Mumbai West / Andheri RTO)",
    fuel_type: "Petrol",
    vin_chassis_number: "MAKGM66DJF4108140",
    engine_number: "L15212237314"
  },
  "MH02EE8522": {
    make: "Volvo",
    model: "XC90",
    variant: "D5 Inscription AWD",
    category: "CAR",
    paint_color: "#0f172a",
    nickname: "Saroj Sales — Volvo XC90 SUV",
    rto_office: "MH-02 (Mumbai West / Andheri RTO)",
    fuel_type: "Diesel",
    vin_chassis_number: "YV1LFA4ACG1067642",
    engine_number: "D4204T11 1513849"
  },
  "MH02FU8522": {
    make: "Skoda",
    model: "Slavia",
    variant: "1.5 TSI Style",
    category: "CAR",
    paint_color: "#1e293b",
    nickname: "Saroj Landmark — Skoda Slavia",
    rto_office: "MH-02 (Mumbai West / Andheri RTO)",
    fuel_type: "Petrol",
    vin_chassis_number: "MEXBPFPB8NG010960",
    engine_number: "DTB065392"
  },
  "MH02FY9251": {
    make: "Toyota",
    model: "Innova Hycross",
    variant: "ZX Strong Hybrid",
    category: "CAR",
    paint_color: "#f8fafc",
    nickname: "Saroj Landmark — Innova Hycross",
    rto_office: "MH-02 (Mumbai West / Andheri RTO)",
    fuel_type: "Petrol Hybrid",
    vin_chassis_number: "MBJABBAA301411560-0723",
    engine_number: "M20ANB03986"
  },
  "MH02EZ0890": {
    make: "Toyota",
    model: "Innova Crysta",
    variant: "2.4 ZX 7S",
    category: "CAR",
    paint_color: "#94a3b8",
    nickname: "Abhay S. Chandak — Innova Crysta",
    rto_office: "MH-02 (Mumbai West / Andheri RTO)",
    fuel_type: "Diesel",
    vin_chassis_number: "MBJJA8EM600515167-0718",
    engine_number: "1GD-A212774"
  },
  "MH02EZ4695": {
    make: "Maruti Suzuki",
    model: "Dzire",
    variant: "VXi / ZXi",
    category: "CAR",
    paint_color: "#cbd5e1",
    nickname: "Saroj Landmark — Maruti Dzire",
    rto_office: "MH-02 (Mumbai West / Andheri RTO)",
    fuel_type: "Petrol",
    vin_chassis_number: "MA3CZF63SJG383704",
    engine_number: "K12MN2232629"
  },
  "MH02FG7883": {
    make: "Audi",
    model: "A3",
    variant: "35 TDI Premium Plus",
    category: "CAR",
    paint_color: "#0f172a",
    nickname: "Shreeraj Developer — Audi A3",
    rto_office: "MH-02 (Mumbai West / Andheri RTO)",
    fuel_type: "Diesel",
    vin_chassis_number: "WAUZBK8VXKY700638",
    engine_number: "CRF009186"
  },
  "MH02FJ7883": {
    make: "Audi",
    model: "Q7",
    variant: "45 TDI Quattro Technology",
    category: "CAR",
    paint_color: "#1f2937",
    nickname: "Shreeraj Developer — Audi Q7",
    rto_office: "MH-02 (Mumbai West / Andheri RTO)",
    fuel_type: "Diesel",
    vin_chassis_number: "WAUZCK4M1KY000369",
    engine_number: "CVM028984"
  },
  "MH02FR8522": {
    make: "Mercedes-Benz",
    model: "GLS",
    variant: "450d 4MATIC",
    category: "CAR",
    paint_color: "#4b5563",
    nickname: "Saroj Landmark — Mercedes GLS 450",
    rto_office: "MH-02 (Mumbai West / Andheri RTO)",
    fuel_type: "Diesel",
    vin_chassis_number: "WIN1679236M006252",
    engine_number: "65692980177181"
  },
  "MH02GD7883": {
    make: "Toyota",
    model: "Innova Hycross",
    variant: "ZX (O) Strong Hybrid",
    category: "CAR",
    paint_color: "#000000",
    nickname: "Chandak Realtors — Innova Hycross",
    rto_office: "MH-02 (Mumbai West / Andheri RTO)",
    fuel_type: "Petrol Hybrid",
    vin_chassis_number: "MBJABBAA501438453-0224",
    engine_number: "M20ANB93702"
  },
  "MH02FX8512": {
    make: "Tata",
    model: "Winger",
    variant: "15S Luxury Coach",
    category: "COMMERCIAL",
    paint_color: "#f9fafb",
    nickname: "Chandak Realtors — Tata Winger",
    rto_office: "MH-02 (Mumbai West / Andheri RTO)",
    fuel_type: "Diesel",
    vin_chassis_number: "MAT557049RUD01729",
    engine_number: "VARICOR11DVXJ05461"
  },
  "MH01ER8522": {
    make: "Toyota",
    model: "Vellfire",
    variant: "Executive Lounge VIP",
    category: "CAR",
    paint_color: "#111827",
    nickname: "Bright Star — Toyota Vellfire",
    rto_office: "MH-01 (Mumbai Central / Tardeo RTO)",
    fuel_type: "Petrol Hybrid",
    vin_chassis_number: "JTNADAAH008003710-0524",
    engine_number: "A2546125149"
  },
  "MH02GP9917": {
    make: "Toyota",
    model: "Urban Cruiser Hyryder",
    variant: "V Hybrid",
    category: "CAR",
    paint_color: "#3b82f6",
    nickname: "Chandak Realtors — Toyota Hyryder",
    rto_office: "MH-02 (Mumbai West / Andheri RTO)",
    fuel_type: "Petrol Hybrid",
    vin_chassis_number: "MBJUYMM1SSK192545",
    engine_number: "M15DNE93508"
  },
  "MH02FK6978": {
    make: "Bajaj",
    model: "CT-100",
    variant: "ES Alloy 100cc",
    category: "BIKE",
    paint_color: "#ef4444",
    nickname: "Shreeraj Developer — Bajaj CT-100",
    rto_office: "MH-02 (Mumbai West / Andheri RTO)",
    fuel_type: "Petrol",
    vin_chassis_number: "MABCT100UNKNOWN",
    engine_number: "BJCT100EN1934"
  },
  // Key Demo Vehicles
  "MH02FE4281": {
    make: "Toyota",
    model: "Fortuner Legender",
    variant: "4x4 AT",
    category: "CAR",
    paint_color: "#000000",
    nickname: "Executive Fortuner Legender",
    rto_office: "MH-02 (Mumbai West / Andheri RTO)",
    fuel_type: "Diesel",
    vin_chassis_number: "MBJ11B81009871234",
    engine_number: "1GD-FTV-887612"
  },
  "MH04KZ8822": {
    make: "Mahindra",
    model: "Scorpio-N",
    variant: "Z8L 4x4 AT",
    category: "CAR",
    paint_color: "#0f172a",
    nickname: "Highscape Project Scorpio-N",
    rto_office: "MH-04 (Thane RTO)",
    fuel_type: "Diesel",
    vin_chassis_number: "MA1TA2SK009876543",
    engine_number: "mStallion-200-1234"
  },
  "MH01EE1901": {
    make: "Tata",
    model: "Nexon EV",
    variant: "Empowered+ LR",
    category: "CAR",
    paint_color: "#0284c7",
    nickname: "HQ GreenAir Pool EV",
    rto_office: "MH-01 (Mumbai South / Tardeo RTO)",
    fuel_type: "Electric",
    vin_chassis_number: "MAT623001EV112233",
    engine_number: "ZIPTRON-LR-4455"
  },
  "HR26CQ9999": {
    make: "Honda",
    model: "City",
    variant: "ZX e:HEV Hybrid",
    category: "CAR",
    paint_color: "#ffffff",
    nickname: "Honda City Hybrid",
    rto_office: "HR-26 (Gurugram / Gurgaon RTO)",
    fuel_type: "Petrol Hybrid",
    vin_chassis_number: "MAKGM2656K1009999",
    engine_number: "L15B-2900192"
  },
  "MH12AB1234": {
    make: "KTM",
    model: "Duke 390",
    variant: "ABS Gen 3",
    category: "BIKE",
    paint_color: "#f97316",
    nickname: "KTM Duke 390",
    rto_office: "MH-12 (Pune Central RTO)",
    fuel_type: "Petrol",
    vin_chassis_number: "VBK390DUKE202401",
    engine_number: "KTM390EN88219"
  }
};

const RTO_DISTRICT_MAP: Record<string, string> = {
  "MH01": "MH-01 (Mumbai South / Tardeo RTO)",
  "MH02": "MH-02 (Mumbai West / Andheri RTO)",
  "MH03": "MH-03 (Mumbai East / Wadala RTO)",
  "MH04": "MH-04 (Thane RTO)",
  "MH05": "MH-05 (Kalyan / Dombivli RTO)",
  "MH06": "MH-06 (Raigad / Pen RTO)",
  "MH07": "MH-07 (Sindhudurg RTO)",
  "MH08": "MH-08 (Ratnagiri RTO)",
  "MH09": "MH-09 (Kolhapur RTO)",
  "MH10": "MH-10 (Sangli RTO)",
  "MH11": "MH-11 (Satara RTO)",
  "MH12": "MH-12 (Pune Central RTO)",
  "MH13": "MH-13 (Solapur RTO)",
  "MH14": "MH-14 (Pimpri-Chinchwad RTO)",
  "MH15": "MH-15 (Nashik RTO)",
  "MH16": "MH-16 (Ahmednagar RTO)",
  "MH17": "MH-17 (Shrirampur RTO)",
  "MH18": "MH-18 (Dhule RTO)",
  "MH19": "MH-19 (Jalgaon RTO)",
  "MH20": "MH-20 (Aurangabad / Chh. Sambhajinagar RTO)",
  "MH21": "MH-21 (Jalna RTO)",
  "MH22": "MH-22 (Parbhani RTO)",
  "MH23": "MH-23 (Beed RTO)",
  "MH24": "MH-24 (Latur RTO)",
  "MH25": "MH-25 (Osmanabad / Dharashiv RTO)",
  "MH26": "MH-26 (Nanded RTO)",
  "MH27": "MH-27 (Amravati RTO)",
  "MH28": "MH-28 (Buldhana RTO)",
  "MH29": "MH-29 (Yavatmal RTO)",
  "MH30": "MH-30 (Akola RTO)",
  "MH31": "MH-31 (Nagpur City RTO)",
  "MH32": "MH-32 (Wardha RTO)",
  "MH33": "MH-33 (Gadchiroli RTO)",
  "MH34": "MH-34 (Chandrapur RTO)",
  "MH35": "MH-35 (Gondia RTO)",
  "MH36": "MH-36 (Bhandara RTO)",
  "MH37": "MH-37 (Washim RTO)",
  "MH38": "MH-38 (Hingoli RTO)",
  "MH39": "MH-39 (Nandurbar RTO)",
  "MH40": "MH-40 (Nagpur Rural RTO)",
  "MH41": "MH-41 (Malegaon RTO)",
  "MH42": "MH-42 (Baramati RTO)",
  "MH43": "MH-43 (Navi Mumbai / Vashi RTO)",
  "MH44": "MH-44 (Ambejogai RTO)",
  "MH45": "MH-45 (Akluj / Solapur District RTO)",
  "MH46": "MH-46 (Panvel / Navi Mumbai South RTO)",
  "MH47": "MH-47 (Mumbai North / Borivali RTO)",
  "MH48": "MH-48 (Vasai-Virar / Palghar RTO)",
  "MH49": "MH-49 (Nagpur East RTO)",
  "MH50": "MH-50 (Karad / Satara RTO)",
  "DL01": "DL-01 (Delhi North / Mall Road RTO)",
  "DL02": "DL-02 (Delhi New Delhi / Tilak Marg RTO)",
  "DL03": "DL-03 (Delhi South / Sheikh Sarai RTO)",
  "DL04": "DL-04 (Delhi West / Janakpuri RTO)",
  "DL08": "DL-08 (Delhi North West / Wazirpur RTO)",
  "HR26": "HR-26 (Gurugram / Gurgaon RTO)",
  "HR55": "HR-55 (Gurugram South RTO)",
  "KA01": "KA-01 (Bangalore Central / Koramangala RTO)",
  "KA03": "KA-03 (Bangalore East / Indiranagar RTO)",
  "GJ01": "GJ-01 (Ahmedabad RTO)",
  "GJ06": "GJ-06 (Vadodara RTO)"
};

const STATE_NAMES: Record<string, string> = {
  "MH": "Maharashtra",
  "DL": "Delhi",
  "HR": "Haryana",
  "KA": "Karnataka",
  "GJ": "Gujarat",
  "TN": "Tamil Nadu",
  "TS": "Telangana",
  "UP": "Uttar Pradesh",
  "RJ": "Rajasthan",
  "WB": "West Bengal",
  "GA": "Goa",
  "MP": "Madhya Pradesh",
  "AP": "Andhra Pradesh",
  "PB": "Punjab",
  "CH": "Chandigarh"
};

export async function fetchVehiclePortalDetailsAction(plateNumber: string): Promise<{
  success: boolean;
  data?: VehiclePortalLookupResult;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    // Optional check: logged in context preferred, read-only lookup allowed
    if (!plateNumber || !plateNumber.trim()) {
      return { success: false, error: "Please enter a valid vehicle registration number" };
    }

    // Clean and normalize plate number: e.g. "mh-02 fe 4040" -> "MH02FE4040"
    const rawClean = plateNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (rawClean.length < 5) {
      return { success: false, error: "Invalid registration plate format (too short)" };
    }

    // Standard formatted string: e.g. "MH-02-FE-4040"
    let formattedPlate = rawClean;
    const plateMatch = rawClean.match(/^([A-Z]{2})([0-9]{1,2})([A-Z]{0,3})([0-9]{1,4})$/);
    if (plateMatch) {
      const [, state, dist, series, num] = plateMatch;
      formattedPlate = `${state}-${dist.padStart(2, "0")}${series ? `-${series}` : ""}-${num.padStart(4, "0")}`;
    }

    // 1. Verify if vehicle is already enrolled in active fleet
    const { data: existing } = await supabaseAdmin
      .from("vehicles")
      .select("id, registration_number, make, model")
      .or(`registration_number.eq.${rawClean},registration_number.eq.${formattedPlate}`)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: `Vehicle ${formattedPlate} (${existing.make} ${existing.model}) is already registered in the fleet master.`
      };
    }

    // 2. Check for Universal Government VAHAN API Provider
    // Supports: Surepass, Sandbox.co.in, RapidAPI, or Supabase Edge Function
    const surepassKey = process.env.SUREPASS_API_KEY || process.env.RTO_API_KEY || process.env.VAHAN_API_KEY;
    const sandboxKey = process.env.SANDBOX_API_KEY;
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    const supabaseEdgeUrl = process.env.SUPABASE_VAHAN_FUNCTION_URL;

    // 2A. Try Surepass Gateway
    if (surepassKey) {
      try {
        const apiUrl = process.env.RTO_API_URL || "https://api.surepass.io/api/v1/rc/vehicle-rc-verification";
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${surepassKey}`
          },
          body: JSON.stringify({ id_number: rawClean })
        });

        if (response.ok) {
          const resJson = await response.json();
          if (resJson.status_code === 200 && resJson.data) {
            const rtoData = resJson.data;
            const rawModel = rtoData.maker_model || "";
            const parts = rawModel.split("/");
            const make = parts[0]?.trim() || "Toyota";
            const model = parts[1]?.trim() || rawModel || "Fleet Vehicle";

            return {
              success: true,
              data: {
                registration_number: formattedPlate,
                make,
                model,
                variant: rtoData.maker_classification || "Standard",
                category: (rtoData.vehicle_class || "").toLowerCase().includes("motorcycle") || (rtoData.vehicle_class || "").toLowerCase().includes("two wheeler") ? "BIKE" : "CAR",
                vin_chassis_number: rtoData.chassis_number || "",
                engine_number: rtoData.engine_number || "",
                registration_date: rtoData.reg_date || "",
                paint_color: rtoData.color || "#1e293b",
                nickname: `${make} ${model}`,
                rto_office: rtoData.registered_at || "RTO Registry Office",
                fuel_type: rtoData.fuel_type || "Petrol",
                odometer_km: 0,
                source: "Live Government RTO Portal (Surepass Verification)"
              }
            };
          }
        }
      } catch (apiErr) {
        console.warn("[vehicle-actions] Surepass API lookup failed:", apiErr);
      }
    }

    // 2B. Try Sandbox.co.in KYC Gateway
    if (sandboxKey) {
      try {
        const sandboxUrl = "https://api.sandbox.co.in/kyc/rc/verify";
        const response = await fetch(sandboxUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": sandboxKey,
            "x-api-key": sandboxKey,
            "x-api-version": "1.0"
          },
          body: JSON.stringify({ rc_number: rawClean })
        });

        if (response.ok) {
          const resJson = await response.json();
          const d = resJson.data || resJson;
          if (d && (d.maker || d.model || d.maker_model)) {
            const make = d.maker || (d.maker_model ? d.maker_model.split(" ")[0] : "Vehicle");
            const model = d.model || d.maker_model || "Fleet Unit";

            return {
              success: true,
              data: {
                registration_number: formattedPlate,
                make,
                model,
                variant: d.variant || d.maker_classification || "Standard",
                category: (d.vehicle_category || "").includes("2W") ? "BIKE" : "CAR",
                vin_chassis_number: d.chassis_number || "",
                engine_number: d.engine_number || "",
                registration_date: d.registration_date || "",
                paint_color: d.color || "#1e293b",
                nickname: `${make} ${model}`,
                rto_office: d.registered_at || d.rto || "RTO Office",
                fuel_type: d.fuel_type || "Petrol",
                odometer_km: 0,
                source: "Live Government RTO Portal (Sandbox Gateway)"
              }
            };
          }
        }
      } catch (sbErr) {
        console.warn("[vehicle-actions] Sandbox API lookup failed:", sbErr);
      }
    }

    // 2C. Try RapidAPI RTO Gateway
    if (rapidApiKey) {
      try {
        const rapidUrl = `https://rto-vehicle-information-india.p.rapidapi.com/rc-details?vehicle_number=${rawClean}`;
        const response = await fetch(rapidUrl, {
          method: "GET",
          headers: {
            "X-RapidAPI-Key": rapidApiKey,
            "X-RapidAPI-Host": "rto-vehicle-information-india.p.rapidapi.com"
          }
        });

        if (response.ok) {
          const resJson = await response.json();
          const d = resJson.result || resJson.data || resJson;
          if (d && (d.maker || d.model || d.maker_model)) {
            const make = d.maker || (d.maker_model ? d.maker_model.split(" ")[0] : "Vehicle");
            const model = d.model || d.maker_model || "Fleet Unit";

            return {
              success: true,
              data: {
                registration_number: formattedPlate,
                make,
                model,
                variant: d.variant || "Standard",
                category: (d.vehicle_class || "").toLowerCase().includes("two") ? "BIKE" : "CAR",
                vin_chassis_number: d.chassis_number || "",
                engine_number: d.engine_number || "",
                registration_date: d.reg_date || "",
                paint_color: d.color || "#1e293b",
                nickname: `${make} ${model}`,
                rto_office: d.registered_at || "RTO Transport Office",
                fuel_type: d.fuel_type || "Petrol",
                odometer_km: 0,
                source: "Live Government RTO Portal (RapidAPI Gateway)"
              }
            };
          }
        }
      } catch (rapidErr) {
        console.warn("[vehicle-actions] RapidAPI lookup failed:", rapidErr);
      }
    }

    // 2D. Try Custom Supabase Edge Function Proxy
    if (supabaseEdgeUrl) {
      try {
        const response = await fetch(supabaseEdgeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ vehicle_number: rawClean })
        });

        if (response.ok) {
          const resJson = await response.json();
          if (resJson.success && resJson.data) {
            return {
              success: true,
              data: {
                ...resJson.data,
                registration_number: formattedPlate,
                source: "Supabase Edge VAHAN Gateway"
              }
            };
          }
        }
      } catch (sbFuncErr) {
        console.warn("[vehicle-actions] Supabase Edge Function lookup failed:", sbFuncErr);
      }
    }

    // 3. Fallback to built-in verified RTO portal registry cache (Enterprise Fleet Master)
    const cached = RTO_PORTAL_REGISTRY[rawClean];
    if (cached) {
      return {
        success: true,
        data: {
          registration_number: formattedPlate,
          make: cached.make || "",
          model: cached.model || "",
          variant: cached.variant || "Standard",
          category: cached.category || "CAR",
          vin_chassis_number: cached.vin_chassis_number,
          engine_number: cached.engine_number,
          registration_date: cached.registration_date,
          paint_color: cached.paint_color || "#1e293b",
          nickname: cached.nickname || `${cached.make} ${cached.model}`,
          rto_office: cached.rto_office || "RTO Transport Office",
          state: (cached.rto_office || "").includes("MH") ? "Maharashtra" : (cached.rto_office || "").includes("DL") ? "Delhi" : (cached.rto_office || "").includes("HR") ? "Haryana" : "India",
          rto_code: rawClean.slice(0, 4),
          fuel_type: cached.fuel_type || "Petrol",
          odometer_km: 0,
          source: "enterprise_registry"
        }
      };
    }

    // 4. Intelligent RTO District Resolution for uncataloged plates
    // IMPORTANT: Never invent fake Make/Model ("Toyota Innova") for unknown plates.
    const districtKey = rawClean.slice(0, 4);
    const stateCode = rawClean.slice(0, 2);
    const rtoOffice = RTO_DISTRICT_MAP[districtKey] || `${stateCode} State Regional Transport Office`;
    const stateName = STATE_NAMES[stateCode] || "India";

    return {
      success: true,
      data: {
        registration_number: formattedPlate,
        make: "",
        model: "",
        variant: "",
        category: "CAR",
        paint_color: "#1e293b",
        nickname: "",
        rto_office: rtoOffice,
        state: stateName,
        rto_code: `${stateCode}-${districtKey.slice(2)}`,
        fuel_type: "Petrol",
        odometer_km: 0,
        source: "rto_jurisdiction_only"
      }
    };
  } catch (err: any) {
    console.error("[vehicle-actions] fetchVehiclePortalDetailsAction exception:", err);
    return { success: false, error: err.message || "Failed to fetch vehicle portal details" };
  }
}

export async function createVehicleAction(formData: {
  registration_number: string;
  make: string;
  model: string;
  variant?: string;
  category?: string;
  odometer_km?: number;
  status?: string;
  assigned_driver_id?: string;
  paint_color?: string;
  nickname?: string;
}): Promise<{
  success: boolean;
  vehicle?: VehicleRecord;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { success: false, error: "Unauthorized request" };
    }

    const regNum = formData.registration_number?.trim().toUpperCase();
    if (!regNum || !formData.make?.trim() || !formData.model?.trim()) {
      return { success: false, error: "Registration number, make, and model are required" };
    }

    // Verify registration number uniqueness
    const { data: existing } = await supabaseAdmin
      .from("vehicles")
      .select("id")
      .eq("registration_number", regNum)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Vehicle with plate ${regNum} already exists` };
    }

    const vehicleId = `veh-${Date.now().toString(36)}`;
    const newRecord = {
      id: vehicleId,
      registration_number: regNum,
      make: formData.make.trim(),
      model: formData.model.trim(),
      variant: formData.variant?.trim() || "Standard",
      category: formData.category || "CAR",
      vin_chassis_number: `VIN-${Date.now()}`,
      status: formData.status || "IN_STOCK",
      odometer_km: Number(formData.odometer_km) || 0,
      nickname: formData.nickname?.trim() || null,
      paint_color: formData.paint_color || "#1e293b",
      ownership_type: "DEALERSHIP_STOCK",
      has_roadside_assistance: true,
      has_hsrp_plate: true
    };

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("vehicles")
      .insert(newRecord)
      .select()
      .single();

    if (insertErr) {
      console.error("[vehicle-actions] createVehicleAction insert error:", insertErr);
      return { success: false, error: insertErr.message };
    }

    // Link assigned driver if selected
    if (formData.assigned_driver_id) {
      await supabaseAdmin
        .from("drivers")
        .update({ assigned_vehicle_id: vehicleId })
        .eq("id", formData.assigned_driver_id);
    }

    return { success: true, vehicle: inserted as VehicleRecord };
  } catch (err: any) {
    console.error("[vehicle-actions] createVehicleAction exception:", err);
    return { success: false, error: err.message || "Failed to create vehicle" };
  }
}

export async function updateVehicleAction(
  id: string,
  formData: {
    registration_number?: string;
    make?: string;
    model?: string;
    variant?: string;
    category?: string;
    status?: string;
    odometer_km?: number;
    assigned_driver_id?: string | null;
    nickname?: string;
    paint_color?: string;
  }
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (formData.registration_number) updates.registration_number = formData.registration_number.trim().toUpperCase();
    if (formData.make) updates.make = formData.make.trim();
    if (formData.model) updates.model = formData.model.trim();
    if (formData.variant !== undefined) updates.variant = formData.variant.trim();
    if (formData.category) updates.category = formData.category;
    if (formData.status) updates.status = formData.status;
    if (formData.odometer_km !== undefined) updates.odometer_km = Number(formData.odometer_km);
    if (formData.nickname !== undefined) updates.nickname = formData.nickname;
    if (formData.paint_color !== undefined) updates.paint_color = formData.paint_color;

    const { error: updateErr } = await supabaseAdmin
      .from("vehicles")
      .update(updates)
      .eq("id", id);

    if (updateErr) return { success: false, error: updateErr.message };

    // Update driver assignment if specified
    if (formData.assigned_driver_id !== undefined) {
      // Clear previous driver assigned to this vehicle
      await supabaseAdmin
        .from("drivers")
        .update({ assigned_vehicle_id: null })
        .eq("assigned_vehicle_id", id);

      // Assign new driver if provided
      if (formData.assigned_driver_id) {
        await supabaseAdmin
          .from("drivers")
          .update({ assigned_vehicle_id: id })
          .eq("id", formData.assigned_driver_id);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteVehicleAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Unassign any driver
    await supabaseAdmin
      .from("drivers")
      .update({ assigned_vehicle_id: null })
      .eq("assigned_vehicle_id", id);

    // Clean up trip plans or service records linked to this vehicle
    await supabaseAdmin
      .from("trip_plans")
      .delete()
      .eq("vehicle_id", id);

    await supabaseAdmin
      .from("service_records")
      .delete()
      .eq("vehicle_id", id);

    const { error } = await supabaseAdmin
      .from("vehicles")
      .delete()
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ------------------------------------------------------------------------------
// 3. Drivers Directory
// ------------------------------------------------------------------------------

export async function fetchDriversList(): Promise<{
  success: boolean;
  drivers: DriverRecord[];
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, drivers: [], error: "Unauthorized" };

    const { data, error } = await supabaseAdmin
      .from("drivers")
      .select("id, full_name, license_number, license_expiry_date, phone, is_active, assigned_vehicle_id, emergency_contact, experience_years")
      .order("full_name", { ascending: true })
      .limit(100);

    if (error) return { success: false, drivers: [], error: error.message };
    return { success: true, drivers: (data || []) as DriverRecord[] };
  } catch (err: any) {
    return { success: false, drivers: [], error: err.message };
  }
}

// ------------------------------------------------------------------------------
// 4. Trip Dispatch & Trips Management
// ------------------------------------------------------------------------------

export async function fetchTripsList(): Promise<{
  success: boolean;
  trips: TripRecord[];
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, trips: [], error: "Unauthorized" };

    const { data: rawTrips, error } = await supabaseAdmin
      .from("trip_plans")
      .select(`
        id,
        vehicle_id,
        driver_id,
        traveler_name,
        plan_date,
        purpose,
        planned_start_time,
        planned_end_time,
        origin,
        destination,
        status,
        created_at
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return { success: false, trips: [], error: error.message };

    const tripsList = (rawTrips || []) as TripRecord[];
    if (tripsList.length === 0) return { success: true, trips: [] };

    // Batch lookup vehicle plates and driver names (eliminates N+1)
    const vehicleIds = Array.from(new Set(tripsList.map((t) => t.vehicle_id).filter(Boolean)));
    const driverIds = Array.from(new Set(tripsList.map((t) => t.driver_id).filter(Boolean)));

    const [vRes, dRes] = await Promise.all([
      vehicleIds.length > 0 ? supabaseAdmin.from("vehicles").select("id, registration_number").in("id", vehicleIds) : { data: [] },
      driverIds.length > 0 ? supabaseAdmin.from("drivers").select("id, full_name").in("id", driverIds) : { data: [] }
    ]);

    const vMap = new Map((vRes.data || []).map((v) => [v.id, v.registration_number]));
    const dMap = new Map((dRes.data || []).map((d) => [d.id, d.full_name]));

    const enrichedTrips = tripsList.map((t) => ({
      ...t,
      vehicle_reg: vMap.get(t.vehicle_id) || "N/A",
      driver_name: dMap.get(t.driver_id) || "Unassigned"
    }));

    return { success: true, trips: enrichedTrips };
  } catch (err: any) {
    return { success: false, trips: [], error: err.message };
  }
}

export async function createTripPlanAction(formData: {
  vehicle_id: string;
  driver_id: string;
  traveler_name: string;
  purpose: string;
  origin: string;
  destination: string;
  planned_start_time: string;
  planned_end_time: string;
  plan_date?: string;
}): Promise<{
  success: boolean;
  trip?: TripRecord;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    if (!formData.vehicle_id || !formData.driver_id || !formData.traveler_name || !formData.purpose) {
      return { success: false, error: "Vehicle, driver, traveler name, and purpose are required" };
    }

    const newTrip = {
      id: `trip-${Date.now().toString(36)}`,
      vehicle_id: formData.vehicle_id,
      driver_id: formData.driver_id,
      traveler_name: formData.traveler_name.trim(),
      purpose: formData.purpose.trim(),
      origin: formData.origin?.trim() || "Chandak Headquarters",
      destination: formData.destination?.trim() || "Site Location",
      planned_start_time: formData.planned_start_time || "09:00",
      planned_end_time: formData.planned_end_time || "18:00",
      plan_date: formData.plan_date || new Date().toISOString().split("T")[0],
      status: "PLANNED"
    };

    const { data: inserted, error } = await supabaseAdmin
      .from("trip_plans")
      .insert(newTrip)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Mark vehicle as in service
    await supabaseAdmin
      .from("vehicles")
      .update({ status: "IN_SERVICE" })
      .eq("id", formData.vehicle_id);

    return { success: true, trip: inserted as TripRecord };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ------------------------------------------------------------------------------
// 5. Maintenance & Workshop Service Records
// ------------------------------------------------------------------------------

export async function fetchMaintenanceList(): Promise<{
  success: boolean;
  records: MaintenanceRecord[];
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, records: [], error: "Unauthorized" };

    const { data: rawRecords, error } = await supabaseAdmin
      .from("service_records")
      .select(`
        id,
        vehicle_id,
        service_type,
        service_center,
        service_date,
        odometer_km,
        cost,
        next_service_due_date,
        created_at
      `)
      .order("service_date", { ascending: false })
      .limit(50);

    if (error) return { success: false, records: [], error: error.message };

    const recordsList = (rawRecords || []) as MaintenanceRecord[];
    if (recordsList.length === 0) return { success: true, records: [] };

    // Batch lookup vehicle plates (eliminates N+1)
    const vehicleIds = Array.from(new Set(recordsList.map((r) => r.vehicle_id).filter(Boolean)));
    const { data: vehiclesData } = await supabaseAdmin
      .from("vehicles")
      .select("id, registration_number")
      .in("id", vehicleIds);

    const vMap = new Map((vehiclesData || []).map((v) => [v.id, v.registration_number]));

    const enriched = recordsList.map((r) => ({
      ...r,
      vehicle_reg: vMap.get(r.vehicle_id) || "N/A"
    }));

    return { success: true, records: enriched };
  } catch (err: any) {
    return { success: false, records: [], error: err.message };
  }
}

export async function createServiceRecordAction(formData: {
  vehicle_id: string;
  service_type: string;
  service_center: string;
  service_date?: string;
  odometer_km: number;
  cost: number;
  next_service_due_date?: string;
}): Promise<{
  success: boolean;
  record?: MaintenanceRecord;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    if (!formData.vehicle_id || !formData.service_type || !formData.service_center) {
      return { success: false, error: "Vehicle, service type, and service center are required" };
    }

    const newService = {
      id: `srv-${Date.now().toString(36)}`,
      vehicle_id: formData.vehicle_id,
      service_type: formData.service_type.trim(),
      service_center: formData.service_center.trim(),
      service_date: formData.service_date || new Date().toISOString().split("T")[0],
      odometer_km: Number(formData.odometer_km) || 0,
      cost: Number(formData.cost) || 0.0,
      next_service_due_date: formData.next_service_due_date || null
    };

    const { data: inserted, error } = await supabaseAdmin
      .from("service_records")
      .insert(newService)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Update vehicle odometer if new reading is higher
    if (formData.odometer_km) {
      const { data: currentV } = await supabaseAdmin
        .from("vehicles")
        .select("odometer_km")
        .eq("id", formData.vehicle_id)
        .single();

      if (currentV && Number(formData.odometer_km) > (currentV.odometer_km || 0)) {
        await supabaseAdmin
          .from("vehicles")
          .update({ odometer_km: Number(formData.odometer_km) })
          .eq("id", formData.vehicle_id);
      }
    }

    return { success: true, record: inserted as MaintenanceRecord };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createDriverAction(formData: {
  full_name: string;
  phone: string;
  license_number: string;
  license_expiry_date?: string;
  assigned_vehicle_id?: string;
  emergency_contact?: string;
  experience_years?: number;
}): Promise<{
  success: boolean;
  driver?: DriverRecord;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    if (!formData.full_name?.trim() || !formData.phone?.trim() || !formData.license_number?.trim()) {
      return { success: false, error: "Driver name, phone, and license number are required" };
    }

    const driverId = `drv-${Date.now().toString(36)}`;
    const newDriver = {
      id: driverId,
      full_name: formData.full_name.trim(),
      phone: formData.phone.trim(),
      license_number: formData.license_number.trim().toUpperCase(),
      license_expiry_date: formData.license_expiry_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      assigned_vehicle_id: formData.assigned_vehicle_id || null,
      emergency_contact: formData.emergency_contact?.trim() || null,
      experience_years: Number(formData.experience_years) || 3,
      is_active: true
    };

    const { data: inserted, error } = await supabaseAdmin
      .from("drivers")
      .insert(newDriver)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, driver: inserted as DriverRecord };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateDriverAction(
  id: string,
  formData: {
    full_name?: string;
    phone?: string;
    license_number?: string;
    license_expiry_date?: string;
    is_active?: boolean;
    assigned_vehicle_id?: string | null;
    emergency_contact?: string;
    experience_years?: number;
  }
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (formData.full_name) updates.full_name = formData.full_name.trim();
    if (formData.phone) updates.phone = formData.phone.trim();
    if (formData.license_number) updates.license_number = formData.license_number.trim().toUpperCase();
    if (formData.license_expiry_date) updates.license_expiry_date = formData.license_expiry_date;
    if (formData.is_active !== undefined) updates.is_active = formData.is_active;
    if (formData.assigned_vehicle_id !== undefined) updates.assigned_vehicle_id = formData.assigned_vehicle_id;
    if (formData.emergency_contact !== undefined) updates.emergency_contact = formData.emergency_contact?.trim() || null;
    if (formData.experience_years !== undefined) updates.experience_years = Number(formData.experience_years) || 0;

    const { error } = await supabaseAdmin
      .from("drivers")
      .update(updates)
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteDriverAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Unlink any trip plans
    await supabaseAdmin
      .from("trip_plans")
      .delete()
      .eq("driver_id", id);

    const { error } = await supabaseAdmin
      .from("drivers")
      .delete()
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateTripStatusAction(
  id: string,
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: trip } = await supabaseAdmin
      .from("trip_plans")
      .select("vehicle_id")
      .eq("id", id)
      .single();

    const { error } = await supabaseAdmin
      .from("trip_plans")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    // Update vehicle status accordingly
    if (trip?.vehicle_id) {
      const vStatus = status === "IN_PROGRESS" ? "IN_SERVICE" : "IN_STOCK";
      await supabaseAdmin
        .from("vehicles")
        .update({ status: vStatus })
        .eq("id", trip.vehicle_id);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteTripAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: trip } = await supabaseAdmin
      .from("trip_plans")
      .select("vehicle_id, status")
      .eq("id", id)
      .single();

    const { error } = await supabaseAdmin
      .from("trip_plans")
      .delete()
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    // If trip was in progress, free up the vehicle
    if (trip?.vehicle_id && trip.status === "IN_PROGRESS") {
      await supabaseAdmin
        .from("vehicles")
        .update({ status: "IN_STOCK" })
        .eq("id", trip.vehicle_id);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteServiceRecordAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { error } = await supabaseAdmin
      .from("service_records")
      .delete()
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


