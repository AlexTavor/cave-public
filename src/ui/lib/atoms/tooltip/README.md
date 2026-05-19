# SmartTooltip

An intelligent, hoverable tooltip component with automatic positioning and support for nested tooltips.

## Features

- **Smart Positioning**: Automatically positions itself to avoid canvas/viewport boundaries using Floating UI
- **Hover Tunnels**: Can hover over tooltip content without dismissing it, enabling nested tooltips
- **Smooth Animations**: Fade in/out transitions (150ms in, 100ms out)
- **Portal Rendering**: Renders via React Portal to avoid z-index conflicts
- **Nested Support**: Tooltips can contain other tooltips
- **Configurable**: Customizable delays, placement, and offset

## Usage

### Basic Tooltip

```tsx
import { SmartTooltip } from "@/ui/atoms/tooltip";

<SmartTooltip content="This is helpful information">
  <button>Hover me</button>
</SmartTooltip>
```

### Custom Placement

```tsx
<SmartTooltip 
  content="Tooltip content" 
  placement="top"
>
  <button>Hover me</button>
</SmartTooltip>
```

Available placements: `top`, `bottom`, `left`, `right`, `top-start`, `top-end`, etc. (see Floating UI docs)

### Nested Tooltips

```tsx
<SmartTooltip 
  content={
    <div>
      This tooltip contains{" "}
      <SmartTooltip content="I'm nested!">
        <span>another tooltip</span>
      </SmartTooltip>
    </div>
  }
>
  <button>Hover me</button>
</SmartTooltip>
```

### With Card Component

```tsx
import { Card } from "@/ui/atoms/card";

<SmartTooltip 
  content={
    <Card padding="md">
      <strong>Enhanced Info</strong>
      <p>Rich content with organic edges</p>
    </Card>
  }
>
  <button>Hover me</button>
</SmartTooltip>
```

### Custom Delays

```tsx
<SmartTooltip 
  content="Quick tooltip"
  enterDelay={100}  // Show after 100ms
  leaveDelay={50}   // Hide after 50ms
>
  <button>Hover me</button>
</SmartTooltip>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `React.ReactNode` | - | **Required**. The content to display in the tooltip |
| `children` | `React.ReactNode` | - | **Required**. The trigger element |
| `placement` | `Placement` | `"left"` | Preferred tooltip position |
| `enterDelay` | `number` | `200` | Delay in ms before showing |
| `leaveDelay` | `number` | `100` | Delay in ms before hiding |
| `offset` | `number` | `8` | Distance from trigger in pixels |
| `className` | `string` | - | Optional CSS class for tooltip container |
| `disabled` | `boolean` | `false` | If true, tooltip won't show |

## Implementation Details

### Positioning Strategy

Uses Floating UI with these middleware:
- `offset`: Adds space between tooltip and trigger
- `flip`: Flips to opposite side if it would overflow
- `shift`: Slides along the edge to stay in bounds

### Animation Behavior

- Tooltip fades in over 150ms when `isOpen` becomes true
- Tooltip fades out over 100ms when `isOpen` becomes false
- Component stays mounted during fade-out to complete animation
- Unmounts after animation completes to clean up DOM

### Hover Tunnel Implementation

The tooltip uses Floating UI's `useHover` hook with:
- Delays on both enter and leave
- `move: false` to prevent retriggering on mouse movement
- `pointer-events: auto` on tooltip to allow hovering over it

This creates a "tunnel" where the mouse can move from trigger → tooltip without dismissing.

## Testing

See `SmartTooltipTest.tsx` for interactive examples demonstrating:
- All placement options
- Nested tooltips
- Card integration
- Edge case handling

## Architecture Notes

- **Layer**: Atom (generic UI component)
- **Dependencies**: `@floating-ui/react`, `@emotion/react`, `@emotion/styled`
- **Portal**: Uses Floating UI's `FloatingPortal` (renders to document.body)
- **Theme**: Consumes theme for colors, spacing, border radius, z-index
