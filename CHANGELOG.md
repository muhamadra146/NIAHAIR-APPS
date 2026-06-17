# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1.0] — 2026-06-17

### Changed
- **Premium table design — Invoice/POS** — `ManagementView` table and `KasirPOSView` search input now use `rounded-xl` inputs with `shadow-sm`, `bg-slate-50/60` header rows, `border-slate-100` dividers, and pastel `STATUS_BADGE` for `UNPAID/PAID/CANCELLED` statuses. Cashier card grid gains collapsible paid section and branded stat cards.
- **Premium table design — Appointments** — `AppointmentListPage` filter card upgraded to `rounded-2xl border-slate-100/80` with uppercase tracking labels. `AppointmentTable` desktop/mobile layouts now use `bg-slate-50/60` headers, `px-5 py-4` row padding, and `rounded-lg` action buttons.
- **Premium status badges — Appointments** — `AppointmentStatusBadge` switched from shadcn variant system to explicit pastel `bg-{color}-50 text-{color}-700 border-{color}-200` classes with `rounded-lg`, covering all 7 statuses (BOOKED → NO_SHOW).
- **Premium table design — Commissions** — `CommissionListPage` gains `rounded-2xl` summary cards with icon badges, status tab buttons with `rounded-lg`, and a full premium table/mobile-card layout using `STATUS_BADGE` for PENDING/APPROVED/PAID.
- **Premium table design — Payroll** — `PayrollPage` payroll list cards use `rounded-2xl border-slate-100/80 shadow-sm` with hover shadow. `StatusBadge` adds `rounded-lg`. `GenerateDialog` selects use `rounded-xl border-slate-200`. Detail view summary cards are unified to `rounded-2xl`.
- **DepositListPage blueprint applied** — `filterInputCls` (`h-9 rounded-xl border-slate-200 bg-white shadow-sm`) and `STATUS_BADGE` pastel pattern established in Deposit page now consistently applied across all 5 operational pages.

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
