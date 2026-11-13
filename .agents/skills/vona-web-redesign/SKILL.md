---
name: vona-web-redesign
description: >
  Content-preserving redesign and single-file HTML prototype workflow for the
  BOWONE multimedia portfolio or other existing sites. Use when changing visual
  hierarchy, layouts, galleries, brand styling, motion, mobile UX, or landing
  composition while retaining real portfolio work, links, pricing, forms,
  project categories, and editor/data integrations.
---

# VONA Web Redesign — Project Skill
Version: 1.0.0 | 2026-11-14

## Purpose
Deliver professional, distinctive, functional web design without overwriting
real business information, portfolio assets or existing application behavior.
Apply this project's source-of-truth before general style advice.

## Mandatory preservation
- Read the current actual files and data before editing. The BOWONE public viewer
  uses index.html and portfolio.json; portfolio.json contains profile, portfolio
  category arrays and image/video paths. Keep its schema and external editor sync.
- Preserve the brand, original artwork, every actual portfolio category/item,
  descriptions, URLs, credits, email/commission CTA, detailed price tables and
  quote calculators, existing policies, and link targets unless asked otherwise.
- Never invent clients, testimonials, statistics, phone numbers, case studies,
  image observations or file content. Never treat filename alone as an image review.
- Existing routes, hover/keyboard/touch interactions, and production deployment
  must continue to work after a redesign.
- When asked for a prototype, write a separate HTML file; do not replace the live
  index.html or deploy changes without the user requesting that action.

## Design method
1. Inventory real source files, UI states, content, image/video assets, pricing,
   navigation, forms, interactions and dependencies.
2. Choose a coherent brand-led art direction, design tokens, responsive type
   scale, image treatment and grid *before* writing markup.
3. Build a visitor journey: signature hero, selected real work, browsable portfolio,
   services, about/experience, price and terms, contact.
4. Prefer artwork and editorial typographic hierarchy over generic cards,
   gimmicky neon/glass gradients, gratuitous bouncing and fake trust elements.
5. Reorganize sections freely, but keep all existing source content accessible
   or clearly link to the unchanged original feature during the prototype stage.
6. For BOWONE start with restrained dark neutral (#0e0e0e), warm beige (#c8b99a),
   readable foreground (#e8e4de), large display type, and actual work-led visuals.
   Current real code overrides historical defaults.

## Single-file HTML mode
- If the user explicitly requests HTML, write a runnable standalone index.html
  with semantic markup, internal CSS and vanilla JS; no required UI framework.
- Existing image/video assets should use real URLs or exact local relative paths.
  If remote data is fetched, include a useful fallback and disclose the online
  dependency. Never claim local 1.png..9.png were inspected unless they exist.
- Mobile first: ensure 320, 390, 768, 1024 and 1440px layouts are usable;
  no horizontal scroll or obscured functionality.
- Accessible navigation, active states, focus-visible, ARIA only where useful,
  labeled forms, motion reduction, alt text, touch targets and error states.
- Purposeful motion via opacity/transform, IntersectionObserver, no scroll
  hijacking. A couple of memorable effects beat continuous animation.
- No fake functional form-success message: mailto must clearly open mail app;
  actual submission requires verified backend.

## Quality gates
1. Check syntax and internal links, then test render in a real browser when
   available. Code inspection is not browser testing.
2. Verify every modified button, menu, gallery filter, modal, scroll target,
   contact action and price option. No dead decorative controls.
3. Check dark/light contrast, small screens, navigation accessibility,
   reduced-motion behavior, video posters and image fallbacks.
4. Reconcile old and new content/data and run regression checks for editor
   compatibility before claiming any production integration.
5. Deliver actual file paths, specific implemented interactions, passed tests
   and unresolved limitations, not a mockup labeled as production-complete.

## Focus for portfolio work
Present the person's real work before service sales copy. Emphasize the art,
not an invented company. Favor clear category navigation, fast image previews,
accurate commission details, direct email and the current Discord commission link.
Do not destroy the broader portfolio to fit a generic landing-page template.
