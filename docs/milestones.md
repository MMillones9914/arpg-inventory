# Milestones

Plan de hitos del módulo. Cada hito cumplido incrementa la versión MINOR (0.x.0). La 1.0.0 culmina el proyecto.

Leyenda de estado: 🔲 To do · 🔄 In progress · ✅ Done

## M0 — Bootstrap & tooling (0.0.1) ✅
- [x] Documentación base (AGENT.md, CHANGELOG.md, README.md, milestones.md)
- [x] Scaffold del módulo (module.json, package.json, .gitignore)
- [x] Estructura de carpetas scripts/templates/styles/lang
- [x] Logger, constantes, settings
- [x] App vacía (ApplicationV2) renderizable
- [x] Integración mínima con dnd5e (hook de carga)
- [x] Repo público + CI release workflow

## M1 — Data model & persistence (0.1.0) ✅
- [x] Modelo de capacidad por actor (cols, rows, maxWeight, mode)
- [x] Modelo de item (grid w×h, rotatable; stack current/max)
- [x] Persistencia en flags versionada + migración
- [x] Settings globales de capacidad
- [x] Hooks de sincronización (createActor/createItem/deleteItem)
- [x] Tests unitarios (Vitest)

## M2 — Grid engine (0.2.0) ✅
- [x] Algoritmo de ocupación de celdas
- [x] Colisión y validación de colocación
- [x] Rotación 90° y snap a grid
- [x] Stack-aware placement y split
- [x] Keybinding B para abrir inventario (placeholder)
- [x] Tests unitarios del engine (7)

## M3 — Inventory UI (ApplicationV2) (0.3.0) ✅
- [x] Ventana de inventario con HBS/CSS grid
- [x] Grid dinámico según capacidad
- [x] Render de raridad (borde/glow)
- [x] Menú contextual (GM) editar tamaño
- [x] Barra de carga (peso)
- [x] Botón en ficha de actor para abrir (B)

## M4 — Drag & Drop (0.4.0) ✅
- [x] DnD con snap, preview, validación
- [x] Rotación con tecla, cancelación
- [x] Apilado automático y split (stack)
- [x] Auto-colocación inicial de items
- [x] Correcciones de colocación/hit-testing y normalización (0.4.13)

## M5 — Equipment & containers (0.5.0) ✅
- [x] Slots de equipo (8 slots, drag & drop bidireccional)
- [x] Contenedores (sub-grid): Backpack y Quiver con pestañas
- [x] Peso/volumen por zona y barra de encumbrance global
- [x] Esquema v2 con migración desde v1
- [x] Edición de tamaño de item eliminada del menú del inventario (se pospone)
- [x] Rediseño visual del panel de equipo a silueta vertical con 14 slots (0.5.1)
- [x] Layout horizontal equipo (9:16) + inventario a la derecha con arte del actor (0.5.2)
- [x] Corrección de fila de armas y visibilidad del arte del actor (0.5.3)
- [x] Barra de armas sobre el grid (principal/secundaria alargadas + munición centrada) y slot de distancia eliminado (0.5.4)
- [x] Barra de armas al costado del grid, slots alargados verticalmente y grid ajustado a su tamaño total (0.5.5)
- [x] Barra de armas de vuelta encima del grid, slots verticales más anchos (0.5.6)
- [x] Barra sin texto ni fondo, slots como espacios más anchos y ventana ajustada al contenido (0.5.7)
- [x] Espacios de datos junto a cada arma, imagen sin zoom excesivo, barra de peso fija y márgenes profesionales (0.5.8)
- [x] Margen general unificado, imagen de armas a pantalla completa y slots más anchos (0.5.9)
- [x] Margen general de 5px y ventana con más alto para no cortar el personaje (0.5.10)

## M6 — D&D 5e integration (0.6.0) 🔲
- [ ] Contenido de los espacios de datos del arma equipada (derecha de principal, izquierda de secundaria)
- [ ] Capacidad dinámica desde Fuerza
- [ ] Tamaños por defecto por tipo
- [ ] Sync de items, attunement, usos
- [ ] Permisos (edición solo GM)

## M7 — UX, accessibility & theming (0.7.0) 🔲
- [ ] Búsqueda y filtros
- [ ] Atajos de teclado
- [ ] Tooltips ricos
- [ ] Temas claro/oscuro + alto contraste
- [ ] Sonidos configurables

## M8 — Multiplayer, permissions & sync (0.8.0) 🔲
- [ ] Permisos GM/Jugador
- [ ] Sync sin race conditions
- [ ] Manejo de conflictos

## M9 — Public API & extensibility (0.9.0) 🔲
- [ ] API pública documentada
- [ ] Hooks propios
- [ ] Compatibilidad con otros módulos

## M10 — Polish, performance & release (1.0.0) 🔲
- [ ] Performance y accesibilidad final
- [ ] Documentación de usuario
- [ ] Empaquetado y release
