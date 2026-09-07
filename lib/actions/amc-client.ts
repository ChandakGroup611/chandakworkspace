"use client";

/**
 * Robust Client-Side AMC Mutation Helpers
 * Communicates via REST API to ensure 100% resilience across server redeployments
 * and eliminate Next.js Server Action hash mismatch errors ("failed-to-find-server-action").
 */

export async function saveAMCEntity(tableName: string, payload: any, editId?: string) {
  try {
    const res = await fetch("/api/amc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tableName,
        payload,
        editId
      })
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("[AMC Client Mutation Error]:", err);
    return { success: false, error: err.message || "Failed to communicate with server." };
  }
}

export async function deleteAMCEntity(tableName: string, id: string, hardDelete = false) {
  try {
    const res = await fetch("/api/amc", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tableName,
        id,
        hardDelete
      })
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("[AMC Client Delete Error]:", err);
    return { success: false, error: err.message || "Failed to communicate with server." };
  }
}
