# Vibe Slides

**AI-Powered Presentation Creation**

Vibe Slides is a "Vibe Coding" application for presentation creation. It enables users to create professional PowerPoint presentations by describing what they want in natural language, powered by **Claude Code** (Anthropic's AI coding assistant) and **PptxGenJS** (JavaScript library for generating PPTX files).

![Preview](assets/vibe-slides-preview.png)

## Features

- **Project Management**
  - Create, edit, and delete projects
  - Configurable aspect ratios (16:9, 4:3, 16:10)
  - Project settings dialog
  - Template system with design presets

- **Integrated Terminal**
  - Full terminal emulation with xterm.js
  - WebSocket + node-pty for real-time communication
  - Claude Code runs in the context of each project folder
  - Session persistence with output buffer for reconnection
  - Auto-generated CLAUDE.md with project context and PptxGenJS examples

- **Asset Management**
  - Drag-and-drop file upload
  - Support for images (PNG, JPG, SVG, GIF, WebP), fonts (TTF, OTF, WOFF), and documents (PDF)
  - Thumbnail generation for images
  - Original filename preservation
  - Copy filename to clipboard for easy use in presentations

- **Template System**
  - 5 built-in design templates (Corporate, Creative, Minimal, Pitch Deck, Data)
  - Color palettes, typography, and layout presets
  - Templates automatically included in CLAUDE.md context

- **Slide Preview**
  - Real-time slide thumbnail generation from PPTX
  - Fullscreen preview with navigation
  - Automatic detection of new presentations
  - LibreOffice + Poppler for high-quality rendering

- **Export & Download**
  - Direct PPTX download
  - Export history tracking
  - Scan for presentations in project folder

- **User Interface**
  - Dark/Light/System theme modes
  - Resizable panels (assets, preview, templates, terminal)
  - Responsive layout
  - shadcn/ui components with Radix Nova style

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16+ (App Router), React 19 |
| **UI** | Tailwind CSS 4, shadcn/ui |
| **Terminal** | xterm.js + WebSocket + node-pty |
| **Presentation** | PptxGenJS |
| **Database** | PostgreSQL + Prisma |
| **File Processing** | Sharp (images), LibreOffice + Poppler (PPTX thumbnails) |

## Getting Started

### Prerequisites

- Node.js 20+ or Bun
- PostgreSQL 14+
- Claude Code CLI installed
- Active Claude Pro/Max subscription or Claude AI API key
- LibreOffice (for PPTX to PDF conversion)
- Poppler (for PDF to PNG conversion): `brew install poppler`

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/vibe-slides.git
cd vibe-slides

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations (also generates Prisma client)
bunx prisma migrate dev

# Seed built-in templates
bun run tsx prisma/seed.ts

# Start the development server
bun dev
```

### Environment Variables

Create a `.env` file:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/vibeslides"

# Server
PORT=3000
HOSTNAME="localhost"
NODE_ENV="development"

# Projects folder (optional, defaults to ./projects)
PROJECTS_ROOT="${PWD}/projects"
```

## Project Structure

```
vibe-slides/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── projects/             # Project CRUD, assets, scan, preview
│   │   └── templates/            # Template listing
│   ├── dashboard/                # Dashboard page
│   ├── editor/                   # Editor pages
│   │   └── [projectId]/          # Project editor
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── components/                   # React components
│   ├── dashboard/                # Dashboard components
│   │   ├── create-project-dialog.tsx
│   │   ├── project-card.tsx
│   │   └── project-grid.tsx
│   ├── editor/                   # Editor-specific components
│   │   ├── asset-manager.tsx     # Asset upload and gallery
│   │   ├── editor-layout.tsx     # Resizable panel layout
│   │   ├── settings-dialog.tsx   # Project settings modal
│   │   ├── slide-preview.tsx     # Slide preview with fullscreen
│   │   ├── template-panel.tsx    # Template selector
│   │   └── terminal.tsx          # Terminal component
│   ├── ui/                       # shadcn/ui components
│   ├── theme-provider.tsx        # Theme context
│   └── theme-toggle.tsx          # Theme switcher
├── data/                         # Static data
│   └── templates/                # Built-in template definitions
├── lib/                          # Utilities and services
│   ├── prisma.ts                 # Prisma client
│   ├── project-fs.ts             # Project filesystem operations
│   ├── upload.ts                 # File upload processing
│   ├── claude-md/                # CLAUDE.md generation
│   │   ├── generator.ts
│   │   └── templates.ts
│   ├── pty/                      # PTY management
│   │   ├── manager.ts            # Session management
│   │   └── security.ts           # Environment sanitization
│   └── watcher/                  # File watching
│       └── thumbnail-generator.ts # PPTX to PNG conversion
├── prisma/                       # Database
│   ├── schema.prisma             # Data model
│   └── seed.ts                   # Template seeding
├── projects/                     # User projects (gitignored)
├── server.ts                     # Custom server with WebSocket
├── types/                        # TypeScript types
└── CLAUDE.md                     # Project instructions
```

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                            BROWSER                               │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐  │
│  │   xterm.js     │  │ Slide Preview  │  │   React UI         │  │
│  │   Terminal     │  │ (thumbnails)   │  │   Components       │  │
│  │                │  │                │  │                    │  │
│  └───────┬────────┘  └───────┬────────┘  └─────────┬──────────┘  │
│          │ WebSocket         │ HTTP              │ HTTP          │
└──────────┼───────────────────┼───────────────────┼───────────────┘
           │                   │                   │
           ▼                   ▼                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                      VIBE SLIDES SERVER                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐  │
│  │  WebSocket     │  │  API Routes    │  │  Thumbnail         │  │
│  │  Handler       │  │  /api/*        │  │  Generator         │  │
│  └───────┬────────┘  └───────┬────────┘  └─────────┬──────────┘  │
│          │                   │                     │             │
│          ▼                   ▼                     ▼             │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐  │
│  │   node-pty     │  │    Prisma      │  │  LibreOffice +     │  │
│  │ (Claude Code)  │  │    Client      │  │  Poppler           │  │
│  └────────────────┘  └────────────────┘  └────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
           │                   │                     │
           ▼                   ▼                     ▼
┌──────────────────┐  ┌────────────────┐  ┌────────────────────────┐
│   Claude Code    │  │   PostgreSQL   │  │   Project Folders      │
│   CLI Process    │  │                │  │   /projects/{uuid}/    │
│                  │  │   - Projects   │  │     ├── CLAUDE.md      │
│                  │  │   - Templates  │  │     ├── assets/        │
│                  │  │   - Assets     │  │     │   ├── images/    │
│                  │  │   - Exports    │  │     │   └── fonts/     │
│                  │  │                │  │     └── output/        │
│                  │  │                │  │         └── *.pptx     │
└──────────────────┘  └────────────────┘  └────────────────────────┘
```

## Usage

### Creating a Presentation

1. **Create a new project** from the dashboard
2. **Select a template** to apply a consistent design system
3. **Upload assets** (logo, images, fonts) via drag-and-drop
4. **Use the terminal** to interact with Claude Code:
   ```
   Create a 10-slide presentation about our Q4 results.
   Include the company logo on the title slide and use
   charts for the financial data.
   ```
5. **Preview** your slides in the preview panel
6. **Download** your PPTX file when ready

### Example Prompts for Claude

```
"Create a pitch deck for our startup. We're building an AI-powered
fitness app. Make it 8 slides with a modern, clean design."

"Add a slide with a comparison table showing our features vs competitors."

"Change the color scheme to use more blue tones and make the
titles larger."

"Create a timeline slide showing our product roadmap for 2024."

"Add the uploaded logo to the bottom-right corner of every slide."
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | GET | List all projects |
| `/api/projects` | POST | Create a new project |
| `/api/projects/[id]` | GET | Get project details |
| `/api/projects/[id]` | PUT | Update project |
| `/api/projects/[id]` | DELETE | Delete project |
| `/api/projects/[id]/assets` | GET | List project assets |
| `/api/projects/[id]/assets` | POST | Upload asset |
| `/api/projects/[id]/assets/[assetId]` | GET | Get asset file |
| `/api/projects/[id]/assets/[assetId]` | DELETE | Delete asset |
| `/api/projects/[id]/assets/[assetId]/thumbnail` | GET | Get asset thumbnail |
| `/api/projects/[id]/template` | POST | Apply template |
| `/api/projects/[id]/scan` | POST | Scan for PPTX files |
| `/api/projects/[id]/preview` | GET | List slide thumbnails |
| `/api/projects/[id]/preview/[filename]` | GET | Get slide thumbnail |
| `/api/projects/[id]/download` | GET | Download latest PPTX |
| `/api/templates` | GET | List all templates |
| `/api/ws` | WebSocket | Terminal communication |

## WebSocket Messages

### Client → Server

| Type | Description |
|------|-------------|
| `session:connect` | Connect to project session |
| `session:disconnect` | Disconnect and kill session |
| `terminal:input` | Send input to terminal |
| `terminal:resize` | Resize terminal dimensions |

### Server → Client

| Type | Description |
|------|-------------|
| `session:connected` | Session connected with output buffer |
| `session:error` | Session error message |
| `session:exit` | Session exited with code |
| `terminal:output` | Terminal output data |

## Development

```bash
# Run development server
bun dev

# Run Prisma Studio (database GUI)
bunx prisma studio

# Generate Prisma client
bunx prisma generate

# Run migrations
bunx prisma migrate dev

# Seed templates
bun run tsx prisma/seed.ts

# Build for production
bun run build

# Start production server
bun start

# Lint code
bun run lint
```

## License

[MIT](LICENSE)

## Credits

- [PptxGenJS](https://gitbrent.github.io/PptxGenJS/) - PowerPoint generation library
- [Claude Code](https://claude.ai/code) - AI coding assistant
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [xterm.js](https://xtermjs.org) - Terminal emulator
- [LibreOffice](https://www.libreoffice.org/) - Document conversion
- [Poppler](https://poppler.freedesktop.org/) - PDF rendering
