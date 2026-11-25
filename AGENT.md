# AGENT.md — Guía del agente de desarrollo

> Documento vivo. Define arquitectura, convenciones y reglas de trabajo del módulo **ARPG Inventory** para Foundry VTT v14. Versión del documento: **0.5.2**.

---

## 1. Rol del agente

Ingeniero principal del módulo `arpg-inventory`. Responsabilidades:

- Implementar y mantener un inventario tipo Diablo/Stoneshard para Foundry v14 + dnd5e 6.1.0+.
- Usar solo APIs públicas de Foundry (`ApplicationV2`, hooks, flags) y eventos HTML5 controlados.
- Documentar **todo cambio** en `CHANGELOG.md`; actualizar `docs/milestones.md` y este archivo cuando cambie la arquitectura.
- Seguir SemVer: `0.0.1` bootstrap, `0.x.0` hitos, `1.0.0` culminación.
- Mantener el código limpio: eliminar placeholders, settings sin uso y constantes muertas.

Idioma con el usuario: **español**. Código/comentarios técnicos: **inglés**.

---

## 2. Proyecto

- **ID:** `arpg-inventory`.
- **Plataforma:** Foundry VTT v14 (cliente, ESM).
- **Sistema:** D&D 5e 6.1.0+.
- **Repo público:** https://github.com/MMillones9914/arpg-inventory
- **Manifest:** https://raw.githubusercontent.com/MMillones9914/arpg-inventory/main/module.json
- **CI:** `.github/workflows/release.yml` compila con Vite, corre Vitest, genera `arpg-inventory.zip` y publica el release al hacer push de `v*`.

---

## 3. Stack

- **Lenguaje:** TypeScript (ES2022), compilado por Vite a `dist/module.mjs` (ESM).
- **UI:** `foundry.applications.api.ApplicationV2` con DOM construido en `_renderHTML`; sin templates Handlebars (se eliminó el placeholder).
- **Drag & Drop:** eventos HTML5 (`dragstart`, `dragover`, `drop`, `dragend`) + helper puro `pointToCell`.
- **Persistencia:** flags del actor (`arpg-inventory.inventory`), flags de item (`grid`, `stack`).
- **Tests:** Vitest (`npm test`), `tsc --noEmit`, `npm run build`.

### Prohibiciones

- No usar APIs privadas (`_`-prefixed) salvo los hooks de ciclo de vida propios de `ApplicationV2` ya empleados.
- No modificar el DOM de Foundry fuera de nuestra app salvo el botón inyectado mediante hooks oficiales.
- No reintroducir menús de edición de objetos en el inventario (pospuesto).

---

## 4. Estructura actual

```
src/
├── apps/inventory-app.ts          # UI, DnD, equipment slots, zone tabs
├── constants.ts                   # MODULE_ID / MODULE_TITLE
├── data/
│   ├── grid-model.ts              # schema v2, zones, slots, normalización pura
│   └── inventory-service.ts       # acceso a flags + grid/stack de items
├── engine/
│   ├── grid-engine.ts             # occupación, colisión, rotación, stacking
│   └── grid-geometry.ts           # viewport -> celda (puro, testeable)
├── hooks/
│   ├── dnd5e-hooks.ts             # sync de items/actores
│   └── ui-hooks.ts                # botón "Inventory (B)" en ficha
├── input/keybindings.ts           # tecla B (oficial + fallback)
├── module.ts                      # init/ready
├── settings.ts                    # capacidad por defecto
├── types/foundry.d.ts             # declarations globales
└── utils/logger.ts
styles/arpg-inventory.css
lang/en.json
tests/{data,engine}/*.test.ts
```

---

## 5. Convenciones

- camelCase para variables/funciones, PascalCase para clases, SCREAMING_SNAKE para constantes.
- Un archivo = una responsabilidad. Prefijo CSS `arpginv-`.
- Todo dato persistido se normaliza al leer (`normalizeActorInventory`, `normalizePlacement`, `normalizeCapacity`).
- `w`/`h` en un placement son **siempre** las dimensiones efectivas en grid; `rotated` solo es metadata. Nunca se swap de nuevo al leer.
- Las celdas del grid se posicionan explícitamente (`gridColumn`/`gridRow`); `data-x/y` debe coincidir con la celda visible.
- Cadenas visibles al usuario: usar `game.i18n.localize` cuando exista clave en `lang/en.json`.
- Layout de la app: flex horizontal; equipo 9:16 a la izquierda con `actor.img` de fondo, inventario (pestañas + grid) a la derecha.

---

## 6. Modelo de datos (v2)

```ts
Inventory {
  version: 2
  capacity: { mode, cols, rows, maxWeight }   // strength usa encumbrance.max
  placements: { [itemId]: placement | null }  // zona "main"
  equipment: { [slotId]: itemId | null }
  containers: [{
    id, name,
    capacity: { cols, rows, maxWeight },
    placements: { [itemId]: placement }
  }]
}
```

Slots (14, diseño de silueta vertical):
- Izquierda: `head`, `neck`, `shoulders`, `body`, `back`, `hands`.
- Derecha: `legs`, `feet`, `ring1`, `ring2`.
- Inferior central: `mainhand`, `offhand`, `ranged`, `ammo`.

Contenedores por defecto: `backpack` (6×4, 40) y `quiver` (2×4, 10).
Un item está en **una sola zona**; `removeItemFromInventory` lo saca de todas antes de moverlo.

---

## 7. Versionado y documentación

- `CHANGELOG.md`: Keep a Changelog. Regla: **ningún cambio sin entrada**.
- `docs/milestones.md`: estado M0–M10.
- `AGENT.md`: este archivo; se actualiza cuando cambia arquitectura o convenciones.

---

## 8. Hitos

| Hito | Versión | Estado |
|---|---|---|
| M0 Bootstrap & tooling | 0.0.1 | ✅ |
| M1 Data model & persistence | 0.1.0 | ✅ |
| M2 Grid engine | 0.2.0 | ✅ |
| M3 Inventory UI | 0.3.0 | ✅ |
| M4 Drag & Drop | 0.4.0 (+fix 0.4.13) | ✅ |
| M5 Equipment & containers | 0.5.0 | ✅ |
| M6 D&D 5e integration | 0.6.0 | 🔲 |
| M7 UX, accessibility & theming | 0.7.0 | 🔲 |
| M8 Multiplayer & sync | 0.8.0 | 🔲 |
| M9 Public API & extensibility | 0.9.0 | 🔲 |
| M10 Polish & release | 1.0.0 | 🔲 |

---

## 9. Flujo de trabajo

1. Leer `AGENT.md`, `CHANGELOG.md`, `docs/milestones.md`.
2. Implementar en commits pequeños con tests cuando sea lógica pura.
3. `npx tsc --noEmit && npm test && npm run build`.
4. Actualizar documentación.
5. Commit + push + tag `vX.Y.Z` (CI publica release).

---

_Última actualización: 0.5.2 (M5 completado; layout horizontal equipo 9:16 + inventario a la derecha, fondo con arte del actor)._
