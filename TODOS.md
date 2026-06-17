# TODOS

Deferred items from CEO review (2026-06-17). Each item has context for pickup in a future session.

---

## P3 — Logo: Replace with transparent-background PNG

**What:** Source a transparent-background version of `logo-niahair.png` from the brand kit and replace the current white-background PNG.

**Why:** The current `invert` CSS filter on the logo `<img>` (added in the UI redesign for dark sidebar) is a workaround — it converts the black logo to white. A proper transparent PNG would work on any background without any CSS filter, and is the clean long-term asset.

**Current state:** `frontend/src/assets/logo-niahair.png` has a white background. The dark sidebar uses `filter: invert(1)` (Tailwind `invert` class) to make it readable.

**Where to start:** Export a transparent-background PNG from the original brand kit (Canva, Illustrator, or whatever was used to create the logo). Replace `frontend/src/assets/logo-niahair.png`. Remove the `invert` class from the `<img>` in `Sidebar.tsx`.

**Effort:** XS (human ~15min / CC ~2min, assuming asset is available) | **Priority:** P3 | **Depends on:** UI Redesign dark sidebar shipped

---

## P2 — Settings: URL persistence for active tab

**What:** Sync the active Settings tab with the URL search param (e.g. `/settings?tab=cabang`) so the selected tab survives page refresh and direct linking.

**Why:** The new vertical split-pane layout creates a strong UX expectation that the selected sidebar item persists — it looks like a real navigation. Currently `useState` resets the tab to the default on every navigation. Direct linking (e.g. sending a colleague a link to `/settings?tab=accurate`) doesn't work.

**Current state:** `SettingsPage.tsx` uses `useState<string>` for tab state. The mobile `<select>` and desktop `<TabsTrigger>` both call `setTab`.

**Where to start:** Replace `useState` with `useSearchParams` from React Router. On mount, initialize tab from `searchParams.get("tab") ?? TABS[0].value`. On `onValueChange`, call `setSearchParams({ tab: value })`. Preserve the mobile `<select>` handler.

**Effort:** S (human ~30min / CC ~5min) | **Priority:** P2 | **Depends on:** UI Redesign Settings split-pane shipped

---

## P2 — Receipt/Printout Discount Line

**What:** Add `Diskon Membership (Gold, 20%): -Rp XX.XXX` as a distinct line item to the invoice receipt/printout.

**Why:** Members see exactly what they saved. Builds trust in the membership product and drives renewals. Currently the discount is applied correctly in the total but not displayed as a labeled line.

**Current state:** `invoice.membershipDiscountTotal` and `invoice.membershipId` will be stored on the invoice after the core membership discount auto-apply feature ships. The data is available — just not displayed.

**Where to start:** Find the invoice receipt/printout component. Add a conditional line below the subtotal: if `invoice.membershipDiscountTotal > 0`, show `Diskon Membership ({membership.name}, {discountType}): -Rp {membershipDiscountTotal}`.

**Effort:** S (human ~2h / CC ~10min) | **Priority:** P2 | **Depends on:** Core membership discount auto-apply feature shipped

---

## P2 — updateInvoice Membership Re-Apply

**What:** When an invoice is updated (items changed), re-evaluate and re-apply the membership discount on the updated items.

**Why:** Currently, membership discount is only applied at invoice creation time. If CS adds/removes items after creation, the discount doesn't update. This is a minor inconsistency — the discount is correct at creation but may be stale after updates.

**Current state (design doc section 5):** The design doc describes the update path logic in detail but it was explicitly deferred. The approved approach: lock membership discount at create time. On update, re-apply only if the set of `{itemId, unitId, qty, price}` changes AND `membershipDiscountTotal` is absent in the request body.

**Reviewer Concern #1:** Create vs. update override detection — see the design doc. The risk is that re-applying on update overwrites per-item discounts the CS adjusted manually.

**Recommendation:** When implementing, lock at create time for PERCENTAGE (don't re-apply on update). For FIXED_AMOUNT, recompute on update if items change (since FIXED_AMOUNT doesn't touch per-item discounts, it's safe).

**Effort:** M (human ~1 day / CC ~20min) | **Priority:** P2 | **Depends on:** Core membership discount auto-apply feature shipped

---

## P3 — Membership Analytics Dashboard

**What:** Manager/owner dashboard showing member vs. non-member revenue, membership utilization, churn risk, and tier performance.

**Why:** Once memberships are used consistently (auto-applied discounts), the data becomes valuable for business decisions. Which membership tier generates the most revenue? Are members visiting more frequently? Which members are at churn risk (no visit in 60+ days)?

**Queries enabled by the schema change:**
- `SELECT SUM(membershipDiscountTotal) WHERE membershipId IS NOT NULL` — total discount given to members
- `SELECT customerId, COUNT(*) as visits WHERE membershipId IS NOT NULL GROUP BY customerId` — visit frequency per member
- `SELECT membershipId, COUNT(*) as invoices, SUM(grandTotal) as revenue` — revenue by membership tier

**Effort:** L (human ~1 week / CC ~1 hour) | **Priority:** P3 | **Depends on:** Core membership discount auto-apply feature shipped; sufficient data accumulated (~1 month)
