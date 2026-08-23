z---
name: Academic Infrastructure Framework
colors:
  surface: '#f7fbf0'
  surface-dim: '#d7dbd2'
  surface-bright: '#f7fbf0'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f5eb'
  surface-container: '#ebefe5'
  surface-container-high: '#e5eadf'
  surface-container-highest: '#e0e4da'
  on-surface: '#181d17'
  on-surface-variant: '#40493d'
  inverse-surface: '#2d322b'
  inverse-on-surface: '#eef2e8'
  outline: '#707a6c'
  outline-variant: '#bfcaba'
  surface-tint: '#1b6d24'
  primary: '#0d631b'
  on-primary: '#ffffff'
  primary-container: '#2e7d32'
  on-primary-container: '#cbffc2'
  inverse-primary: '#88d982'
  secondary: '#006398'
  on-secondary: '#ffffff'
  secondary-container: '#5bb8fe'
  on-secondary-container: '#00476e'
  tertiary: '#923357'
  on-tertiary: '#ffffff'
  tertiary-container: '#b14b6f'
  on-tertiary-container: '#ffedf0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a3f69c'
  primary-fixed-dim: '#88d982'
  on-primary-fixed: '#002204'
  on-primary-fixed-variant: '#005312'
  secondary-fixed: '#cce5ff'
  secondary-fixed-dim: '#93ccff'
  on-secondary-fixed: '#001d31'
  on-secondary-fixed-variant: '#004b73'
  tertiary-fixed: '#ffd9e2'
  tertiary-fixed-dim: '#ffb1c7'
  on-tertiary-fixed: '#3f001c'
  on-tertiary-fixed-variant: '#7f2448'
  background: '#f7fbf0'
  on-background: '#181d17'
  surface-variant: '#e0e4da'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 24px
  gutter: 16px
  sidebar-width: 260px
  sidebar-collapsed: 72px
  section-gap: 32px
---

## Brand & Style
The design system is engineered for the University of Zambia's maintenance ecosystem, balancing institutional authority with modern accessibility. The brand personality is **reliable, efficient, and transparent**, aiming to reduce the friction between students reporting issues and the administration resolving them.

The visual style is a hybrid of **Material Design 3's** structural logic and **Microsoft Fluent’s** soft surfacing. It emphasizes clarity through a minimal, high-utility interface that utilizes significant whitespace to prevent cognitive overload. The emotional response should be one of "systematic confidence"—users should feel that their requests are being handled by a modern, organized institution.

## Colors
The palette is rooted in **University Green (#2E7D32)**, serving as the primary anchor for actions and branding. The interface relies on a clean **Light Gray (#F8FAFC)** background to allow white surface cards to pop with subtle depth.

A semantic status palette is critical for the tracking nature of the application:
- **Primary Green:** Global actions, primary buttons, and university branding.
- **Surface & Background:** Distinguishes the application "shell" from the interactive "content."
- **Status Tints:** Used for badges and timeline nodes to provide immediate visual feedback on request lifecycles.

## Typography
The design system employs a dual-font strategy. **Plus Jakarta Sans** is used for headings to provide a modern, welcoming, and slightly professional flair. **Inter** is utilized for all body copy, data tables, and labels due to its exceptional legibility at small sizes and neutral, systematic character.

- **Headlines:** Use Plus Jakarta Sans with tighter letter-spacing for a refined, editorial look in dashboards.
- **Numerical Data:** Inter’s tabular figures should be used in maintenance IDs and date columns to ensure alignment.
- **Labels:** Use Inter Medium or Semi-Bold for status badges and form field titles to ensure they stand out against surface backgrounds.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a sidebar-driven navigation structure. 

### Breakpoints & Reflow
- **Desktop (1280px+):** 12-column grid. Left sidebar is expanded (260px). Main content area uses 24px margins.
- **Tablet (768px - 1279px):** 8-column grid. Sidebar collapses to an icon-only rail (72px) to maximize data table visibility. 
- **Mobile (<767px):** 4-column grid. Sidebar becomes a hidden drawer. Top navigation persists with a simplified search icon. Spacing scales down to 16px margins.

The spacing rhythm is built on an **8px base unit**. Component internal padding should favor 16px (2 units) for density and 24px (3 units) for "hero" cards or empty states.

## Elevation & Depth
This design system uses **Tonal Layering** combined with **Ambient Shadows** to create a sense of organized hierarchy.

- **Level 0 (Background):** #F8FAFC. The lowest layer.
- **Level 1 (Cards/Sidebar):** #FFFFFF. Raised with a very soft, diffused shadow: `0px 4px 12px rgba(0, 0, 0, 0.03)`. Uses a 1px border in `#E2E8F0` for crispness.
- **Level 2 (Dropdowns/Modals):** #FFFFFF. Higher elevation with a more pronounced shadow: `0px 12px 24px rgba(0, 0, 0, 0.08)`.
- **Interactions:** Hover states on interactive cards should subtly increase the shadow spread and move the element -2px on the Y-axis to provide tactile feedback.

## Shapes
A consistent **16px (rounded-lg)** radius is applied to all primary containers, including cards, modals, and input fields. This high degree of roundedness softens the professional atmosphere, making the "Maintenance" aspect feel approachable and modern rather than industrial and rigid.

- **Buttons:** 12px radius for a slightly more compact, action-oriented look.
- **Badges/Chips:** Fully pill-shaped (999px) to distinguish them from interactive buttons.
- **Input Fields:** 12px radius to match buttons, ensuring a cohesive form-factor.

## Components

### Navigation & Sidebar
- **Sidebar:** Uses a semi-transparent blur or solid white background. Active states should use a vertical green bar (4px) on the left edge and a light green tint (#E8F5E9) for the background.
- **Icons:** Use 24px thin-stroke (2pt) icons. Ensure consistent stroke weight across the entire set.

### Cards & Data Tables
- **Status Badges:** Use low-saturation background tints of the status colors with high-saturation text (e.g., "In Progress" uses #FEF3C7 background with #B45309 text).
- **Data Tables:** Row height set to 64px. Use horizontal dividers only (#F1F5F9); no vertical borders. The first column (Request ID) should be Semi-Bold.

### Input Fields & Buttons
- **Primary Button:** Solid University Green (#2E7D32) with white text. High-contrast, 12px rounded.
- **Inputs:** 1px border (#CBD5E1). On focus, the border transitions to Primary Green with a 3px soft outer glow.

### Specialized Components
- **Timeline:** A vertical line (2px wide, #E2E8F0) with circular nodes. Completed steps turn Green; current steps pulse.
- **Analytics Charts:** Use the status color palette for chart segments to maintain semantic consistency (e.g., the "Completed" slice in a pie chart must be #10B981).
- **Notification Bell:** Features a red dot at the top-right corner; clicking opens a Level 2 elevation popover.