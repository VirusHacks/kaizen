# Kaizen Design System

> **A comprehensive guide to building consistent, polished interfaces for Kaizen**

---

## 🎨 Design Philosophy

Kaizen embodies a **dark, polished, professional** aesthetic designed for power users and enterprise workflows. Our design system prioritizes:

- **🌑 Dark-First Design**: All interfaces default to dark mode with near-black backgrounds
- **✨ Minimalist Chrome**: Reduce visual clutter through strategic whitespace and subtle borders
- **📦 Card-Based Layouts**: Organize content in bordered cards with gentle shadows
- **🔍 High Contrast**: White/light text on dark backgrounds for optimal readability
- **🎯 Purposeful Hierarchy**: Clear visual hierarchy through size, weight, and color

---

## 🎨 Color Palette

### Base Colors (HSL)

```typescript
// CSS Variables (from globals.css and tailwind.config.ts)
const colorSystem = {
  // Primary backgrounds
  background: 'hsl(0 0% 3.9%)',        // #0a0a0a - Near-black canvas
  foreground: 'hsl(0 0% 98%)',          // #fafafa - Primary text (white)
  
  // Card & elevated surfaces
  card: 'hsl(0 0% 3.9%)',               // #0a0a0a - Card backgrounds
  cardForeground: 'hsl(0 0% 98%)',      // #fafafa - Text on cards
  
  // Muted/secondary elements
  muted: 'hsl(0 0% 14.9%)',             // #262626 - Muted backgrounds
  mutedForeground: 'hsl(0 0% 63.9%)',   // #a3a3a3 - Secondary text
  
  // Borders & dividers
  border: 'hsl(0 0% 14.9%)',            // #262626 - Subtle borders
  input: 'hsl(0 0% 14.9%)',             // #262626 - Input borders
  
  // Interactive elements
  primary: 'hsl(0 0% 98%)',             // Primary action color
  primaryForeground: 'hsl(0 0% 9%)',    // Text on primary
  
  // Status colors
  destructive: 'hsl(0 84.2% 60.2%)',    // Error/danger red
  destructiveForeground: 'hsl(0 0% 98%)', // Text on destructive
}
```

### Accent & Feature Colors (Hex)

```typescript
const accentColors = {
  // Navy & dark tones
  dark1: '#1C1F2E',    // Deep navy - sidebar backgrounds
  dark2: '#161925',    // Darker navy - card backgrounds
  dark3: '#252A41',    // Accent dark - hover states
  dark4: '#1E2757',    // Purple-tinted dark - selected states
  
  // Primary actions & highlights
  blue1: '#0E78F9',    // Primary action blue - CTAs, links
  purple1: '#830EF9',  // Accent purple - active states, badges
  orange1: '#FF742E',  // Warning/accent orange - alerts
  yellow1: '#F9A90E',  // Highlight yellow - notifications
}
```

### Usage Guidelines

| Element | Color Variable | Hex | Usage |
|---------|---------------|-----|-------|
| **Page Background** | `bg-background` | `#0a0a0a` | Main canvas, root layouts |
| **Card Surface** | `bg-card` | `#0a0a0a` | Content containers |
| **Primary Text** | `text-foreground` | `#fafafa` | Headings, body text |
| **Secondary Text** | `text-muted-foreground` | `#a3a3a3` | Labels, descriptions |
| **Borders** | `border` | `#262626` | Card borders, dividers |
| **Sidebar Active** | `bg-[#2F006B]` | `#2F006B` | Active navigation item |
| **Sidebar Hover** | `bg-[#EEE0FF]` | `#EEE0FF` | Light mode hover |
| **Primary Action** | `bg-[#0E78F9]` | `#0E78F9` | CTA buttons |
| **Success/Active** | `bg-[#830EF9]` | `#830EF9` | Active badges, success |
| **Warning** | `bg-[#FF742E]` | `#FF742E` | Warnings, alerts |

---

## 📝 Typography

### Font Stack

```css
/* Default font (system font stack) */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
             "Helvetica Neue", Arial, sans-serif;
```

### Type Scale & Usage

| Element | Class | Size | Weight | Usage |
|---------|-------|------|--------|-------|
| **Page Title** | `text-2xl font-semibold` | 24px | 600 | Main page headings |
| **Section Title** | `text-xl font-semibold` | 20px | 600 | Section headings, card titles |
| **Large Body** | `text-lg` | 18px | 400 | Emphasized content |
| **Body Text** | *(default)* | 16px | 400 | Standard text |
| **Small Text** | `text-sm` | 14px | 400 | Labels, captions |
| **Micro Text** | `text-xs` | 12px | 400 | Metadata, timestamps |
| **Light Label** | `text-sm font-light text-gray-300` | 14px | 300 | Subtle labels |
| **Bold Accent** | `font-bold` | - | 700 | Emphasis, numbers |

### Typography Examples

```tsx
// Page title
<h1 className="text-2xl font-semibold">Dashboard</h1>

// Card title with icon
<CardTitle className="flex items-center gap-2">
  <Calendar className="h-5 w-5" />
  Upcoming Events
</CardTitle>

// Card description
<CardDescription>View and manage your calendar events</CardDescription>

// Small label
<span className="text-sm font-light text-gray-300">Credits</span>

// Body text with muted color
<p className="text-muted-foreground">No items found</p>
```

---

## 📐 Layout System

### Standard Page Structure

```tsx
<div className="flex flex-col h-screen">
  {/* Sticky header with backdrop blur */}
  <header className="sticky top-0 z-[10] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div className="container flex h-14 items-center justify-between">
      <h1 className="text-2xl font-semibold">Page Title</h1>
      <div className="flex items-center gap-4">
        {/* Actions */}
      </div>
    </div>
  </header>

  {/* Scrollable main content */}
  <main className="flex-1 py-6 overflow-y-auto mx-24">
    <div className="grid gap-6 md:grid-cols-4">
      {/* Content grid */}
    </div>
  </main>
</div>
```

### Grid Layouts

```tsx
// 4-column responsive grid (dashboard widgets)
<div className="grid gap-6 md:grid-cols-4">
  <Card className="md:col-span-2">Wide card</Card>
  <Card>Standard card</Card>
  <Card>Standard card</Card>
</div>

// 3-column grid
<div className="grid gap-6 md:grid-cols-3">
  {items.map(item => <Card key={item.id}>{item.content}</Card>)}
</div>

// 2-column form layout
<div className="grid gap-6 md:grid-cols-2">
  <FormField name="firstName" />
  <FormField name="lastName" />
</div>
```

### Responsive Breakpoints

| Breakpoint | Class | Min Width | Usage |
|------------|-------|-----------|-------|
| **Mobile** | Default | 0px | Single column |
| **Tablet** | `md:` | 768px | 2-3 columns |
| **Desktop** | `lg:` | 1024px | 3-4 columns |
| **Wide** | `xl:` | 1280px | 4+ columns |

---

## 🧩 Component Patterns

### 1. Cards

#### Standard Content Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

<Card className="w-full">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Icon className="h-5 w-5" />
      Card Title
    </CardTitle>
    <CardDescription>Supporting description text</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Card content */}
  </CardContent>
</Card>
```

#### Feature Card with Hover Effect

```tsx
<div className="group relative overflow-hidden rounded-lg border p-4 hover:border-primary/50 transition-colors cursor-pointer">
  {/* Animated background gradient */}
  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 opacity-20 transition-opacity group-hover:opacity-40" />
  
  {/* Content */}
  <div className="relative space-y-2">
    <Icon className="h-6 w-6 text-primary" />
    <h3 className="font-semibold">Feature Title</h3>
    <p className="text-sm text-muted-foreground">Description</p>
  </div>
</div>
```

#### Stats Card

```tsx
<Card>
  <CardContent className="pt-6">
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-sm font-light text-gray-300">Total Users</p>
        <p className="text-2xl font-bold">1,234</p>
      </div>
      <Users className="h-8 w-8 text-muted-foreground" />
    </div>
  </CardContent>
</Card>
```

### 2. Navigation

#### Vertical Icon Sidebar

```tsx
<nav className="dark:bg-black h-screen overflow-scroll justify-between flex items-center flex-col gap-10 py-6 px-2">
  {/* Logo */}
  <Link className="flex font-bold flex-row px-3" href="/">
    CommandoAI
  </Link>
  
  {/* Navigation items */}
  <TooltipProvider>
    {menuOptions.map((item) => (
      <Tooltip key={item.name} delayDuration={0}>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            className={cn(
              'group h-8 w-8 flex items-center justify-center scale-[1.5] rounded-lg p-[3px] cursor-pointer transition-colors',
              pathname === item.href 
                ? 'dark:bg-[#2F006B] bg-[#EEE0FF]' 
                : 'hover:bg-muted'
            )}
          >
            <item.Component selected={pathname === item.href} />
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
<div className="flex flex-row justify-end gap-6 items-center px-4 py-4 w-full dark:bg-black">
  {/* Credits badge */}
  <span className="flex items-center gap-2 font-bold">
    <p className="text-sm font-light text-gray-300">Credits</p>
    <span>{credits}/10</span>
  </span>
  
  {/* Search bar */}
  <span className="flex items-center rounded-full bg-muted px-4">
    <Search className="h-4 w-4 text-muted-foreground" />
    <Input 
      placeholder="Quick Search" 
      className="border-none bg-transparent focus-visible:ring-0" 
    />
  </span>
  
  {/* Icon actions with tooltips */}
  <TooltipProvider>
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon">
          <Headphones className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent><p>Contact Support</p></TooltipContent>
    </Tooltip>
  </TooltipProvider>
  
  {/* User menu */}
  <UserButton />
</div>
```

### 3. Buttons

#### Button Variants

```tsx
// Primary CTA
<Button className="bg-[#0E78F9] hover:bg-[#0E78F9]/90">
  Create Workflow
</Button>

// Secondary
<Button variant="secondary">Cancel</Button>

// Ghost (icon buttons)
<Button variant="ghost" size="icon">
  <Settings className="h-5 w-5" />
</Button>

// Destructive
<Button variant="destructive">Delete</Button>

// Outline
<Button variant="outline">Learn More</Button>

// Link style
<Button variant="link">View Details</Button>
```

### 4. Forms

#### Standard Form Pattern

```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
})

export function MyForm() {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "" }
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter name" {...field} />
              </FormControl>
              <FormDescription>Your display name</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save"}
        </Button>
      </form>
    </Form>
  )
}
```

### 5. Loading States

```tsx
// Spinner loader
import { Loader2 } from "lucide-react"

{isLoading ? (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
) : (
  <ContentComponent />
)}

// Skeleton loader
import { Skeleton } from "@/components/ui/skeleton"

<Card>
  <CardHeader>
    <Skeleton className="h-6 w-1/2" />
    <Skeleton className="h-4 w-3/4 mt-2" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-32 w-full" />
  </CardContent>
</Card>

// Full page loader
<div className="flex items-center justify-center h-screen">
  <div className="text-center space-y-4">
    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
    <p className="text-sm text-muted-foreground">Loading...</p>
  </div>
</div>
```

### 6. Empty States

```tsx
<div className="text-center py-12 text-muted-foreground">
  <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
  <h3 className="text-lg font-semibold mb-2">No items found</h3>
  <p className="text-sm mb-4">Get started by creating your first item</p>
  <Button>
    <Plus className="h-4 w-4 mr-2" />
    Create Item
  </Button>
</div>
```

### 7. Error States

```tsx
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

const [error, setError] = useState<string | null>(null)

<Alert variant="destructive" className={cn(!error && "hidden")}>
  <AlertCircle className="h-4 w-4" />
  <AlertDescription>{error}</AlertDescription>
</Alert>
```

### 8. Modals & Dialogs

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Modal</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Modal Title</DialogTitle>
      <DialogDescription>Modal description text</DialogDescription>
    </DialogHeader>
    <div className="space-y-4 py-4">
      {/* Modal content */}
    </div>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Save Changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 9. Tooltips

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

<TooltipProvider>
  <Tooltip delayDuration={0}>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon">
        <HelpCircle className="h-5 w-5" />
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="bg-black/10 backdrop-blur-xl">
      <p>Helpful information</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### 10. Badges

```tsx
import { Badge } from "@/components/ui/badge"

// Default
<Badge>New</Badge>

// Status badges
<Badge variant="default">Active</Badge>
<Badge variant="secondary">Pending</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Draft</Badge>

// Custom color badges
<Badge className="bg-[#830EF9]">Pro</Badge>
<Badge className="bg-[#0E78F9]">Free</Badge>
<Badge className="bg-[#FF742E]">Warning</Badge>
```

---

## 🎨 Spacing System

### Consistent Spacing Scale

```tsx
// Tailwind spacing scale (4px base unit)
gap-1   // 4px   - Minimal spacing
gap-2   // 8px   - Tight groupings (icon + text)
gap-4   // 16px  - Standard spacing (form fields, list items)
gap-6   // 24px  - Section spacing (cards in grid)
gap-8   // 32px  - Large section breaks
gap-10  // 40px  - Major layout sections
gap-12  // 48px  - Page sections

// Padding scale
p-2     // 8px   - Compact padding
p-4     // 16px  - Standard padding (cards, buttons)
p-6     // 24px  - Generous padding (card content)
py-6    // 24px vertical only
px-4    // 16px horizontal only

// Margins
mx-24   // 96px horizontal - main content margins
my-8    // 32px vertical - section spacing
```

### Usage Examples

```tsx
// Card grid with section spacing
<div className="grid gap-6 md:grid-cols-3">
  {/* gap-6 = 24px between cards */}
</div>

// Form fields
<div className="space-y-4">
  {/* 16px vertical spacing between fields */}
</div>

// Icon with text
<div className="flex items-center gap-2">
  <Icon className="h-5 w-5" />
  <span>Label</span>
</div>

// Content sections
<div className="space-y-8">
  <Section1 />
  <Section2 />
</div>
```

---

## 🖼️ Border & Shadow System

### Borders

```tsx
// Standard border
border              // 1px solid border
border-[1px]        // Explicit 1px border

// Specific sides
border-t            // Top border only
border-b            // Bottom border only
border-l            // Left border only
border-r            // Right border only

// Border radius
rounded-lg          // 8px - Standard (cards, buttons)
rounded-md          // 6px - Small elements
rounded-full        // 9999px - Pills, avatars
rounded-xl          // 12px - Large cards

// Border colors
border              // Uses CSS variable --border
border-primary/50   // Primary color at 50% opacity
dark:border-t-[#353346] // Custom color for dark mode
```

### Shadows

```tsx
// Subtle elevation
shadow-sm           // Minimal shadow
shadow              // Standard shadow (cards)
shadow-md           // Medium elevation
shadow-lg           // High elevation (modals)

// No shadow
shadow-none         // Remove shadow
```

---

## 🎭 Interactive States

### Hover Effects

```tsx
// Standard hover
hover:bg-muted                    // Background change
hover:border-primary/50           // Border highlight
hover:text-foreground             // Text color change

// Smooth transitions
transition-colors                  // Color transitions
transition-all                     // All properties
transition-opacity                 // Opacity only

// Group hover (parent hover affects child)
<div className="group">
  <div className="opacity-20 group-hover:opacity-40 transition-opacity" />
</div>
```

### Focus States

```tsx
// Accessible focus rings
focus-visible:outline-none        // Remove default outline
focus-visible:ring-2              // Add custom ring
focus-visible:ring-ring           // Use theme ring color
focus-visible:ring-offset-2       // Ring offset

// Example
<Input className="focus-visible:ring-2 focus-visible:ring-primary" />
```

### Active/Selected States

```tsx
// Navigation item selected
className={cn(
  'base-classes',
  isActive && 'dark:bg-[#2F006B] bg-[#EEE0FF]'
)}

// Button pressed
active:scale-95 transition-transform

// Checkbox/switch checked
data-[state=checked]:bg-primary
```

---

## 📊 Data Visualization

### Charts (Recharts)

```tsx
import { 
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer 
} from "recharts"

// Standard chart wrapper
<Card>
  <CardHeader>
    <CardTitle>Chart Title</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
          <XAxis 
            dataKey="month" 
            stroke="#a3a3a3"
            fontSize={12}
          />
          <YAxis 
            stroke="#a3a3a3"
            fontSize={12}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#0a0a0a',
              border: '1px solid #262626',
              borderRadius: '8px'
            }}
          />
          <Bar 
            dataKey="value" 
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </CardContent>
</Card>
```

### Stat Cards

```tsx
<div className="grid gap-4 md:grid-cols-4">
  {stats.map(stat => (
    <Card key={stat.label}>
      <CardContent className="pt-6">
        <div className="space-y-2">
          <p className="text-sm font-light text-gray-300">{stat.label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold">{stat.value}</p>
            {stat.change && (
              <Badge className={stat.change > 0 ? "bg-green-500" : "bg-red-500"}>
                {stat.change > 0 ? "↑" : "↓"} {Math.abs(stat.change)}%
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

---

## 🎯 Icon System

### Icon Sizing

```tsx
import { Icon } from "lucide-react"

// Standard sizes
<Icon className="h-4 w-4" />   // 16px - Small (inline text)
<Icon className="h-5 w-5" />   // 20px - Standard (buttons, labels)
<Icon className="h-6 w-6" />   // 24px - Feature icons
<Icon className="h-8 w-8" />   // 32px - Large (stats, empty states)
<Icon className="h-12 w-12" /> // 48px - Hero icons
```

### Icon with Text

```tsx
// Standard pattern
<div className="flex items-center gap-2">
  <Calendar className="h-5 w-5" />
  <span>Calendar</span>
</div>

// Button with icon
<Button>
  <Plus className="h-4 w-4 mr-2" />
  Create New
</Button>

// Card title with icon
<CardTitle className="flex items-center gap-2">
  <Workflow className="h-5 w-5" />
  Workflows
</CardTitle>
```

---

## ✅ Best Practices Checklist

### Before Building a New Page

- [ ] Use `dark:bg-black` for main backgrounds
- [ ] Wrap content in `Card` components with `border` and `rounded-lg`
- [ ] Apply consistent spacing: `gap-4` for items, `gap-6` for sections
- [ ] Use `text-muted-foreground` for secondary text
- [ ] Include loading states with `<Loader2 className="animate-spin" />`
- [ ] Add empty states with icons and CTAs
- [ ] Implement error handling with `Alert` component
- [ ] Use `cn()` helper for conditional classes
- [ ] Add tooltips to icon-only buttons
- [ ] Ensure responsive layouts with `md:` breakpoints

### Component Checklist

- [ ] Import `cn` from `@/lib/utils` for class merging
- [ ] Use shadcn/ui components from `@/components/ui/`
- [ ] Add proper TypeScript types
- [ ] Include `"use client"` directive only when needed
- [ ] Handle loading, error, and empty states
- [ ] Use proper semantic HTML (headers, main, nav, etc.)
- [ ] Ensure keyboard accessibility (focus states)
- [ ] Add ARIA labels where needed

### Color Usage

- [ ] Use CSS variables (e.g., `bg-background`, `text-foreground`)
- [ ] Apply custom hex colors only for brand accents
- [ ] Maintain high contrast (min 4.5:1 ratio)
- [ ] Use `opacity-*` for subtle overlays
- [ ] Test in dark mode (primary focus)

---

## 🎪 Example: Complete Page Template

```tsx
"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Loader2, Inbox } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

export default function ExamplePage() {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch data
    fetchItems()
  }, [])

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="sticky top-0 z-[10] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="text-2xl font-semibold">Page Title</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-full bg-muted px-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
                className="border-none bg-transparent focus-visible:ring-0" 
              />
            </div>
            <Button className="bg-[#0E78F9] hover:bg-[#0E78F9]/90">
              <Plus className="h-4 w-4 mr-2" />
              Create New
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-6 overflow-y-auto mx-24">
        {/* Error State */}
        <Alert variant="destructive" className={cn(!error && "hidden", "mb-6")}>
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12 text-muted-foreground">
            <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No items found</h3>
            <p className="text-sm mb-4">Get started by creating your first item</p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Item
            </Button>
          </div>
        ) : (
          /* Content Grid */
          <div className="grid gap-6 md:grid-cols-3">
            {items.map(item => (
              <Card key={item.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Card content */}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
```

---

## 🔗 Quick Reference

### Essential Imports

```tsx
// Layout & structure
import { cn } from "@/lib/utils"

// UI components
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Icons
import { Loader2, Plus, Search, AlertCircle } from "lucide-react"

// Forms
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
```

### Common Class Combinations

```tsx
// Card wrapper
"rounded-lg border bg-card p-6"

// Page header
"sticky top-0 z-[10] w-full border-b bg-background/95 backdrop-blur"

// Button primary
"bg-[#0E78F9] hover:bg-[#0E78F9]/90"

// Hover card
"hover:border-primary/50 transition-colors"

// Centered loader
"flex items-center justify-center p-8"

// Icon with text
"flex items-center gap-2"

// Grid layout
"grid gap-6 md:grid-cols-3"

// Muted text
"text-sm text-muted-foreground"
```

