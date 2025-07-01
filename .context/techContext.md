# Technical Context - Secret Garden Circles App

## Technology Stack

### Frontend Framework
- **SvelteKit**: Modern Svelte framework with file-based routing
- **Svelte 5**: Using latest Svelte features including runes ($state, $derived, etc.)
- **TypeScript**: Full TypeScript support throughout the application

### Styling & UI
- **Tailwind CSS**: Utility-first CSS framework
- **DaisyUI**: Component library built on Tailwind
- **DM Sans Font**: Custom Google Font integration
- **Custom Theme**: Configured DaisyUI theme with purple primary colors

### Current DaisyUI Configuration
```javascript
daisyui: {
  themes: [
    {
      mytheme: {
        primary: '#38318b',
        secondary: '#4052d6',
        accent: '#37cdbe',
        neutral: '#3d4451',
        'base-100': '#ffffff',
      },
    },
    'dark',
    'cupcake',
  ],
  darkTheme: 'light',
}
```

### Development Environment
- **Node.js**: Modern Node environment
- **npm**: Package management
- **Vite**: Build tool and dev server
- **Development Server**: `npm run dev`

## Project Structure

### Key Directories
- `src/lib/components/` - Reusable Svelte components
- `src/lib/stores/` - Svelte stores for state management
- `src/routes/` - SvelteKit file-based routing
- `src/lib/flows/` - Multi-step user flows
- `src/lib/utils/` - Utility functions and helpers

### Component Architecture
- **Modular Design**: Components are well-separated and reusable
- **Props Interface**: TypeScript interfaces for component props
- **State Management**: Mix of local state and global stores
- **Flow Components**: Multi-step processes broken into separate components

## Current Implementation Details

### Styling Approach
- **Utility-First**: Heavy use of Tailwind utility classes
- **DaisyUI Components**: Leveraging DaisyUI's pre-built components
- **Custom CSS**: Minimal custom CSS, mostly in component `<style>` blocks
- **Responsive Design**: Mobile-first responsive patterns

### Component Patterns
- **ActionButton**: Stateful button with loading, error, and success states
- **PopUp**: Modal system with stack-based navigation
- **Layout**: Centralized layout with header, main content, and footer

### State Management
- **Svelte Stores**: Global state management
- **Local State**: Component-level state using Svelte 5 runes
- **Reactive Patterns**: Heavy use of $derived and $effect

## Development Constraints

### Must Maintain
- Existing functionality and user flows
- Current routing structure
- State management patterns
- TypeScript interfaces and types

### Can Modify
- Visual appearance and styling
- Component markup and structure
- CSS classes and styling approaches
- DaisyUI theme configuration

### Dependencies
- All existing npm dependencies should remain
- Can add new dependencies if needed for UI enhancements
- Must maintain compatibility with current Circles SDK integration

## Build & Deployment
- **Build Command**: `npm run build`
- **Dev Server**: `npm run dev`
- **Production**: Static site generation with SvelteKit adapter
- **Deployment**: Currently deployed to DigitalOcean App Platform
