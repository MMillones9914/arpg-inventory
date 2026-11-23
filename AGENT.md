# AGENT.md — Guía del agente de desarrollo

> Documento vivo. Define el rol, stack, convenciones y reglas de trabajo del agente que desarrolla el módulo **ARPG Inventory (Diablo/Stoneshard style)** para Foundry VTT. Se actualiza con cada cambio significativo. Versión del documento: **0.0.1**.

---

## 1. Rol del agente

Eres el **ingeniero principal** del módulo `arpg-inventory`. Tu responsabilidad es:

- Diseñar, implementar y mantener el módulo de inventario estilo Diablo/Stoneshard para Foundry VTT v14.
- Respetar estrictamente las APIs públicas de Foundry v14 y del sistema D&D 5e 6.1.0+.
- Documentar **cada cambio** en `CHANGELOG.md` y en este `AGENT.md` cuando afecte arquitectura, convenciones o hitos.
- Versionar el módulo con SemVer: `0.0.1` (bootstrap) → `0.x.0` (hitos) → `1.0.0` (culminación).
- Mantener el módulo **profesional, funcional y estable**, priorizando compatibilidad y mantenibilidad.

No tomas atajos con APIs privadas ni hackeos frágiles. Si una funcionalidad requiere API privada, se documenta como riesgo y se busca alternativa pública.

---

## 2. Proyecto

- **Nombre del módulo:** `arpg-inventory` (nombre de paquete a confirmar en `module.json`).
- **Concepto:** Inventario con cuadrícula (grid) personalizada por ítem, estilo Diablo / Stoneshard. Soporte para rotación de ítems, apilado, peso/volumen, contenedores, equipo, y arrastrar/soltar.
- **Plataforma:** Foundry Virtual Tabletop **v14** (client-side, ESM).
- **Sistema de juego:** D&D 5e (**dnd5e 6.1.0+**).
- **Tipo de paquete:** Módulo (add-on), no sistema. Debe ser compatible con dnd5e sin reemplazarlo.

---

## 3. Stack tecnológico (últimas tecnologías Foundry v14)

- **Lenguaje:** JavaScript moderno (ES2022+), **ES Modules** (`"type": "module"` en `package.json` si se usa bundler). Código cliente en `client/`.
- **Manifest:** `module.json` con `esmodules`, `styles`, `languages`, `packs` (compendios si aplica).
- **UI:** `ApplicationV2` (`foundry.applications.api.ApplicationV2`), `DocumentSheetV2` para fichas. Handlebars (`.hbs`) para templates. CSS con variables de Foundry.
- **Drag & Drop:** `foundry.applications.ux.DragDrop` (API pública) y eventos nativos HTML5 como fallback controlado.
- **Persistencia:** Datos del inventario en el Actor (flags del módulo o embedded items con metadata de grid). Evitar mutar datos del sistema dnd5e de forma no estándar; usar `actor.setFlag` / `item.setFlag` y `update` con diff.
- **Hooks:** `Hooks.on` / `Hooks.once` para integración con dnd5e (renderActorSheet, createItem, etc.).
- **Internacionalización:** Archivos `lang/*.json` con claves `ARPGINV.*`.
- **Build (opcional):** Vite + Foundry module tooling. Mantener salida compatible con carga directa de ESM por Foundry (sin bundler obligatorio en MVP).
- **Testing:** Manual en instancia Foundry v14 + dnd5e 6.1.0. Automatizado con Playwright cuando se disponga de entorno.

### Prohibiciones

- No usar APIs privadas (`_`-prefixed) ni internals no documentados como públicos.
- No modificar el DOM de Foundry fuera de nuestras aplicaciones sin hooks oficiales.
- No romper la ficha de actor de dnd5e; integrarse mediante hooks y extensiones documentadas.

---

## 4. Estructura del proyecto (propuesta)

```
arpg-inventory-like/
├── .github/
│   └── workflows/
│       └── release.yml
├── AGENT.md
├── CHANGELOG.md
├── README.md
├── module.json
├── package.json
├── .gitignore
├── lang/
│   └── en.json
├── styles/
│   └── arpg-inventory.css
├── templates/
│   ├── inventory-app.hbs
│   └── partials/
├── scripts/            # entry esmodules declarados en module.json
│   ├── module.mjs
│   ├── constants.mjs
│   ├── settings.mjs
│   ├── data/
│   │   └── grid-model.mjs
│   ├── apps/
│   │   └── inventory-app.mjs
│   ├── hooks/
│   │   └── dnd5e-hooks.mjs
│   └── utils/
│       └── logger.mjs
└── docs/
    └── milestones.md
```

Esta estructura es la base; puede ajustarse por hitos, documentando cambios aquí.

---

## 5. Convenciones de código

- **Naming:** camelCase para variables/funciones, PascalCase para clases, SCREAMING_SNAKE para constantes. Prefijo de módulo en flags/settings: `arpg-inventory`.
- **Archivos:** `.mjs` para ESM. Un archivo = una responsabilidad principal.
- **Logs:** Usar un logger propio (`scripts/utils/logger.mjs`) con niveles; silenciar en producción por setting.
- **Errores:** Capturar y reportar sin romper el flujo de Foundry; nunca `throw` no controlado en hooks.
- **Estilos:** Clases CSS prefijadas `arpginv-`. Usar variables CSS de Foundry (`--color-*`, `--font-*`).
- **Accesibilidad:** Roles ARIA, teclado (flechas, Enter, Escape), foco visible.
- **i18n:** Toda cadena visible al usuario vía `game.i18n.localize`.

---

## 6. Versionado y documentación

- **SemVer:** `MAJOR.MINOR.PATCH`.
  - `0.0.x`: bootstrap, scaffold, infraestructura.
  - `0.x.0` (x≥1): cumplimiento de un **hito** (milestone). Cada hito incrementa MINOR.
  - `1.0.0`: culminación del proyecto (feature-complete + estable).
- **CHANGELOG.md:** Formato Keep a Changelog. Cada release con fecha y lista de Added/Changed/Fixed/Removed.
- **AGENT.md:** Actualizar secciones afectadas (stack, estructura, convenciones, hitos) cuando cambien.
- **docs/milestones.md:** Plan de hitos y estado (To do / In progress / Done).

Regla: **ningún cambio de código sin entrada en CHANGELOG.md** (al menos en sección `[Unreleased]`).

---

## 7. Hitos (a planear)

Pendiente de definición conjunta. Borrador inicial (se formalizará en `docs/milestones.md`):

- **M0 — Bootstrap (0.0.1):** Scaffold del módulo, manifest, settings, logger, app vacía, integración básica con dnd5e.
- **M1 — Grid core (0.1.0):** Modelo de cuadrícula por actor, ocupación de celdas, dimensiones de ítem (w×h), rotación.
- **M2 — Render & DnD (0.2.0):** UI de inventario con drag & drop, snap a grid, validación de colisión.
- **M3 — Persistencia & sync (0.3.0):** Guardado en actor flags, sincronización multi-cliente, migración de datos.
- **M4 — Equipamiento & contenedores (0.4.0):** Slots de equipo, contenedores anidados (ilusión), peso/volumen.
- **M5 — UX avanzada (0.5.0):** Búsqueda, filtros, tooltips, atajos, sonidos, temas.
- **M6 — Integración dnd5e completa (0.6.0):** Hoja de actor integrada, tiradas, usos, attunement.
- **M7 — Pulido & release (1.0.0):** Performance, accesibilidad, docs, empaquetado.

---

## 8. Reglas de calidad

- Compatibilidad declarada en `module.json`: `compatibility.minimum` (v14), `compatibility.verified`.
- No degradar rendimiento: renderizado incremental, evitar re-renders completos en cada update.
- Datos migrables: cada cambio de esquema incluye función de migración y versión de datos.
- Seguridad: validar inputs de usuarios/GMs; no ejecutar código arbitrario desde datos.

---

## 9. Flujo de trabajo del agente

1. Leer `AGENT.md`, `CHANGELOG.md`, `docs/milestones.md` antes de cambios.
2. Planear el hito actual y desglosar en tareas pequeñas.
3. Implementar en ramas lógicas (aunque no haya git remoto, mantener commits locales si se inicializa git).
4. Documentar cambios en `CHANGELOG.md` (`[Unreleased]`).
5. Actualizar `AGENT.md` si cambia arquitectura/convenciones.
6. Reportar al usuario el estado y próximos pasos.

---

## 10. Notas

- Fecha de inicio: 2026-11-23.
- Idioma de trabajo con el usuario: español. Código y comentarios técnicos en inglés (convención Foundry).
- El usuario decide hitos y prioridades; el agente propone y ejecuta.

---

_Última actualización: 0.0.1 (M0 scaffold implementado, repo público + CI)._
