This project is a Nuxt 4 project using nitro as backend.

---

With vue.js use composition api and script setup.

---

Auto imports is disabled, you can get components by doing
```ts
import { Component } from "#components"
```

And typescript modules using
```ts
import { myFunction } from "#imports"
```
If you can use explicit dependecies (for example vue > #imports)

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

If you edit graphql query, DO NOT EDIT FILES IN THE CODEGEN FOLDER,  please use `pnpm codegen` instead.


---

Avoid large files, use #region comments if you have to.