import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const PERMS_TO_SEED: any[] = [
  {
    "id": "9ba9301c-af5a-4cad-a5cc-70b9d94f8185",
    "code": "LEARNING_VIEW",
    "name": "View Core",
    "module": "LEARNING",
    "submodule": "Core",
    "action": "VIEW",
    "resource_type": "PAGE"
  },
  {
    "id": "3c6735aa-85b7-4ff0-9aa4-913977182a6b",
    "code": "LEARNING_MANAGE",
    "name": "Manage Core",
    "module": "LEARNING",
    "submodule": "Core",
    "action": "MANAGE",
    "resource_type": "PAGE"
  },
  {
    "id": "46bba767-2f25-4c0b-9abb-797fdaf947d5",
    "code": "AUDIT_READ",
    "name": "View Audit Trails",
    "module": "governance",
    "submodule": null,
    "action": "VIEW",
    "resource_type": "PAGE"
  },
  {
    "id": "35f6f3be-f81c-46e3-a059-0a47947c4d8e",
    "code": "USER_MANAGE",
    "name": "Manage User Directory",
    "module": "IAM",
    "submodule": "Users",
    "action": "MANAGE",
    "resource_type": "PAGE"
  },
  {
    "id": "6e686745-e8c8-4e0f-8fc4-c152449c74ea",
    "code": "IAM_ADMIN",
    "name": "Global Identity Master",
    "module": "IAM",
    "submodule": "Security",
    "action": "MANAGE",
    "resource_type": "PAGE"
  },
  {
    "id": "04549f66-4087-4f5c-8b6e-90843dc237b7",
    "code": "TICKETS_VIEW",
    "name": "View Operations Tickets",
    "module": "Tickets",
    "submodule": "ITSM Lifecycle",
    "action": "VIEW",
    "resource_type": "PAGE"
  },
  {
    "id": "5d5777be-7281-4f4a-97b1-06a7223bf53e",
    "code": "TICKETS_CREATE",
    "name": "Create Service Tickets",
    "module": "Tickets",
    "submodule": "ITSM Lifecycle",
    "action": "CREATE",
    "resource_type": "PAGE"
  },
  {
    "id": "7bd08efe-ed37-4295-9544-8b4968155a4d",
    "code": "TICKETS_UPDATE",
    "name": "Modify Ticket Records",
    "module": "Tickets",
    "submodule": "ITSM Lifecycle",
    "action": "UPDATE",
    "resource_type": "PAGE"
  },
  {
    "id": "4d00b63f-bcb5-4a8d-a30f-54a51509cdac",
    "code": "TICKETS_DELETE",
    "name": "Purge Ticket Data",
    "module": "Tickets",
    "submodule": "ITSM Lifecycle",
    "action": "DELETE",
    "resource_type": "PAGE"
  },
  {
    "id": "975fcede-c1c0-42ac-86f6-75ed585ee4a3",
    "code": "TICKETS_MANAGE",
    "name": "Full Ticket Governance",
    "module": "Tickets",
    "submodule": "ITSM Lifecycle",
    "action": "MANAGE",
    "resource_type": "PAGE"
  },
  {
    "id": "7bde50ba-7c24-46da-bd13-2a63172a74a7",
    "code": "WORKSPACES_VIEW",
    "name": "View Workspace Hub",
    "module": "Workspaces",
    "submodule": "Execution Tasks",
    "action": "VIEW",
    "resource_type": "PAGE"
  },
  {
    "id": "2e70d8e8-0104-44d3-8642-2979f9c69166",
    "code": "WORKSPACES_CREATE",
    "name": "Initialize Workspaces",
    "module": "Workspaces",
    "submodule": "Execution Tasks",
    "action": "CREATE",
    "resource_type": "PAGE"
  },
  {
    "id": "ee8f1a9c-30e7-4ab0-89a8-ab06ccfa7bb0",
    "code": "WORKSPACES_UPDATE",
    "name": "Modify Workspaces",
    "module": "Workspaces",
    "submodule": "Execution Tasks",
    "action": "UPDATE",
    "resource_type": "PAGE"
  },
  {
    "id": "b5487e40-5273-45f7-9420-7a4648f650c1",
    "code": "WORKSPACES_DELETE",
    "name": "Archive Workspaces",
    "module": "Workspaces",
    "submodule": "Execution Tasks",
    "action": "DELETE",
    "resource_type": "PAGE"
  },
  {
    "id": "2847aeb6-1c37-498c-bfa1-7200e68a2db2",
    "code": "WORKSPACES_MANAGE",
    "name": "Workspace Governance",
    "module": "Workspaces",
    "submodule": "Execution Tasks",
    "action": "MANAGE",
    "resource_type": "PAGE"
  },
  {
    "id": "78835170-f282-4763-9a98-850971db5e77",
    "code": "TASKS_VIEW",
    "name": "View Tasks Flow",
    "module": "Tasks",
    "submodule": "Execution Tasks",
    "action": "VIEW",
    "resource_type": "PAGE"
  },
  {
    "id": "f125691d-129f-4d12-bc58-514e52b1248b",
    "code": "TASKS_CREATE",
    "name": "Create Tasks",
    "module": "Tasks",
    "submodule": "Execution Tasks",
    "action": "CREATE",
    "resource_type": "PAGE"
  },
  {
    "id": "79311f1f-6439-46e1-a5ac-2b3d2b754bcd",
    "code": "TASKS_UPDATE",
    "name": "Modify Tasks state",
    "module": "Tasks",
    "submodule": "Execution Tasks",
    "action": "UPDATE",
    "resource_type": "PAGE"
  },
  {
    "id": "52e9cce7-e614-4be6-8f80-98f85ad492ce",
    "code": "TASKS_DELETE",
    "name": "Delete Tasks",
    "module": "Tasks",
    "submodule": "Execution Tasks",
    "action": "DELETE",
    "resource_type": "PAGE"
  },
  {
    "id": "a2e277db-a058-459e-aa47-bed6e1208fdb",
    "code": "TASKS_MANAGE",
    "name": "Tasks Governance",
    "module": "Tasks",
    "submodule": "Execution Tasks",
    "action": "MANAGE",
    "resource_type": "PAGE"
  },
  {
    "id": "c77d34e6-19f9-4ec1-b249-77a23c400baa",
    "code": "USERS_VIEW",
    "name": "View User Directory",
    "module": "Users",
    "submodule": "Personnel Registry",
    "action": "VIEW",
    "resource_type": "PAGE"
  },
  {
    "id": "5dc9f8bf-a6d6-48d0-8397-afd509cc098b",
    "code": "USERS_CREATE",
    "name": "Register New Users",
    "module": "Users",
    "submodule": "Personnel Registry",
    "action": "CREATE",
    "resource_type": "PAGE"
  },
  {
    "id": "4bdfef36-1b6c-4016-8fad-a2bd04e38bcc",
    "code": "USERS_UPDATE",
    "name": "Modify Personnel Profiles",
    "module": "Users",
    "submodule": "Personnel Registry",
    "action": "UPDATE",
    "resource_type": "PAGE"
  },
  {
    "id": "92ba4ee9-247a-4a1d-aa6f-0034bad21eb9",
    "code": "SLA_VIEW",
    "name": "View SLA Rules",
    "module": "SLA",
    "submodule": "Service Levels",
    "action": "VIEW",
    "resource_type": "PAGE"
  },
  {
    "id": "b36ea479-fcc1-4101-95fd-ce3a2cf94e95",
    "code": "SLA_CREATE",
    "name": "Create SLA Targets",
    "module": "SLA",
    "submodule": "Service Levels",
    "action": "CREATE",
    "resource_type": "PAGE"
  },
  {
    "id": "34de4473-6c86-4daa-a7c9-de88a9ac3687",
    "code": "USERS_DELETE",
    "name": "Deactivate Accounts",
    "module": "Users",
    "submodule": "Personnel Registry",
    "action": "DELETE",
    "resource_type": "PAGE"
  },
  {
    "id": "a35f133a-23e5-4835-b3b6-e732d8cb6f2c",
    "code": "USERS_MANAGE",
    "name": "Full HR Governance",
    "module": "Users",
    "submodule": "Personnel Registry",
    "action": "MANAGE",
    "resource_type": "PAGE"
  },
  {
    "id": "8de8644a-73ad-4df9-960c-c78037ffb69e",
    "code": "IAM_VIEW",
    "name": "View Identity Controls",
    "module": "IAM",
    "submodule": "Security Registry",
    "action": "VIEW",
    "resource_type": "PAGE"
  },
  {
    "id": "0d41e8fe-ae63-4618-92ca-27db45f5c129",
    "code": "IAM_CREATE",
    "name": "Create Security Policies",
    "module": "IAM",
    "submodule": "Security Registry",
    "action": "CREATE",
    "resource_type": "PAGE"
  },
  {
    "id": "be1c9286-26b4-4811-87ff-b764961df06d",
    "code": "IAM_UPDATE",
    "name": "Modify Access Rules",
    "module": "IAM",
    "submodule": "Security Registry",
    "action": "UPDATE",
    "resource_type": "PAGE"
  },
  {
    "id": "57007d0f-fdfc-4f64-a2fc-a5ced9a4fbcd",
    "code": "IAM_DELETE",
    "name": "Revoke Roles",
    "module": "IAM",
    "submodule": "Security Registry",
    "action": "DELETE",
    "resource_type": "PAGE"
  },
  {
    "id": "99636cbd-abf8-4512-86e8-c932a2e01f5e",
    "code": "IAM_MANAGE",
    "name": "Manage Roles & Access",
    "module": "IAM",
    "submodule": "Security Registry",
    "action": "MANAGE",
    "resource_type": "PAGE"
  },
  {
    "id": "66a2f1a8-6793-4bfe-b223-939cdcfdec48",
    "code": "MASTERS_VIEW",
    "name": "View System Masters Config",
    "module": "Masters",
    "submodule": "Core Config",
    "action": "VIEW",
    "resource_type": "PAGE"
  },
  {
    "id": "135324e6-876a-4436-a0d3-12b9af1cd2a5",
    "code": "MASTERS_CREATE",
    "name": "Create Master Entities",
    "module": "Masters",
    "submodule": "Core Config",
    "action": "CREATE",
    "resource_type": "PAGE"
  },
  {
    "id": "acf01a75-26dd-45ab-b5ab-b8be1410b362",
    "code": "MASTERS_UPDATE",
    "name": "Modify Master Specs",
    "module": "Masters",
    "submodule": "Core Config",
    "action": "UPDATE",
    "resource_type": "PAGE"
  },
  {
    "id": "4fe201db-c49f-4a7a-8d6c-8e2581c8e572",
    "code": "MASTERS_DELETE",
    "name": "Remove Master Data",
    "module": "Masters",
    "submodule": "Core Config",
    "action": "DELETE",
    "resource_type": "PAGE"
  },
  {
    "id": "6a02b979-eb8e-4f35-824d-a7f8707ba975",
    "code": "MASTERS_MANAGE",
    "name": "Masters Governance",
    "module": "Masters",
    "submodule": "Core Config",
    "action": "MANAGE",
    "resource_type": "PAGE"
  },
  {
    "id": "f9e7900c-a248-4e9e-9abf-f225676453c9",
    "code": "SLA_UPDATE",
    "name": "Modify SLA Metrics",
    "module": "SLA",
    "submodule": "Service Levels",
    "action": "UPDATE",
    "resource_type": "PAGE"
  },
  {
    "id": "c614e8a5-6354-468c-9a0d-230c8582f344",
    "code": "SLA_DELETE",
    "name": "Delete SLA Schemes",
    "module": "SLA",
    "submodule": "Service Levels",
    "action": "DELETE",
    "resource_type": "PAGE"
  },
  {
    "id": "e9c28e36-2fa8-4e7b-a08b-2f6b90250f8d",
    "code": "SLA_MANAGE",
    "name": "SLA Governance",
    "module": "SLA",
    "submodule": "Service Levels",
    "action": "MANAGE",
    "resource_type": "PAGE"
  },
  {
    "id": "c1834082-bd12-4d88-9cff-36e97134543a",
    "code": "TRASH_VIEW",
    "name": "View Trash Data Audits",
    "module": "Trash Data",
    "submodule": "Audit Registry",
    "action": "VIEW",
    "resource_type": "PAGE"
  },
  {
    "id": "71c1ebaa-d512-4e7b-8e88-a7e772edabc6",
    "code": "TRASH_CREATE",
    "name": "Add Trash Data Controls",
    "module": "Trash Data",
    "submodule": "Audit Registry",
    "action": "CREATE",
    "resource_type": "PAGE"
  },
  {
    "id": "484160d9-b863-4cde-8c4a-bc9166d67d47",
    "code": "TRASH_UPDATE",
    "name": "Update Trash Data Checks",
    "module": "Trash Data",
    "submodule": "Audit Registry",
    "action": "UPDATE",
    "resource_type": "PAGE"
  },
  {
    "id": "a995e8f0-1085-434d-b6fb-3f5fd4d30af2",
    "code": "TRASH_DELETE",
    "name": "Delete Trash Data Logs",
    "module": "Trash Data",
    "submodule": "Audit Registry",
    "action": "DELETE",
    "resource_type": "PAGE"
  },
  {
    "id": "5001381f-5c44-4e08-8be2-673df280a5bf",
    "code": "TRASH_MANAGE",
    "name": "Trash Data System Lead",
    "module": "Trash Data",
    "submodule": "Audit Registry",
    "action": "MANAGE",
    "resource_type": "PAGE"
  },
  {
    "id": "c4eab2b5-184d-4c42-99bd-4eb66c6075be",
    "code": "REQUIREMENTS_VIEW",
    "name": "View Requirements engineering",
    "module": "Requirements",
    "submodule": "Requirements Trace",
    "action": "VIEW",
    "resource_type": "PAGE"
  },
  {
    "id": "b45d6596-4887-4ca6-9cd0-0d6b4854ee1f",
    "code": "REQUIREMENTS_CREATE",
    "name": "Initialize Requirements",
    "module": "Requirements",
    "submodule": "Requirements Trace",
    "action": "CREATE",
    "resource_type": "PAGE"
  },
  {
    "id": "8c564871-51ef-4f71-b326-14ce6a36a0e3",
    "code": "REQUIREMENTS_UPDATE",
    "name": "Modify Requirements Specs",
    "module": "Requirements",
    "submodule": "Requirements Trace",
    "action": "UPDATE",
    "resource_type": "PAGE"
  },
  {
    "id": "ee72f4a1-91be-40e5-a7a7-bc9033b5ccca",
    "code": "REQUIREMENTS_DELETE",
    "name": "Archive Requirements",
    "module": "Requirements",
    "submodule": "Requirements Trace",
    "action": "DELETE",
    "resource_type": "PAGE"
  },
  {
    "id": "76d6792a-2189-4aa6-b68d-9fe0119f8d75",
    "code": "REQUIREMENTS_MANAGE",
    "name": "Requirements Governance",
    "module": "Requirements",
    "submodule": "Requirements Trace",
    "action": "MANAGE",
    "resource_type": "PAGE"
  },
  {
    "id": "4fe333bb-ff93-4784-9242-527eef158cf2",
    "code": "SETTINGS_VIEW",
    "name": "View Core",
    "module": "SETTINGS",
    "submodule": "Core",
    "action": "VIEW",
    "resource_type": "PAGE"
  },
  {
    "id": "d63b285f-d5ff-4a5d-80c1-8d017dd1465d",
    "code": "SETTINGS_CREATE",
    "name": "Create Core",
    "module": "SETTINGS",
    "submodule": "Core",
    "action": "CREATE",
    "resource_type": "PAGE"
  },
  {
    "id": "09958695-9057-4c84-ac0f-29e66735a597",
    "code": "REPORTS_VIEW",
    "name": "View Core",
    "module": "REPORTS",
    "submodule": "Core",
    "action": "VIEW",
    "resource_type": "PAGE"
  },
  {
    "id": "03c1f9bb-7d98-4880-9807-5e8b825142ce",
    "code": "REPORTS_CREATE",
    "name": "Create Core",
    "module": "REPORTS",
    "submodule": "Core",
    "action": "CREATE",
    "resource_type": "PAGE"
  },
  {
    "id": "2d67d319-4a30-4001-a3d1-1f413a3861d8",
    "code": "REPORTS_DELETE",
    "name": "Delete Core",
    "module": "REPORTS",
    "submodule": "Core",
    "action": "DELETE",
    "resource_type": "PAGE"
  },
  {
    "id": "e429fce9-fbc0-4fda-90a5-467be183d809",
    "code": "REQUIREMENTS_APPROVALS_MANAGE",
    "name": "Manage Approvals",
    "module": "REQUIREMENTS",
    "submodule": "Approvals",
    "action": "MANAGE",
    "resource_type": "PAGE"
  },
  {
    "id": "88d9dd22-bb7e-464d-9881-79ad16e68b9b",
    "code": "AUDIT_VIEW",
    "name": "View Core",
    "module": "governance",
    "submodule": "Core",
    "action": "VIEW",
    "resource_type": "PAGE"
  },
  {
    "id": "3f1b4876-8531-4401-a189-52a70edb7458",
    "code": "AUDIT_UPDATE",
    "name": "Update Core",
    "module": "governance",
    "submodule": "Core",
    "action": "UPDATE",
    "resource_type": "PAGE"
  },
  {
    "id": "77f940e1-c1d5-424d-82c6-b682346e4676",
    "code": "AUDIT_DELETE",
    "name": "Delete Core",
    "module": "governance",
    "submodule": "Core",
    "action": "DELETE",
    "resource_type": "PAGE"
  },
  {
    "id": "9aa28c44-3282-46e3-afc9-36097e9566ff",
    "code": "USER_VIEW",
    "name": "View Users",
    "module": "IAM",
    "submodule": "Users",
    "action": "VIEW",
    "resource_type": "PAGE"
  },
  {
    "id": "db29d5fe-8fa2-4529-895e-374a796639e8",
    "code": "USER_CREATE",
    "name": "Create Users",
    "module": "IAM",
    "submodule": "Users",
    "action": "CREATE",
    "resource_type": "PAGE"
  },
  {
    "id": "897ad8ae-a679-4909-966b-5b3651a0316c",
    "code": "USER_DELETE",
    "name": "Delete Users",
    "module": "IAM",
    "submodule": "Users",
    "action": "DELETE",
    "resource_type": "PAGE"
  },
  {
    "id": "867a4806-da23-4ef8-8890-9244b2998cf3",
    "code": "IAM_ADMIN_VIEW",
    "name": "View Security",
    "module": "IAM",
    "submodule": "Security",
    "action": "VIEW",
    "resource_type": "PAGE"
  },
  {
    "id": "80d7cbac-ba7d-430b-bfed-0f3aa61f4fba",
    "code": "IAM_ADMIN_UPDATE",
    "name": "Update Security",
    "module": "IAM",
    "submodule": "Security",
    "action": "UPDATE",
    "resource_type": "PAGE"
  },
  {
    "id": "99f0ee0a-b913-442e-81d6-60d31c3b49ed",
    "code": "IAM_ADMIN_DELETE",
    "name": "Delete Security",
    "module": "IAM",
    "submodule": "Security",
    "action": "DELETE",
    "resource_type": "PAGE"
  },
  {
    "id": "f83de6d4-61aa-4b78-b750-43f5fe9b1cfa",
    "code": "SYSTEM_MASTERS_MANAGE",
    "name": "Manage System Master",
    "module": "MASTERS",
    "submodule": "System Master",
    "action": "MANAGE",
    "resource_type": "PAGE"
  },
  {
    "id": "42c0d815-a7ef-45bd-9152-85fadfa030d6",
    "code": "SETTINGS_THEME_CREATE",
    "name": "Create Design Gallery",
    "module": "SETTINGS",
    "submodule": "Design Gallery",
    "action": "CREATE",
    "resource_type": "PAGE"
  },
  {
    "id": "85452ccd-52b2-4da5-9a6f-c41a9788f4c1",
    "code": "SETTINGS_THEME_MANAGE",
    "name": "Manage Design Gallery",
    "module": "SETTINGS",
    "submodule": "Design Gallery",
    "action": "MANAGE",
    "resource_type": "PAGE"
  },
  {
    "id": "f132b450-18e0-4f79-bd87-18bc10e52db9",
    "code": "SETTINGS_IDENTITY_CREATE",
    "name": "Create Identity & Access",
    "module": "SETTINGS",
    "submodule": "Identity & Access",
    "action": "CREATE",
    "resource_type": "PAGE"
  },
  {
    "id": "a6fdd1b1-41b1-4fb1-a07a-0dfca2cc8f0a",
    "code": "SETTINGS_IDENTITY_DELETE",
    "name": "Delete Identity & Access",
    "module": "SETTINGS",
    "submodule": "Identity & Access",
    "action": "DELETE",
    "resource_type": "PAGE"
  },
  {
    "id": "9a9df58a-67f6-4908-a344-bb5aed87170a",
    "code": "SETTINGS_COMMUNICATION_CREATE",
    "name": "Create Communication Center",
    "module": "SETTINGS",
    "submodule": "Communication Center",
    "action": "CREATE",
    "resource_type": "PAGE"
  },
  {
    "id": "c2739b34-15a5-4bf1-94e6-8dfbccadef2f",
    "code": "SETTINGS_COMMUNICATION_DELETE",
    "name": "Delete Communication Center",
    "module": "SETTINGS",
    "submodule": "Communication Center",
    "action": "DELETE",
    "resource_type": "PAGE"
  },
  {
    "id": "da298d1c-8bf7-428b-9f9c-a1b617da759a",
    "code": "SETTINGS_NOTIFICATIONS_CREATE",
    "name": "Create Notifications",
    "module": "SETTINGS",
    "submodule": "Notifications",
    "action": "CREATE",
    "resource_type": "PAGE"
  },
  {
    "id": "bfa09c7f-503b-4313-afe3-232c24c912b1",
    "code": "SETTINGS_NOTIFICATIONS_DELETE",
    "name": "Delete Notifications",
    "module": "SETTINGS",
    "submodule": "Notifications",
    "action": "DELETE",
    "resource_type": "PAGE"
  },
  {
    "id": "cde1636f-c8ce-49b8-81f6-b814618f984b",
    "code": "ENROLLED_WORKSPACES_CREATE",
    "name": "Create Enrolled Workspaces",
    "module": "WORKSPACES",
    "submodule": "Enrolled Workspaces",
    "action": "CREATE",
    "resource_type": "PAGE"
  },
  {
    "id": "e0c43e8c-bbb8-4251-97cd-85747f7a8118",
    "code": "ENROLLED_WORKSPACES_DELETE",
    "name": "Delete Enrolled Workspaces",
    "module": "WORKSPACES",
    "submodule": "Enrolled Workspaces",
    "action": "DELETE",
    "resource_type": "PAGE"
  },
  {
    "id": "9a2d6a2b-6ec7-457b-8d9d-937c3b36d81f",
    "code": "SETTINGS_DELETE",
    "name": "Delete Core",
    "module": "SETTINGS",
    "submodule": "Core",
    "action": "DELETE",
    "resource_type": "PAGE"
  },
  {
    "id": "b9331ab6-e64b-472d-a4c4-44a898d55b14",
    "code": "REPORTS_UPDATE",
    "name": "Update Core",
    "module": "REPORTS",
    "submodule": "Core",
    "action": "UPDATE",
    "resource_type": "PAGE"
  },
  {
    "id": "f50494fa-0e84-40f6-b041-814b9444ddc3",
    "code": "REPORTS_MANAGE",
    "name": "Manage Core",
    "module": "REPORTS",
    "submodule": "Core",
    "action": "MANAGE",
    "resource_type": "PAGE"
  },
  {
    "id": "47f278d6-e058-49a3-8e7e-2b4e1779f52a",
    "code": "AUDIT_CREATE",
    "name": "Create Core",
    "module": "governance",
    "submodule": "Core",
    "action": "CREATE",
    "resource_type": "PAGE"
  },
  {
    "id": "b1250167-d496-4612-ac73-08372447cbbd",
    "code": "AUDIT_MANAGE",
    "name": "Manage Core",
    "module": "governance",
    "submodule": "Core",
    "action": "MANAGE",
    "resource_type": "PAGE"
  },
  {
    "id": "711ce095-7fb9-4b6c-9c74-b7068e5484c1",
    "code": "USER_UPDATE",
    "name": "Update Users",
    "module": "IAM",
    "submodule": "Users",
    "action": "UPDATE",
    "resource_type": "PAGE"
  },
  {
    "id": "74bcea15-2113-4931-9a8e-d7f76b95b529",
    "code": "IAM_ADMIN_CREATE",
    "name": "Create Security",
    "module": "IAM",
    "submodule": "Security",
    "action": "CREATE",
    "resource_type": "PAGE"
  },
  {
    "id": "8061d312-13dd-4521-98b1-3e6de52bf54d",
    "code": "COMPANIES_MANAGE",
    "name": "Manage Company Master",
    "module": "MASTERS",
    "submodule": "Company Master",
    "action": "MANAGE",
    "resource_type": "PAGE"
  },
  {
    "id": "3e84ef39-96e1-43e2-adb2-bd69c01b19d2",
    "code": "SETTINGS_THEME_DELETE",
    "name": "Delete Design Gallery",
    "module": "SETTINGS",
    "submodule": "Design Gallery",
    "action": "DELETE",
    "resource_type": "PAGE"
  },
  {
    "id": "3a38c7ff-8403-462e-b512-ce86c2f54262",
    "code": "SETTINGS_IDENTITY_UPDATE",
    "name": "Update Identity & Access",
    "module": "SETTINGS",
    "submodule": "Identity & Access",
    "action": "UPDATE",
    "resource_type": "PAGE"
  },
  {
    "id": "bb34ecf6-b5cf-4d22-80e3-1529f3b7998a",
    "code": "SETTINGS_COMMUNICATION_UPDATE",
    "name": "Update Communication Center",
    "module": "SETTINGS",
    "submodule": "Communication Center",
    "action": "UPDATE",
    "resource_type": "PAGE"
  },
  {
    "id": "3b3924ad-a0d3-499a-91b6-551caf5f28af",
    "code": "SETTINGS_NOTIFICATIONS_UPDATE",
    "name": "Update Notifications",
    "module": "SETTINGS",
    "submodule": "Notifications",
    "action": "UPDATE",
    "resource_type": "PAGE"
  },
  {
    "id": "4fc67cbe-0c7b-45ed-a476-a0c5979d67a5",
    "code": "ENROLLED_WORKSPACES_UPDATE",
    "name": "Update Enrolled Workspaces",
    "module": "WORKSPACES",
    "submodule": "Enrolled Workspaces",
    "action": "UPDATE",
    "resource_type": "PAGE"
  },
  {
    "id": "e8e12a45-6a7b-4c89-9a1b-3f4a1c5d6e8b",
    "code": "REQUIREMENTS_REPORTS_VIEW",
    "name": "View Requirements Reports",
    "module": "Requirements",
    "submodule": "Requirement Analytics",
    "action": "VIEW",
    "resource_type": "PAGE"
  },
  {
    "id": "2d1a3b4c-5d6e-7f8a-9b0c-1d2e3f4a5b6c",
    "code": "REQUIREMENTS_REPORTS_CREATE",
    "name": "Create Requirements Reports",
    "module": "Requirements",
    "submodule": "Requirement Analytics",
    "action": "CREATE",
    "resource_type": "PAGE"
  },
  {
    "id": "f5e6d7c8-b9a0-1c2d-3e4f-5a6b7c8d9e0f",
    "code": "REQUIREMENTS_REPORTS_UPDATE",
    "name": "Update Requirements Reports",
    "module": "Requirements",
    "submodule": "Requirement Analytics",
    "action": "UPDATE",
    "resource_type": "PAGE"
  },
  {
    "id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "code": "REQUIREMENTS_REPORTS_DELETE",
    "name": "Delete Requirements Reports",
    "module": "Requirements",
    "submodule": "Requirement Analytics",
    "action": "DELETE",
    "resource_type": "PAGE"
  },
  {
    "id": "7e8f9a0b-1c2d-3e4f-5a6b-7c8d9e0f1a2b",
    "code": "REQUIREMENTS_REPORTS_MANAGE",
    "name": "Manage Requirements Reports",
    "module": "Requirements",
    "submodule": "Requirement Analytics",
    "action": "MANAGE",
    "resource_type": "PAGE"
  }
];

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.from("permissions").upsert(PERMS_TO_SEED, { onConflict: "code" });
  const { error: updateError } = await supabase.from("permissions").update({ action: "VIEW" }).eq("code", "AUDIT_READ");

  if (error) {
    return NextResponse.json({ success: false, error: error.message });
  }

  return NextResponse.json({ success: true, message: "Seeded " + PERMS_TO_SEED.length + " IAM permissions successfully.", updateError });
}
