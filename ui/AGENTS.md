# UI - Frontend Application

Next.js 15 frontend for the Dograh voice AI platform.

## Project Structure

```
ui/
├── src/
│   ├── app/          # Next.js App Router pages
│   ├── components/   # React components
│   ├── lib/          # Utilities and configurations
│   ├── client/       # Auto-generated API client
│   ├── context/      # React context providers
│   ├── hooks/        # Custom React hooks
│   ├── constants/    # Application constants
│   └── types/        # TypeScript type definitions
├── public/           # Static assets
└── package.json
```

## Where to Find Things

| Looking for...      | Go to...                                             |
| ------------------- | ---------------------------------------------------- |
| Pages/routes        | `src/app/` - Next.js App Router (file-based routing) |
| Reusable components | `src/components/` - organized by feature             |
| Base UI primitives  | `src/components/ui/` - shadcn/ui components          |
| Workflow builder    | `src/components/flow/` - React Flow based            |
| API calls           | `src/client/` - auto-generated from OpenAPI spec     |
| Auth utilities      | `src/lib/auth/`                                      |
| Helper functions    | `src/lib/utils.ts`                                   |
| Global state        | `src/context/` - React context providers             |

## Tech Stack

- Next.js 15 with App Router, React 19, TypeScript
- Tailwind CSS with shadcn/ui components
- Zustand for state management
- @xyflow/react for workflow builder

## API Client

The `src/client/` directory is auto-generated from the backend OpenAPI spec. Whenever you add a
new api route in backend, and wish to use it in the UI, generate the client using below command.

```bash
npm run generate-client
```

## Conventions

### UI Spacing & Styling Guidelines

To maintain a highly consistent, Vapi/ElevenLabs-style minimalist presentation, all dashboard layout changes must adhere to the following rules:

1. **Spacing Scale (Padding & Margins)**:
   - **Outer Page Padding**: Use `px-6 py-6` or `p-6` for standard views (never mix random sizes like `p-4` or `p-12`).
   - **Gaps**: Use `gap-4` for standard elements (menus, action rows) and `gap-6` for large sections.
   - **Form Rows**: Use `space-y-4` or `space-y-5`.

2. **Borders & Corners**:
   - **Sidebar & Panels**: Use `border-r border-border/40` or `border border-border/40` to maintain clean separation lines.
   - **Radius scale**: Use `rounded-lg` (`0.5rem`) for inputs, buttons, and small interactive states. Use `rounded-xl` (`0.75rem`) for cards and large layout panels.

3. **Typography**:
   - **Titles**: Use `text-2xl font-bold tracking-tight text-foreground`.
   - **Group Labels**: Use `text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50` (like Build, Manage sidebar section titles).
   - **Body text**: Use `text-sm leading-relaxed text-muted-foreground`.

4. **Component Heights**:
   - **Inputs/Buttons**: Use `h-9` for standard forms, and `h-10` for main auth/landing page actions.
   - **Headers**: Sticky headers must be `h-16` or `py-3 px-6` to align with the sidebar header.

## Development

```bash
npm install
npm run dev    # Runs on port 3000
```
