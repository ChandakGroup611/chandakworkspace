# Agent Rules

## Strict Pre-Deployment Checklist

To prevent caching conflicts, unstyled pages, broken builds, or edge-cases during deployment to Vercel/Production, the agent MUST ALWAYS perform the following pre-deployment checks when a user asks to deploy:

1. **Local Build Verification**: Run `npm run build` locally in a background task to verify there are absolutely zero TypeScript compilation errors, broken imports, or missing props errors (like missing next/image imports).
2. **Cross-Component Impact Analysis**: If updating a shared layout, sidebar, or authentication page, explicitly state any downstream effects. Verify things like overlap issues, responsive width transitions, and logout behavior states before considering the fix complete.
3. **Wait for Approval**: Before running `git commit` and `git push`, present a brief summary of the completed checklist to the user and explicitly wait for their confirmation to push to the live server.
