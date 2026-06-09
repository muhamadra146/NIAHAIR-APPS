# NIAHAIR ERP — Responsive Rules

All modules must be usable at **375 px** (minimum phone width) through desktop.

---

## Breakpoints

| Prefix | Min width | Use for |
|--------|-----------|---------|
| *(none)* | 0 px | Mobile-first base styles |
| `sm` | 640 px | Phablet / large phone landscape |
| `md` | 768 px | Tablet portrait — tables become visible |
| `lg` | 1024 px | Desktop — sidebar becomes visible |
| `xl` | 1280 px | Wide desktop |

---

## Layout

### Desktop (`lg+`)
- Fixed sidebar (240 px) always visible on the left.
- Content fills remaining width.

### Tablet / Mobile (`< lg`)
- Sidebar is **hidden**.
- Header shows a **hamburger** button that opens `MobileSidebar` (Sheet drawer from left).
- Tapping outside or clicking a nav link closes the drawer automatically.

### Page wrapper — always use `PageContainer`
```tsx
import { PageContainer } from "@/components/layout/PageContainer";

export function MyPage() {
  return (
    <PageContainer>
      {/* page content */}
    </PageContainer>
  );
}
```
`PageContainer` applies `px-4 py-4 sm:px-6 sm:py-6` and prevents horizontal overflow.  
**Never** add bare `p-6` directly to a page root — use `PageContainer` instead.

---

## Page header pattern

```tsx
<div className="flex flex-wrap items-center justify-between gap-3">
  <div>
    <h1 className="text-xl font-bold sm:text-2xl">Page Title</h1>
    <p className="text-sm text-muted-foreground">Subtitle</p>
  </div>
  <Button size="sm">
    <Plus className="mr-2 h-4 w-4" /> Primary Action
  </Button>
</div>
```

- Use `flex-wrap` so title and button stack on very narrow screens.
- `text-xl sm:text-2xl` keeps headings readable on phones.

---

## Table / Card pattern

**Rule:** never render a wide table bare on mobile — hide it and show cards instead.

```tsx
{/* Mobile cards — shown below md */}
<div className="divide-y divide-border md:hidden">
  {items.map((item) => (
    <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-sm">{item.name}</p>
        <p className="text-xs text-muted-foreground">{item.secondary}</p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-2">
        <SomeBadge />
        <Button size="sm" variant="outline" asChild>
          <Link to={`/route/${item.id}`}>View</Link>
        </Button>
      </div>
    </div>
  ))}
</div>

{/* Desktop table — shown at md+ */}
<div className="hidden overflow-x-auto md:block">
  <table className="w-full text-sm">…</table>
</div>
```

**Column strategy for desktop tables:**

| Columns | Visible at |
|---------|-----------|
| Primary (name/title) | Always |
| Secondary (ID, phone) | `md+` |
| Status / badges | `md+` |
| Metadata (date, amount) | `lg+` (use `hidden lg:table-cell`) |
| Actions | Always |

---

## Forms / Dialogs

### Desktop (`sm+`)
Standard centered modal, `max-w-lg`, rounded corners.

### Mobile (`< sm`)
Full-screen drawer: `top-0`, `h-[100dvh]`, `rounded-none`.  
Footer buttons are sticky at the bottom.

```tsx
<DialogContent
  className={cn(
    "flex flex-col gap-0 p-0",
    // mobile full-screen
    "top-0 translate-y-0 rounded-none h-[100dvh] max-w-full",
    // desktop modal
    "sm:top-[50%] sm:translate-y-[-50%] sm:rounded-lg sm:h-auto sm:max-w-lg sm:max-h-[90dvh]"
  )}
>
  <DialogHeader className="shrink-0 border-b px-4 py-4 sm:px-6">…</DialogHeader>

  <form className="flex flex-1 flex-col overflow-hidden">
    {/* Scrollable fields */}
    <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Full-width field */}
        <div className="sm:col-span-2 space-y-1.5">…</div>
        {/* Half-width field */}
        <div className="space-y-1.5">…</div>
      </div>
    </div>

    {/* Sticky footer */}
    <DialogFooter className="shrink-0 border-t px-4 py-4 sm:px-6">
      <Button variant="outline" className="flex-1 sm:flex-none">Cancel</Button>
      <Button className="flex-1 sm:flex-none">Save</Button>
    </DialogFooter>
  </form>
</DialogContent>
```

**Input rules:**
- All inputs are `w-full` by default.
- Use `inputMode="tel"` for phone fields, `inputMode="email"` for email.
- Use `type="date"` for date pickers (native — works on all devices).

---

## Navigation auto-close

Nav links in the mobile drawer call `closeSidebar()` from `useLayout()` on click.  
This is handled inside the `MobileSidebar` component automatically — no extra code needed in pages.

---

## Spacing

| Context | Class |
|---------|-------|
| Page vertical gap | `space-y-4 sm:space-y-6` |
| Card padding | `p-4 sm:p-6` |
| Section padding | `px-4 sm:px-6` |
| Button gap in toolbar | `gap-2 sm:gap-3` |

---

## Touch targets

Minimum tap target: **44 × 44 px** (`h-11 w-11` or Tailwind `size-11`).  
Icon-only buttons should use `size="icon"` (40 × 40 px) which is acceptable.  
Never use text smaller than `text-xs` (12 px) for interactive elements.

---

## Future module checklist

When building a new module, verify:

- [ ] Page root uses `<PageContainer>`
- [ ] Page header uses `flex-wrap` pattern
- [ ] Lists use card pattern on mobile (`md:hidden` / `hidden md:block`)
- [ ] Forms use full-screen-on-mobile Dialog pattern
- [ ] No hard-coded widths on inputs (`w-full` everywhere)
- [ ] No `overflow-x-auto` on the page root (can break mobile layout)
- [ ] Test at 375 px viewport width before submitting
