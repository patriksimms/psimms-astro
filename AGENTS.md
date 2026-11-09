# Repository guidelines

## Lucide icons

Always import each Lucide icon directly from its per-icon module:

```ts
import BookOpen from "@lucide/astro/icons/book-open";
```

Do not use named imports from the package root:

```ts
import { BookOpen } from "@lucide/astro";
```

Package-root imports make Vite process the complete Lucide icon export graph
and significantly slow down the first development render of any page that uses
one.
