# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] — 2026-06-17

### Added
- **MetricCard component** (`frontend/src/components/ui/MetricCard.tsx`) — reusable KPI card with gradient top strip, icon badge, animated progress bar, and staggered fade-up entrance. Shared across DashboardPage.

### Changed
- **Dark sidebar palette** — sidebar CSS tokens updated to slate-900 background, slate-200 foreground text, rose primary accent, and slate-800 hover state. Logo PNG inverted via CSS filter for display on dark background.
- **Sidebar token adoption** — all hardcoded color classes replaced with `bg-sidebar`, `text-sidebar-foreground`, `text-sidebar-primary`, etc. design token utilities.
- **DashboardPage KPI grid** — inline `KpiCard` function removed; `KPI_CONFIG` + `kpiValues` arrays drive the grid declaratively through the shared `MetricCard` component.
- **SettingsPage navigation** — horizontal tab strip replaced with a vertical split-pane layout (Radix `orientation="vertical"`). 192px left rail with `border-l-2` active indicator and viewport-relative height (`calc(100vh-12rem)`).

### Fixed
- `text-[10px]` (10px, WCAG 1.4.4 violation) changed to `text-xs` (12px) on SectionLabel and UserFooter role code in `Sidebar.tsx`.
- `MetricCard` `delay` prop made required (removes `?? "delay-0"` fallback; all callers in `DashboardPage` already supply a value).
- Removed no-op `md:gap-0` from `SettingsPage` wrapper div.
