import { supabaseAdmin } from "@/lib/supabase/service_role";

export interface MicrosoftGraphProfile {
  microsoftId?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  userPrincipalName?: string;
  jobTitle?: string;
  department?: string;
  officeLocation?: string;
  mobilePhone?: string;
  businessPhone?: string;
  companyName?: string;
}

/**
 * Safely fetches the authenticated user's profile from Microsoft Graph.
 * Handles missing, null, or inaccessible fields gracefully.
 */
export async function fetchMicrosoftProfile(accessToken: string): Promise<MicrosoftGraphProfile | null> {
  if (!accessToken) return null;

  try {
    const res = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`[Microsoft Graph] /me returned status ${res.status}`);
      return null;
    }

    const data = await res.json();
    return {
      microsoftId: data.id || undefined,
      displayName: data.displayName || undefined,
      firstName: data.givenName || undefined,
      lastName: data.surname || undefined,
      email: data.mail || undefined,
      userPrincipalName: data.userPrincipalName || undefined,
      jobTitle: data.jobTitle || undefined,
      department: data.department || undefined,
      officeLocation: data.officeLocation || undefined,
      mobilePhone: data.mobilePhone || undefined,
      businessPhone: Array.isArray(data.businessPhones) && data.businessPhones.length > 0 ? data.businessPhones[0] : undefined,
      companyName: data.companyName || undefined,
    };
  } catch (err) {
    console.warn("[Microsoft Graph] Failed to fetch /me profile:", err);
    return null;
  }
}

/**
 * Safely fetches the authenticated user's profile photo from Microsoft Graph.
 * Returns binary Buffer if photo is found, or null if not found (404/403) without error.
 */
export async function fetchMicrosoftProfilePhoto(accessToken: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!accessToken) return null;

  try {
    const res = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (res.status === 404 || res.status === 403 || !res.ok) {
      // 404: No profile photo uploaded in Microsoft account
      // 403: Insufficient permissions (e.g. tenant admin restricted photo access)
      return null;
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await res.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType,
    };
  } catch (err) {
    console.warn("[Microsoft Graph] Failed to fetch profile photo:", err);
    return null;
  }
}

/**
 * Uploads a profile photo buffer to the Supabase Storage 'profiles' bucket.
 * Returns public URL if successful, or base64 data URI fallback.
 */
export async function uploadProfilePhoto(userId: string, photo: { buffer: Buffer; contentType: string }): Promise<string | null> {
  try {
    const filePath = `avatars/${userId}.jpg`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("profiles")
      .upload(filePath, photo.buffer, {
        contentType: photo.contentType,
        upsert: true,
      });

    if (!uploadError) {
      const { data: publicUrlData } = supabaseAdmin.storage
        .from("profiles")
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        return `${publicUrlData.publicUrl}?t=${Date.now()}`;
      }
    } else {
      console.warn("[Microsoft Graph] Storage upload warning:", uploadError.message);
    }

    // Fallback: Use base64 Data URI
    const base64 = photo.buffer.toString("base64");
    return `data:${photo.contentType};base64,${base64}`;
  } catch (err) {
    console.warn("[Microsoft Graph] uploadProfilePhoto error:", err);
    return null;
  }
}

export interface SyncMicrosoftUserParams {
  authUserId: string;
  email?: string | null;
  userMetadata?: Record<string, any> | null;
  providerToken?: string | null;
}

/**
 * Synchronizes Microsoft identity and Graph profile to Chandak User Master.
 * 
 * Rules:
 * 1. Matches existing user by auth ID, Microsoft OID, or email/UPN.
 * 2. Does not duplicate users on repeated logins.
 * 3. Never overwrites role_id, user_roles, user_modules, permissions, is_active, or is_deleted.
 * 4. Resolves department_id and designation_id if currently unassigned and match exists.
 * 5. Handles missing Graph data or permission restrictions safely without breaking login.
 */
export async function syncMicrosoftUserToMaster({
  authUserId,
  email,
  userMetadata,
  providerToken,
}: SyncMicrosoftUserParams): Promise<{
  success: boolean;
  userRecord: any;
  isNewUser: boolean;
}> {
  try {
    // Step 1: Extract Graph Profile if provider_token is available
    let graphProfile: MicrosoftGraphProfile | null = null;
    let photoUrl: string | null = null;

    if (providerToken) {
      const [profileResult, photoResult] = await Promise.all([
        fetchMicrosoftProfile(providerToken),
        fetchMicrosoftProfilePhoto(providerToken),
      ]);
      graphProfile = profileResult;

      if (photoResult) {
        photoUrl = await uploadProfilePhoto(authUserId, photoResult);
      }
    }

    // Step 2: Combine Graph Profile with ID Token user_metadata fallbacks
    const msId = graphProfile?.microsoftId || userMetadata?.oid || userMetadata?.sub || undefined;
    const resolvedEmail = (graphProfile?.email || email || userMetadata?.email || userMetadata?.preferred_username || "").toLowerCase().trim();
    const upn = (graphProfile?.userPrincipalName || userMetadata?.preferred_username || userMetadata?.email || "").toLowerCase().trim();
    const fullName = graphProfile?.displayName || userMetadata?.full_name || userMetadata?.name || (resolvedEmail ? resolvedEmail.split("@")[0] : "Chandak Personnel");
    const firstName = graphProfile?.firstName || userMetadata?.given_name || undefined;
    const lastName = graphProfile?.lastName || userMetadata?.family_name || undefined;
    const jobTitle = graphProfile?.jobTitle || undefined;
    const departmentName = graphProfile?.department || undefined;
    const officeLocation = graphProfile?.officeLocation || undefined;
    const mobilePhone = graphProfile?.mobilePhone || undefined;
    const businessPhone = graphProfile?.businessPhone || undefined;
    const companyName = graphProfile?.companyName || undefined;

    // Step 3: Match existing user in user_master
    // 3a. Match by exact auth ID
    let existingUser: any = null;
    const { data: userById } = await supabaseAdmin
      .from("user_master")
      .select("*")
      .eq("id", authUserId)
      .maybeSingle();

    existingUser = userById;

    // 3b. Match by stable Microsoft ID
    if (!existingUser && msId) {
      const { data: userByMsId } = await supabaseAdmin
        .from("user_master")
        .select("*")
        .eq("microsoft_id", msId)
        .maybeSingle();

      existingUser = userByMsId;
    }

    // 3c. Match by email or UPN (case-insensitive)
    if (!existingUser && (resolvedEmail || upn)) {
      let query = supabaseAdmin.from("user_master").select("*");
      if (resolvedEmail && upn && resolvedEmail !== upn) {
        query = query.or(`email.ilike.${resolvedEmail},user_principal_name.ilike.${upn}`);
      } else if (resolvedEmail) {
        query = query.ilike("email", resolvedEmail);
      } else {
        query = query.ilike("user_principal_name", upn);
      }

      const { data: userByEmail } = await query.maybeSingle();
      existingUser = userByEmail;
    }

    // Step 4: Department & Designation auto-resolution (if currently unassigned)
    let resolvedDepartmentId = existingUser?.department_id || null;
    let resolvedDesignationId = existingUser?.designation_id || null;

    if (!resolvedDepartmentId && departmentName) {
      const { data: matchedDept } = await supabaseAdmin
        .from("departments")
        .select("id")
        .ilike("name", departmentName.trim())
        .eq("is_deleted", false)
        .maybeSingle();

      if (matchedDept?.id) {
        resolvedDepartmentId = matchedDept.id;
      }
    }

    if (!resolvedDesignationId && jobTitle) {
      const { data: matchedDesig } = await supabaseAdmin
        .from("designations")
        .select("id")
        .ilike("name", jobTitle.trim())
        .eq("is_deleted", false)
        .maybeSingle();

      if (matchedDesig?.id) {
        resolvedDesignationId = matchedDesig.id;
      }
    }

    const nowIso = new Date().toISOString();

    // Step 5: Update Existing User or Provision New User
    if (existingUser) {
      const updatePayload: Record<string, any> = {
        last_login_at: nowIso,
        updated_at: nowIso,
        ms_profile_synced_at: nowIso,
      };

      if (fullName && (!existingUser.full_name || existingUser.full_name === "New Personnel" || existingUser.full_name === "New User")) {
        updatePayload.full_name = fullName;
      }
      if (firstName && !existingUser.first_name) updatePayload.first_name = firstName;
      if (lastName && !existingUser.last_name) updatePayload.last_name = lastName;
      if (msId && !existingUser.microsoft_id) updatePayload.microsoft_id = msId;
      if (upn && !existingUser.user_principal_name) updatePayload.user_principal_name = upn;
      if (jobTitle && !existingUser.job_title) updatePayload.job_title = jobTitle;
      if (departmentName && !existingUser.department_name) updatePayload.department_name = departmentName;
      if (officeLocation && !existingUser.office_location) updatePayload.office_location = officeLocation;
      if (mobilePhone && !existingUser.mobile_phone) updatePayload.mobile_phone = mobilePhone;
      if (businessPhone && !existingUser.business_phone) updatePayload.business_phone = businessPhone;
      if (companyName && !existingUser.company_name) updatePayload.company_name = companyName;

      if (resolvedDepartmentId && !existingUser.department_id) updatePayload.department_id = resolvedDepartmentId;
      if (resolvedDesignationId && !existingUser.designation_id) updatePayload.designation_id = resolvedDesignationId;

      // Update profile photograph if a fresh one was retrieved from Microsoft Graph
      if (photoUrl) {
        updatePayload.profile_photo = photoUrl;
      }

      const { data: updatedRecord, error: updateError } = await supabaseAdmin
        .from("user_master")
        .update(updatePayload)
        .eq("id", existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.warn("[Microsoft Graph] Failed to update user_master profile:", updateError.message);
        return { success: true, userRecord: existingUser, isNewUser: false };
      }

      return { success: true, userRecord: updatedRecord || existingUser, isNewUser: false };
    }

    // Step 6: Provision New User
    const userCode = `USR-${authUserId.substring(0, 8).toUpperCase()}`;

    // Look up default role (USER)
    const { data: defaultRole } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("code", "USER")
      .maybeSingle();

    const insertPayload: Record<string, any> = {
      id: authUserId,
      email: resolvedEmail || `${authUserId}@chandakgroup.tech`,
      full_name: fullName,
      user_code: userCode,
      is_active: true,
      is_deleted: false,
      role_id: defaultRole?.id || null,
      microsoft_id: msId || null,
      user_principal_name: upn || null,
      first_name: firstName || null,
      last_name: lastName || null,
      job_title: jobTitle || null,
      department_name: departmentName || null,
      department_id: resolvedDepartmentId || null,
      designation_id: resolvedDesignationId || null,
      office_location: officeLocation || null,
      mobile_phone: mobilePhone || null,
      business_phone: businessPhone || null,
      company_name: companyName || null,
      profile_photo: photoUrl || null,
      ms_profile_synced_at: nowIso,
      last_login_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const { data: createdRecord, error: insertError } = await supabaseAdmin
      .from("user_master")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error("[Microsoft Graph] Failed to provision new user_master:", insertError.message);
      // Fallback check if another parallel request inserted
      const { data: fallbackUser } = await supabaseAdmin
        .from("user_master")
        .select("*")
        .eq("id", authUserId)
        .maybeSingle();

      if (fallbackUser) {
        return { success: true, userRecord: fallbackUser, isNewUser: false };
      }
      return { success: false, userRecord: null, isNewUser: false };
    }

    // Assign default operational modules to new user
    const { assignUserModules } = await import("@/lib/actions/module-switcher");
    await assignUserModules(authUserId, ["TASK_WORKFLOW", "VEHICLE_DESK", "DESIGN_TRACKING"], "TASK_WORKFLOW");

    return { success: true, userRecord: createdRecord, isNewUser: true };
  } catch (err: any) {
    console.error("[Microsoft Graph] syncMicrosoftUserToMaster error:", err);
    return { success: false, userRecord: null, isNewUser: false };
  }
}
