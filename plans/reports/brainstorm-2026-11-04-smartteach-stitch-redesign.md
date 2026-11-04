---
title: SmartTeach screen-flow redesign in Google Stitch
date: 2026-11-04
status: decided
---

# SmartTeach screen-flow redesign in Google Stitch

## Intent / Problem

SmartTeach has working UI, theme tokens, and product flows, but its screens were
implemented before a complete screen flow existed. As a result, visual hierarchy
and UX decisions can drift between features. The product needs a reviewed,
high-fidelity source of truth before further UI implementation.

## Desired Outcome

A private Stitch project holds a consistent, high-fidelity desktop and mobile
screen flow for the full SmartTeach experience. It is the approved visual and
interaction reference for later Next.js work; the existing product logic, APIs,
routes, and data model are not changed during this design phase.

## Constraints

- Teachers use laptops in bright classrooms and may project screens; clarity and
  contrast take priority over decoration.
- Preserve the established SmartTeach identity from PRODUCT.md and DESIGN.md:
  “Bảng đen sáng”, Blackboard Blue, and a single Chalk Yellow primary CTA.
- Maintain WCAG AA, keyboard access, Vietnamese copy, responsive desktop/mobile
  layouts, 44px touch targets, and prefers-reduced-motion behavior.
- Content panels are near-solid; translucent material is only for functional
  floating chrome. Live quiz and classroom-tool canvases must stay opaque and
  projection-safe.
- No source-code changes, external production writes, commits, or pushes are
  authorized by this decision alone.

## Non-goals

- Reworking business logic, Supabase schema, routes, APIs, or quiz behavior.
- Treating a Stitch-generated HTML screen as production code.
- Decorative glassmorphism, cursor-dependent interaction, mascots, neon, or
  generic repeated card grids.

## Domain Context

Primary users are Vietnamese school teachers moving quickly between classroom
activities. Students do not have accounts and participate through live quiz
PINs. The product must make a key action possible within two clicks where
practical and must remain legible from the back of a classroom.

## Options Considered

| Option | Key assumption | Failure condition | Trade-offs |
| --- | --- | --- | --- |
| Continue styling directly in code | Individual screens are enough to converge | UI drift continues without shared flow decisions | Fast locally, weak cross-flow consistency |
| Build desktop-only concepts first | Mobile can follow from the desktop pattern | Mobile interaction and density are discovered too late | Fewer initial screens, incomplete decision source |
| Create a complete desktop/mobile flow in Stitch | A design system plus flow review resolves hierarchy before code | Designs are treated as implementation rather than reference | More up-front design work, less rework in code |

## Decision

Use Google Stitch as the design workspace. Create the full high-fidelity screen
flow for desktop and mobile, beginning with the home/discovery flow and then
covering teacher management and live quiz flows. Retain one design system across
all screens.

The approved direction combines three purpose-specific compositions rather than
one visual template: a committed blue home/discovery surface, a restrained
teacher workspace, and a high-contrast projection-first live quiz canvas.

## Reasoning

This preserves the existing brand and accessibility decisions while giving the
project a visual source of truth before more code is changed. Separating the
design flows by purpose prevents the home page, teacher dashboard, and projected
quiz from inheriting the same unsuitable density or material treatment.

## Acceptance Criteria

- A private Stitch project exists with the “SmartTeach — Bảng đen sáng” design
  system applied.
- The flow includes desktop and mobile screens for home/discovery, tools/games,
  authentication, classes, quiz library/create/edit/import, host/live results,
  student join/play, and quiz history.
- Each key flow depicts default, empty/first-use, loading, error, and relevant
  live-session states.
- Visual review confirms hierarchy, Vietnamese copy, contrast, responsive
  structure, and interactive-state conventions before code implementation.
- Generated screens are reviewed before their layout or assets inform source
  changes.

## Open Questions / Risks

- On 2026-11-04, Stitch screen generation timed out after 300 seconds and no
  background screen appeared after ten 30-second polls. The project and its
  design system were created successfully, but flow generation must resume only
  after the Stitch generation service is available.
