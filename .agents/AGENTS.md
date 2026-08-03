# Agent Rules

## Strict Pre-Deployment Checklist

To prevent caching conflicts, unstyled pages, broken builds, or edge-cases during deployment to Vercel/Production, the agent MUST ALWAYS perform the following pre-deployment checks when a user asks to deploy:

1. **Local Build Verification**: Run `npm run build` locally in a background task to verify there are absolutely zero TypeScript compilation errors, broken imports, or missing props errors (like missing next/image imports).
2. **Cross-Component Impact Analysis**: If updating a shared layout, sidebar, or authentication page, explicitly state any downstream effects. Verify things like overlap issues, responsive width transitions, and logout behavior states before considering the fix complete.
3. **Wait for Approval**: Before running `git commit` and `git push`, present a brief summary of the completed checklist to the user and explicitly wait for their confirmation to push to the live server.
4. **Vulnerability Scan**: Always run `npm audit` to check for Hostinger / dependency vulnerabilities. If any exist, you must resolve them first before deploying. **CRITICAL**: The scan MUST pass with exactly `0 vulnerabilities` before proceeding. If a package has an unpatchable vulnerability (e.g., patched version not yet on the registry), you must use advanced resolution strategies (like isolating the package in a local `vendor/` directory and patching it manually, then using `file:` dependencies) to ensure `npm audit` natively reports 0 vulnerabilities. Never skip this check.
5. **IAM & RBAC Functionality Verification**: Whenever changes touch IAM, user management, authentication, or permissions, verify that:
   - **Role Assignment**: User role assignments (in user edit/create flows) save correctly with proper UUID sanitization and role mapping.
   - **Permission Matrix Ticking**: In the IAM Role Builder (`/iam/roles`), verify that permissions are clickable/toggleable individually and per-module (`togglePermission`, `toggleModulePermissions`), and that `syncRolePermissions` accurately persists selected permission IDs.
   - **Authorization Logic & Snapshots**: Verify that permission changes propagate to `user_permissions_snapshot`, system roles remain protected, and `checkServerPermission` / `hasPermission` gates function without regression.
