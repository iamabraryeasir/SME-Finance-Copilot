# DESIGN.md

## Core Design Philosophy
This project strictly utilizes **Tailwind CSS** and **Shadcn UI** as the foundational design system. All visual elements, layouts, and interactive components must adhere to the rules defined in this document to maintain a cohesive, enterprise-grade user interface.

---

## 1. Component Library Protocol (Strictly Shadcn UI)

### Primary Rule
- **Shadcn First:** Every interactive element (buttons, inputs, dialogs, tables, cards, dropdowns) MUST be a Shadcn UI component. 
- **No Manual Component Generation:** The AI agent is strictly forbidden from manually writing or generating the source code for standard Shadcn components (e.g., creating a custom `button.tsx` from scratch). 

### Installation Workflow
1. When the AI agent determines a component is needed for a UI task, it will provide the developer with a list of required components to install (e.g., `bunx --bun shadcn@latest add card table badge`).
2. The agent will wait for the developer to confirm installation.
3. Once confirmed, the agent will import and use the components directly from the `@/components/ui` directory.

### Custom Component Fallback
- Custom components should only be created if the required functionality or UI pattern does not exist within the standard Shadcn UI registry.
- Any custom component must still strictly utilize the global design tokens and Tailwind utility classes.

---

## 2. Theming and Styling (Global CSS)

### Strict Token Usage
- **No Hardcoded Colors:** The agent must never use arbitrary hex codes (e.g., `#FF5733`) or standard Tailwind color scales (e.g., `bg-blue-500`) for standard UI elements unless specifically required for a semantic chart or alert.
- **CSS Variables:** All colors, radii, and styling must rely on the Shadcn CSS variables defined in the `global.css` file. 
- Use semantic utility classes mapping to the theme:
  - Backgrounds: `bg-background`, `bg-card`, `bg-muted`, `bg-secondary`
  - Text: `text-foreground`, `text-muted-foreground`, `text-primary`
  - Borders: `border-border`, `border-input`
  - States: `hover:bg-accent`, `focus:ring-ring`

### Typography
- The font family is controlled globally by the Shadcn theme configuration (typically standard sans-serif like Inter or Geist). 
- Do not apply custom font families arbitrarily. Use standard Tailwind typography utilities (`text-sm`, `font-semibold`, `tracking-tight`) to establish hierarchy.

---

## 3. Layout & Structure

- **Consistency:** Use Shadcn's `Card` components to encapsulate discrete widgets (e.g., the Cash-Flow Forecast chart, the Alert Feed).
- **Spacing:** Rely on consistent Tailwind spacing utilities (e.g., `gap-4`, `p-6`, `mb-8`) to maintain vertical and horizontal rhythm. 
- **Responsiveness:** Ensure all layouts are fluid and responsive using standard Tailwind breakpoints (`sm:`, `md:`, `lg:`), defaulting to a mobile-first approach.