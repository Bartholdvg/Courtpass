import { createClient } from "@supabase/supabase-js"

export interface CourtPassUser {
  id: string
  email: string
  name: string
  points: number
  rank: string
  level: string
  location: string
  credits: number
  plan: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aplxpnqkkamolmqzuuon.supabase.co"
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbHhwbnFra2Ftb2xtcXp1dW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NjM5NTAsImV4cCI6MjA4OTMzOTk1MH0.o9Z4lYNgA_Ym36x0S48OzaK6oD63kdZikD3j4uC_zHY"

const AUTH_STORAGE_KEY = "courtpass-auth-user"

export interface RecoveryParams {
  accessToken?: string | null
  refreshToken?: string | null
  tokenHash?: string | null
  code?: string | null
  type?: string | null
  errorCode?: string | null
  errorDescription?: string | null
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: false,
  },
})

export const getRecoveryParamsFromLocation = (
  location?: Pick<Location, "hash" | "search"> | null,
): RecoveryParams => {
  const hash = location?.hash?.replace(/^#/, "") || ""
  const search = location?.search?.replace(/^\?/, "") || ""
  const hashParams = new URLSearchParams(hash)
  const searchParams = new URLSearchParams(search)

  const getParam = (name: string) => hashParams.get(name) || searchParams.get(name)

  return {
    accessToken: getParam("access_token"),
    refreshToken: getParam("refresh_token"),
    tokenHash: getParam("token_hash"),
    code: getParam("code"),
    type: getParam("type"),
    errorCode: getParam("error_code"),
    errorDescription: getParam("error_description"),
  }
}

export const getRankFromPoints = (points: number) => {
  if (points >= 250) return "Elite"
  if (points >= 150) return "Pro"
  if (points >= 80) return "Gevorderd"
  return "Rookie"
}

export const buildStoredUser = (email: string, name: string, overrides: Partial<CourtPassUser> = {}): CourtPassUser => ({
  id: overrides.id || `local-${email || "player"}`,
  email,
  name,
  points: overrides.points ?? 120,
  rank: overrides.rank ?? getRankFromPoints(overrides.points ?? 120),
  level: overrides.level ?? "Intermediate",
  location: overrides.location ?? "Amsterdam",
  credits: overrides.credits ?? 8,
  plan: overrides.plan ?? "Pro",
})

export const AUTH_CHANGED_EVENT = "courtpass-auth-changed"

const notifyAuthChanged = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

export const storeAuthUser = (user: Partial<CourtPassUser> & { email: string; name: string }) => {
  if (typeof window === "undefined") return null
  const nextUser = buildStoredUser(user.email, user.name, user)
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser))
  notifyAuthChanged()
  return nextUser
}

export const loadStoredUser = (): CourtPassUser | null => {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as CourtPassUser
    return parsed?.email ? parsed : null
  } catch {
    return null
  }
}

export const clearStoredUser = () => {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(AUTH_STORAGE_KEY)
  notifyAuthChanged()
}

export const updateStoredUser = (updates: Partial<CourtPassUser>) => {
  const current = loadStoredUser()
  if (!current) return null
  const nextUser = {
    ...current,
    ...updates,
    rank: updates.points ? getRankFromPoints(updates.points) : current.rank,
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser))
    notifyAuthChanged()
  }
  return nextUser
}

export const getUserDisplayName = (user?: CourtPassUser | null) => {
  if (!user) return "Speler"
  return user.name || user.email.split("@")[0] || "Speler"
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })
  if (error) throw error
  return data
}

export const requestPasswordReset = async (email: string) => {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "https://courtpass.nl")
  const normalizedSiteUrl = siteUrl.replace(/\/$/, "")
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""
  const redirectTo = `${normalizedSiteUrl}${basePath}/reset-password/`
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
  return data
}

/** Starts the Google OAuth redirect. Since the client has
 * detectSessionInUrl disabled (to not clash with the password-recovery
 * link parsing on the login page), the caller is responsible for
 * exchanging the ?code= that comes back — see login/page.tsx. */
export const signInWithGoogle = async (redirectTo: string) => {
  const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })
  if (error) throw error
}

/** "azure" is Supabase's provider id for Microsoft/Outlook accounts — same
 * OAuth code-exchange path as Google, see the login page's shared ?code=
 * handling. Requires an Azure AD app registration configured as the
 * "Azure" provider in the Supabase dashboard (free tier is enough for
 * basic sign-in), same manual step Google needed. */
export const signInWithMicrosoft = async (redirectTo: string) => {
  const { error } = await supabase.auth.signInWithOAuth({ provider: "azure", options: { redirectTo, scopes: "email" } })
  if (error) throw error
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
