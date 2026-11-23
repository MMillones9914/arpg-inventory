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

## M2 — Grid engine (0.2.0) 🔲
- [ ] Algoritmo de ocupación de celdas
- [ ] Colisión y validación de colocación
- [ ] Rotación 90° y snap a grid
- [ ] Stack-aware placement y split

## M3 — Inventory UI (ApplicationV2) (0.3.0) 🔲
- [ ] Ventana de inventario con HBS
- [ ] Grid dinámico según capacidad
- [ ] Render de raridad (borde/glow)
- [ ] Menú contextual (GM) editar tamaño
- [ ] Barra de carga (peso)

## M4 — Drag & Drop (0.4.0) 🔲
- [ ] DnD con snap, preview, validación
- [ ] Rotación con tecla, cancelación
- [ ] Apilado automático y split

## M5 — Equipment & containers (0.5.0) 🔲
- [ ] Slots de equipo
- [ ] Contenedores (sub-grid)
- [ ] Peso/volumen y encumbrance

## M6 — D&D 5e integration (0.6.0) 🔲
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
