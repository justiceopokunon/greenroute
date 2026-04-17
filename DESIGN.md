# Design System Document: Urban Flow

## 1. Creative North Star: The Kinetic Curator
This design system rejects the static, boxy nature of traditional logistics platforms. Instead, it adopts the philosophy of **"The Kinetic Curator."** We aim to capture the rhythmic, vibrant energy of Ghanaian transport—the "tro-tro" culture's movement—and refine it through a lens of high-end, editorial precision. 

The interface must feel like it is in a state of "Flow." We achieve this through:
*   **Intentional Asymmetry:** Breaking the grid with oversized typography and overlapping image containers.
*   **Tonal Depth:** Replacing harsh lines with a hierarchy of light surfaces and glass layers.
*   **Luminous Accents:** Using our primary greens not just as colors, but as sources of "light" within a light, premium environment.

---

## 2. Color Architecture & Surface Philosophy

Our palette is rooted in the luminous ambiance of the urban day, punctuated by the high-visibility greens of the "Green-Route" mission.

### The "No-Line" Rule
**Standard 1px borders are strictly prohibited for sectioning.** 
To define boundaries, use background shifts. A `surface-container-low` section should sit on a `surface` background. If you feel the need for a line, you have failed to use the elevation scale correctly.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of glass and polished stone. 
*   **Base Layer:** `surface` (#ededed) for the main application background.
*   **Secondary Context:** Use `surface-container-low` (#e6e6e6) for sidebars or secondary content areas.
*   **Interactive Cards:** Use `surface-container-high` (#dcdcdc) or `white` with 80% opacity and a 20px backdrop blur for that signature "Glassmorphism" look.

### The "Glass & Gradient" Rule
For primary actions and high-impact hero sections, use a **Signature Texture**: A linear gradient from `primary` (#16a34a) to `primary_container` (#dcfce7) at a 135-degree angle. This provides a "soul" and depth that flat hex codes cannot replicate.

---

## 3. Typography: The Editorial Voice

We use a high-contrast scale to create an authoritative, premium feel. 

*   **Display & Headlines (Plus Jakarta Sans):** These are your "vibe" setters. They should be bold and tight-tracked. Use `display-lg` (3.5rem) for hero statements to create a "magazine" feel.
*   **UI & Body (Inter):** Reserved for high-functionality areas. `body-md` (0.875rem) is your workhorse for descriptions.
*   **The Medium Label:** `label-md` must always be medium weight (500) and uppercase with slight letter spacing (+0.05rem) to maintain a professional, "instrument panel" aesthetic.

---

## 4. Elevation & Depth

### The Layering Principle
Depth is achieved through **Tonal Layering**. Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a "recessed" or "inset" feel without a single drop shadow.

### Ambient Shadows & "Ghost Borders"
*   **Ambient Glow:** For floating elements (like a navigation bar), use a shadow tinted with `surface_tint` (#16a34a) at 4% opacity. The blur should be massive (40px-60px) to mimic soft ambient light.
*   **The Ghost Border:** If accessibility requires a stroke (e.g., in high-glare environments), use the `outline_variant` token at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Modern Cards
*   **Style:** No borders. Background: `surface_container_highest` or Glass-White.
*   **Corner Radius:** Always `DEFAULT` (1rem) or `md` (1.5rem).
*   **Hover State:** Scale the card by 1.02% and increase the backdrop-blur density. Shift background from `surface_container_high` to `surface_bright`.

### Action Buttons
*   **Primary:** Gradient fill (`primary` to `primary_container`). 1rem+ rounded corners. No shadow.
*   **Secondary:** `surface_variant` background with `on_surface_variant` text.
*   **Tertiary:** Ghost style. No background, no border. Use `primary` text weight 600.

### Status Badges (The Flow Indicators)
Use high-saturation tokens for clear communication, but wrap them in low-opacity containers:
*   **Pending:** `Yellow` text on a 10% opacity Yellow fill.
*   **Confirmed:** `primary` text on 10% `primary_container` fill.
*   **On-Route:** `Blue` (Custom) text on 10% Blue fill.
*   **Completed:** `on_surface_variant` text on `surface_variant` fill.

### Navigation Bar
A sleek, detached floating bar. Use `surface-container-high` with 70% opacity and a 32px backdrop blur. Positioning should be `xl` (3rem) from the screen bottom for thumb-driven ergonomics.

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace Negative Space:** Allow `display` type to breathe. Use the `xl` spacing scale between major sections.
*   **Use Subtle Motion:** Micro-interactions (like a button gently glowing on hover) should feel like "Urban Flow"—smooth and continuous.
*   **Layer Glass:** Put a glass card over a subtle green gradient background for maximum premium effect.

### Don’t:
*   **Don't use 100% White:** Pure white (#FFFFFF) is too stark. Use `surface` (#ededed) to allow for depth and shadows.
*   **Don't use sharp corners:** Nothing in this system is sharper than `sm` (0.5rem). The city is fluid; the interface should be too.
*   **Don't use Dividers:** Avoid horizontal rules. If content needs to be separated, use a 16px `surface-container-low` gap.