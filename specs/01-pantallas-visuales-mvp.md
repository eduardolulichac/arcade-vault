# SPEC 01 — Pantallas visuales del MVP de Arcade Vault

> **Status:** Aprovado
> **Depends on:** —
> **Date:** 2026-08-28
> **Objective:** Implementar en Next.js (App Router) las cinco pantallas del prototipo visual en `references/templates/` (biblioteca, detalle, reproductor, autenticación y salón de la fama), sin lógica de juego real.

---

## Por qué existe esta spec

El repo trae un prototipo visual completo hecho en React vanilla + CDN (`references/templates/*.jsx`, `styles.css`) con enrutamiento por hash. El proyecto real es Next.js 16 App Router + TypeScript estricto + Tailwind v4. Esta spec define cómo portar ese prototipo a rutas reales de Next.js conservando la fidelidad visual exacta, sin escribir todavía ningún juego jugable.

`app/globals.css` y `app/layout.tsx` ya migraron los estilos y las fuentes (`Press Start 2P`, `JetBrains Mono`, `Courier Prime` vía `next/font/google`) del template — esta spec no vuelve a tocar esa base salvo que falte algo puntual; los estilos nuevos que se necesiten se resuelven con utilidades de Tailwind, no con más CSS custom.

---

## Scope

**In:**

- Ruteo real de Next.js App Router (nada de router por hash tipo SPA):
  - `/` → Biblioteca (`biblioteca.jsx`)
  - `/juegos/[id]` → Detalle del juego (`detalle.jsx`)
  - `/juegos/[id]/jugar` → Reproductor (`reproductor.jsx`)
  - `/auth` → Inicio de sesión / registro (`auth.jsx`)
  - `/salon-de-la-fama` → Salón de la Fama (`salon.jsx`)
- Navbar (`nav.jsx`) integrada en `app/layout.tsx`, con estado activo por ruta y menú móvil (hamburguesa).
- Datos mock portados a TypeScript (`GAMES`, `CATS`, `PLAYERS`, `seededScores`) desde `references/templates/data.jsx`.
- Sesión de usuario y puntuaciones guardadas en `localStorage`, igual que el template (`av_user`, `av_scores`), compartida entre rutas vía un Context de React.
- Pantalla de reproductor con el placeholder animado tal cual el template: arena CRT decorativa (nave, enemigos) y puntaje que sube solo automáticamente — es únicamente CSS/estado de UI, no hay reglas de juego.
- Fidelidad visual con el prototipo: mismos textos en español, misma composición, mismas animaciones CSS (neón, scanlines, flicker, tilt de las cards, etc.).
- Responsive tal como en `styles.css` (breakpoints ya definidos ahí).

**Out of scope (para futuras specs):**

- Cualquier juego jugable real (Bloque Buster, Caída, Serpentina, etc.) — la arena del reproductor sigue siendo decorativa.
- Autenticación real contra un backend (API, base de datos, OAuth con Google/GitHub). Los botones sociales del template quedan como elementos decorativos sin funcionalidad.
- Persistencia de puntuaciones en un servidor o base de datos compartida entre usuarios.
- Multijugador o partidas en tiempo real.
- Tests automatizados (el repo no tiene test runner configurado).
- Sonido/efectos de audio.

---

## Data model

Se porta `references/templates/data.jsx` a `lib/data.ts` con tipos explícitos. No hay backend ni base de datos: todo vive en un array en memoria más lo que el usuario guarda en `localStorage`.

```ts
// lib/data.ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string; // clase CSS de portada, ej. "cover-bricks"
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // DD/MM/AAAA
}

export const GAMES: Game[];
export const CATS: readonly ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
export function seededScores(seed: number, count?: number): ScoreRow[];
```

```ts
// lib/auth-context.tsx — estado de sesión compartido entre rutas
export interface SessionUser {
  name: string;
}
// localStorage key: "av_user" → SessionUser | null
```

```ts
// lib/scores.ts — utilidad para guardar puntuaciones
export interface SavedScoreEntry {
  game: string; // Game.id
  score: number;
  name: string;
  at: number; // Date.now()
}
// localStorage key: "av_scores" → SavedScoreEntry[]
```

---

## Implementation plan

1. Crear `lib/data.ts` portando `GAMES`, `CATS`, `PLAYERS` y `seededScores` desde `references/templates/data.jsx`, con los tipos de la sección anterior. Verificación manual: `npm run build` compila sin errores de tipos.
2. Crear `lib/scores.ts` con `saveScore(entry)` y `getScores()` sobre `localStorage` (`av_scores`).
3. Crear `components/auth-provider.tsx` (`"use client"`) con un Context que expone `user`, `login(user)`, `logout()`, sincronizado con `localStorage` (`av_user`), tal como `app.jsx` hace con `useState` + `localStorage`.
4. Crear `components/nav.tsx` (`"use client"`) replicando `nav.jsx`: logo, links "Biblioteca"/"Salón de la Fama" activos según `usePathname()`, contador de créditos, botón "Iniciar Sesión" / nombre de usuario usando `AuthProvider`, panel móvil con hamburguesa.
5. Editar `app/layout.tsx` para envolver `children` con `<AuthProvider>`, renderizar `<Nav />` antes del `<main>` y el `<footer>` fijo del template (ya están `av-bg`, `av-noise` y las fuentes). El sitio ya es navegable aunque las páginas internas sigan siendo el scaffold.
6. Crear `components/game-card.tsx` (`"use client"`, por el efecto tilt con `onMouseMove`) replicando `GameCard` de `biblioteca.jsx`.
7. Reemplazar `app/page.tsx` por la pantalla Biblioteca (`"use client"`): hero con `<h1>` flicker, buscador, chips de categoría, grid de `GameCard` con estado vacío "NO HAY RESULTADOS". Verificación manual: `/` se ve igual que `biblioteca.jsx` renderizado en `Arcade Vault.html`.
8. Crear `app/juegos/[id]/page.tsx` (Detalle, server component): busca el juego en `GAMES` por `params.id`, llama `notFound()` si no existe, renderiza portada, tags, descripción, stat-strip, botones "JUGAR AHORA"/"VOLVER AL VAULT" y el leaderboard lateral con `seededScores`.
9. Crear `app/juegos/[id]/jugar/page.tsx` (Reproductor, `"use client"`): HUD (jugador/puntuación/vidas/nivel), pantalla CRT con la arena animada, botones Pausa/Fin/Salir, modal de fin de partida que guarda la puntuación con `lib/scores.ts` y `AuthProvider`. Si el `id` no existe, `notFound()`.
10. Crear `app/auth/page.tsx` (Auth, `"use client"`): tabs "Iniciar sesión"/"Crear cuenta", campos usuario/correo/contraseña, botón "Jugar como invitado", separador social decorativo. Al enviar, llama `AuthProvider.login` y navega a `/`.
11. Crear `app/salon-de-la-fama/page.tsx` (Salón de la Fama, `"use client"` por los tabs): tabs por juego, podio top 3, tabla de puntuaciones con `seededScores`, fila "tu mejor marca" solo si hay usuario en sesión.
12. Recorrer las cinco rutas en `npm run dev` comparándolas visualmente contra `references/templates/Arcade Vault.html`, y correr `npm run build` para confirmar que TypeScript estricto compila sin errores.

---

## Acceptance criteria

- [ ] `/` muestra la Biblioteca: hero, buscador funcional, chips de categoría funcionales, grid de juegos desde `lib/data.ts`.
- [ ] Buscar un texto que no matchea ningún juego muestra el estado "NO HAY RESULTADOS".
- [ ] `/juegos/[id]` con un id válido muestra portada, descripción, stats y leaderboard del juego correspondiente.
- [ ] `/juegos/algo-que-no-existe` devuelve 404 (`notFound()`).
- [ ] Desde el detalle, "JUGAR AHORA" navega a `/juegos/[id]/jugar`.
- [ ] `/juegos/[id]/jugar` muestra el HUD, la arena animada, y el puntaje sube solo automáticamente.
- [ ] En el reproductor, "PAUSA" detiene el incremento de puntaje y "REANUDAR" lo retoma.
- [ ] "FIN" abre el modal de fin de partida con el puntaje final.
- [ ] Guardar la puntuación en el modal la agrega a `localStorage` bajo la clave `av_scores` y muestra el toast "PUNTUACIÓN GUARDADA".
- [ ] `/auth` permite iniciar sesión con un nombre de usuario, que queda guardado en `localStorage` bajo `av_user` y persiste tras recargar la página.
- [ ] "Jugar como invitado" navega a `/` sin dejar sesión iniciada.
- [ ] Con sesión iniciada, la navbar muestra el nombre del usuario en vez del botón "Iniciar Sesión", y un clic cierra sesión.
- [ ] `/salon-de-la-fama` muestra tabs por juego, podio top 3 y tabla de puntuaciones.
- [ ] Con sesión iniciada, `/salon-de-la-fama` muestra la fila "TU MEJOR MARCA"; sin sesión, no aparece.
- [ ] En viewport móvil (<840px), la navbar colapsa a hamburguesa y el panel lateral abre/cierra correctamente.
- [ ] `npm run build` compila sin errores de TypeScript ni de ESLint.
- [ ] No hay errores en la consola del navegador al navegar por las cinco rutas.

---

## Decisions

- **Sí:** rutas reales de Next.js App Router en vez de router por hash. `app/layout.tsx` ya sigue la estructura estándar (no SPA), y es lo idiomático para Next 16.
- **Sí:** `localStorage` para sesión de usuario (`av_user`) y puntuaciones guardadas (`av_scores`), igual que el template. Sigue siendo 100% cliente, sin backend.
- **Sí:** Context de React (`AuthProvider`) para compartir la sesión entre `Nav`, `Auth`, el reproductor y el salón de la fama, ya que en App Router cada ruta es una página independiente (no hay un único componente `App` como en el template).
- **Sí:** mantener el placeholder animado del reproductor (arena CSS + puntaje automático) tal cual el template. Es decoración/CSS, no reglas de juego, así que no contradice "no implementar ningún juego".
- **Sí:** reutilizar `app/globals.css` tal como está migrado; cualquier estilo adicional que falte se resuelve con utilidades de Tailwind v4, no con más CSS custom.
- **No:** autenticación real (API, OAuth, base de datos). Fuera de alcance para este MVP visual.
- **No:** implementar cualquiera de los ocho juegos. Explícitamente pedido por el usuario.
- **No:** archivo `tailwind.config` — Tailwind v4 en este proyecto no lo usa (ver `CLAUDE.md`).

---

## Risks

| Riesgo                                                              | Mitigación                                                                                          |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `localStorage` no disponible (modo privado/incógnito)               | La sesión y el guardado de puntuación fallan silenciosamente (try/catch), igual que en `app.jsx`; la UI sigue funcionando, solo no persiste. |
| Desajuste de hidratación entre el estado activo de la navbar (SSR) y `usePathname()` en cliente | `Nav` se marca `"use client"` completo, así que el estado activo se calcula solo en cliente tras hidratar. |
| Ids de ruta dinámica (`/juegos/[id]`) que no existen en `GAMES`      | Se llama `notFound()` explícitamente en detalle y reproductor.                                       |

---

## What is **not** in this spec

- Cualquier juego jugable real (mecánica, colisiones, niveles reales).
- Autenticación real contra un backend o proveedor OAuth.
- Persistencia de puntuaciones compartida entre usuarios o dispositivos.
- Multijugador.
- Sonido y efectos de audio.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.
