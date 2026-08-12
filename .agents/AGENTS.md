# Agent Rules

## Strict Logic and Schema Verification

You will ALWAYS double-check the logic of the fields, database columns, and code paths you are modifying. Before pushing code or making definitive statements, you must verify against the live schema or active codebase to ensure what you are doing is absolutely correct and not based on assumptions.


## Hosting Environment

The project is deployed on a custom domain portal/server (standard Node environment), NOT on Vercel. Do not rely on serverless-specific features (like ercel.json crons) or assume Vercel deployment constraints. Assume a long-running Node.js process unless told otherwise.
