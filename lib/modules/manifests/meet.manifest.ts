import type { ModuleManifest } from "../types";

/**
 * Chandak Meet — Module Manifest
 * Governance: Master Architecture Blueprint v2.0 (Phase 4 Pilot Module)
 */
export const meetManifest: ModuleManifest = {
  code: "CHANDAK_MEET",
  name: "Chandak Meet",
  description: "Enterprise meeting governance, agendas, live sessions, MOM, and action tracking",
  icon: "Calendar",
  routePath: "/meet",
  displayOrder: 4,
  status: "ACTIVE",
  rbacAdminRoute: "/meet/settings/rbac",
  scopeConfig: {
    supportedTypes: ["all", "departments"],
    defaultType: "all",
    entityLabel: "Department",
  },
  roles: [
    {
      code: "STANDARD",
      name: "Meeting Participant",
      description: "Standard meeting participant who can view meetings, add agenda points, and update assigned action items.",
      isSystem: true,
    },
    {
      code: "ORGANISER",
      name: "Meeting Organiser",
      description: "Meeting organizer who can create and schedule meetings, manage sessions, and assign action items.",
      isSystem: false,
    },
    {
      code: "MEET_ADMIN",
      name: "Meet Administrator",
      description: "Full administrative control over all meeting templates, SLA policies, room masters, and module RBAC settings.",
      isSystem: false,
    },
    {
      code: "VIEWER",
      name: "Meeting Viewer",
      description: "Read-only access to view meetings and published minutes of meetings.",
      isSystem: false,
    },
  ],
  permissions: [
    {
      code: "MEETINGS_VIEW",
      name: "View Meetings",
      description: "View meeting schedules, details, agendas, and published minutes of meetings",
      category: "VIEW",
    },
    {
      code: "MEETINGS_CREATE",
      name: "Create Meetings",
      description: "Draft and schedule new meetings, set cadences, and define agendas",
      category: "CREATE",
    },
    {
      code: "MEETINGS_UPDATE",
      name: "Update Meetings",
      description: "Edit meeting details, change dates, update agendas, and modify meeting settings",
      category: "EDIT",
    },
    {
      code: "MEETINGS_DELETE",
      name: "Delete Meetings",
      description: "Cancel, archive, or permanently remove meetings and meeting series",
      category: "DELETE",
      isSensitive: true,
    },
    {
      code: "SESSIONS_START_RUN",
      name: "Run Meeting Sessions",
      description: "Start, pause, end live meeting sessions, take live minutes, and control attendance",
      category: "ADMINISTER",
    },
    {
      code: "AGENDA_ADD_POINTS",
      name: "Add Agenda Points",
      description: "Propose, draft, and add discussion points or agenda items to meetings",
      category: "CREATE",
    },
    {
      code: "MOM_RECORD_PUBLISH",
      name: "Publish MOM & Decisions",
      description: "Record, edit, approve, and formally publish Minutes of Meeting and official decisions",
      category: "APPROVE",
    },
    {
      code: "ACTION_ITEMS_ASSIGN",
      name: "Assign Action Items",
      description: "Assign action item tasks to users, set deadlines, and configure escalation targets",
      category: "ADMINISTER",
    },
    {
      code: "ACTION_ITEMS_UPDATE",
      name: "Update Action Items",
      description: "Update progress, mark checklists, and complete assigned action tasks",
      category: "EDIT",
    },
    {
      code: "MEET_SETTINGS",
      name: "Manage Meet Settings",
      description: "Configure meeting masters, room displays, SLA escalation policies, templates, and module RBAC",
      category: "CONFIGURE",
      isSensitive: true,
    },
  ],
  defaultPolicies: {
    STANDARD: [
      "MEETINGS_VIEW",
      "AGENDA_ADD_POINTS",
      "ACTION_ITEMS_UPDATE",
    ],
    VIEWER: [
      "MEETINGS_VIEW",
    ],
    ORGANISER: [
      "MEETINGS_VIEW",
      "MEETINGS_CREATE",
      "MEETINGS_UPDATE",
      "SESSIONS_START_RUN",
      "AGENDA_ADD_POINTS",
      "MOM_RECORD_PUBLISH",
      "ACTION_ITEMS_ASSIGN",
      "ACTION_ITEMS_UPDATE",
    ],
    MEET_ADMIN: [
      "MEETINGS_VIEW",
      "MEETINGS_CREATE",
      "MEETINGS_UPDATE",
      "MEETINGS_DELETE",
      "SESSIONS_START_RUN",
      "AGENDA_ADD_POINTS",
      "MOM_RECORD_PUBLISH",
      "ACTION_ITEMS_ASSIGN",
      "ACTION_ITEMS_UPDATE",
      "MEET_SETTINGS",
    ],
  },
};

export default meetManifest;
