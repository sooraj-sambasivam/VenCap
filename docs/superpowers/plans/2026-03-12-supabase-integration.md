# Supabase Integration — Auth, Cloud Saves, Leaderboard

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase backend for authentication, cloud game saves, and a global leaderboard.

**Architecture:** Offline-first approach — localStorage remains the primary store, Supabase syncs when authenticated. Auth is optional (guest play stays fully functional). Cloud saves replace the 3-slot local system for logged-in users. Leaderboard becomes global with local fallback.

**Tech Stack:** @supabase/supabase-js, Supabase Auth (email + Google OAuth), Supabase Database (Postgres), Row Level Security (RLS)

---

## File Structure

| File                                | Responsibility                                                  |
| ----------------------------------- | --------------------------------------------------------------- |
| `src/lib/supabase.ts`               | **Create** — Supabase client singleton                          |
| `src/engine/auth.ts`                | **Create** — Auth context provider, hook, session management    |
| `src/engine/cloudSaves.ts`          | **Create** — CRUD for cloud saves (Supabase)                    |
| `src/engine/leaderboard.ts`         | **Modify** — Add cloud leaderboard functions alongside local    |
| `src/engine/types.ts`               | **Modify** — Add CloudSave, Profile, auth-related types         |
| `src/engine/gameState.ts`           | **Modify** — Add cloud save/load actions to store               |
| `src/components/AuthDialog.tsx`     | **Create** — Login/signup modal (email + Google)                |
| `src/components/SaveLoadDialog.tsx` | **Modify** — Add cloud saves tab for authenticated users        |
| `src/pages/Results.tsx`             | **Modify** — Submit to global leaderboard, show global rankings |
| `src/pages/Index.tsx`               | **Modify** — Add login button to Step 1                         |
| `src/App.tsx`                       | **Modify** — Wrap with AuthProvider                             |
| `supabase/schema.sql`               | **Create** — Database schema + RLS policies                     |

---

## Chunk 1: Foundation — Supabase Client + Database Schema + Types

### Task 1: Database Schema

**Files:**

- Create: `supabase/schema.sql`

- [ ] **Step 1: Write the database schema SQL**

```sql
-- Run this in Supabase SQL Editor

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  avatar_url text,
  total_games integer default 0,
  best_score numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- CLOUD SAVES
-- ============================================================
create table public.cloud_saves (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  fund_name text not null,
  month integer not null,
  tvpi_gross numeric not null,
  game_state jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_cloud_saves_user on public.cloud_saves(user_id);

-- ============================================================
-- LEADERBOARD
-- ============================================================
create table public.leaderboard_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  fund_name text not null,
  final_score numeric not null,
  grade text not null,
  tvpi_net numeric not null,
  irr_net numeric not null,
  total_exits integer not null,
  unicorn_count integer not null,
  scenario_id text,
  scenario_won boolean,
  difficulty text not null,
  rebirth_count integer default 0,
  duration_months integer not null,
  completed_at timestamptz default now()
);

create index idx_leaderboard_score on public.leaderboard_entries(final_score desc);
create index idx_leaderboard_user on public.leaderboard_entries(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Profiles: users can read all, update own
alter table public.profiles enable row level security;
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Cloud saves: users can CRUD own saves only
alter table public.cloud_saves enable row level security;
create policy "Users can view own saves" on public.cloud_saves
  for select using (auth.uid() = user_id);
create policy "Users can create own saves" on public.cloud_saves
  for insert with check (auth.uid() = user_id);
create policy "Users can update own saves" on public.cloud_saves
  for update using (auth.uid() = user_id);
create policy "Users can delete own saves" on public.cloud_saves
  for delete using (auth.uid() = user_id);

-- Leaderboard: everyone can read, users can insert own
alter table public.leaderboard_entries enable row level security;
create policy "Leaderboard is viewable by everyone" on public.leaderboard_entries
  for select using (true);
create policy "Users can submit own scores" on public.leaderboard_entries
  for insert with check (auth.uid() = user_id);
```

- [ ] **Step 2: Run the SQL in Supabase dashboard**

Go to Supabase Dashboard → SQL Editor → paste and run. Verify all 3 tables appear under Table Editor.

- [ ] **Step 3: Enable Google OAuth in Supabase**

Go to Authentication → Providers → Google → Enable. Add OAuth credentials from Google Cloud Console.

- [ ] **Step 4: Commit schema file**

```bash
git add supabase/schema.sql
git commit -m "chore: add Supabase database schema for auth, saves, leaderboard"
```

---

### Task 2: Supabase Client + Types

**Files:**

- Create: `src/lib/supabase.ts`
- Modify: `src/engine/types.ts`

- [ ] **Step 1: Create Supabase client**

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing — cloud features disabled");
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
```

- [ ] **Step 2: Add cloud types to types.ts**

Append to `src/engine/types.ts`:

```typescript
// ============================================================
// SUPABASE / CLOUD TYPES
// ============================================================

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  total_games: number;
  best_score: number;
  created_at: string;
  updated_at: string;
}

export interface CloudSave {
  id: string;
  user_id: string;
  name: string;
  fund_name: string;
  month: number;
  tvpi_gross: number;
  created_at: string;
  updated_at: string;
}

export interface CloudLeaderboardEntry {
  id: string;
  user_id: string;
  fund_name: string;
  final_score: number;
  grade: string;
  tvpi_net: number;
  irr_net: number;
  total_exits: number;
  unicorn_count: number;
  scenario_id: string | null;
  scenario_won: boolean | null;
  difficulty: string;
  rebirth_count: number;
  duration_months: number;
  completed_at: string;
  // Joined from profiles
  profiles?: { username: string | null };
}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc -b`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase.ts src/engine/types.ts
git commit -m "feat: add Supabase client and cloud types"
```

---

## Chunk 2: Authentication — Provider, Hook, UI

### Task 3: Auth Context Provider

**Files:**

- Create: `src/engine/auth.ts`

- [ ] **Step 1: Create auth provider with session management**

Create `src/engine/auth.ts`:

```typescript
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: "Supabase not configured" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: "Supabase not configured" };
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return { error: "Supabase not configured" };
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext value={{
      user,
      session,
      loading,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
    }}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`

- [ ] **Step 3: Commit**

```bash
git add src/engine/auth.ts
git commit -m "feat: add AuthProvider with email + Google OAuth support"
```

---

### Task 4: Auth Dialog UI

**Files:**

- Create: `src/components/AuthDialog.tsx`

- [ ] **Step 1: Create login/signup dialog component**

Create `src/components/AuthDialog.tsx`:

```tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/engine/auth";
import { LogIn, UserPlus, Chrome } from "lucide-react";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fn = mode === "login" ? signInWithEmail : signUpWithEmail;
    const { error: err } = await fn(email, password);

    setLoading(false);
    if (err) {
      setError(err);
    } else {
      onOpenChange(false);
      setEmail("");
      setPassword("");
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const { error: err } = await signInWithGoogle();
    if (err) setError(err);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="outline" className="w-full" onClick={handleGoogle}>
            <Chrome className="mr-2 h-4 w-4" />
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                or
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                minLength={6}
                required
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {mode === "login" ? (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  {loading ? "Signing in..." : "Sign In"}
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {loading ? "Creating account..." : "Sign Up"}
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                No account?{" "}
                <button
                  className="underline hover:text-foreground"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  className="underline hover:text-foreground"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`

- [ ] **Step 3: Commit**

```bash
git add src/components/AuthDialog.tsx
git commit -m "feat: add AuthDialog with email + Google login UI"
```

---

### Task 5: Wire Auth into App

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/pages/Index.tsx`

- [ ] **Step 1: Wrap App with AuthProvider**

In `src/App.tsx`, import `AuthProvider` from `@/engine/auth` and wrap the outermost component:

```tsx
import { AuthProvider } from "@/engine/auth";

// In the return, wrap everything:
<AuthProvider>
  <BrowserRouter>...existing content...</BrowserRouter>
</AuthProvider>;
```

- [ ] **Step 2: Add login button to Index.tsx Step 1**

In `src/pages/Index.tsx`, add an auth button in the top-right of the wizard. Import `useAuth` and `AuthDialog`. Show a "Sign In" button when not authenticated, or user email + "Sign Out" when authenticated:

```tsx
import { useAuth } from "@/engine/auth";
import { AuthDialog } from "@/components/AuthDialog";

// Inside the component:
const { user, signOut } = useAuth();
const [authOpen, setAuthOpen] = useState(false);

// In the header area of Step 1:
{
  user ? (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>{user.email}</span>
      <Button variant="ghost" size="sm" onClick={() => signOut()}>
        Sign Out
      </Button>
    </div>
  ) : (
    <Button variant="outline" size="sm" onClick={() => setAuthOpen(true)}>
      <LogIn className="mr-2 h-4 w-4" /> Sign In
    </Button>
  );
}
<AuthDialog open={authOpen} onOpenChange={setAuthOpen} />;
```

- [ ] **Step 3: Verify it compiles and renders**

Run: `npx tsc -b && npx vite build`

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/pages/Index.tsx
git commit -m "feat: wire AuthProvider into App and add login to setup wizard"
```

---

## Chunk 3: Cloud Saves

### Task 6: Cloud Save CRUD Functions

**Files:**

- Create: `src/engine/cloudSaves.ts`

- [ ] **Step 1: Create cloud save module**

Create `src/engine/cloudSaves.ts`:

```typescript
import { supabase } from "@/lib/supabase";
import type { CloudSave } from "./types";

export async function getCloudSaves(userId: string): Promise<CloudSave[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("cloud_saves")
    .select(
      "id, user_id, name, fund_name, month, tvpi_gross, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch cloud saves:", error.message);
    return [];
  }
  return data ?? [];
}

export async function saveToCloud(
  userId: string,
  name: string,
  fundName: string,
  month: number,
  tvpiGross: number,
  gameState: Record<string, unknown>,
): Promise<CloudSave | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("cloud_saves")
    .insert({
      user_id: userId,
      name,
      fund_name: fundName,
      month,
      tvpi_gross: tvpiGross,
      game_state: gameState,
    })
    .select(
      "id, user_id, name, fund_name, month, tvpi_gross, created_at, updated_at",
    )
    .single();

  if (error) {
    console.error("Failed to save to cloud:", error.message);
    return null;
  }
  return data;
}

export async function loadFromCloud(
  saveId: string,
): Promise<Record<string, unknown> | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("cloud_saves")
    .select("game_state")
    .eq("id", saveId)
    .single();

  if (error) {
    console.error("Failed to load cloud save:", error.message);
    return null;
  }
  return data?.game_state as Record<string, unknown> | null;
}

export async function updateCloudSave(
  saveId: string,
  name: string,
  fundName: string,
  month: number,
  tvpiGross: number,
  gameState: Record<string, unknown>,
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("cloud_saves")
    .update({
      name,
      fund_name: fundName,
      month,
      tvpi_gross: tvpiGross,
      game_state: gameState,
      updated_at: new Date().toISOString(),
    })
    .eq("id", saveId);

  if (error) {
    console.error("Failed to update cloud save:", error.message);
    return false;
  }
  return true;
}

export async function deleteCloudSave(saveId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("cloud_saves")
    .delete()
    .eq("id", saveId);

  if (error) {
    console.error("Failed to delete cloud save:", error.message);
    return false;
  }
  return true;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`

- [ ] **Step 3: Commit**

```bash
git add src/engine/cloudSaves.ts
git commit -m "feat: add cloud save CRUD functions for Supabase"
```

---

### Task 7: Integrate Cloud Saves into SaveLoadDialog

**Files:**

- Modify: `src/components/SaveLoadDialog.tsx`

- [ ] **Step 1: Add cloud saves tab to SaveLoadDialog**

Extend `SaveLoadDialog.tsx` to show two tabs when authenticated: "Local Saves" (existing 3-slot UI) and "Cloud Saves" (unlimited, fetched from Supabase).

Key changes:

- Import `useAuth` from `@/engine/auth`
- Import cloud save functions from `@/engine/cloudSaves`
- Import `Tabs, TabsList, TabsTrigger, TabsContent` from `@/components/ui/tabs`
- Add state: `cloudSaves: CloudSave[]`, `cloudLoading: boolean`
- Fetch cloud saves on mount when `user` is present
- Cloud tab shows a list of saves with Load / Delete buttons + "New Save" input
- Cloud saves are unlimited (no 3-slot constraint)

For the cloud save card, display: name, fundName, month (formatted as "Year X, Month Y"), tvpiGross, updated_at timestamp.

"Save Current Game" button at top of cloud tab: prompts for name, calls `saveToCloud()` with serialized state (same serialization as `saveToSlot` — strip functions and history).

"Load" on a cloud save: calls `loadFromCloud(saveId)`, then `set()` on the Zustand store (same pattern as `loadFromSlot`).

- [ ] **Step 2: Verify it compiles and renders**

Run: `npx tsc -b && npx vite build`

- [ ] **Step 3: Commit**

```bash
git add src/components/SaveLoadDialog.tsx
git commit -m "feat: add cloud saves tab to SaveLoadDialog for authenticated users"
```

---

## Chunk 4: Global Leaderboard

### Task 8: Cloud Leaderboard Functions

**Files:**

- Modify: `src/engine/leaderboard.ts`

- [ ] **Step 1: Add cloud leaderboard functions**

Extend `src/engine/leaderboard.ts` with cloud functions (keep existing local functions intact):

```typescript
import { supabase } from "@/lib/supabase";
import type { CloudLeaderboardEntry } from "./types";

export async function getCloudLeaderboard(
  limit = 50,
  scenarioId?: string,
  difficulty?: string,
): Promise<CloudLeaderboardEntry[]> {
  if (!supabase) return [];

  let query = supabase
    .from("leaderboard_entries")
    .select("*, profiles(username)")
    .order("final_score", { ascending: false })
    .limit(limit);

  if (scenarioId) query = query.eq("scenario_id", scenarioId);
  if (difficulty) query = query.eq("difficulty", difficulty);

  const { data, error } = await query;
  if (error) {
    console.error("Failed to fetch leaderboard:", error.message);
    return [];
  }
  return data ?? [];
}

export async function submitToCloudLeaderboard(
  userId: string,
  entry: Omit<
    CloudLeaderboardEntry,
    "id" | "user_id" | "completed_at" | "profiles"
  >,
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("leaderboard_entries")
    .insert({ ...entry, user_id: userId });

  if (error) {
    console.error("Failed to submit to leaderboard:", error.message);
    return false;
  }
  return true;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`

- [ ] **Step 3: Commit**

```bash
git add src/engine/leaderboard.ts
git commit -m "feat: add cloud leaderboard query and submission functions"
```

---

### Task 9: Update Results Page for Global Leaderboard

**Files:**

- Modify: `src/pages/Results.tsx`

- [ ] **Step 1: Add global leaderboard display to Results page**

Key changes to `src/pages/Results.tsx`:

- Import `useAuth` and cloud leaderboard functions
- On mount, if user is authenticated:
  - Call `submitToCloudLeaderboard()` (instead of just local `addToLeaderboard()`)
  - Call `getCloudLeaderboard()` to fetch global rankings
  - Update profile stats: increment `total_games`, update `best_score` if higher
- Add tabs to leaderboard section: "Local" (existing) and "Global" (cloud)
- Global leaderboard table shows: rank, username (from joined profiles), fundName, score, grade, TVPI, IRR, difficulty
- If not authenticated, show a "Sign in to compete globally" prompt in the Global tab
- Keep local leaderboard submission as fallback (always runs)

- [ ] **Step 2: Verify it compiles and builds**

Run: `npx tsc -b && npx vite build`

- [ ] **Step 3: Commit**

```bash
git add src/pages/Results.tsx
git commit -m "feat: add global leaderboard display with filters on Results page"
```

---

## Chunk 5: Polish + Deploy

### Task 10: Add Auth to NavBar

**Files:**

- Modify: `src/components/NavBar.tsx` (or wherever the nav lives)

- [ ] **Step 1: Add user avatar / sign-in button to NavBar**

Show a small user indicator in the NavBar:

- Authenticated: user email (truncated) + avatar circle + sign-out button
- Guest: "Sign In" button that opens AuthDialog

- [ ] **Step 2: Commit**

```bash
git add src/components/NavBar.tsx
git commit -m "feat: add auth status indicator to NavBar"
```

---

### Task 11: Add Supabase env vars to Vercel

- [ ] **Step 1: Set env vars on Vercel**

```bash
npx vercel env add VITE_SUPABASE_URL production
npx vercel env add VITE_SUPABASE_ANON_KEY production
```

- [ ] **Step 2: Update .env.example**

Add the Supabase vars to `.env.example` (without real values):

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

- [ ] **Step 3: Add Supabase redirect URL**

In Supabase Dashboard → Authentication → URL Configuration:

- Site URL: `https://ven-cap.vercel.app`
- Redirect URLs: `https://ven-cap.vercel.app`, `http://localhost:5173`

- [ ] **Step 4: Commit and deploy**

```bash
git add .env.example .gitignore
git commit -m "chore: add Supabase env vars to .env.example and update .gitignore"
npx vercel --prod --yes
```

---

### Task 12: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All 269+ tests pass (cloud functions are guarded by `if (!supabase)` so tests work without credentials)

- [ ] **Step 2: Run type check**

Run: `npx tsc -b`
Expected: 0 errors

- [ ] **Step 3: Production build**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 4: Manual smoke test**

1. Open app → verify guest play works unchanged
2. Click Sign In → create account with email
3. Start a game → save to cloud → verify in Supabase dashboard
4. Load cloud save → verify state restored
5. Complete a game → verify score appears in global leaderboard
6. Sign out → verify local play still works
