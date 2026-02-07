# Commando AI - Copilot Instructions

## Project Overview
Commando AI is a Next.js 14 workflow automation platform with real-time meeting capabilities. It integrates multiple services (Slack, Discord, Notion, Google Drive) into visual workflow automations and provides live meeting transcription.

## Architecture

### Core Stack
- **Framework**: Next.js 14 (App Router) with TypeScript
- **Auth**: Clerk (`@clerk/nextjs`) - middleware protects routes via `clerkMiddleware`
- **Database**: PostgreSQL with Prisma ORM
- **UI**: Tailwind CSS + shadcn/ui (Radix primitives) - components in `src/components/ui/`
- **State**: Zustand (`src/store.tsx`) + React Context providers
- **Video**: Stream.io SDK for meetings (`StreamVideoProvider`)

### Key Directories
```
src/
├── app/(auth)/           # Sign-in/sign-up pages
├── app/(main)/(pages)/   # Protected dashboard pages
│   ├── workflows/        # Visual workflow editor (ReactFlow)
│   ├── connections/      # Third-party service integrations
│   └── _actions/         # Server actions per feature
├── providers/            # Context providers (wrap in layout.tsx)
├── lib/                  # Shared utilities, types, db client
└── components/           # Reusable components
```

### Route Structure
- Public routes: `/`, `/sign-in`, `/sign-up`, `/api/webhooks`, `/api/clerk-webhook`
- Protected routes: Everything under `(main)` requires Clerk auth
- API routes use Edge runtime where specified (`export const runtime = "edge"`)

## Development Patterns

### Server Actions
Place server actions in `_actions/` directories colocated with features:
```typescript
// src/app/(main)/(pages)/connections/_actions/google-connection.tsx
"use server"
import { auth } from "@clerk/nextjs/server"
// Always verify auth in server actions
const { userId } = auth()
if (!userId) return { error: "Unauthorized" }
```

### Database Access
Use the singleton Prisma client from `src/lib/db.ts`:
```typescript
import { db } from '@/lib/db'
const user = await db.user.findUnique({ where: { clerkId: userId } })
```

### Provider Hierarchy
Providers wrap in `src/app/layout.tsx` in this order:
`ClerkProvider` → `ThemeProvider` → `BillingProvider` → `ModalProvider`

Feature-specific providers (like `EditorProvider`, `ConnectionsProvider`) wrap at page level.

### Component Patterns
- Use `'use client'` directive only when necessary (interactivity, hooks)
- UI components use shadcn/ui - install via: `npx shadcn-ui@latest add [component]`
- Class merging: `cn()` from `src/lib/utils.ts` combines Tailwind classes

### Workflow Editor
The visual workflow builder uses ReactFlow with custom node types defined in `src/lib/types.ts`:
- Node types: `Email`, `Slack`, `Discord`, `Notion`, `Google Drive`, `Trigger`, etc.
- Editor state managed via `EditorProvider` with undo/redo history

## Commands
```bash
npm run dev           # Starts dev server with HTTPS (--experimental-https)
npm run build         # Production build (runs prisma generate first)
npx prisma db push    # Sync schema to database
npx prisma studio     # Open Prisma database GUI
```

## Environment Variables
Required keys (see `.env` file):
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` - Clerk auth
- `OPENAI_API_KEY` - For transcription (Whisper API)
- `NEXT_PUBLIC_STREAM_API_KEY`, `STREAM_SECRET_KEY` - Stream.io video
- OAuth credentials for Google, Slack, Discord, Notion integrations

## Integration Points
- **External AI**: Assistant API calls n8n webhook at `virushacks.app.n8n.cloud`
- **Transcription**: OpenAI Whisper via `/api/transcribe` (Edge runtime)
- **OAuth flows**: Clerk handles Google OAuth; service-specific tokens stored in DB models

## Key Types
```typescript
// src/lib/types.ts
type ConnectionTypes = 'Google Drive' | 'Notion' | 'Slack' | 'Discord'
type EditorCanvasTypes = 'Email' | 'Slack' | 'Google Drive' | 'Notion' | 'Trigger' | ...
```
---

## UI Design Guidelines

### Design Philosophy
Commando AI follows a **dark, polished, professional** aesthetic with the following core principles:
- **Dark-first design**: All interfaces default to dark mode with `dark:bg-black` backgrounds
- **Minimalist chrome**: Reduce visual clutter, use whitespace strategically
- **Card-based layouts**: Content organized in bordered cards with subtle shadows
- **Subtle borders**: Use `border` class with low-opacity borders (`border-[1px]`)
- **High contrast text**: White/light text (`text-foreground`) on dark backgrounds

### Color Palette
```typescript
// Primary colors (from tailwind.config.ts and globals.css)
const darkTheme = {
  background: 'hsl(0 0% 3.9%)',        // Near-black background (#0a0a0a)
  foreground: 'hsl(0 0% 98%)',          // White text (#fafafa)
  card: 'hsl(0 0% 3.9%)',               // Card backgrounds
  muted: 'hsl(0 0% 14.9%)',             // Muted backgrounds (#262626)
  mutedForeground: 'hsl(0 0% 63.9%)',   // Secondary text (#a3a3a3)
  border: 'hsl(0 0% 14.9%)',            // Subtle borders
  
  // Accent colors for features
  dark1: '#1C1F2E',  // Deep navy
  dark2: '#161925',  // Darker navy
  dark3: '#252A41',  // Accent dark
  dark4: '#1E2757',  // Purple-tinted dark
  blue1: '#0E78F9',  // Primary action blue
  purple1: '#830EF9', // Accent purple
  orange1: '#FF742E', // Warning/accent orange
  yellow1: '#F9A90E', // Highlight yellow
}
```

### Component Patterns

#### Cards
```tsx
// Standard card pattern - use for all content sections
<Card className="w-full">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Icon className="h-5 w-5" />
      Title Text
    </CardTitle>
    <CardDescription>Subtitle or description text</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content here */}
  </CardContent>
</Card>

// Feature cards with hover effects
<div className="group relative overflow-hidden rounded-lg border p-4 hover:border-primary/50 transition-colors">
  <div className={cn("absolute inset-0 opacity-20 transition-opacity group-hover:opacity-40", bgColor)} />
  <div className="relative space-y-2">
    {/* Content */}
  </div>
</div>
```

#### Layout Structure
```tsx
// Standard page layout
<div className="flex flex-col">
  {/* Sticky header */}
  <header className="sticky top-0 z-[10] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div className="container flex h-14 items-center justify-between">
      <h1 className="text-2xl font-semibold">Page Title</h1>
    </div>
  </header>

  {/* Main content with responsive grid */}
  <main className="flex-1 py-6 overflow-y-auto mx-24">
    <div className="grid gap-6 md:grid-cols-4">
      {/* Grid items */}
    </div>
  </main>
</div>
```

#### Sidebar Navigation
```tsx
// Vertical icon sidebar (from sidebar/index.tsx pattern)
<nav className="dark:bg-black h-screen overflow-scroll justify-between flex items-center flex-col gap-10 py-6 px-2">
  {/* Logo/brand */}
  <Link className="flex font-bold flex-row px-3" href="/">CommandoAI</Link>
  
  {/* Navigation items with tooltips */}
  <TooltipProvider>
    {menuOptions.map((item) => (
      <Tooltip delayDuration={0}>
        <TooltipTrigger>
          <Link
            href={item.href}
            className={clsx(
              'group h-8 w-8 flex items-center justify-center scale-[1.5] rounded-lg p-[3px] cursor-pointer',
              { 'dark:bg-[#2F006B] bg-[#EEE0FF]': isActive }
            )}
          >
            <item.Component selected={isActive} />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-black/10 backdrop-blur-xl">
          <p>{item.name}</p>
        </TooltipContent>
      </Tooltip>
    ))}
  </TooltipProvider>
</nav>
```

#### Top Info Bar
```tsx
// Standard info bar (from infobar/index.tsx)
<div className="flex flex-row justify-end gap-6 items-center px-4 py-4 w-full dark:bg-black">
  {/* Credits display */}
  <span className="flex items-center gap-2 font-bold">
    <p className="text-sm font-light text-gray-300">Credits</p>
    <span>{credits}/10</span>
  </span>
  
  {/* Search bar */}
  <span className="flex items-center rounded-full bg-muted px-4">
    <Search />
    <Input placeholder="Quick Search" className="border-none bg-transparent" />
  </span>
  
  {/* Icon buttons with tooltips */}
  <TooltipProvider>
    <Tooltip delayDuration={0}>
      <TooltipTrigger><Headphones /></TooltipTrigger>
      <TooltipContent><p>Contact Support</p></TooltipContent>
    </Tooltip>
  </TooltipProvider>
  
  <UserButton />
</div>
```

### UI Best Practices

1. **Always use `cn()` for class merging**:
   ```tsx
   import { cn } from "@/lib/utils"
   <div className={cn("base-classes", conditionalClass && "conditional-classes", className)} />
   ```

2. **Icons**: Use `lucide-react` icons at `h-5 w-5` for standard size, `h-6 w-6` for feature icons

3. **Spacing**: Use Tailwind spacing scale consistently:
   - `gap-2` for tight groupings
   - `gap-4` for standard spacing
   - `gap-6` for section spacing
   - `py-6`, `px-4` for content padding

4. **Typography**:
   - Page titles: `text-2xl font-semibold`
   - Card titles: `text-xl font-semibold` or use `<CardTitle>`
   - Body text: Default size with `text-muted-foreground` for secondary
   - Small labels: `text-sm font-light text-gray-300`

5. **Borders and Dividers**:
   - Cards: `rounded-lg border` (uses CSS variable `--border`)
   - Separators: Use `<Separator />` from shadcn/ui
   - Subtle borders: `border-[1px] dark:border-t-[#353346]`

6. **Hover States**:
   - Links/buttons: `hover:border-primary/50 transition-colors`
   - Cards: Use `group` with `group-hover:opacity-40` for background effects

7. **Loading States**:
   ```tsx
   // Always show loading states for async operations
   {isLoading ? (
     <div className="flex items-center justify-center p-4">
       <Loader2 className="h-6 w-6 animate-spin" />
     </div>
   ) : (
     <ContentComponent />
   )}
   ```

8. **Empty States**:
   ```tsx
   <div className="text-center py-8 text-muted-foreground">
     <Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
     <p>No items found</p>
   </div>
   ```

### Charts and Data Visualization
```tsx
// Use Recharts with theme-aware colors
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

<div className="h-[300px]">
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="month" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="users" fill="hsl(var(--primary))" />
    </BarChart>
  </ResponsiveContainer>
</div>
```

---

## Backend Integration Guidelines

### API Route Structure
All API routes follow Next.js 14 App Router conventions:
```
src/app/api/
├── assistant/          # AI assistant webhook integration
├── auth/               # OAuth flows (Google, etc.)
├── calendar/           # Google Calendar CRUD operations
├── chat/               # Real-time chat endpoints
├── clerk-webhook/      # Clerk user sync webhook
├── connections/        # Service connection management
├── drive/              # Google Drive operations
├── drive-activity/     # Drive activity monitoring
├── generate-workflow/  # AI workflow generation
├── gmail/              # Gmail integration
├── payment/            # Stripe/payment processing
├── transcribe/         # OpenAI Whisper transcription
└── workflow/           # Workflow execution endpoints
```

### Standard API Route Pattern
```typescript
// src/app/api/[feature]/route.ts
import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const { userId } = auth()
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // 2. Get user from database
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: { /* relations */ }
    })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // 3. Perform operation
    const data = await db.someModel.findMany({
      where: { userId: user.clerkId }
    })

    // 4. Return response
    return NextResponse.json(data)
  } catch (error) {
    console.error("[API_FEATURE_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await request.json()
    // Validate body...

    const result = await db.someModel.create({
      data: { ...body, userId }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("[API_FEATURE_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
```

### Server Actions Pattern
```typescript
// src/app/(main)/(pages)/[feature]/_actions/[action].tsx
"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createItem(formData: FormData) {
  const { userId } = auth()
  if (!userId) {
    return { error: "Unauthorized" }
  }

  try {
    const name = formData.get("name") as string
    // Validate inputs...

    const item = await db.item.create({
      data: { name, userId }
    })

    revalidatePath("/items")
    return { success: true, data: item }
  } catch (error) {
    console.error("[CREATE_ITEM]", error)
    return { error: "Failed to create item" }
  }
}

export async function getItems() {
  const { userId } = auth()
  if (!userId) {
    return { error: "Unauthorized" }
  }

  try {
    const items = await db.item.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    })
    return { data: items }
  } catch (error) {
    console.error("[GET_ITEMS]", error)
    return { error: "Failed to fetch items" }
  }
}
```

### Client-Side Data Fetching
```typescript
// Using Server Actions in client components
"use client"

import { useEffect, useState, useTransition } from "react"
import { getItems, createItem } from "./_actions/items"

export function ItemsList() {
  const [items, setItems] = useState<Item[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadItems() {
      const result = await getItems()
      if (result.error) {
        setError(result.error)
      } else {
        setItems(result.data || [])
      }
    }
    loadItems()
  }, [])

  const handleCreate = async (formData: FormData) => {
    startTransition(async () => {
      const result = await createItem(formData)
      if (result.error) {
        setError(result.error)
      } else {
        // Refresh data
        const updated = await getItems()
        if (updated.data) setItems(updated.data)
      }
    })
  }

  return (/* UI */)
}

// Using fetch for API routes
async function fetchCalendarEvents() {
  const response = await fetch("/api/calendar")
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`)
  }
  return response.json()
}
```

### Database Models & Relations
```prisma
// Core models in prisma/schema.prisma:

User {
  // Authentication
  clerkId, email, name, profileImage
  // Billing
  tier ("Free" | "Pro" | "Unlimited"), credits
  // Relations
  LocalGoogleCredential, DiscordWebhook[], Notion[], Slack[], 
  connections[], workflows[]
}

Workflows {
  // Workflow configuration
  name, description, nodes, edges
  // Service templates
  discordTemplate, notionTemplate, slackTemplate
  // Connection tokens
  slackAccessToken, notionAccessToken
  // State
  publish, flowPath, cronPath
}

// Connection models: LocalGoogleCredential, DiscordWebhook, Slack, Notion
// Each stores service-specific tokens and configuration
```

### External Service Integration Patterns

#### Google APIs (Calendar, Drive, Gmail)
```typescript
import { google } from "googleapis"
import { clerkClient } from "@clerk/nextjs/server"

async function getOAuth2Client(userId: string) {
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const { googleAccessToken, googleRefreshToken } = user.privateMetadata as {
    googleAccessToken?: string
    googleRefreshToken?: string
  }

  if (!googleAccessToken) return null

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  )

  oauth2Client.setCredentials({
    access_token: googleAccessToken,
    refresh_token: googleRefreshToken,
  })

  // Auto-refresh tokens
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await client.users.updateUser(userId, {
        privateMetadata: { ...user.privateMetadata, googleAccessToken: tokens.access_token }
      })
    }
  })

  return oauth2Client
}

// Usage
const calendar = google.calendar({ version: "v3", auth: oauth2Client })
const events = await calendar.events.list({ calendarId: 'primary' })
```

#### Stream.io Video Integration
```typescript
// src/providers/StreamClientProvider.tsx
import { StreamVideo, StreamVideoClient } from "@stream-io/video-react-sdk"

// Get token from server action
import { tokenProvider } from "@/actions/stream.actions"

const client = new StreamVideoClient({
  apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY!,
  user: { id: clerkId, name: user.name },
  tokenProvider,
})

// Wrap pages in provider
<StreamVideo client={client}>{children}</StreamVideo>
```

#### OpenAI Transcription
```typescript
// src/app/api/transcribe/route.ts
export const runtime = "edge"

export async function POST(request: Request) {
  const formData = await request.formData()
  const audio = formData.get("audio") as Blob

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: (() => {
      const fd = new FormData()
      fd.append("file", audio, "audio.webm")
      fd.append("model", "whisper-1")
      return fd
    })(),
  })

  return Response.json(await response.json())
}
```

### Error Handling Best Practices
```typescript
// API routes - always wrap in try/catch
try {
  // Operation
} catch (error) {
  console.error("[ENDPOINT_METHOD]", error)
  
  // Return appropriate status codes
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 })
  }
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Already exists" }, { status: 409 })
    }
  }
  return new NextResponse("Internal Error", { status: 500 })
}

// Client-side - show user-friendly errors
const [error, setError] = useState<string | null>(null)

<Alert variant="destructive" className={cn(!error && "hidden")}>
  <AlertCircle className="h-4 w-4" />
  <AlertDescription>{error}</AlertDescription>
</Alert>
```

### Production Checklist
- [ ] All API routes verify `auth()` before operations
- [ ] Database queries include proper `where` clauses with userId
- [ ] Error boundaries wrap page components
- [ ] Loading states for all async operations
- [ ] Form validation with Zod schemas
- [ ] Rate limiting on public endpoints
- [ ] Proper CORS headers for webhooks
- [ ] Environment variables validated at startup
- [ ] Prisma client singleton (`src/lib/db.ts`)
- [ ] Revalidate paths after mutations