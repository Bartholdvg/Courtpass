# CourtPass Platform - Next.js Version

Ultra-smooth tennis booking platform with stunning scroll animations.

## Features ✨

- 🎨 **Beautiful UI** - Tailwind CSS with custom color system
- ⚡ **Smooth Animations** - Framer Motion + scroll-triggered reveals
- 📱 **Mobile-first** - Responsive hamburger menu with slide-in animation
- 🔐 **Authentication** - Supabase integration
- 🎯 **Apple-style scroll effects** - Staggered fade-in animations
- ⚙️ **Full next.js** - App Router, TypeScript, ESLint

## Project Structure

```
app/
  ├── layout.tsx           # Root layout with navigation
  ├── globals.css          # Global styles
  ├── page.tsx             # Home page
  ├── login/
  │   └── page.tsx         # Login & registration
  ├── clubs/
  │   └── page.tsx         # Clubs listing
  ├── dashboard/
  │   └── page.tsx         # User dashboard
  ├── betalen/
  │   └── page.tsx         # Subscription management
  ├── betaal-succes/
  │   └── page.tsx         # Payment success
  └── club-admin/
      └── page.tsx         # Club admin panel

components/
  ├── Navigation.tsx       # Header with hamburger menu
  ├── MobileMenu.tsx       # Slide-in mobile menu
  └── ScrollObserver.tsx   # Scroll animation wrapper

public/
  └── favicon.svg          # Site icon
```

## Setup

### Prerequisites
- Node.js 18+ (Required for Next.js 14)
- npm or yarn

### Installation

1. **Install Node.js** (if not already installed)
   - Download from https://nodejs.org/
   - Or use a package manager

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   - Visit http://localhost:3000
   - The page will auto-reload as you edit

## Key Technologies

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **Framer Motion** - Advanced animations
- **react-intersection-observer** - Scroll detection
- **Supabase JS** - Backend & auth

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm start            # Run production build locally
npm run lint         # Run ESLint
```

## Animation Features

### 1. Mobile Menu Slide-in
- Smooth slide from right with fade-in
- Closes on click outside or ESC key
- Touch-friendly padding and tap targets

### 2. Scroll-triggered Animations
- Elements fade-up as you scroll
- Staggered delays for flow
- `once: true` - animations only trigger once

### 3. Navigation
- Fixed header with backdrop blur
- Auto-hides mobile nav on link click
- Smooth color transitions on hover

## Customization

### Colors
Edit `tailwind.config.ts`:
```ts
colors: {
  lime: "#BFEF45",
  dark: "#0D1A0F",
  surface: "#132015",
  // ... more colors
}
```

### Animations
Update `tailwind.config.ts` keyframes section or use Framer Motion in components.

### Fonts
Modify `app/layout.tsx` to change Google Fonts imports.

## Future Enhancements

- [ ] Supabase authentication integration
- [ ] Real reservation system
- [ ] Payment processing (Stripe)
- [ ] User profiles
- [ ] Club management dashboard
- [ ] Email notifications

## Troubleshooting

**Build fails?**
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

**Port 3000 already in use?**
- Run on different port: `npm run dev -- -p 3001`

**Styles not loading?**
- Restart dev server
- Clear cache: `npm run build && npm start`

## Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Docker
```bash
docker build -t courtpass .
docker run -p 3000:3000 courtpass
```

## License

Proprietary - CourtPass 2024

## Support

Need help? Check out:
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion)
