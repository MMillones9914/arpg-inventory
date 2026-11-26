# AGENT.md — Guía del agente de desarrollo

> Documento vivo. Define arquitectura, convenciones y reglas de trabajo del módulo **ARPG Inventory** para Foundry VTT v14. Versión del documento: **0.8.10**.

---

## 1. Rol del agente

Ingeniero principal del módulo `arpg-inventory`. Responsabilidades:

- Implementar y mantener un inventario tipo Diablo/Stoneshard para Foundry v14 + dnd5e 6.1.0+.
- Usar solo APIs públicas de Foundry (`ApplicationV2`, hooks, flags) y eventos HTML5 controlados.
- Documentar **todo cambio** en `CHANGELOG.md`; actualizar `docs/milestones.md` y este archivo cuando cambie la arquitectura.
- Seguir SemVer: `0.0.1` bootstrap, `0.x.0` hitos, `1.0.0` culminación.
- Mantener el código limpio: eliminar placeholders de código (stubs), settings sin uso y constantes muertas. Los placeholders visuales de icons sí son parte del diseño.

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
│   ├── dnd5e.ts                   # reglas 5e puras: capacidad, tipos, attunement, usos, permisos
│   ├── grid-model.ts              # schema v2, zones, slots, normalización pura
│   ├── inventory-service.ts       # acceso a flags + grid/stack de items
│   ├── container-capacity.ts      # 4 lb por celda, conteo y rejilla cuadrada
│   ├── containers.ts              # detección de contenedores y límite del GM
│   ├── inventory-items.ts         # tipos dnd5e permitidos en el inventario
│   ├── permissions.ts             # GM/dueño/observador (puro, testeable)
│   ├── inventory-sync.ts          # revisiones y resolución de conflictos (puro)
│   ├── placeholders.ts            # icons core para slots/armas/zonas vacías
│   └── ux.ts                      # filtros, opciones, peso y tooltips (puro)
├── engine/
│   ├── grid-engine.ts             # ocupación, colisión, rotación, stacking e intercambio de bolsas
│   └── grid-geometry.ts           # viewport -> celda (puro, testeable)
├── hooks/
│   ├── dnd5e-hooks.ts             # sync de items/actores
│   └── ui-hooks.ts                # botón "Inventory (B)" en ficha
├── input/keybindings.ts           # tecla B (abrir/cerrar, oficial + fallback)
├── module.ts                      # init/ready
├── settings.ts                    # capacidad, tema y sonidos
├── types/foundry.d.ts             # declarations globales
└── utils/
    ├── logger.ts
    └── sound.ts                   # feedback opcional con assets de Foundry
styles/arpg-inventory.css
lang/en.json
tests/{data,engine}/*.test.ts   # incluye dnd5e.test.ts y ux.test.ts
```

---

## 5. Convenciones

- camelCase para variables/funciones, PascalCase para clases, SCREAMING_SNAKE para constantes.
- Un archivo = una responsabilidad. Prefijo CSS `arpginv-`.
- Todo dato persistido se normaliza al leer (`normalizeActorInventory`, `normalizePlacement`, `normalizeCapacity`).
- `w`/`h` en un placement son **siempre** las dimensiones efectivas en grid; `rotated` solo es metadata. Nunca se swap de nuevo al leer.
- Las celdas del grid se posicionan explícitamente (`gridColumn`/`gridRow`); `data-x/y` debe coincidir con la celda visible.
- Cadenas visibles al usuario: usar `game.i18n.localize` cuando exista clave en `lang/en.json`.
- Reglas dnd5e y permisos van en `src/data/dnd5e.ts` (puro, testeable); la UI solo consume esos helpers.
- Mutar flags del inventario está permitido únicamente al GM (`canEditInventory`); otros usuarios ven la app en solo lectura.
- Lógica de UX no dependiente de Foundry va en `src/data/ux.ts` (puro, testeable); los icons de placeholders en `src/data/placeholders.ts`; las reglas de contenedores en `src/data/containers.ts`; la capacidad derivada en `src/data/container-capacity.ts`; el filtro de tipos de ítem en `src/data/inventory-items.ts`; los permisos en `src/data/permissions.ts` y las revisiones en `src/data/inventory-sync.ts`; el sonido opcional en `src/utils/sound.ts`.
- Un placeholder solo se renderiza cuando el slot/arma/zona está vacío; todos usan el mismo filtro grisáreo y opacidad para quedar como fondo. La excepción son las pestañas de zona disponibles (icono a color) y las armas (placeholder a pantalla completa).
- `backpack` se habilita con cualquier ítem de tipo `container`; `quiver` por nombre (`quiver`/`carcaj`). Si no hay contenedor, la pestaña sigue visible pero inactiva (grisárea, borde discontinuo, `aria-disabled`) y avisa con `ui.notifications.warn` al intentar usarla; sus ítems se reubican en una zona válida.
- La pestaña de un contenedor disponible usa la imagen del ítem contenedor del actor; si no existe, usa el icono core atenuado.
- Cada ítem contenedor crea su propia zona (id = item id) con rejilla cuadrada exacta: 4 lb equivalen a 1 celda y `capacity.count` cuenta como celdas. El setting `maxContainers` limita el número de zonas; mínimo 1.
- Los temas son variables CSS en `.arpg-inventory` con clases `arpginv-theme--light|dark|highContrast`; la app añade la clase activa a la raíz.
- El tooltip propio vive en `document.body`; se oculta al salir del objetivo y se elimina al cerrar la app.
- Layout de la app: flex horizontal; `.window-content` sin padding y raíz con padding 7px arriba/izquierda y 5px abajo/derecha. El resto de separaciones usan `--arpginv-space` (5px). Equipo 9:16 a la izquierda con `actor.img` de fondo, inventario a la derecha con espacios de armas encima del grid; panel con ancho fijo igual al grid principal; ventana 710×620.

---

## 6. Modelo de datos (v2)

```ts
Inventory {
  version: 2
  capacity: { mode, cols, rows, maxWeight, spaces } // strength usa encumbrance.max; spaces = suelo(maxWeight / 4)
  placements: { [itemId]: placement | null }  // zona "main"
  equipment: { [slotId]: itemId | null }
  containers: [{
    id, name, itemId?, img?, available?,
    capacity: { cols, rows, maxWeight, spaces, mode, maxCount },
    placements: { [itemId]: placement }
  }]
  containerOrder: [zoneId]  // orden elegido por el usuario para las pestañas
  revision: number          // se incrementa en cada escritura
  updatedBy: userId | null
  updatedAt: timestamp | null
}
```

Slots (14):
- Panel de equipo (silueta vertical, 11): izquierda `head`, `neck`, `shoulders`, `body`, `back`, `hands`; derecha `wrist`, `waist`, `feet`, `ring1`, `ring2`. `legs` fue eliminado.
- Espacios de armas encima del grid del inventario (3): `mainhand` y `offhand` alargados verticalmente (96×150) con imagen `cover` que rellena el slot, `ammo` como cuadro pequeño (44×44) centrado junto a la secundaria. Un único panel de datos entre `mainhand` y `offhand`: clic en `mainhand`, `offhand` o `ammo` elige qué objeto describe. Orden: nombre, rareza, ataque, daño (el dado cambia al alternar manos), tipo de daño, daño alternativo, alcance, CA, maestría (resaltada si el actor la posee), sintonía y propiedades. Con scroll visible en vez de recortar. No se muestran usos ni fila de manos. `Propiedades` y `Tipo de daño` son bloques con la etiqueta encima y una entrada por línea cuando hay más de una; cada propiedad, maestría, tipo y fila de daño tiene descripción al pasar el mouse. `ranged` fue eliminado.
- Los colores del panel vienen de variables de tema (`--arpginv-info-text`, `--arpginv-info-muted`, `--arpginv-info-accent*`). Daño y CA usan el color de texto del tema y la maestría activa usa un dorado legible en light, dark y high-contrast; nada queda en blanco sobre fondo claro.
- Las armas arrojadizas muestran sus dos distancias juntas en la propiedad `thr` (`Arrojadiza 20/60 ft`), mientras `Alcance` muestra el alcance normal cuerpo a cuerpo. Las distancias usan `system.range.units` y la abreviatura localizada de dnd5e. El ataque se lee de `system.activities[].attack.bonus` (dnd5e 6.x), con compatibilidad con `system.attack.bonus` legacy.
- `weaponHands()` lee `system.properties` (`two`, `ver`); `equipmentSlotsForItem()` y `enforceFoundryPlacement()` asignan dos manos a las armas con `two` (glaive, greatsword) y a las versátiles con el flag `twoHanded` del módulo. `_equipSlotsFor()` y `_toggleTwoHanded()` aplican la misma regla al equipar desde la UI. La copia de `offhand` de un arma a dos manos muestra la misma imagen en plomo (`arpginv-slot--mirror-hand`). El botón para alternar manos va sobre la imagen equipada, abajo a la derecha, con `icons/skills/melee/hand-grip-staff-blue.webp`, y su icono es cuadrado y llena el botón.
- `syncAttackMode()` refleja la forma de empuñar en el flag nativo de dnd5e `dnd5e.last.<activityId>.attackMode` de cada actividad de ataque. Al pasar una versátil a dos manos, Foundry usa automáticamente `system.damage.versatile` en las tiradas de ataque/daño; al volver a una mano, vuelve al dado base. El hook `updateItem` también sincroniza cuando cambia el flag del módulo.

Capacidad `strength`: `system.attributes.encumbrance.max` o `Fuerza × 15` lb. **Regla universal: 4 lb = 1 space**; `spaces = suelo(maxWeight / 4)`. El grid usa **10 columnas fijas** y `filas = techo(spaces / 10)` (300 lb → 75 espacios → 10×8). `cols`/`rows` guardados solo se usan en zonas legacy sin peso declarado. Los contenedores grandes también se limitan a 10 columnas para no desbordar el panel. Al cambiar el tamaño del grid se recolocan las colocaciones válidas más cercanas (`reflowZonePlacements`). Tamaños por tipo dnd5e en `ITEM_GRID_DEFAULTS` (armadura 2×3, herramienta 1×2, munición 1×2 stack 20, contenedor 2×2, etc.).

Contenedores: una zona por ítem contenedor del actor, con `capacity: { cols, rows, maxWeight, spaces, mode, maxCount }` derivada del ítem. Por peso: 4 lb = 1 celda y rejilla cuadrada. Por conteo: **un slot del tamaño del contenido** (flechas 1×2) y `maxCount` = límite de apilado (quiver 20); no se crea una celda por unidad. `backpack` (6×4, 40) y `quiver` (2×4, 10) se conservan solo como placeholders inactivos cuando no hay ítem dedicado.
Un item está en **una sola zona**; `removeItemFromInventory` lo saca de todas antes de moverlo. dnd5e es la fuente de verdad: `system.container` (id del contenedor o `null`) y `system.equipped`. `enforceFoundryPlacement()` refleja ambos al cargar el flag: un objeto equipado va a un slot (el elegido en la UI si ya existe, si no `equipmentSlotsForItem()` lo infiere) y sale de todo grid; si no está equipado vuelve a su contenedor o a `main`. `_autoPlaceAll()` solo coloca el objeto en su zona dueña. Soltar en un slot llama a `_syncItemEquipped(true)`; soltar en un grid/contenedor llama a `_syncItemPlacement()` (que desequipa y ajusta `system.container`). El hook `updateItem` detecta cambios externos de `container`/`equipped`. Al arrastrar una bolsa sobre otra bolsa de la misma zona se intercambian sus posiciones (`swapItems`), con ajuste de anclas si difieren en tamaño; el swap está restringido a ítems contenedores. Las pestañas de contenedor se reordenan arrastrando una sobre otra y su orden se guarda en `containerOrder`.

Permisos: el GM edita cualquier actor; un jugador solo edita los actores que posee; los observadores abren el panel en solo lectura. Toda escritura usa `setActorInventory`, que verifica la revisión actual, incrementa `revision` y guarda `updatedBy`/`updatedAt`. Si otra cliente ganó la carrera, se descarta el guardado, se avisa y se recarga la versión ganadora; los hooks de flag remoto refrescan los paneles abiertos.

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
| M6 D&D 5e integration | 0.6.0 | ✅ |
| M7 UX, accessibility & theming | 0.7.0 | ✅ |
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

_Última actualización: 0.8.10 (información ordenada y contrastes legibles en todos los temas)._
