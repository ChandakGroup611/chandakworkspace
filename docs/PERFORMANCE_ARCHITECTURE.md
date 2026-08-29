# Performance Architecture Roadmap

## Current Architecture
- Database: Supabase PostgreSQL
- Missing critical indexes on large transactional tables (`tasks`, `tickets`, etc.)
- Repository API fetches large unbounded datasets.
- Authorization builds massive `.or(id.in(...))` strings.

## Known Bottlenecks
1. **Missing Indexes**: Sequential scans on foreign keys.
2. **Lack of Pagination**: High memory usage and slow payload transfer for large lists.
3. **Application-side RLS**: URL string length limits and slow string parsing due to `id.in(....)` array expansion.

## Strategy
- Implement missing B-Tree indexes based on evidence.
- Introduce API-level pagination safely.
- Refactor massive IN clause authorization to efficient DB-native RLS or RPC.
