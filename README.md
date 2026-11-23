# ARPG Inventory

Módulo para Foundry VTT v14 que añade un inventario estilo Diablo / Stoneshard con cuadrícula personalizada por ítem, integrado con el sistema D&D 5e (6.1.0+).

## Estado

Versión actual: **0.0.1** (M0 bootstrap). En desarrollo.

## Instalación (Foundry VTT)

Manifest URL:
```
https://raw.githubusercontent.com/MMillones9914/arpg-inventory/main/module.json
```
Pegar en "Install Module" → "Manifest URL".

## Desarrollo

Requisitos: Node 22+, npm.

```bash
npm install
npm run build      # genera dist/module.mjs
npm run dev        # vite dev server (opcional)
```

Para probar en Foundry, copiar/symlink el repo en `Data/modules/arpg-inventory` y ejecutar `npm run build`.

## Documentación

- `AGENT.md` — guía del agente de desarrollo, stack, convenciones, versionado.
- `CHANGELOG.md` — historial de cambios.
- `docs/milestones.md` — plan de hitos y estado.

## Requisitos

- Foundry VTT v14+
- Sistema D&D 5e 6.1.0+

## Licencia

MIT.
