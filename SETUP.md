# Next.js Setup Instructions for Courtpass

## ⚠️ Prerequisites

Before starting, you need **Node.js 18+** installed on your system.

### Install Node.js

**Option 1: Download Installer** (Recommended for Mac)
1. Go to https://nodejs.org/
2. Download the LTS version (v20.10.0 or newer)
3. Run the installer and follow the steps
4. Verify installation:
   ```bash
   node --version
   npm --version
   ```

**Option 2: Use Homebrew** (if installed)
```bash
brew install node
```

**Option 3: Use NVM** (Node Version Manager)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

This will install:
- Next.js
- React 18
- Tailwind CSS
- Framer Motion (animations)
- Supabase client
- And more...

### 2. Configure Environment Variables
```bash
# Copy the example file
cp .env.example .env.local

# Edit it with your Supabase credentials
# nano .env.local  (or use your favorite editor)
```

Add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Get these from: https://supabase.com/dashboard/project/[your-project]/settings/api

### 3. Start Development Server
```bash
npm run dev
```

Output should show:
```
> ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

### 4. Open in Browser
Visit **http://localhost:3000**

The page auto-reloads as you edit files. Try changing something in `app/page.tsx`!

---

## 🎨 What You Get

### Features Included:
✅ **Hamburger Menu** - Smooth slide-in animation from right  
✅ **Scroll Animations** - Apple-style fade-in on scroll  
✅ **Mobile Responsive** - Works on all devices  
✅ **Dark Theme** - Professional tennis club aesthetic  
✅ **TypeScript** - Type-safe code  
✅ **Tailwind CSS** - Utility-first styling  

### Pages Already Built:
- 🏠 Home (with hero + animations)
- 🎾 Clubs listing
- 🔐 Login/Register
- 📊 Dashboard
- 💳 Subscription management
- ✅ Payment success
- 🛠️ Club admin panel

---

## 📁 Project Structure

```
app/
  ├── layout.tsx           # Root layout
  ├── page.tsx             # Home page
  ├── login/page.tsx       # Auth
  ├── clubs/page.tsx       # Clubs
  ├── dashboard/page.tsx   # User dashboard
  └── ...

components/
  ├── Navigation.tsx       # Header with hamburger
  ├── MobileMenu.tsx       # Slide-in menu
  └── ScrollObserver.tsx   # Scroll animations

lib/
  ├── supabase.ts          # Auth helpers
  └── types.ts             # TypeScript types

tailwind.config.ts         # Color config
globals.css                # Global styles
```

---

## 🔧 Development Commands

```bash
npm run dev       # Start development server (port 3000)
npm run build     # Create production build
npm start         # Run production build
npm run lint      # Check code with ESLint
```

---

## 🎬 Working with Animations

### Mobile Menu (Slide-in)
Located in: `components/MobileMenu.tsx`
- Uses Framer Motion for smooth animations
- Closes on ESC or outside click

### Scroll Animations (Fade-up)
Located in: `components/ScrollObserver.tsx`
- Triggers when element enters viewport
- Staggered delays for flow effect
- Only animates once per load

### Customize Animations
Edit `tailwind.config.ts`:
```ts
keyframes: {
  "slide-in-left": {
    "0%": { transform: "translateX(-100%)" },
    "100%": { transform: "translateX(0)" },
  },
  // ...
}
```

---

## 🔐 Supabase Integration

### Setup Auth
1. Create Supabase project at supabase.com
2. Get URL and Anon Key from Settings > API
3. Add to `.env.local`

### Example: Quick Login
```typescript
import { signIn } from '@/lib/supabase'

const handleLogin = async (email: string, password: string) => {
  try {
    const { user } = await signIn(email, password)
    console.log('Logged in:', user.email)
  } catch (error) {
    console.error('Login failed:', error)
  }
}
```

---

## 🚨 Troubleshooting

### "npm: command not found"
→ Node.js not installed. Download from nodejs.org

### Port 3000 in use
```bash
npm run dev -- -p 3001   # Use port 3001 instead
```

### Build errors
```bash
rm -rf .next node_modules
npm install
npm run build
```

### Styles not loading
Restart dev server and hard-refresh browser (Cmd+Shift+R)

### Supabase connection fails
Check `.env.local` - make sure you copied variables correctly

---

## 📚 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)
- [Supabase Docs](https://supabase.com/docs)

---

## ⭐ Next Steps

1. ✅ Get the dev server running
2. ✨ Customize colors in `tailwind.config.ts`
3. 🔐 Connect Supabase auth
4. 📱 Test on mobile device
5. 🚀 Deploy to Vercel!

---

## 🚀 Deployment

### Deploy to Vercel (Free)

1. Push to GitHub:
```bash
git add .
git commit -m "Initial commit"
git push
```

2. Go to vercel.com and connect your GitHub repo

3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Click Deploy!

Your site will be live at `your-project.vercel.app` 🎉

---

Questions? Create an issue or check the docs!
