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