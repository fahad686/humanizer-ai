---
name: Humanizer AI System
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#ddb7ff'
  on-secondary: '#490080'
  secondary-container: '#6f00be'
  on-secondary-container: '#d6a9ff'
  tertiary: '#89ceff'
  on-tertiary: '#00344d'
  tertiary-container: '#009ada'
  on-tertiary-container: '#002d43'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#c9e6ff'
  tertiary-fixed-dim: '#89ceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h1:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 0.5rem
  sm: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  gutter: 24px
  container-max: 1280px
---

## Brand & Style
The design system is anchored in the concept of "Digital Alchemy"—the transition from raw machine output to polished human expression. It balances high-tech precision with an approachable, organic feel. 

The aesthetic is **Minimalist Glassmorphism**. It utilizes expansive whitespace and clean layouts to maintain professionalism, while introducing futuristic elements through translucent layers and luminous accents. This system is designed to evoke a sense of calm authority, ensuring users feel they are using a cutting-edge tool that respects the nuance of human language.

## Colors
The palette centers on a "Deep Space" foundation. In dark mode, the primary background is a rich Obsidian (#020617), providing a canvas where Indigo and Violet accents can truly glow. 

**Accents & Glows:** 
- **Indigo (#6366F1):** Used for primary actions and "Machine" states.
- **Violet (#A855F7):** Represents the "Humanized" transformation and premium features.
- **Glow Effects:** Use 15-25% opacity blurs of the primary color behind key cards to create a sense of depth and energy.

**Neutral Logic:**
Light mode uses a "Cool Frost" palette (Slate 50 to 400), ensuring the UI feels crisp and surgical. Dark mode uses "Obsidian/Slate" tiers to maintain hierarchy without harsh pure-blacks.

## Typography
This design system utilizes **Inter** exclusively to leverage its systematic, utilitarian nature. The type scale is optimized for readability during long-form text editing and comparison.

**Styling Rules:**
- **Headlines:** Utilize tighter letter-spacing and heavier weights to anchor the page.
- **Body:** Generous line-height (1.6) is mandatory to prevent eye fatigue during text analysis.
- **Labels:** Use uppercase and slight tracking for categorization labels to differentiate them from body copy.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. Main application containers are capped at 1280px for optimal readability, while background elements and secondary sidebars can extend to fill the viewport.

A 12-column grid is used for dashboard layouts. Spacing is governed by a 4px baseline, but large-scale components (like the text editor) should favor "L" and "XL" spacing tiers to maintain the minimal, breathable aesthetic.

## Elevation & Depth
Depth is communicated through **Translucent Stacking** rather than traditional heavy shadows.

1.  **Surface Tiers:** In dark mode, the base is #020617. Cards are #0F172A with a subtle 1px border (#1E293B).
2.  **Multi-layered Shadows:** For floating elements (modals/popovers), use three shadow layers:
    *   Outer: 0px 20px 40px rgba(0,0,0, 0.4)
    *   Inner: 0px 4px 10px rgba(0,0,0, 0.2)
    *   Accent: A 1px top-border gradient to simulate a light source from above.
3.  **Backdrop Blurs:** High-elevation elements must use a `backdrop-filter: blur(12px)` to maintain the glassmorphic theme.

## Shapes
The design system uses a "Hyper-Rounded" language to contrast with the technical nature of AI.

- **Standard Components:** 12px (0.75rem) radius for buttons and inputs.
- **Containers/Cards:** 24px (1.5rem) radius for main content areas and comparison panels.
- **Active Indicators:** Pill-shaped (999px) for status chips and toggle switches.

## Components

### Premium Upload States
Upload zones should transition from a dashed border to a soft Indigo/Violet mesh gradient on drag-over. Use a "pulse" animation on the icon to indicate processing, utilizing a subtle outer glow that expands and contracts.

### Text Comparison UI
- **Original Text:** Set in a semi-transparent Slate container.
- **Humanized Text:** Set in a high-contrast Obsidian (dark) or White (light) container with a 1px Violet glow border.
- **Diff Highlights:** Use soft violet underlines or background tints for changed words, rather than aggressive "Track Changes" styles.

### AI Detection Indicators
Represent AI probability with a **Concentric Ring Gauge**.
- **High AI Risk:** Glowing Red-to-Orange gradient.
- **Humanized:** Deep Indigo-to-Violet gradient with a "sparkle" icon.
- **Scorecards:** Use a "Frosted Glass" card with a large display font for the percentage.

### Buttons & Inputs
Buttons feature a subtle linear gradient (top-to-bottom) of the primary color. On hover, the "glow" shadow (15px blur) of the button's own color should intensify. Inputs should use a 1px border that illuminates into a Violet gradient when focused.