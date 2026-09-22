# Business Rules Registry

This document records the important business rules for the Chandak Workspace application. 
The AI Agent MUST check this file before changing business logic.

## 1. Task Execution & Ownership Rules

- **Primary Assignee (Task Owner)**:
  - Can change Primary Assignee, Executors, and Watchers.
  - Can change Task Schedule (Duration, Start Date, Due Date).
  - Can change Task Status, Department, Title, and Checklists.
  - Can Transfer Task to another workspace.
  - Can Close / Reopen the task.

- **Executors (Collaborators)**:
  - Can change Task Status (Start Progress, Resolve Directive).
  - Can check off checklist items, create checklist items, and upload attachments.
  - Can add Task Remarks and collaborate in realtime chat.
  - **CANNOT** reassign Primary Assignee or modify Executors.
  - **CANNOT** alter Task Dates or Duration.
  - **CANNOT** Transfer or Delete the task.

- **Watchers / Reviewers / Standard Users (`ROLE_AGENT`)**:
  - Read-only access to task properties and timeline.
  - Can view details, view attachments, and add remarks / comments.
  - **MUST NOT** see any Edit buttons (Primary Assignee, Executors, Watchers, Dates, Transfer).

- **Super Admin**:
  - Full override access across all operations.

