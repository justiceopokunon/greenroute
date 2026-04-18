# GreenRoute: AI Agent Instructions

**Project**: A premium rideshare web application built with vanilla HTML/CSS/JavaScript.  
**Philosophy**: Clean, maintainable, industry-standard code that respects the design system and user experience.

---

## 1. Project Overview & Architecture

### Stack
- **Frontend**: Vanilla HTML5, CSS3 (no frameworks)
- **Styling**: CSS Variables for theming (dark/light mode support)
- **JavaScript**: IIFE pattern for encapsulation and namespace management
- **Tooling**: Python HTTP server (development), Python smoke tests
- **Typography**: Manrope (body), Space Grotesk (headings)
- **Build**: No build step required—direct browser execution

### Key Files
- `app.js` - Shared application logic (theme management, storage, state)
- `app.css` - Shared design tokens and component styles
- `index.html` - Landing page
- `code.html`, `signin.html`, `signup.html` - Passenger flows
- `driver.html`, `driver-signin.html`, `driver-signup.html` - Driver flows
- `stich/DESIGN.md` - **CRITICAL**: The design system manifesto

### Why No Framework?
This project deliberately avoids frontend frameworks to maintain simplicity, performance, and direct control over the design system. Any component work must respect this constraint.

---

## 2. The Urban Flow Design System (CRITICAL)

**Before writing ANY HTML, CSS, or component code, read [stich/DESIGN.md](stich/DESIGN.md).**

### Core Principles (Non-Negotiable)
1. **No Harsh Borders**: Never use `border: 1px solid`. Define boundaries using background color shifts (`surface` vs `surface-container-low`).
2. **Glass-Morphism Over Shadows**: Cards use `backdrop-filter: blur()` with layered opacity, not drop shadows.
3. **Asymmetrical Typography**: Use `display-lg` (3.5rem) for hero statements, `label-md` (0.875rem, 500 weight, uppercase) for UI labels.
4. **Tonal Layering**: Stack surfaces with increasing depth: `surface` → `surface-container-low` → `surface-container-high` → `white` (80% opacity).
5. **Primary Green as Light**: The green palette (#5ce07a, #20b954) is not just color—it's a source of visual energy.

### Design Tokens (CSS Variables)
```css
/* Colors */
--bg: #0d0d0d (dark mode base)
--primary: #5ce07a (main action color)
--primary-deep: #20b954
--primary-soft: rgba(92, 224, 122, 0.18)
--accent: #1a7c45
--alert: #FF6B6B
--muted: #8c938b

/* Spacing Scale */
--space-xs: 0.25rem
--space-sm: 0.5rem
--space-md: 1rem
--space-lg: 1.5rem
--space-xl: 2rem

/* Corner Radius */
--radius-xl: 30px (hero elements)
--radius-lg: 24px
--radius-md: 18px
--radius-sm: 14px

/* Typography */
--font-body: 'Manrope'
--font-heading: 'Space Grotesk'

/* Effects */
--blur: 22px (backdrop filter standard)
--shadow: 0 30px 70px rgba(0, 0, 0, 0.45)
```

### What NOT to Do
- ❌ Use `border: 1px solid` for any separation
- ❌ Use pure white (`#FFFFFF`) backgrounds
- ❌ Apply sharp corners (`border-radius: 0` or `border-radius: 4px`)
- ❌ Use flat, single-color buttons without texture
- ❌ Add horizontal divider lines
- ❌ Hardcode colors instead of using CSS variables
- ❌ Forget to apply transitions for micro-interactions

---

## 3. HTML Standards & Accessibility

### Requirements
1. **Semantic HTML**: Always use `<main>`, `<nav>`, `<header>`, `<section>`, `<aside>` appropriately.
2. **ARIA Labels**: Every interactive element must have descriptive ARIA attributes:
   ```html
   <button id="theme-toggle" type="button" aria-label="Toggle theme">Theme</button>
   <nav aria-label="Primary navigation">...</nav>
   <a href="#" aria-label="Green Route home">Brand</a>
   ```
3. **Data Attributes for State**: Use `data-*` attributes instead of inline styles:
   ```html
   <!-- Good -->
   <html data-theme="dark">
   
   <!-- Avoid -->
   <html style="background: #0d0d0d;">
   ```
4. **Link & Button Intent**: Distinguish between navigation (`<a>`) and actions (`<button>`).
5. **Mobile Meta Tags**: Every page must include:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0" />
   ```

---

## 4. CSS Architecture & Patterns

### Token Usage (MANDATORY)
Every color, spacing, and effect must come from CSS variables. No magic numbers or hardcoded hex values.

```css
/* Good: Respects design tokens */
.card {
  background: var(--panel);
  padding: var(--space-lg);
  border-radius: var(--radius-md);
  backdrop-filter: blur(var(--blur));
}

/* Bad: Hardcoded values */
.card {
  background: #1d1d1d;
  padding: 24px;
  border-radius: 16px;
  border: 1px solid #333;  /* ❌ Violates design system */
}
```

### Component Patterns

**Buttons**:
```css
.cta {
  background: linear-gradient(135deg, var(--primary), #dcfce7);
  padding: var(--space-md) var(--btn-pad-x);
  border-radius: var(--radius-md);
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
}

.cta:hover {
  transform: scale(1.02);
  backdrop-filter: blur(var(--blur));
}

.cta.secondary {
  background: var(--panel-2);
  color: var(--text);
}
```

**Status Badges**:
```css
.badge--pending {
  background: rgba(255, 193, 7, 0.1);
  color: #ffc107;
}

.badge--confirmed {
  background: var(--primary-soft);
  color: var(--primary);
}
```

**Cards**:
```css
.card {
  background: var(--panel);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(var(--blur));
  /* NO border, NO drop-shadow */
  transition: all 0.3s ease;
}

.card:hover {
  background: var(--panel-2);
}
```

### Utility Classes (Established Pattern)
The project uses utility classes for common patterns:
- `.stack-block` - Vertical stacking with consistent spacing
- `.section-head` - Title/subtitle pairing
- `.pad-md` - Padding using design tokens
- `.ghost` - Borderless button style
- `.focus-page`, `.focus-shell` - Layout containers

**When building new components, follow this pattern** rather than creating one-off styles.

---

## 5. JavaScript Guidelines

### IIFE Pattern (Standard in this project)
All JavaScript is wrapped in an IIFE to avoid global namespace pollution:

```javascript
(() => {
  'use strict';
  
  const storageKey = 'greenroute-theme';
  
  const themeToggle = () => {
    // Logic here
  };
  
  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    themeToggle();
  });
})();
```

### Storage Management
Always use error handling for `localStorage`:

```javascript
const storageGet = (key, fallback = null) => {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;  // Graceful degradation if storage unavailable
  }
};

const storageSet = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};
```

### Naming Conventions
- Storage keys: `greenroute-{feature}` (kebab-case)
- Query selectors: `getElementById()` with explicit `id` attributes
- Event handlers: `handleClick()`, `onSubmit()` (camelCase)
- Constants: `SCREAMING_SNAKE_CASE` for global configuration

### State Management
State should be persisted via `localStorage` with a prefix and fallback:

```javascript
const roleStorageKey = 'greenroute-user-role';
const userRole = storageGet(roleStorageKey, 'passenger');
```

### DOM Manipulation
- Use `.textContent` for text, `.innerHTML` only when necessary (XSS risk)
- Use `addEventListener()` for event binding, not inline `onclick`
- Debounce resize/scroll handlers for performance
- Use `data-*` attributes for state instead of inline styles

---

## 6. Common Pitfalls to Avoid

### ❌ AI-Generated Code Antipatterns
1. **Inline Styles Over CSS Variables**: Never write `style="color: #5ce07a"` when `color: var(--primary)` exists.
2. **Component Bloat**: Don't create a 500-line component when the design system provides reusable utilities.
3. **Hardcoded Values**: No magic numbers. Every dimension, color, and timing must come from a design token.
4. **Forgetting Accessibility**: Always include `aria-label`, `role`, and semantic HTML.
5. **Over-Engineering State**: Don't add Redux for what `localStorage` + event listeners can handle.
6. **Ignoring the Design System**: Don't create custom colors, corners, or layouts just because they're "easy."
7. **Forgotten Transitions**: Every interactive element should have smooth motion (`transition: all 0.3s ease`).
8. **Missing Theme Support**: Ensure dark/light mode works via `data-theme="dark"` and `html[data-theme="light"]` selectors.
9. **Broken Mobile UX**: Test with the viewport; respect the mobile nav overlay and button sizing.
10. **Copy-Paste Code**: Don't duplicate utility classes. Extract and reuse.

---

## 7. Testing & Quality Assurance

### Run Tests
```bash
npm test  # Runs smoke_test.py
```

### Development Server
```bash
npm run dev  # Runs Python HTTP server on port 3000
```

### Manual Testing Checklist
- [ ] Theme toggle works (dark ↔ light)
- [ ] All pages load without console errors
- [ ] Responsive on mobile (hamburger menu, overlays)
- [ ] Keyboard navigation works (Tab, Enter, Esc)
- [ ] No hardcoded colors or values visible in DevTools
- [ ] Hover/focus states are smooth and visible
- [ ] Form validation and error messages appear

---

## 8. When to Break the Rules

Sometimes pragmatism beats perfection. Only deviate from these guidelines if:
1. **Performance**: CSS variables have unmeasurable overhead; only optimize if profiling shows it matters.
2. **Accessibility**: If ARIA violates the design, prioritize accessibility (WCAG 2.1 AA is the floor).
3. **Browser Compatibility**: If CSS Grid or `backdrop-filter` don't work, provide a fallback.
4. **Documented Exception**: Always comment why you're breaking a pattern.

**Example**:
```css
/* Exception: Using inline style for dynamically calculated height
   (CSS custom properties + calc insufficient for this use case) */
.card {
  height: /* dynamic value */;
}
```

---

## 9. Resources

- **Design System**: [stich/DESIGN.md](stich/DESIGN.md)
- **Testing**: [smoke_test.py](smoke_test.py)
- **Typography**: [Google Fonts](https://fonts.googleapis.com/) (Manrope, Space Grotesk)
- **CSS Reference**: [MDN Web Docs](https://developer.mozilla.org/)
- **Accessibility**: [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)

---

## 10. Summary: Write Code Like a Professional

- ✅ Follow the design system religiously.
- ✅ Use CSS variables for every style decision.
- ✅ Write semantic, accessible HTML.
- ✅ Encapsulate JavaScript in IIFE.
- ✅ Test on mobile and theme modes.
- ✅ Favor clarity and reuse over brevity.
- ✅ Comment your exceptions.

**The goal**: Code that feels intentional, polished, and built by someone who knows the craft—not generated overnight.
