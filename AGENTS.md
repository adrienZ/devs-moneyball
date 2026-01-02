This project is a Nuxt 4 project using nitro as backend. Vue.js use composition api, script setup, scoped style (if needed).

find more info on the [wiki](./wiki/) folder.

---

Auto imports is disabled.

You can get global components by doing
```ts
import { Component } from "#components"
```
regular import otherwise.

And typescript modules using
```ts
import { myFunction } from "#imports"
```
If you can, use explicit dependecies (for example vue > #imports)
---

Always try to reduce diffs unless absolutely needed.
DO NOT USE THE ANY TYPE IN TYPESCRIPT

---

for formatting run the command
```bash
pnpm run lint --fix
```

---
Use the repository pattern for database access:
- Do not call `useDrizzle()` directly in handlers/services/tasks; use repository singletons instead.
- Repositories should encapsulate Drizzle queries and obtain the DB via `useDrizzle()` internally.
Repository access is via singleton classes, so use `Repository.getInstance()` in consumers.

---

DO NOT EDIT FILES IN THE CODEGEN FOLDER,  please use `pnpm codegen` instead.

---

DO NOT EDIT FILES IN THE MIGRATIONS FOLDER,  please use `pnpm db:generate` instead.

---

Avoid large files, use #region comments if you have to.