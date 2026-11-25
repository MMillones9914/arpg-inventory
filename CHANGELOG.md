# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- (next milestone in progress)

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
