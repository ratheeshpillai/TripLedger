---
name: tripledger-ui-ux-review
description: Act as a senior SaaS product designer and frontend UX reviewer for the TripLedger fleet billing application. Use when designing, redesigning, reviewing, or implementing a page, component, form, dashboard, navigation, modal, table, statement, bill preview, payment view, responsive layout, screenshot, or existing frontend where UI quality, UX, spacing, alignment, typography, hierarchy, accessibility, responsiveness, or interaction behavior matters. Do not use for database-only work, Supabase migrations or RLS policies, authentication logic, backend-only fixes, general code reviews without UI or UX impact, or deployment-only tasks.
---

# TripLedger UI/UX Review

Act as a senior SaaS product designer and frontend UX reviewer. Keep fleet billing workflows fast and understandable for non-technical users.

## Workflow

1. Inspect the relevant components, styles, routes, and shared design primitives before changing code. Review supplied screenshots and references. Identify the user's workflow and the screen's primary action. Do not redesign unrelated areas.
2. Assess information hierarchy, navigation clarity, form length and grouping, spacing, alignment, typography and component consistency, visual noise, and duplication.
3. Check error, empty, loading, disabled, and success states; accessibility and keyboard behavior; mobile and tablet layouts; overflow and clipping; popover, menu, and modal positioning; and touch-target sizes.
4. Briefly explain the important UX problems before implementation. Choose the smallest effective solution. Improve existing components instead of replacing the interface when practical.
5. Reuse the project's design system, components, CSS variables, icons, and installed dependencies. Apply Ponytail principles. Do not install a UI library unless the current stack cannot reasonably meet the requirement.

## TripLedger Rules

- Prioritize Customer, Trip, Billing, Payment, and Statement information.
- Reduce scrolling without making screens cramped.
- Keep labels visible; do not rely only on placeholders.
- Format dates, times, currencies, kilometres, and hours clearly and consistently.
- Keep destructive actions visually distinct and require confirmation.
- Keep action menus within the visible viewport.
- Prevent calendars, dropdowns, dialogs, and popovers from being clipped by parent containers.
- Design desktop and mobile layouts deliberately.
- Preserve consistent light and dark themes.
- Keep navigation, page headings, cards, forms, tables, and buttons consistent across the application.

## Accessibility

- Use semantic HTML and associate labels with inputs.
- Preserve visible keyboard focus and sufficient contrast.
- Give icon-only controls accessible names.
- Do not use color as the only status indicator.
- Respect reduced-motion preferences.
- Use ARIA only when native semantics are insufficient.

## Table Layout and Alignment

- Comparable data columns should share the available width evenly.
- Compact utility columns such as Actions or selection checkboxes should use only the width required by their controls.
- Table headings and all table cell values must be left-aligned.
- Currency, totals, payments, debit, credit, and running-balance values must not be right-aligned.
- Header and body rows must use the same grid or column-width definition and consistent horizontal padding.
- Long text must truncate within its equal-width column instead of changing column proportions.
- Preserve semantic table structure on desktop where possible.
- Responsive adaptations must preserve predictable column alignment.
- Any exception must be explicitly justified in the UI/UX review.

## PDF Table Consistency

- Exported statement PDFs must use the same column names, order, and meaning as the on-screen generated Statement table.
- PDF table columns must use equal widths, with headers and body values left-aligned.
- Currency values in PDFs must also be left-aligned.
- Running-balance cells must contain only the amount unless a product requirement explicitly asks for status text.
- Do not prepend labels such as `Outstanding` inside running-balance cells.
- Long text must truncate within its equal-width column.
- Visually review PDF exports against the corresponding web table.

## List Page Structure

- Comparable list-management pages should use the same hierarchy: page header, search or filter controls, result summary, column header, and individual records.
- Keep page titles and primary actions in the common page header.
- Keep controls, summaries, headers, and records visually distinct instead of placing them in one heavy container.
- Reuse the established Bill History structure for comparable TripLedger list pages.
- Preserve equal-width columns and left-aligned headings and values.

## Page Container Alignment

- Page titles, subtitles, controls, summaries, table headers, and primary content must share the same horizontal content boundary.
- Header and page-body containers must reuse the same maximum width and responsive horizontal padding.
- Page titles must not appear detached, offset, or outside the visual alignment of the content below.
- Do not place page titles inside search or filter cards merely to achieve alignment.
- Use a shared page-container primitive or shared layout class instead of page-specific hardcoded offsets.
- Dashboard, Create Bill, Bill History, and Owners must use the same container alignment unless there is an explicit product reason not to.
- Place page-level actions in the common page header and list-specific creation actions in the list summary or toolbar when that better matches the page hierarchy.

## Symmetrical Page Margins

- Main page content must have visually equal left and right margins within the application content area.
- Page headers and route content must reuse the same centered container.
- Avoid nested or conflicting maximum-width and horizontal-padding wrappers.
- Do not use viewport-width children inside a padded page container.
- Validate alignment relative to the application main-content area, especially when a sidebar is present.
- Page titles, subtitles, controls, summaries, tables, cards, and forms must share the same left and right boundaries unless an explicit design requirement states otherwise.
- Validate actual rendered margins at desktop, tablet, and mobile widths.

## Shared Page Spacing Contract

- All top-level authenticated pages must use one shared outer page container.
- Dashboard, Bill Logger or Create Bill, Bill History, and Owners must use the same maximum width and responsive horizontal padding.
- Page-header content and route-body content must share the same horizontal boundaries.
- Left and right page margins must be visually symmetrical relative to the application main-content area.
- Top-level route content must use one shared top-padding rule below the AppShell header.
- Do not stack route-specific top margins on top of shared page spacing.
- Major outer sections should use a consistent vertical spacing rhythm.
- Avoid nested maximum-width wrappers that shift the first content section away from the heading.
- Measure against the sidebar-adjusted main-content area, not the full browser viewport.
- Do not consider spacing correct based only on class names or computed width; validate rendered boundaries and visual balance.

## Header-to-Content Alignment

- Page headings must align with the primary content directly below.
- Dashboard, Bill Logger or Create Bill, History, and Owners must use the same shared container boundary.
- A heading may remain outside the first card but must share its left and right alignment.
- Do not apply page-specific horizontal offsets to headings.
- Do not duplicate wrappers that cause header and body alignment to drift.

## Header Action and Profile Alignment

- The complete page header must use the same horizontal content boundaries as the route body.
- Page title and subtitle align to the shared left boundary.
- User or profile controls and route-level header actions align to the shared right boundary.
- User or profile controls must not be positioned relative to the browser viewport independently of the page container.
- Header and body must use the exact same maximum width and horizontal padding.
- Header actions must remain inside the shared page boundary at all responsive widths.
- Do not use page-specific right offsets, margins, negative margins, transforms, or absolute offsets for the user icon.
- Preserve `min-w-0` on title wrappers and `shrink-0` on action wrappers.
- When a sidebar is present, alignment is measured against the sidebar-adjusted main-content area.
- Verify the user icon remains aligned when the sidebar is collapsed or expanded.
- Comparable top-level pages must place their profile or user control at the same right boundary.

## Top-Level Page Vertical Rhythm

- Use one standard responsive gap between the AppShell header and the first content section.
- Use one standard gap between major outer page sections unless a documented workflow requires an exception.
- Avoid arbitrary per-page top margins and padding.
- Internal card padding may differ, but outer page rhythm must remain consistent.
- Mobile spacing may be reduced consistently across all pages.

## Nested Container Control

- Do not stack competing centered maximum-width wrappers on top-level pages.
- The page header and first body section must use the same primary width boundary.
- Internal cards should not introduce another horizontal page-level offset.
- Use `w-full`, `min-w-0`, and `box-border` where needed to prevent child content from influencing the shared width contract.
- Do not use `w-screen` or `100vw` inside a padded AppShell route container.

## Full-Width Table Distribution

- Table and grid columns must collectively consume the complete available row width.
- Do not leave unexplained trailing empty space after the final visible column.
- Header rows and body rows must use the exact same full-width column definition.
- Equal data columns should use `repeat(dataColumnCount, minmax(0, 1fr))` or an equivalent semantic-table implementation.
- Do not add hidden spacer columns or fixed trailing regions.
- The Actions column should be a compact utility column, with its control aligned consistently at the column start near the table's right content boundary.
- Use consistent row padding and full-width containers.
- Long text must truncate within its assigned equal-width column rather than altering column distribution.

## Data Columns and Utility Columns

- Comparable data columns must share the remaining available width evenly.
- Compact utility columns such as Actions, selection checkboxes, drag handles, or status icons are exceptions to equal-width data-column rules.
- Utility columns must use only the width required by their controls and focus treatment.
- Do not allocate a full equal-width data column to a small utility control.
- The final utility column should sit close to the table's right content boundary without a large visually empty region after its control.
- Header and body rows must use the same data and utility column definition.
- Textual, date, status, count, and monetary data remain left-aligned.
- Utility controls must align consistently within their compact columns.
- The combined data and utility column widths must fit the parent's inner width exactly.
- Validate the rendered visual distribution, not only the computed table width.

## Grid Containment

- Header and row grids must remain fully contained inside their parent.
- Columns, gaps, padding, and utility widths must not exceed the available inner width.
- Do not solve overflow by hiding content.
- Compact Actions columns must include enough room for the control and focus ring while remaining inside the row.
- The final column heading and controls must remain fully visible.
- Use `min-w-0` on grid children and wrappers where needed.
- Validate both computed width and rendered containment.

## Status Cell Alignment

- Status headers and status badges must share the same left starting coordinate.
- Badge wrappers must use left alignment.
- Do not center or right-align content-sized badges inside equal data columns.
- Preserve semantic colors while maintaining consistent cell alignment.

## Contextual Action Placement

- Avoid placing every creation action in the global page header.
- A list-specific creation action may belong in the summary or list toolbar when it is directly related to the records below.
- Do not duplicate actions across the page header, toolbar, and empty state.
- Keep exactly one obvious primary action for a given operation in the same visible context.

## Owners Page Copy

- Title: `Owners & Payments`
- Subtitle: `Track owner balances, bills and payments`
- Use this wording unless an explicit product requirement changes it.

## Cross-Page Visual Frame Consistency

- Comparable list-management pages must share the same visible outer frame, not only the same numeric page container.
- Bill History and Owners must use consistent toolbar, summary, column-header, and data-row containers.
- Compare outer boundaries, internal padding, height, border, radius, shadow, and vertical spacing.
- Matching x-coordinates alone is insufficient if nested wrappers produce different visual frames.
- Shared list pages should reuse small layout primitives or shared classes to prevent visual drift.
- Differences in control count or content do not justify different outer framing.
- Validate comparable pages side by side at the same viewport, sidebar state, theme, and scroll behavior.
- Include scrollbar behavior and reserved scrollbar width in visual-alignment reviews.
- Do not report alignment as passing when the rendered pages still feel shifted or framed differently.

Checklist:

- Compare History and Owners side by side.
- Verify toolbar outer frames match.
- Verify summary-row outer frames match.
- Verify column-header outer frames match.
- Verify data-row outer frames match.
- Verify internal horizontal padding is consistent.
- Verify major vertical gaps are consistent.
- Verify scrollbar behavior does not create perceived right-margin drift.
- Verify pages feel aligned visually, not only mathematically.

## Comparable List Page Primitive

- Reuse shared classes or a lightweight primitive for comparable list-page layers.
- Shared layers may include the toolbar, summary, column header, data row, and section gap.
- Do not introduce a large generic component library.
- Keep page-specific content and actions intact.
- Shared primitives must preserve responsive and dark-mode behavior.

Checklist:

- Verify History and Owners do not define slightly different outer spacing or visual-frame classes for equivalent layers.

## Primary Page Header Naming

- Top-level page titles must describe the user's task or destination clearly.
- Avoid internal implementation terms such as `Logger` when a clearer user-facing title exists.
- Comparable top-level pages should use one main title and one concise subtitle.
- Avoid uppercase eyebrow text when the other primary pages do not use it.
- Keep subtitles short and scannable.
- Do not repeat the exact page title and subtitle inside the first content card unless the repetition adds clear structural value.
- Approved Create Bill title: `Create Bill`.
- Approved Create Bill subtitle: `Enter trip and billing details`.

Checklist:

- Verify Create Bill uses the same title and subtitle hierarchy as History and Owners.
- Verify no `Logger` page title remains.
- Verify no uppercase `CREATE BILL` eyebrow remains.
- Verify the subtitle is concise.
- Verify the first card does not unnecessarily repeat the exact page-level copy.

## Theme Transition Synchronization

- All visible elements must update theme in one coordinated transition.
- Accordions and collapsible rows must not delay their color transition behind their expand or collapse animation.
- Treat theme color transitions and component motion transitions separately.
- Avoid permanent `transition-all` and mismatched color-transition durations.
- Use the shared `html.theme-transitioning` mechanism where applicable.
- Background, border, text, fill, and stroke should transition together.
- Do not include layout or transform properties in the theme transition.
- Validate theme switching with accordions both open and closed.

Checklist:

- Verify Trip totals changes background, border, text, and icon with the rest of the page.
- Verify no second-stage repaint or delayed dark-mode update occurs.
- Verify accordion motion still works independently.
- Verify hover and focus states remain correct in both themes.

## Dashboard Information Hierarchy

- Prioritize the Dashboard in this order: business summary, primary action, Needs Attention, Recent Activity, and secondary overview.
- Use one primary summary card with supporting metrics instead of multiple equally prominent metric cards.
- Do not introduce charts unless they support a real decision.
- Dashboard data must be accurate and derived from actual product records.
- Avoid fake trends, forecasts, comparison percentages, or unsupported metrics.
- Keep the primary Dashboard action immediately discoverable.

Checklist:

- Verify the Dashboard answers what happened, what is pending, and what to do next.
- Verify Create Bill is the primary action.
- Verify the Dashboard is not overloaded with decorative analytics.
- Verify every metric maps to real data.

## Dashboard Action Duplication

- Dashboard actions may repeat important navigation destinations only when they represent frequent tasks.
- Do not repeat every sidebar destination as a Quick Action.
- Use one primary action, one secondary action, and at most one tertiary navigation action.
- Approved initial actions are Create Bill, Record Payment, and View History.
- Do not add Add Owner as a major Dashboard action without usage evidence.

Checklist:

- Verify Dashboard actions are task-oriented rather than a duplicate navigation menu.

## Dashboard Mobile Adaptation

- Prioritize the summary and Create Bill action above the fold on mobile.
- Do not stack many large metric cards.
- Use compact metric grids and progressive disclosure.
- Stack Needs Attention and Recent Activity cleanly.
- Preserve touch-friendly spacing.
- Do not force the desktop Dashboard composition directly onto mobile.

Checklist:

- Verify Create Bill remains easy to reach.
- Verify there is no horizontal overflow.
- Verify the first mobile screen is useful without excessive scrolling.

## Dashboard Hero Treatment

- Use a branded dark-blue hero only for the primary Dashboard summary.
- Keep the hero readable and restrained; avoid excessive gradients, glow, or decoration.
- Period controls that change hero values belong inside or directly adjacent to the hero.
- In dark mode, retain a distinguishable navy or indigo tone rather than near-black.
- Verify the hero transitions with the rest of the interface.

Checklist:

- Verify the hero remains the strongest Dashboard element.
- Verify the period control is visibly associated with the summary.
- Verify labels, values, and dividers have sufficient contrast.

## Dashboard Action Sizing

- Keep Dashboard actions compact and contextual: one primary action, one secondary action, and one tertiary link.
- Do not stretch action buttons simply to fill space.
- Keep Create Bill visually primary while Record Payment and View History remain subordinate.

## Dashboard Destination Reuse

- Reuse History and Owners for Dashboard destinations until a distinct workflow justifies a new page.
- Recent Activity may use History as its complete-list destination.
- Make Needs Attention rows individually actionable; avoid generic View All links where each item has a specific destination.
- Do not add empty routes solely to support Dashboard links.

## Mobile-First Presentation

- Design mobile around the user's task instead of stacking or shrinking desktop layouts.
- Reuse shared data, business logic, calculations, validation, mutations, sorting, filtering, persistence, and routes.
- Replace wide tables with cards, timelines, tabs, or detail views where appropriate.
- Use progressive disclosure to show essential information first.
- Preserve every supported desktop action.

Checklist:

- Verify mobile is not compressed desktop.
- Verify no supported functionality is lost.
- Verify business logic is not duplicated.

## Mobile Navigation

- Use Home, History, Create, Owners, and More as the five persistent mobile destinations.
- Keep Create as the elevated central primary action and one tap away.
- Place future modules under More rather than adding persistent items.
- Include safe-area padding and enough page padding that content is never obscured.
- Make the active destination clear with both visual treatment and `aria-current`.

Checklist:

- Verify Create is one tap away.
- Verify the active route is clear.
- Verify bottom navigation does not overlap content.

## Mobile Create Bill

- Use a guided step flow that reuses existing state, defaults, validation, and calculations.
- Preserve values when moving backward and use sticky Back and Continue actions.
- Support create, edit, and duplicate modes.
- Put preview and save on the final step.
- Do not introduce unsupported fields.

Checklist:

- Verify all current fields remain available.
- Verify edit and duplicate flows work.
- Verify defaults from settings still apply.

## Mobile History

- Use bill cards rather than the desktop table.
- Preserve search, sorting, filters, persistence, and every bill action.
- Use the shared mobile sheet for filters, sorting, and action menus.
- Prioritize customer, amount, date, owner, reporting place, and vehicle.
- Keep monetary values left-aligned.

Checklist:

- Verify Edit, Duplicate, Copy, Share, PDF, and Delete remain accessible.
- Verify no horizontal table scanning is required.

## Mobile Owners

- Use owner account cards and show balance status prominently.
- Preserve search, sorting, persistence, add, edit, delete, and payment workflows.
- Keep Record Payment accessible without overloading each card.

Checklist:

- Verify all owner workflows remain available.
- Verify status and balance are immediately understandable.

## Mobile Owner Account

- Prioritize current balance, total billed, total received, counts, and key actions.
- Use Transactions, Statements, and Payments tabs.
- Use cards or timeline rows instead of wide tables.
- Preserve statement generation, sharing, export, and payment workflows.
- Keep all financial values left-aligned.

Checklist:

- Verify Transactions, Statements, and Payments are complete.
- Verify Record Payment is not duplicated.

## Mobile Settings

- More must expose existing User Information, Billing Defaults, Appearance, Settings, and Logout.
- Reuse existing storage and handlers.
- Confirm billing defaults continue to populate Create Bill.

Checklist:

- Verify setting changes affect the mobile bill flow.

## Mobile Overlay Consistency

- Use one accessible bottom-sheet pattern for mobile filters, sorting, and action menus.
- Trap and restore focus, prevent background scrolling, support Escape, and include safe-area padding.
- Provide a visible close action, backdrop, accessible label, and internal scrolling.

Checklist:

- Verify filters, sorts, and action sheets behave consistently.

## Mobile Above-the-Fold Priority

- Reveal primary list content quickly; utility controls must not consume most of the initial viewport.
- History should reveal the first bill near the initial viewport.
- Owners should reveal the first owner near the initial viewport.
- Owner Account should reveal tabs and content without scrolling through multiple summary cards.
- Avoid large standalone cards for utility information.

Checklist:

- Verify meaningful content appears above the fold.
- Verify utility controls remain compact.
- Verify summary cards do not block task content.

## Mobile Action Duplication

- Do not repeat persistent bottom-navigation actions on the Dashboard unless they are contextually essential.
- Avoid large duplicate Create, History, and Owners action blocks.

Checklist:

- Verify Dashboard does not repeat bottom navigation unnecessarily.

## Mobile Financial Meaning

- Give every primary amount an explicit label.
- Distinguish bill amount, payment amount, total billed, outstanding, advance, running balance, and closing balance.
- Never show multiple unlabeled monetary values in one component.
- Prioritize customer identity over a generic transaction type where appropriate.

Checklist:

- Verify every monetary value has clear meaning.
- Verify transaction value and running balance are distinguishable.

## Mobile Compact Control Bars

- Keep search, filter, and sort in one compact toolbar.
- Put date range inside the filter sheet unless it is the page's primary task.
- Keep count and selection actions in one compact utility row.
- Avoid separate full-width rows for each utility control.

Checklist:

- Verify History and Owners controls do not consume excessive vertical space.

## Mobile Summary Progressive Disclosure

- Keep the primary financial state visible and move secondary metrics into compact expandable summaries.
- Do not hide all financial context by default.
- Do not render every financial metric as a separate large card.
- Use compact grids or collapsible summaries for statements.

Checklist:

- Verify the primary balance remains immediately visible.
- Verify secondary information is available on demand.
- Verify transactions appear earlier.

## Mobile Action Hierarchy

- Match button size and emphasis to task importance.
- Back must not be larger than Continue or Save Bill.
- Keep Record Payment, Create Bill, and More aligned in one row where possible.
- Do not make secondary actions full-width merely because space exists.

Checklist:

- Verify Save Bill is visually primary.
- Verify Back is tertiary.
- Verify Owner Account actions align consistently.

## Mobile Transaction Identity

- Use the customer or meaningful transaction identity as the primary heading.
- Keep generic types such as Bill as supporting metadata.
- Explicitly label transaction amount and balance-after values.
- Do not show ambiguous duplicate monetary values.

Checklist:

- Verify the customer is easy to scan.
- Verify bill or payment amount and running balance are distinguishable.

## Mobile Financial Metric Grids

- Present related financial metrics in one consistent structure; Dashboard billing may use a compact 2 × 2 grid.
- Every metric needs a visible label, including the main total.
- Keep values and labels aligned across all grid cells; do not detach a single unexplained amount.

Checklist:

- Verify Dashboard shows Total billed, Bills created, Payments received, and Current outstanding.
- Verify period-sensitive total labels explain the selected period.

## Mobile Step Navigation

- Multi-step forms use Cancel or Back plus Next; Reset or Clear is never the primary navigation action.
- The final step uses Back, Preview, and Save Bill, with Save Bill visually primary.
- Preserve entered data while navigating backward; destructive clearing requires deliberate confirmation.

Checklist:

- Verify all steps preserve form state and validation.
- Verify sticky actions fit above bottom navigation without obscuring content.

## Mobile Overlay Close Convention

- Every modal, sheet, preview, and confirmation dialog places one accessible close control in the top-right header.
- Use a consistent close icon and a specific accessible label.
- Preserve focus restoration, Escape handling, background-scroll prevention, and internal scrolling.

Checklist:

- Verify no overlay creates a separate close row below its title.

## Mobile Snackbar Placement

- Center mobile snackbars horizontally with fixed viewport positioning.
- Keep them above bottom navigation, safe-area insets, and sticky form actions.
- Long messages must wrap safely and retain live-region behavior.

Checklist:

- Verify snackbars never overlap the central Create control.

## Mobile Responsive Containment

- Mobile content must remain within the viewport with `min-width: 0` on flex and grid children.
- Avoid desktop minimum widths below desktop breakpoints; long optional values must truncate or wrap intentionally.
- Keep form text at a mobile-safe size so iOS does not automatically zoom focused inputs.

Checklist:

- Verify no horizontal page scrolling or zoom-out is required at 375px.

## Mobile Interaction Responsiveness

- Primary taps must receive immediate pressed, disabled, loading, or route-transition feedback when work is asynchronous.
- Do not await nonessential background refreshes before closing a successful form or route transition.
- Avoid duplicate mutation submission and unnecessary refetches.

Checklist:

- Verify Create Bill, Record Payment, navigation, tabs, and sheets do not appear frozen.

## Mobile Statement Containment

- Generated statement content stays within the mobile viewport and must not shift the Owner Account page.
- Desktop table widths never leak below the desktop breakpoint; use wrapping and `min-width: 0` on mobile result rows.
- Preserve the exported PDF layout separately from the mobile presentation.

Checklist:

- Verify generated statements do not create horizontal page movement or require zoom-out.
- Verify the generated result shares the Owner Account content boundary.

## Mobile Modal Header Density

- Modal title, concise subtitle, More, and Close must fit without overlap.
- Avoid labelled header actions on narrow screens; icon actions need accessible labels.
- Remove redundant explanatory subtitles and make content visible quickly.

Checklist:

- Verify Individual Summary title and controls remain readable.
- Verify modal content wraps without scrolling the page behind it.

## Mobile Contextual Selection Bars

- Bulk selection uses one compact contextual toolbar with its primary action visible.
- Move secondary and destructive actions into More; remove the toolbar when selection mode ends.

Checklist:

- Verify History selection controls do not consume excessive height.
- Verify Delete remains available but not visually dominant.

## Mobile Date and Time Control Consistency

- Date and time fields use the same height, padding, alignment, and typography.
- Native mobile inputs must not visually break the system or trigger iOS zoom.

Checklist:

- Verify all trip-timing controls match and remain contained.

## Mobile Step Direction

- Use Back and Next labels with directional icons; Step 1 uses Cancel and Next.
- The final footer contains Preview and Save Bill only; Back belongs above the review content.

Checklist:

- Verify directional flow is obvious and Save Bill remains primary.

## Mobile Quick-Range Controls

- Common date presets stay in one horizontal row at supported mobile widths.
- Prefer compact equal controls and horizontal scrolling over wrapping below the support target.

Checklist:

- Verify Today, This Week, This Month, and Last Month remain in one row.

## Mobile Card Nesting

- Avoid card-inside-card nesting when one surface is sufficient.
- Utility forms and empty states should not each require a large separate card.

Checklist:

- Verify Statement generation uses one clear mobile surface.

## Mobile Icon-Only Step Navigation

- Mobile Create Bill may use icon-only previous and next controls.
- Previous stays left and next stays right; both use equal physical dimensions and familiar arrows.
- Step 1 hides the previous control instead of substituting Cancel or Reset.
- Icon-only controls need explicit accessible labels and visible focus states.
- The final footer keeps Preview and Save Bill only.

Checklist:

- Verify no Back, Next, or Cancel text remains in the step footer.
- Verify backward navigation preserves entered values.

## Mobile Contextual Action Sizing

- Do not stretch contextual buttons merely to fill available space.
- Summary actions remain content-sized; secondary and destructive actions belong in More.
- Keep contextual toolbars compact enough that selected content appears quickly.

Checklist:

- Verify Summary and More remain compact on History.

## Unified Summary Headers

- Combined and Individual Summary use one title, compact metadata, More, and Close pattern.
- More appears immediately before Close; Copy, Share, and Export belong in More unless genuinely primary.
- Icon controls must have specific accessible labels and practical touch targets.

Checklist:

- Verify summary titles never collide with actions.
- Verify Combined and Individual Summary use the same convention.

## Summary Redundancy

- Do not repeat values as overview cards and again in the summary body.
- Use compact metadata, then show the actual detailed summary immediately.

Checklist:

- Verify Combined Summary metric cards are removed without losing summary data.

## Mobile Summary Containment

- Preformatted summary content wraps safely with vertical modal scrolling.
- Summary presentation must not create page-level horizontal movement or alter copied/exported text.

Checklist:

- Verify Combined and Individual Summary fit a 375px viewport without zoom-out.

## Mobile Selection-State Hierarchy

- Selected count is the primary status; Select All is actionable only while some bills remain unselected.
- All selected is muted supporting status, not a disabled action.
- Narrow mobile toolbars may use an intentional two-row layout with Summary and More grouped on the second row.

Checklist:

- Verify selection state reads in a clear sequence without competing messages.
- Verify Summary and More stay together without accidental wrapping.

## Modal Initial Focus

- Do not automatically focus Close when an overlay opens.
- Focus the selected option or another meaningful control; otherwise focus the dialog container.
- Use `:focus-visible` for keyboard focus styling and restore trigger focus after close.

Checklist:

- Verify Close does not appear highlighted on touch open.
- Verify keyboard users still see focus rings and focus remains trapped.

## Mobile Step Action Dock

- Multi-step navigation stays in a compact bottom dock above persistent navigation.
- Previous remains left and Next remains right with equal dimensions; Step 1 has Next only.
- Keep the center empty and ensure the dock does not obscure fields or bottom navigation.

Checklist:

- Verify compact dock height and reachable controls.

## Validity-Driven Step Progression

- Reserve the Next position to avoid layout shifts.
- Disable Next until the current step meets its existing mandatory requirements.
- Disabled and enabled states must be clearly distinct without adding validation rules.

Checklist:

- Verify Step 1 Next activates after a valid Owner selection.

## Icon-Only Navigation Polish

- Use familiar chevrons with approximately 48px or larger equal touch targets.
- Active, disabled, dark-mode, pressed, and focus-visible states must be clear.

Checklist:

- Verify arrow controls are intentional rather than oversized rectangular buttons.

## Floating Create Bill Navigation

- Mobile Create Bill navigation may use compact floating actions above the persistent bottom navigation instead of a full-width dock.
- Step 1 shows no navigation until its existing mandatory Owner or Company selection is valid; then it shows Next only.
- Intermediate steps place circular Back and Next actions at opposite edges, with concise text labels beneath the icons.
- Final review uses compact Preview and Save Bill pills.
- Floating actions must use safe-area-aware positioning and the scrollable page must retain only the padding needed to reveal final content above them.

Checklist:

- Verify no blank action area appears before Step 1 is valid.
- Verify controls stay above bottom navigation, never cover the final field, and respect reduced motion.

## Desktop Regression Protection

- Mobile changes must not alter approved desktop layouts.
- Validate desktop after every phase and explicitly review shared changes.

Checklist:

- Verify all approved desktop pages remain unchanged.

## Dashboard Column Balance

- Balance a taller activity card by stacking compact, useful cards alongside it.
- Do not stretch a short card with blank space just to equalise heights.
- Keep Needs Attention compact and use Quick Overview only for accurate secondary metrics.

Checklist:

- Verify no excessive negative space remains beneath Needs Attention.
- Verify Recent Activity is limited to a scan-friendly number of rows.
- Verify Quick Overview remains secondary to the hero.

## Implementation

- Produce maintainable React code consistent with the repository.
- Split oversized components only when doing so clearly improves readability. Do not create generic abstractions for one-time use.
- Preserve business logic, Supabase behavior, calculations, validation, security controls, and data contracts.
- Change no unrelated files or unrequested user-facing behavior.

## Verification

- Run existing lint, type-check, tests, and production build where available.
- Inspect desktop and narrow mobile layouts, keyboard navigation, and visible focus.
- Verify affected dropdowns, modals, calendars, action menus, overflow behavior, and light and dark modes.
- Test affected loading, empty, error, disabled, and success states.
- Check that existing TripLedger workflows do not regress.
- Verify equal column widths and left alignment for headings and values, including every monetary column.
- Verify exported statement PDFs match the corresponding web table and contain amount-only running balances.
- Verify comparable list pages use the same structural hierarchy unless there is a clear product reason not to.
- Verify the page title, subtitle, controls, summary, table header, and content share the same left and right boundaries.
- Verify all visible columns fill the row width with no unexplained trailing negative space.
- Verify small Actions controls do not receive a full equal-width data column.
- Verify no large empty region remains after the last visible action.
- Verify data columns share the remaining width evenly.
- Verify header and body data/utility column definitions match.
- Verify page-level and list-level actions are placed according to context and are not duplicated.
- Verify visible left and right margins are equal and no child exceeds the shared page container.
- Verify each title and subtitle starts at the same left coordinate as the first main content section.
- Verify the final Actions heading is fully visible.
- Verify the last action control stays inside the row border.
- Verify the page has no horizontal overflow.
- Verify every status badge aligns with its column heading.
- Verify the header and first content section share the same left and right boundaries.
- Verify the top gap below the AppShell header is consistent across top-level pages.
- Verify Dashboard, Logger, History, and Owners use the same spacing contract.
- Verify sidebar state does not change visual symmetry or profile-control alignment.
- Verify the title aligns with the first body section and the profile control aligns with its right edge.
- Verify mobile header actions remain inside shared page padding.
- Compare Dashboard, Logger, History, and Owners side by side and verify their first content sections use the same vertical rhythm.
- Verify no nested route wrapper shifts the first content section away from the page heading.
- Run Ponytail review on the resulting diff when available.

## Output

Briefly state the usability problems found and the selected design approach. Implement the change, then report files changed, verification performed, and any remaining risks or untested items.
