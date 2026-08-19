# Agent Rules

## Strict Logic and Schema Verification

You will ALWAYS double-check the logic of the fields, database columns, and code paths you are modifying. Before pushing code or making definitive statements, you must verify against the live schema or active codebase to ensure what you are doing is absolutely correct and not based on assumptions.


## Hosting Environment

The project is deployed on a custom domain portal/server (standard Node environment), NOT on Vercel. Do not rely on serverless-specific features (like  ercel.json crons) or assume Vercel deployment constraints. Assume a long-running Node.js process unless told otherwise.

## Mandatory Self-Verification

Whenever you are given a requirement, report an issue, or report an error, you MUST independently verify your fix from your end. After writing code or making modifications, do not just assume it works. You must run relevant checks (e.g., `npx tsc --noEmit`, linters, or test scripts), check logs, and definitively confirm that the changes actually resolve the stated issue before notifying the user that it is complete. You are responsible for the final quality assurance of your own changes.

## Global Dependency and Regression Validation

NEVER deploy a change without first checking its global impact. 
- If you modify a shared component, global CSS, or utility (e.g., removing a class like `backdrop-blur` or modifying `globals.css`), you MUST search the codebase to understand what other modules use it.
- If you modify a specific workflow (e.g., Requirement Creation), you MUST trace the entire lifecycle of the data (e.g., from Ticket -> Requirement) to ensure dependent entities like attachments, approval flows, or statuses aren't orphaned or broken.
- Assume every localized change has a global ripple effect. Systematically verify that "because of or in between these changes, something else didn't accidentally break."
