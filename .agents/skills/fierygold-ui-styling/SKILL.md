SKILL.md — Fiery Gold × Earthy Glass 4D UI Styling Engine
Name
FieryGold-UI-Styling

Purpose
A reusable workflow that transforms any UI request into a fully styled, mobile‑optimized component using the Fiery Gold × Earthy Glass 4D design system.
This skill enforces global styling, lighting, spacing, container rules, and output format across all UI code.

Inputs
The user may provide:

Component name

Component purpose

Data shape

Required interactions

Required layout

Optional variations

Outputs
This skill produces:

A React component (or JSX/TSX depending on project)

A matching CSS module (or Tailwind/styled-components if configured)

Mobile‑optimized container rules

Fiery Gold × Earthy Glass 4D styling applied consistently

Deterministic structure following the global blueprint

Global Design System (Enforced)
1. Color Tokens
Golds

--gold-primary: #FFB800;

--gold-molten: #FF7B00;

--gold-earth: #E6A84A;

--gold-bronze: #B37A2A;

Earth Tones

--earth-black: #1A120B;

--earth-charcoal: #2A1F14;

--earth-umber: #3B2A1C;

Glow

--glow-fiery: rgba(255, 184, 0, 0.45);

--glow-soft: #F6D68A;

2. Glassmorphism Rules
All containers must apply:

Code
background: rgba(20, 14, 8, 0.35);
backdrop-filter: blur(18px);
border: 1px solid rgba(255, 184, 0, 0.35);
box-shadow:
  0 0 18px rgba(255, 184, 0, 0.45),
  0 8px 22px rgba(0,0,0,0.55),
  0 -2px 6px rgba(255, 184, 0, 0.25);
border-radius: 18px;
Sheen Layer

Code
background-image: linear-gradient(
  145deg,
  rgba(255,255,255,0.08),
  rgba(0,0,0,0.15)
);
3. Mobile Container Rules
All components must follow:

Code
max-width: 360px;
width: 92%;
margin: 0 auto;
padding: 16px;
Never:

100% width

Edge‑to‑edge layouts

4. Shape Rules
Containers: border-radius: 18px

Buttons: border-radius: 12px

Inputs: border-radius: 14px

No sharp edges anywhere

5. Lighting Rules
Every block must include:

Gold rim light on top edge

Fiery glow behind container

Directional light from top-left

Depth shadow bottom-right

Optional bokeh particles

6. Spacing System
Element spacing: 16px

Section spacing: 24px

No element touches screen edges

Vertical rhythm must be consistent

Workflow (Deterministic)
When the user requests a UI component:

Step 1 — Identify Component Type
Classify as:

Container

Card

Section

List

Modal

Button

Input

Navigation

Badge

Banner

Custom

Step 2 — Apply Mobile Layout Rules
Always enforce:

Max width

Center alignment

Padding

No full-width expansion

Step 3 — Apply Fiery Gold × Earthy Glass 4D Styling
Use the global design system:

Glass background

Gold border

Glow

Depth shadows

Sheen layer

Step 4 — Apply Component Blueprint
Every component must include:

Wrapper container

Title (if applicable)

Content block

Actions block (if applicable)

Step 5 — Generate Code
Output:

React component

CSS module (or configured styling system)

Clean, readable, consistent structure

Step 6 — Quality Checks
Before finalizing, ensure:

No inline styles

No arbitrary colors

No magic numbers

All spacing uses the system

All containers follow mobile rules

All lighting rules applied

All shapes follow radius rules

Example Prompts
“Create a fiery-gold card for user stats.”

“Generate a mobile-friendly modal using the 4D glass style.”

“Make a settings list with gold rim lighting.”

“Build a login form using the FieryGold UI system.”

Notes
This skill must override any default styling.

This skill must always enforce the global design system.

This skill is deterministic — no creative deviation unless explicitly requested.