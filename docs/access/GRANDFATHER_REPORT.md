# Grandfather Access Migration Report (GRANDFATHER_REPORT.md)

**Audit Date:** 2026-11-19  
**Governing Rule:** Master Programme WP7.3 (Grandfather Rule — Zero Access Loss Guarantee)  
**Active Users Audited:** 56  

## User-by-User Access Verification Matrix

| Corporate Email | Name | Platform Role | Status | Workspace Memberships | Assigned Module Roles | Scope Analysis | Grandfather Status |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- | :---: |
| `adil.kazi@chandakgroup.com` | adil.kazi | ROLE_AGENT | Active | 7 | TASK_WORKFLOW:MEMBER, CHANDAK_MEET:PARTICIPANT, VEHICLE_DESK:REQUESTER | TASK_WORKFLOW: all; CHANDAK_MEET: all; VEHICLE_DESK: all | PRESERVED |
| `anand.bhowad@chandakgroup.com` | anand.bhowad | ROLE_AGENT | Active | 6 | CHANDAK_MEET:ORGANISER, DASHBOARDS:VIEWER, TASK_WORKFLOW:MEMBER | CHANDAK_MEET: all; DASHBOARDS: companies; TASK_WORKFLOW: all | PRESERVED |
| `anand@chandakgroup.com` | anand | SUPER_ADMIN | Active | 16 | ALL MODULES (Root Override) | Global Unrestricted (ALL) | SUPER_ADMIN |
| `ankit.shukla@chandakgroup.com` | ankit.shukla | ROLE_AGENT | Inactive | 5 | TASK_WORKFLOW:MEMBER, CHANDAK_MEET:PARTICIPANT | TASK_WORKFLOW: all; CHANDAK_MEET: all | PRESERVED |
| `arun.narvekar@chandakgroup.com` | arun.narvekar | ROLE_AGENT | Active | 10 | TASK_WORKFLOW:MEMBER, CHANDAK_MEET:PARTICIPANT | TASK_WORKFLOW: all; CHANDAK_MEET: all | PRESERVED |
| `avinash.pise@chandakgroup.com` | Avinash Pise | SUPER_ADMIN | Active | 9 | ALL MODULES (Root Override) | Global Unrestricted (ALL) | SUPER_ADMIN |
| `avinashpise@chandakgroup.com` | avinashpise | ROLE_AGENT | Inactive | 0 | TASK_WORKFLOW:MEMBER, VEHICLE_DESK:FLEET_LEAD, CHANDAK_MEET:PARTICIPANT, DESIGN_TRACKING:VIEWER | TASK_WORKFLOW: all; VEHICLE_DESK: all; CHANDAK_MEET: all; DESIGN_TRACKING: all | PRESERVED |
| `bhavesh.k@chandakgroup.com` | bhavesh.k | ROLE_AGENT | Active | 6 | TASK_WORKFLOW:MEMBER, CHANDAK_MEET:ORGANISER | TASK_WORKFLOW: all; CHANDAK_MEET: all | PRESERVED |
| `gaurang.desai@chandakgroup.com` | gaurang.desai | ROLE_AGENT | Active | 0 | VEHICLE_DESK:FLEET_LEAD, CHANDAK_MEET:PARTICIPANT | VEHICLE_DESK: all; CHANDAK_MEET: all | PRESERVED |
| `kashvi.velani@chandakgroup.com` | kashvi.velani | ROLE_AGENT | Active | 5 | TASK_WORKFLOW:MEMBER | TASK_WORKFLOW: all | PRESERVED |
| `komal.panchal@chandakgroup.com` | komal.panchal | SUPER_ADMIN | Active | 22 | ALL MODULES (Root Override) | Global Unrestricted (ALL) | SUPER_ADMIN |
| `manmohan@chandakgroup.com` | manmohan | ROLE_AGENT | Active | 7 | TASK_WORKFLOW:MEMBER, CHANDAK_MEET:PARTICIPANT, VEHICLE_DESK:REQUESTER | TASK_WORKFLOW: all; CHANDAK_MEET: all; VEHICLE_DESK: all | PRESERVED |
| `meraz.ahamad@chandakgroup.com` | meraz.ahamad | ROLE_AGENT | Active | 7 | TASK_WORKFLOW:MEMBER, CHANDAK_MEET:ORGANISER | TASK_WORKFLOW: all; CHANDAK_MEET: all | PRESERVED |
| `minal.medhekar@chandakgroup.com` | minal.medhekar | ROLE_AGENT | Active | 0 | VEHICLE_DESK:FLEET_LEAD, CHANDAK_MEET:PARTICIPANT | VEHICLE_DESK: all; CHANDAK_MEET: all | PRESERVED |
| `mohak.joshi@chandakgroup.com` | mohak.joshi | ROLE_AGENT | Active | 7 | TASK_WORKFLOW:MEMBER, CHANDAK_MEET:ORGANISER | TASK_WORKFLOW: all; CHANDAK_MEET: all | PRESERVED |
| `Noreply@chandakgroup.com` | Noreply | ROLE_AGENT | Active | 0 | TASK_WORKFLOW:MEMBER, CHANDAK_MEET:PARTICIPANT, VEHICLE_DESK:REQUESTER, DESIGN_TRACKING:VIEWER | TASK_WORKFLOW: all; CHANDAK_MEET: all; VEHICLE_DESK: all; DESIGN_TRACKING: all | PRESERVED |
| `prashant.padwal@chandakgroup.com` | prashant.padwal | ROLE_AGENT | Active | 0 | DASHBOARDS:VIEWER, DASHBOARDS:VIEWER | DASHBOARDS: all; DASHBOARDS: all | PRESERVED |
| `prashant@chandakgroup.com` | prashant | ROLE_AGENT | Active | 2 | TASK_WORKFLOW:MEMBER, CHANDAK_MEET:PARTICIPANT | TASK_WORKFLOW: all; CHANDAK_MEET: all | PRESERVED |
| `rahil.shaikh@chandakgroup.com` | rahil.shaikh | ROLE_AGENT | Active | 9 | TASK_WORKFLOW:MEMBER, CHANDAK_MEET:PARTICIPANT | TASK_WORKFLOW: all; CHANDAK_MEET: all | PRESERVED |
| `rohit.gurav@chandakgroup.com` | rohit.gurav | ROLE_AGENT | Active | 8 | TASK_WORKFLOW:MEMBER, CHANDAK_MEET:ORGANISER | TASK_WORKFLOW: all; CHANDAK_MEET: all | PRESERVED |
| `sagar.jadhav@chandakgroup.com` | sagar.jadhav | ROLE_AGENT | Active | 7 | TASK_WORKFLOW:MEMBER, CHANDAK_MEET:ORGANISER | TASK_WORKFLOW: all; CHANDAK_MEET: all | PRESERVED |
| `sagar.mohta@chandakgroup.com` | sagar.mohta | ROLE_AGENT | Active | 6 | TASK_WORKFLOW:MEMBER, VEHICLE_DESK:FLEET_LEAD, CHANDAK_MEET:PARTICIPANT | TASK_WORKFLOW: all; VEHICLE_DESK: all; CHANDAK_MEET: all | PRESERVED |
| `shivani.bhandar@chandakgroup.com` | shivani.bhandar | ROLE_AGENT | Active | 6 | TASK_WORKFLOW:MEMBER, CHANDAK_MEET:PARTICIPANT | TASK_WORKFLOW: all; CHANDAK_MEET: all | PRESERVED |
| `super@gmail.com` | super | SUPER_ADMIN | Active | 20 | ALL MODULES (Root Override) | Global Unrestricted (ALL) | SUPER_ADMIN |
| `test.amc.admin@chandakgroup.tech` | test.amc.admin | ROLE_ADMIN | Inactive | 0 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.amc.noaccess@chandakgroup.tech` | test.amc.noaccess | ROLE_AGENT | Active | 0 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.amc.standard@chandakgroup.tech` | test.amc.standard | ROLE_AGENT | Active | 1 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.budget.admin@chandakgroup.tech` | test.budget.admin | ROLE_ADMIN | Inactive | 0 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.budget.noaccess@chandakgroup.tech` | test.budget.noaccess | ROLE_AGENT | Active | 0 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.budget.viewer@chandakgroup.tech` | test.budget.viewer | ROLE_AGENT | Active | 1 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.dash.multi@chandakgroup.tech` | test.dash.multi | ROLE_DASHBOARD | Active | 1 | DASHBOARDS:VIEWER, DASHBOARDS:VIEWER | DASHBOARDS: specific; DASHBOARDS: specific | PRESERVED |
| `test.dash.noaccess@chandakgroup.tech` | test.dash.noaccess | ROLE_AGENT | Active | 0 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.dash.viewer@chandakgroup.tech` | test.dash.viewer | ROLE_DASHBOARD | Active | 1 | DASHBOARDS:VIEWER | DASHBOARDS: specific | PRESERVED |
| `test.design.lead@chandakgroup.tech` | test.design.lead | ROLE_MANAGER | Inactive | 0 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.design.noaccess@chandakgroup.tech` | test.design.noaccess | ROLE_AGENT | Active | 0 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.design.viewer@chandakgroup.tech` | test.design.viewer | ROLE_AGENT | Active | 1 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.meet.attendee@chandakgroup.tech` | test.meet.attendee | ROLE_AGENT | Active | 1 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.meet.noaccess@chandakgroup.tech` | test.meet.noaccess | ROLE_AGENT | Active | 0 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.meet.organizer@chandakgroup.tech` | test.meet.organizer | ROLE_MANAGER | Inactive | 0 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.req.lead@chandakgroup.tech` | test.req.lead | ROLE_MANAGER | Inactive | 0 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.req.noaccess@chandakgroup.tech` | test.req.noaccess | ROLE_AGENT | Active | 0 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.req.standard@chandakgroup.tech` | test.req.standard | ROLE_AGENT | Active | 1 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.superadmin@chandakgroup.tech` | test.superadmin | SUPER_ADMIN | Inactive | 1 | ALL MODULES (Root Override) | Global Unrestricted (ALL) | SUPER_ADMIN |
| `test.task.manager@chandakgroup.tech` | test.task.manager | ROLE_MANAGER | Inactive | 0 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.task.noaccess@chandakgroup.tech` | test.task.noaccess | ROLE_AGENT | Active | 0 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.task.standard@chandakgroup.tech` | test.task.standard | ROLE_AGENT | Active | 1 | TASK_WORKFLOW:MEMBER | TASK_WORKFLOW: specific | PRESERVED |
| `test.ticket.lead@chandakgroup.tech` | test.ticket.lead | ROLE_MANAGER | Inactive | 0 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.ticket.noaccess@chandakgroup.tech` | test.ticket.noaccess | ROLE_AGENT | Active | 0 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.ticket.standard@chandakgroup.tech` | test.ticket.standard | ROLE_AGENT | Active | 1 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.vehicle.admin@chandakgroup.tech` | test.vehicle.admin | ROLE_ADMIN | Inactive | 0 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.vehicle.noaccess@chandakgroup.tech` | test.vehicle.noaccess | ROLE_AGENT | Active | 0 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `test.vehicle.traveler@chandakgroup.tech` | test.vehicle.traveler | ROLE_AGENT | Active | 1 | Synthetic Test User (Scoped per suite) | Test Harness Managed | TEST_USER |
| `vijay@chandakgroup.com` | vijay | SUPER_ADMIN | Active | 9 | ALL MODULES (Root Override) | Global Unrestricted (ALL) | SUPER_ADMIN |
| `vinayak.bhagane@chandakgroup.com` | vinayak.bhagane | ROLE_AGENT | Active | 6 | TASK_WORKFLOW:MEMBER, CHANDAK_MEET:ORGANISER | TASK_WORKFLOW: all; CHANDAK_MEET: all | PRESERVED |
| `wajid.ali@chandakgroup.com` | wajid.ali | ROLE_AGENT | Active | 10 | TASK_WORKFLOW:MEMBER, CHANDAK_MEET:PARTICIPANT | TASK_WORKFLOW: all; CHANDAK_MEET: all | PRESERVED |
| `yash.posture@chandakgroup.com` | yash.posture | ROLE_AGENT | Inactive | 6 | TASK_WORKFLOW:MEMBER, DESIGN_TRACKING:CONTRIBUTOR, CHANDAK_MEET:PARTICIPANT, DASHBOARDS:VIEWER | TASK_WORKFLOW: all; DESIGN_TRACKING: all; CHANDAK_MEET: all; DASHBOARDS: companies | PRESERVED |

---

### Summary
- **Total Users Evaluated:** 56
- **Access Loss Count:** 0 (100% of existing real users have full access preserved)
- **Super Administrators:** Global bypass retained as platform invariant.
