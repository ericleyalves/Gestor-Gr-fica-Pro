---
name: Gestor Gráfico Pro System
colors:
  surface: '#fdf7ff'
  surface-dim: '#ded7e7'
  surface-bright: '#fdf7ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f1ff'
  surface-container: '#f2ebfb'
  surface-container-high: '#ece5f5'
  surface-container-highest: '#e7e0f0'
  on-surface: '#1d1a25'
  on-surface-variant: '#494457'
  inverse-surface: '#322f3b'
  inverse-on-surface: '#f5eefe'
  outline: '#7a7488'
  outline-variant: '#cbc3da'
  surface-tint: '#6a22fc'
  primary: '#5400d6'
  on-primary: '#ffffff'
  primary-container: '#6d28ff'
  on-primary-container: '#e3d7ff'
  inverse-primary: '#cebdff'
  secondary: '#712ae2'
  on-secondary: '#ffffff'
  secondary-container: '#8a4cfc'
  on-secondary-container: '#fffbff'
  tertiary: '#4b475a'
  on-tertiary: '#ffffff'
  tertiary-container: '#635e72'
  on-tertiary-container: '#e1d9f1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e8ddff'
  primary-fixed-dim: '#cebdff'
  on-primary-fixed: '#20005e'
  on-primary-fixed-variant: '#5000cf'
  secondary-fixed: '#eaddff'
  secondary-fixed-dim: '#d2bbff'
  on-secondary-fixed: '#25005a'
  on-secondary-fixed-variant: '#5a00c6'
  tertiary-fixed: '#e7dff7'
  tertiary-fixed-dim: '#cac3da'
  on-tertiary-fixed: '#1d192a'
  on-tertiary-fixed-variant: '#494457'
  background: '#fdf7ff'
  on-background: '#1d1a25'
  surface-variant: '#e7e0f0'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
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
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 24px
  gutter: 16px
---

## Brand & Style

The design system is engineered for a high-performance printing management environment. It balances technical precision with a premium, vibrant aesthetic that reflects the creative nature of the printing industry. 

The visual style is **Corporate/Modern** with subtle influences of **Glassmorphism** for navigational depth. The interface prioritizes high contrast and extreme legibility to ensure that complex data—such as print queues, inventory levels, and financial margins—remains easy to process at a glance. The emotional response is one of organized efficiency, professional reliability, and modern technological capability.

## Colors

The palette is rooted in a "Digital Violet" theme, signaling innovation and high-quality output.

- **Primary & Secondary:** These purples are used for high-action items, primary buttons, and progress indicators. They provide the "SaaS Premium" feel.
- **Tertiary (Light Lilac):** Used primarily for subtle backgrounds, hover states on soft elements, and "ghost" containers to separate information without adding visual weight.
- **Neutrals:** We use a deep charcoal (#1A1A1B) for maximum contrast on titles and a slate grey (#64748B) for body text to reduce eye strain during prolonged use.
- **Backgrounds:** The off-white background (#F8F6FC) has a slight purple tint to prevent the interface from feeling "stark" or "clinical," maintaining a cohesive brand temperature.

## Typography

This design system utilizes **Inter** exclusively to leverage its exceptional readability and systematic feel. 

- **Hierarchy:** Large display sizes use tighter letter spacing and heavy weights for a confident, editorial look. 
- **Body Text:** Regular weights are used for standard information, while the slate-grey color ensures a sophisticated, "elegant" reading experience.
- **Labels:** Use uppercase for metadata and category labels to provide clear visual anchors within dense data tables or property panels.
- **Mobile scaling:** Headlines scale down on mobile to prevent awkward line breaks while maintaining the same weight to preserve brand hierarchy.

## Layout & Spacing

The design system employs a **fluid 12-column grid** for main dashboard views and a **fixed sidebar** model for navigation.

- **Rhythm:** An 8px linear scale governs all padding and margins. 
- **Desktop:** The sidebar is fixed at 280px. Content occupies the remaining fluid space with a maximum inner container width of 1440px to prevent excessive line lengths.
- **Mobile:** The layout collapses to a single column. The sidebar transforms into a bottom navigation bar or a hamburger overlay. Margins reduce to 16px to maximize screen real estate for task management.
- **Density:** High-density views (like order lists) use 8px (sm) vertical padding, while marketing or settings pages use 24px (lg) for a more "premium" feel.

## Elevation & Depth

To achieve a "Premium SaaS" look, this design system uses **Ambient Shadows** tinted with the primary purple hue. This creates a more natural, cohesive feel than generic grey shadows.

- **Level 0 (Flat):** Used for background and non-interactive sections.
- **Level 1 (Card):** Used for main content cards. Shadow: `0px 4px 20px rgba(109, 40, 255, 0.04)`.
- **Level 2 (Raised):** Used for hovered interactive cards or buttons. Shadow: `0px 10px 30px rgba(109, 40, 255, 0.08)`.
- **Level 3 (Overlay):** Used for modals and dropdowns. Shadow: `0px 20px 50px rgba(10, 10, 15, 0.15)`.

Glassmorphism is applied selectively to the sidebar and top navigation bars, using a `20px` backdrop blur and a `1px` white border at 10% opacity to create a "layered" feel over the background content.

## Shapes

The shape language is defined by a **"2XL" roundedness philosophy**. 

- **Cards & Modals:** Use `1rem` (16px) or `1.5rem` (24px) for outer containers to create a soft, friendly silhouette that contrasts with the professional, sharp typography.
- **Buttons & Inputs:** Use `0.5rem` (8px) for standard elements, providing a modern but functional shape.
- **Small Elements:** Tooltips and tags use `0.25rem` (4px).

This generous rounding humanizes the "industrial" nature of print management software.

## Components

- **Buttons:** Primary buttons use a linear gradient from Primary Purple (#6D28FF) to Violet (#7C3AED). Secondary buttons use the Light Lilac (#EFE7FF) background with Primary Purple text.
- **Inputs:** Fields are white with a 1px border (#E2E8F0). On focus, the border changes to Primary Purple and a subtle 4px Lilac outer glow is applied.
- **Chips:** Used for status indicators (e.g., "In Production", "Shipped"). These should be semi-transparent versions of semantic colors (Success Green, Warning Amber, Primary Purple) with bold text.
- **Cards:** White surface (#FFFFFF) with Level 1 shadows and 24px internal padding.
- **Icons:** Must be **thin-stroke (1.5px)** professional icons. They should use the Neutral Text color (#64748B) unless they are active, in which case they take the Primary Purple.
- **Lists:** Table rows should have a subtle hover state using the Background color (#F8F6FC) and a thin divider line (#F1F5F9).
- **Progress Bars:** Thin, using the Primary Purple gradient for the filler and Light Lilac for the track.