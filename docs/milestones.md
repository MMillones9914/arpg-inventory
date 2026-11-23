# Milestones

Plan de hitos del módulo. Cada hito cumplido incrementa la versión MINOR (0.x.0). La 1.0.0 culmina el proyecto.

Leyenda de estado: 🔲 To do · 🔄 In progress · ✅ Done

## M0 — Bootstrap (0.0.1) 🔄
- [x] Documentación base (AGENT.md, CHANGELOG.md, README.md, milestones.md)
- [ ] Scaffold del módulo (module.json, package.json, .gitignore)
- [ ] Estructura de carpetas scripts/templates/styles/lang
- [ ] Logger, constantes, settings
- [ ] App vacía (ApplicationV2) renderizable
- [ ] Integración mínima con dnd5e (hook de carga)

## M1 — Grid core (0.1.0) 🔲
- [ ] Modelo de cuadrícula por actor
- [ ] Dimensiones de ítem (w×h), rotación
- [ ] Ocupación de celdas y colisión
- [ ] Persistencia en flags del actor

## M2 — Render & DnD (0.2.0) 🔲
- [ ] UI de inventario (ApplicationV2 + HBS)
- [ ] Drag & drop con snap a grid
- [ ] Validación de colisión en tiempo real
- [ ] Tooltips básicos

## M3 — Persistencia & sync (0.3.0) 🔲
- [ ] Guardado robusto, diff updates
- [ ] Sincronización multi-cliente
- [ ] Migración de datos v1

## M4 — Equipamiento & contenedores (0.4.0) 🔲
- [ ] Slots de equipo
- [ ] Contenedores anidados (ilusión)
- [ ] Peso / volumen

## M5 — UX avanzada (0.5.0) 🔲
- [ ] Búsqueda y filtros
- [ ] Atajos de teclado
- [ ] Temas / estilos
- [ ] Sonidos

## M6 — Integración dnd5e completa (0.6.0) 🔲
- [ ] Hoja de actor integrada
- [ ] Tiradas, usos, attunement
- [ ] Compatibilidad con items mágicos

## M7 — Pulido & release (1.0.0) 🔲
- [ ] Performance y accesibilidad
- [ ] Documentación de usuario
- [ ] Empaquetado y release
