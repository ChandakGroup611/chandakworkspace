"use server";

import {
  getModuleRbacDataAction,
  saveModuleRolePolicyAction,
  resetModuleRoleToDefaultAction,
  type ModuleRoleData,
  type ModuleRbacResponse,
} from "@/lib/actions/module-rbac";

export type MeetRoleData = ModuleRoleData;
export type MeetRbacResponse = ModuleRbacResponse;

/**
 * Fetch complete RBAC state for Chandak Meet.
 */
export async function getMeetRbacDataAction(): Promise<MeetRbacResponse> {
  return getModuleRbacDataAction("CHANDAK_MEET");
}

/**
 * Save customized permissions for a Chandak Meet role.
 */
export async function saveMeetRolePolicyAction(
  roleCode: string,
  newPermissions: string[]
): Promise<{ success: boolean; error?: string }> {
  return saveModuleRolePolicyAction("CHANDAK_MEET", roleCode, newPermissions);
}

/**
 * Reset a role to manifest defaults.
 */
export async function resetMeetRoleToDefaultAction(
  roleCode: string
): Promise<{ success: boolean; error?: string }> {
  return resetModuleRoleToDefaultAction("CHANDAK_MEET", roleCode);
}
