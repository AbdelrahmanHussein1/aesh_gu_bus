---
name: Galala University Bus Booking System
colors:
  surface: '#fbf8ff'
  surface-dim: '#dbd9e3'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2fc'
  surface-container: '#FFFFFF'
  surface-container-high: '#e9e7f1'
  surface-container-highest: '#e3e1eb'
  on-surface: '#1b1b22'
  on-surface-variant: '#454653'
  inverse-surface: '#303037'
  inverse-on-surface: '#f2effa'
  outline: '#767685'
  outline-variant: '#c6c5d5'
  surface-tint: '#4452c3'
  primary: '#000f74'
  on-primary: '#ffffff'
  primary-container: '#14259b'
  on-primary-container: '#8b98ff'
  inverse-primary: '#bcc2ff'
  secondary: '#775a00'
  on-secondary: '#ffffff'
  secondary-container: '#fdc735'
  on-secondary-container: '#6f5400'
  tertiary: '#470b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#6d1600'
  on-tertiary-container: '#f87c5c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dfe0ff'
  primary-fixed-dim: '#bcc2ff'
  on-primary-fixed: '#000b62'
  on-primary-fixed-variant: '#2938aa'
  secondary-fixed: '#ffdf99'
  secondary-fixed-dim: '#f4bf2c'
  on-secondary-fixed: '#251a00'
  on-secondary-fixed-variant: '#5a4300'
  tertiary-fixed: '#ffdbd2'
  tertiary-fixed-dim: '#ffb4a1'
  on-tertiary-fixed: '#3c0800'
  on-tertiary-fixed-variant: '#83260c'
  background: '#fbf8ff'
  on-background: '#1b1b22'
  surface-variant: '#e3e1eb'
  canvas-bg: '#F8FAFC'
  navigation-dark: '#0A0F1D'
  text-primary: '#0F172A'
  text-secondary: '#64748B'
  border-whisper: '#E2E8F0'
  success-galala: '#A1D55D'
  destructive-asu: '#8B0942'
  destructive-alt: '#E11D48'
typography:
  display-lg:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
  label-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 16px
  max-width: 1440px
---

# Design System: Galala University Bus Booking System (Powered by ASU)

This design system serves as the single source of truth for generating screens via **Google Stitch** and manual frontend implementation. It enforces a high-end, premium educational-utility aesthetic that is clean, structurally sound, and free of generic AI-generated clichés.

---

## 1. Visual Theme & Atmosphere
A restrained, structured, and modern academic-utility interface with confident layouts, generous white space, and sharp grid structures. The mood is highly professional, trustworthy, and clean (density 5, variance 7, motion 6). It feels like a premium administrative dashboard combined with a high-end travel booking application.

---

## 2. Color Palette & Roles

The color system is derived directly from the official co-branded university colors:
- **Primary Canvas Background:** `Slate Light` (`#F8FAFC`) — Primary background surface.
- **Surface Container Fill:** `Pure Alabaster` (`#FFFFFF`) — Cards, table headers, forms, and dialog container surfaces.
- **Dark Navigation Sidebar/Header Canvas:** `Deep Obsidian` (`#0A0F1D`) — Used for a high-contrast dark header or sidebar area.
- **Primary Text Ink:** `Charcoal Slate` (`#0F172A`) — Slate-900 depth for maximum contrast and readability.
- **Secondary Metadata Text:** `Muted Steel` (`#64748B`) — Slate-500 depth for descriptions, timestamps, table labels, and helper text.
- **Structural Dividers & Borders:** `Whisper Border` (`#E2E8F0`) — Slate-200 depth for 1px layout boundaries, dividers, and card outlines.
- **Primary Brand Accent (Galala Royal Blue):** `#14259B` — Used for active navigation links, primary action buttons, active tab lines, and critical interface focus rings.
- **Secondary Brand Highlight (ASU Gold):** `#FFC937` — Used selectively for success badges, booking confirmation highlights, and custom tags.
- **Success Identifier (Galala Green):** `#A1D55D` — Used for confirmed booking badges and successful payment alerts.
- **Secondary Accent (ASU Maroon):** `#8B0942` — Used for destructive actions, system alerts, and check-in errors.

---

## 3. Typography Rules

- **Display/Headlines:** `Outfit` — Track-tight (`letter-spacing: -0.02em`), bold weight, clean geometric sans-serif.
- **Body Text:** `Outfit` — Line height `1.6`.
- **Mono/Metadata:** `JetBrains Mono` — Set to `font-feature-settings: "tnum" 1` (tabular numerals) for seat numbers, trip times, pricing values (`160.00 EGP`), and dates.

---

## 4. Component Stylings

### 4.1. Buttons
- **Primary Button:** Solid `#14259B` background, white text, flat, sharp or slightly rounded corners (`6px`). 
- **Secondary Button:** White background, thin `1px` border in `#E2E8F0`, dark slate text.
- **Destructive Button:** Clean crimson red (`#E11D48`) or ASU Maroon (`#8B0942`).

### 4.2. Cards
- **Structure:** Softly rounded corners (`12px`). Subtle border (`1px solid #E2E8F0`) and very subtle shadow.

---

## 5. Layout & Spacing Principles
- **Hero/Dashboard Structure:** Left-aligned asymmetric layout.
- **Grid Systems:** Pure CSS Grid for cards and lists.
- **Responsiveness:** Multi-column layouts collapse to single column below 768px. Tap targets ≥ 44px.
