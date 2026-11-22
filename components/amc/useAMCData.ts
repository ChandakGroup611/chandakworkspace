"use client";

/**
 * Shared data for every AMC page (dashboard, contracts, subscriptions, record pages).
 * Moved out of the old single-page app/amc/page.tsx so each section can be its own route.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { createClient } from "@/utils/supabase/client";

export function useAMCData() {
  const supabase = useMemo(() => createClient(), []);
  const [records, setRecords] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("software_amc").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setRecords(data || []);
    } catch (err: any) {
      console.error("Error loading contracts:", err);
      toast.error("Failed to load contracts: " + (err.message || "Network error"));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const fetchDependencies = useCallback(async () => {
    try {
      const [vRes, dRes, uRes] = await Promise.all([
        // vendor_master columns are name / contact_email / contact_name / tax_gstin / tax_pan; aliased to the names the AMC screens use
        supabase.from("vendor_master").select("id, vendor_name:name, email:contact_email, phone, contact_person:contact_name, gst_number:tax_gstin, pan_number:tax_pan").order("name"),
        supabase.from("departments").select("id, name").order("name"),
        supabase.from("user_master").select("id, full_name, email").order("full_name"),
      ]);
      if (vRes.error) console.error("Error loading vendors:", vRes.error);
      if (dRes.error) console.error("Error loading departments:", dRes.error);
      if (vRes.data) setVendors(vRes.data);
      if (dRes.data) setDepartments(dRes.data);
      if (uRes.data) setUsers(uRes.data);
    } catch (err) {
      console.error("Error fetching dependencies:", err);
    }
  }, [supabase]);

  useEffect(() => {
    fetchRecords();
    fetchDependencies();
  }, [fetchRecords, fetchDependencies]);

  return { records, vendors, departments, users, loading, fetchRecords };
}

/** URL of a record page. Subscriptions and AMC contracts live under their own sections. */
export function amcRecordHref(record: { id: string; contract_type?: string | null }, suffix = "") {
  const base = record.contract_type === "Subscription" ? "/amc/subscriptions" : "/amc/contracts";
  return `${base}/${record.id}${suffix}`;
}
