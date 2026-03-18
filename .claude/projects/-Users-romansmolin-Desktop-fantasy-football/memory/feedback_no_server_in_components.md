---
name: No server-side services in components
description: Never use server-layer code (services, repositories) in page/view components — use the entity-layer API services instead
type: feedback
---

Do not use server-specific methods (from `src/server/`) in page or view components. The `src/entities/*/api/` layer has separate client-side services for data fetching.

**Why:** The project separates server-side clean architecture (controller/service/repository) from client-side API services. Components should only use the entity-layer API services.

**How to apply:** When a page component needs to fetch data (e.g. for SWR prefetching), import from `@/entities/*/api/` or the entity barrel export, never from `@/server/`.
