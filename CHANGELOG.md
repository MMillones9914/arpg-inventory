# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- (next milestone in progress)

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
