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
      jobCardsRes,
      driversRes,
      tripsRes
    ] = await Promise.all([
      supabaseAdmin.from("vehicles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "IN_STOCK"),
      supabaseAdmin.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "IN_SERVICE"),
      supabaseAdmin.from("job_cards").select("*", { count: "exact", head: true }).neq("status", "COMPLETED"),
      supabaseAdmin.from("drivers").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabaseAdmin.from("trip_plans").select("*", { count: "exact", head: true }).eq("status", "IN_PROGRESS")
    ]);

    return {
      success: true,
      stats: {
        totalVehicles: totalRes.count || 0,
        availableVehicles: availableRes.count || 0,
        onRouteVehicles: inServiceRes.count || 0,
        inMaintenanceVehicles: jobCardsRes.count || 0,
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
