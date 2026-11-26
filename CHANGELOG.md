# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- (next milestone in progress)

## [0.7.5] - 2026-11-26

### Added
- `swapItems()` in `src/engine/grid-engine.ts`: dragging a bag onto another bag in the same zone exchanges their positions (clamped when their sizes differ). 4 new tests (total 52).
- `_bagSwap()` in the inventory app: swap preview and drop handling, restricted to items detected as containers.

### Changed
- Count-capacity containers no longer create one cell per item. A quiver is now a single **1×2 slot** (arrow-sized) with a declared stack limit of 20; count containers for other contents use a 1×1 slot. Weight-capacity containers keep the 4 lb per cell rule.
- Ammo items default to a **1×2** grid size, matching the quiver slot.
- Zone info shows `Loaded n/max` for count containers instead of a meaningless weight limit; stacks larger than the declared count are rejected.

## [0.7.4] - 2026-11-26

### Added
- Zona de inventario **por cada contenedor que lleva el actor**: se crea una pestaña extra por ítem (tipo `container` o quiver por nombre), con el icono del ítem y su capacidad propia. 9 tests nuevos (total 48).
- Setting mundial `maxContainers` (mínimo 1, por defecto 5): el GM limita cuántas zonas de contenedor pueden mostrarse.
- `src/data/container-capacity.ts`: 4 lb = 1 celda; `capacity.weight` / legacy `capacity.type: "weight"` por peso y `capacity.count` por conteo; rejilla cuadrada exacta (40 lb -> 5×2, 20 flechas -> 5×4, 4 lb -> 1×1).

### Changed
- Las definiciones `backpack`/`quiver` sin ítem propio quedan como placeholders inactivos; si existe un ítem dedicado, su pestaña dinámica sustituye al placeholder.
- Los ítems guardados en un contenedor que desaparece (o queda fuera del límite del GM) se liberan y se recolocan en una zona válida.

## [0.7.3] - 2026-11-26

### Added
- `findContainerItem()` en `src/data/containers.ts`: el icono de la pestaña del contenedor usa la imagen del ítem que el actor lleva (misma imagen que el container). 2 tests nuevos (total 39).
- Claves `ARPGINV.App.NoContainer` y `ARPGINV.App.NeedContainer` en `lang/en.json` para la alerta de zona sin contenedor.

### Changed
- Cualquier ítem de tipo `container` habilita la zona `backpack`, sin depender del nombre; los ítems con nombre `quiver`/`carcaj` siguen habilitando solo `quiver`.
- Las pestañas de contenedores inexistentes ya no se ocultan: se muestran con su placeholder grisáreo, borde discontinuo y `aria-disabled`, para que se vea que esa zona existe.
- Al pulsar, usar el atajo o soltar un ítem en una pestaña sin contenedor, se muestra una alerta (`ui.notifications.warn`) indicando que se necesita un contenedor; la zona sigue sin ser destino válido.
- La pestaña de contenedor disponible muestra la imagen del ítem contenedor; la inexistente muestra el icono core de Foundry atenuado.

## [0.7.2] - 2026-11-26

### Added
- Reglas puras de disponibilidad de contenedores en `src/data/containers.ts` + 3 tests nuevos (total 37): el actor debe poseer un ítem `backpack`/`mochila` o `quiver`/`carcaj` para usar cada zona.

### Changed
- Las pestañas `Backpack` y `Quiver` solo se muestran cuando el actor tiene ese contenedor; si desaparece, la pestaña se oculta y la zona deja de ser destino válido para drag & drop, atajos y teclado.
- El icono de la zona `main` se muestra a color (siempre disponible), al igual que el de los contenedores disponibles.
- El placeholder de las armas (`mainhand`, `offhand`, `ammo`) cubre todo el slot (`object-fit: cover`, sin padding), igual que la imagen del ítem equipado.

### Fixed
- Los ítems guardados en un contenedor que el actor ya no posee se liberan y vuelven a colocarse en una zona disponible en lugar de quedar ocultos.

## [0.7.1] - 2026-11-26

### Added
- Placeholders de **imágenes core de Foundry** para slots vacíos: 11 slots del panel de equipo, 3 espacios de armas y 3 pestañas de zona. Se muestran únicamente cuando no hay nada equipado/asignado.
- Mapa puro `src/data/placeholders.ts` con las rutas de los icons y 4 tests nuevos (total 34).

### Changed
- Eliminado el slot `legs` (pantalones) y añadidos `wrist` (brazaletes) y `waist` (cinturón) en la columna derecha; el panel de equipo pasa a 11 slots + 3 de armas (14 en total).
- Los códigos de texto (`CAB`, `CUE`, …) ya no se renderizan; el nombre del slot sigue disponible en tooltip/aria-label.
- Las pestañas de zona muestran icono en lugar de texto; el nombre se conserva en tooltip y aria-label.
- Todos los placeholders comparten el mismo estilo grisáreo (`grayscale(1)`, opacidad 0.4) para que queden como fondo.

### Fixed
- Al quitar `legs`, la normalización ya no conserva ese slot en flags guardados; el item queda libre y se autocoloca en el grid.

## [0.7.0] - 2026-11-25

### Added — M7 UX, accessibility & theming
- Barra de búsqueda por nombre (insensible a acentos) y panel desplegable de filtros por tipo, rareza y zona, con contador `mostrados/total`. Los objetos que no coinciden se atenúan y los que coinciden se resaltan.
- Tooltip propio en objetos y slots del equipo: nombre, tipo, rareza, peso, cantidad, usos, attunement y datos de arma (daño, ataque, alcance, propiedades). Funciona con ratón y con foco de teclado; sustituye al `title` nativo.
- Atajos: **B** abre/cierra el inventario, **R** rota al arrastrar, **Esc** cierra, **1/2/3** cambian de zona, **Tab** recorre slots y objetos, **Enter** mueve el objeto enfocado o desequipa el slot enfocado. Panel de ayuda con `?`.
- Temas **claro**, **oscuro** y **alto contraste** (setting por cliente) con variables CSS centralizadas; el cambio se aplica en caliente a la ventana abierta.
- Sonidos configurables (setting por cliente) para abrir, cerrar, equipar, colocar, apilar y colocación inválida, usando únicamente assets de Foundry.
- Accesibilidad: `aria-label`, `role="button"`, `tabindex` y outline de foco visible en objetos, slots y controles.

### Changed
- Módulo puro `src/data/ux.ts` con filtros, opciones de selector, peso y tooltips; 6 tests nuevos (total 30).
- `itemWeight` se movió a `src/data/ux.ts` y la UI reutiliza esa helper.
- B pasa de "abrir" a "abrir/cerrar" y no actúa mientras se escribe en un campo.

### Fixed
- El tooltip no se recorta dentro de la ventana: se renderiza en `document.body` con posición fija y se limpia al cerrar.
- Los handlers de teclado y tooltip se eliminan al cerrar la app.

## [0.6.0] - 2026-11-25

### Added — M6 D&D 5e integration
- Contenido de los espacios reservados junto a las armas: daño, bonificación de ataque, alcance, usos y estado de attunement del arma equipada (el tooltip incluye nombre, rareza y propiedades).
- Módulo puro `src/data/dnd5e.ts` con tests: capacidad por Fuerza, mapeo de tipos dnd5e, attunement, usos y permisos de edición.
- Hook `updateItem` para resincronizar al cambiar cantidad, attunement, usos, tipo, rareza o daño, refrescando la ventana abierta.
- Indicador compacto de attunement (`A`/`R`) en slots y objetos del grid; tooltips con usos.

### Changed
- Tamaños por defecto por tipo dnd5e: armadura 2×3, escudo 2×2, herramienta 1×2, contenedores 2×2, foco 1×1 y munición con stack máximo 20.
- La capacidad por Fuerza usa `system.attributes.encumbrance.max` de dnd5e con fallback `Fuerza × 15`.

### Fixed
- Edición restringida a GM: auto-colocación, drag & drop, equipar y apilado no se ejecutan para otros usuarios, que ven el inventario en solo lectura.

## [0.5.13] - 2026-11-25

### Changed
- Margen superior e izquierdo aumentado 5px más: de 2px a **7px** para centrar mejor el contenido.

## [0.5.12] - 2026-11-25

### Changed
- Margen superior e izquierdo aumentado a **2px** (antes 0) para que el contenido no quede apegado; abajo y derecha se mantienen en 5px.

## [0.5.11] - 2026-11-25

### Changed
- El contenido se ancla arriba a la izquierda: padding interno de `.window-content` forzado a 0 y padding de la raíz solo abajo/derecha (5px).
- Más separación en los bordes derecho e inferior sin cambiar el tamaño de la ventana.

## [0.5.10] - 2026-11-25

### Changed
- Margen general reducido a **5px** en toda la ventana (raíz, paneles, títulos, barras, pestañas y grid).
- Ventana ajustada a **710×620**: menos espacio arriba/izquierda y algo más de alto abajo para que no se corte el personaje.

## [0.5.9] - 2026-11-25

### Changed
- Margen general unificado con `--arpginv-space` (10px) en raíz, separación de paneles, títulos, barra de peso, pestañas, info de zona y grid. Eliminado el padding doble del contenido de la ventana.
- Ancho de los espacios de arma aumentado a **112px** (alto 150px).
- Las imágenes de las armas vuelven a **rellenar todo el slot** (`object-fit: cover`, sin padding).
- Ventana ajustada a **740×600** teniendo en cuenta el nuevo ancho del grid con padding uniforme.

## [0.5.8] - 2026-11-25

### Changed
- Ancho de los slots de arma aumentado a **96px** (alto 150px).
- Las imágenes equipadas en esos slots usan `object-fit: contain` con padding: se rellena el espacio pero se ve el arma completa, sin tanto zoom.
- Añadidos espacios reservados para datos del arma equipada: a la **derecha de `mainhand`** y a la **izquierda de `offhand`**. `ammo` no lleva espacio. El contenido se detallará en M6.
- La barra de peso y la fila de armas mantienen un ancho fijo igual al grid principal, también al cambiar a Backpack o Quiver.
- Márgenes generales ampliados (12px) y separación entre paneles (14px); ventana ajustada a 740×610.

## [0.5.7] - 2026-11-25

### Changed
- Eliminado el texto "Armas" y el fondo/borde de la barra de armas: ahora solo se ven los espacios de los slots.
- Slots de arma sin degradado, con contorno sutil y ancho aumentado a **84px** (alto 150px); municiones sigue en 44×44.
- Ventana reducida a **730×600** para ajustarla al contenido y quitar el espacio sobrante a la derecha.

## [0.5.6] - 2026-11-25

### Changed
- La barra de armas vuelve a estar **encima del grid** del inventario (antes estaba al costado).
- Los slots de arma conservan su alargado vertical (150px de alto) pero con más anchura: **72px** (antes 58px).
- Municiones sigue como cuadro pequeño (44×44) centrado junto a la secundaria.
- El grid mantiene su tamaño exacto (`max-content`), sin excederse.

## [0.5.5] - 2026-11-25

### Changed
- La barra de armas se mueve al **costado derecho del grid** (referencia Stoneshard), como columna vertical.
- Corregida la orientación de los slots alargados: `mainhand` y `offhand` son ahora **verticales (58×150)**, no horizontales.
- `ammo` permanece como cuadro pequeño (44×44) centrado junto a `offhand`.
- El grid y el panel del inventario usan `width: max-content`: ocupan exactamente el total de celdas y no se exceden.

## [0.5.4] - 2026-11-25

### Changed
- `mainhand`, `offhand` y `ammo` se muestran ahora en una barra propia encima del grid del inventario (antes en la fila inferior del panel de equipo).
- Arma principal y Arma secundaria usan slots alargados (150×58); Municiones es un cuadro pequeño (44×44) centrado junto a la secundaria.

### Removed
- Eliminado el slot de Distancia (`ranged`) del modelo y de la UI. Los ítems que estuvieran equipados ahí se normalizan y vuelven al inventario automáticamente.

## [0.5.3] - 2026-11-25

### Fixed
- La fila de armas (Arma principal, Arma secundaria, Distancia y Municiones) ya no queda cortada: tiene barra propia, slots de 52px y más separación del borde.
- El arte del actor ahora se renderiza como `<img>` real dentro del panel (antes solo como fondo CSS), con fallback al token y a `mystery-man.svg`.
- Reducido el velo oscuro para que la imagen del actor sea visible.
- Ampliada la ventana a 900×640 y el panel 9:16 a 315×560.

## [0.5.2] - 2026-11-25

### Changed
- Rediseñado el layout a dos columnas: panel de equipo a la izquierda (proporción 9:16) e inventario a la derecha, evitando que el grid quede fuera de la ventana.
- Ampliada la ventana por defecto a 800×540.
- El fondo del panel usa el arte del actor (`actor.img`, con fallback al token) con velo más claro para que la imagen sea visible.
- Reubicados los 14 slots para la nueva altura 9:16.

## [0.5.1] - 2026-11-25

### Changed
- Rediseñado el panel de equipo como silueta vertical con retrato del actor de fondo y velo opaco.
- Ampliado de 8 a 14 slots: izquierda (Cabeza, Cuello, Hombreras, Cuerpo, Espalda, Manos), derecha (Pantalones, Zapatos, Anillo 1, Anillo 2) e inferior central (Arma principal, Arma secundaria, Distancia, Municiones).
- Slots más vistosos: borde por rareza, código corto, etiqueta visible, glow al hover y fondo degradado.
- El inventario principal (pestañas + grid) queda debajo del panel de equipo.

### Fixed
- La migración añade los slots nuevos sin perder los equipamientos existentes.

## [0.5.0] - 2026-11-25

### Added — M5 Equipment & containers
- Equipment slots (`head`, `neck`, `body`, `mainhand`, `offhand`, `ring1`, `ring2`, `feet`) with drag & drop in both directions.
- Container sub-grids (`Backpack` 6×4, `Quiver` 2×4) with tabs; items can be dropped onto a tab to auto-place into that container.
- Per-zone volume indicator (used/total cells) and per-zone weight; global encumbrance bar now flags overweight.
- Inventory schema v2 with migration from v1 and pruning of stale ids across main grid, containers and equipment.
- Tests for slot/container lookup, cross-zone removal and volume calculation (19 total).

### Removed
- GM item-size editing from the inventory context menu/double-click (deferred to a later milestone).
- Dead code: placeholder Handlebars template, unused `debug` setting/localization, unused version constant/logger helper and unused placement helpers.

### Fixed
- Dragging an item out of an equipment slot no longer leaves a stale slot reference.
- Cancelled drags from equipment slots now clear highlight and dragging state.

## [0.4.13] - 2026-11-25

### Fixed
- Redesigned drag target detection: grid cells are now explicitly positioned and hit-testing uses viewport geometry, so `data-x/y` always matches the visible cell (fixes “Cannot place item here” on free cells).
- Removed double-swap of rotated item dimensions during inventory normalization.
- Coerced saved coordinates/dimensions with `Number()` instead of `Number.isFinite()` on raw values; string placements no longer collapse to `(0,0)`.
- Clamped placements to grid bounds, repaired stale/overlapping placements via auto-place, and normalized capacity values saved as strings.
- Resizing an item (GM) now invalidates and re-auto-places it instead of leaving an overlapping placement.
- Fixed duplicate “Inventory (B)” button injected into the inventory window itself.
- Avoided double B-key handling (official keybinding + fallback) and cleaned up the temporary rotation listener on close.

### Added
- Pure grid-geometry helper with regression tests for gap/bounds hit-testing.
- Regression tests for string coords, clamped placement and rotated dimensions.

## [0.4.12] - 2026-11-25

### Fixed
- Coerced placement coordinates to numbers (fixes cannot place).

## [0.4.11] - 2026-11-25

### Changed
- Migrated codebase to TypeScript.
- Fixed placement dimension normalization.

## [0.4.10] - 2026-11-25

### Debug
- Added dragover clientX/Y and cell rect logging.

## [0.4.9] - 2026-11-25

### Debug
- Added dragover debug info (occupied cell).

## [0.4.8] - 2026-11-24

### Debug
- Added placement debug info (canPlace).

## [0.4.7] - 2026-11-24

### Debug
- Added drop logging/notifications to diagnose placement.

## [0.4.6] - 2026-11-24

### Fixed
- Restored base cell styling (visible grid).
- Drop placement notification when invalid.

## [0.4.5] - 2026-11-24

### Fixed
- Drag highlight now uses cell hit-testing (more reliable).

## [0.4.4] - 2026-11-24

### Fixed
- Drag highlight now paints target cells directly (inline styles).
- Item image covers entire item border.

## [0.4.3] - 2026-11-24

### Changed
- Drag highlight now only on target cells (no general border).
- Items show image only; name appears as tooltip on hover.

## [0.4.2] - 2026-11-24

### Improved
- Drag & drop now highlights target cells (green/red) based on item size.

## [0.4.1] - 2026-11-24

### Fixed
- Drag & drop now works (coordinate-based cell detection).
- Item images displayed.
- Item grid size editable via double-click/context menu (GM).

## [0.4.0] - 2026-11-24

### Added
- M4 drag & drop: move items with snap/validation, rotation (R), stacking and auto-placement.

## [0.3.3] - 2026-11-24

### Removed
- GM "Edit capacity" button (capacity not editable from UI).

## [0.3.2] - 2026-11-24

### Fixed
- B key now opens inventory (official keybinding + fallback).
- Strength mode now uses dnd5e carry capacity (encumbrance.max).
- Added GM "Edit capacity" dialog.

## [0.3.1] - 2026-11-23

### Fixed
- Keybinding B now targets the controlled token's actor (or user character).

## [0.3.0] - 2026-11-23

### Added
- M3 inventory UI: ApplicationV2 window, dynamic grid, rarity styling, GM edit size dialog, weight bar.
- Actor sheet button to open inventory (B keybinding).

## [0.2.0] - 2026-11-23

### Added
- M2 grid engine: occupancy, collision, rotation, snap, stack-aware placement, split.
- Keybinding `B` to open inventory (placeholder app).
- Unit tests (7) for grid engine.

## [0.1.0] - 2026-11-23

### Added
- M1 data model & persistence: capacity per actor, item grid/stack, versioned flags, migration.
- Global settings for capacity (mode, cols, rows, maxWeight).
- Sync hooks for actor/item create/delete.
- Unit tests (Vitest) for grid model.

### Changed
- Milestone plan updated to M0–M10.

## [0.0.1] - 2026-11-23

### Added
- Bootstrap of the module planning and repository (public).
- Initial scaffold (M0): Vite build, CI, manifest, placeholder app.

[Unreleased]: https://github.com/MMillones9914/arpg-inventory/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/MMillones9914/arpg-inventory/releases/tag/v0.0.1
