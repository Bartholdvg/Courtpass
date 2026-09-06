import { supabase } from "@/lib/supabase"

export interface CreditPack {
  id: string
  name: string
  credits: number
  priceCents: number
  salePriceCents: number | null
  saleUntil: string | null
  paymentLink: string | null
  active: boolean
  sortOrder: number
}

export interface SubscriptionPlan {
  id: string
  name: string
  creditsPerMonth: number
  priceCents: number
  salePriceCents: number | null
  saleUntil: string | null
  paymentLink: string | null
  active: boolean
  mostChosen: boolean
  sortOrder: number
}

export interface UserSubscription {
  id: string
  userId: string
  planId: string
  status: "active" | "cancelled"
  isAnnual: boolean
  startedAt: string
  renewsAt: string
  lastPeriodCredits: number
  cancelledAt: string | null
}

/** The price to actually charge/show right now: the sale price, if one is
 * set and its expiry hasn't passed yet, otherwise the regular price. */
export function effectivePriceCents(item: { priceCents: number; salePriceCents: number | null; saleUntil: string | null }): number {
  if (item.salePriceCents != null && item.saleUntil && new Date(item.saleUntil) > new Date()) {
    return item.salePriceCents
  }
  return item.priceCents
}

export function formatEuros(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`
}

function mapPackRow(row: any): CreditPack {
  return {
    id: row.id,
    name: row.name,
    credits: row.credits,
    priceCents: row.price_cents,
    salePriceCents: row.sale_price_cents,
    saleUntil: row.sale_until,
    paymentLink: row.payment_link,
    active: row.active,
    sortOrder: row.sort_order,
  }
}

function mapPlanRow(row: any): SubscriptionPlan {
  return {
    id: row.id,
    name: row.name,
    creditsPerMonth: row.credits_per_month,
    priceCents: row.price_cents,
    salePriceCents: row.sale_price_cents,
    saleUntil: row.sale_until,
    paymentLink: row.payment_link,
    active: row.active,
    mostChosen: row.most_chosen,
    sortOrder: row.sort_order,
  }
}

function mapSubscriptionRow(row: any): UserSubscription {
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    status: row.status,
    isAnnual: row.is_annual,
    startedAt: row.started_at,
    renewsAt: row.renews_at,
    lastPeriodCredits: row.last_period_credits,
    cancelledAt: row.cancelled_at,
  }
}

export async function fetchActiveCreditPacks(): Promise<CreditPack[]> {
  const { data, error } = await supabase.from("credit_packs").select("*").eq("active", true).order("sort_order")
  if (error) throw error
  return (data ?? []).map(mapPackRow)
}

export async function fetchActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase.from("subscription_plans").select("*").eq("active", true).order("sort_order")
  if (error) throw error
  return (data ?? []).map(mapPlanRow)
}

/* ================= Admin: packs & plans CRUD ================= */

export async function fetchAllCreditPacks(): Promise<CreditPack[]> {
  const { data, error } = await supabase.from("credit_packs").select("*").order("sort_order")
  if (error) throw error
  return (data ?? []).map(mapPackRow)
}

export async function fetchAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase.from("subscription_plans").select("*").order("sort_order")
  if (error) throw error
  return (data ?? []).map(mapPlanRow)
}

export interface CreditPackInput {
  name: string
  credits: number
  priceCents: number
  salePriceCents: number | null
  saleUntil: string | null
  paymentLink: string | null
  active: boolean
  sortOrder: number
}

export interface SubscriptionPlanInput {
  name: string
  creditsPerMonth: number
  priceCents: number
  salePriceCents: number | null
  saleUntil: string | null
  paymentLink: string | null
  active: boolean
  mostChosen: boolean
  sortOrder: number
}

export async function createCreditPack(input: CreditPackInput): Promise<void> {
  const { error } = await supabase.from("credit_packs").insert({
    name: input.name,
    credits: input.credits,
    price_cents: input.priceCents,
    sale_price_cents: input.salePriceCents,
    sale_until: input.saleUntil,
    payment_link: input.paymentLink,
    active: input.active,
    sort_order: input.sortOrder,
  })
  if (error) throw error
}

export async function updateCreditPack(id: string, input: CreditPackInput): Promise<void> {
  const { error } = await supabase
    .from("credit_packs")
    .update({
      name: input.name,
      credits: input.credits,
      price_cents: input.priceCents,
      sale_price_cents: input.salePriceCents,
      sale_until: input.saleUntil,
      payment_link: input.paymentLink,
      active: input.active,
      sort_order: input.sortOrder,
    })
    .eq("id", id)
  if (error) throw error
}

export async function deleteCreditPack(id: string): Promise<void> {
  const { error } = await supabase.from("credit_packs").delete().eq("id", id)
  if (error) throw error
}

export async function createSubscriptionPlan(input: SubscriptionPlanInput): Promise<void> {
  const { error } = await supabase.from("subscription_plans").insert({
    name: input.name,
    credits_per_month: input.creditsPerMonth,
    price_cents: input.priceCents,
    sale_price_cents: input.salePriceCents,
    sale_until: input.saleUntil,
    payment_link: input.paymentLink,
    active: input.active,
    most_chosen: input.mostChosen,
    sort_order: input.sortOrder,
  })
  if (error) throw error
}

export async function updateSubscriptionPlan(id: string, input: SubscriptionPlanInput): Promise<void> {
  const { error } = await supabase
    .from("subscription_plans")
    .update({
      name: input.name,
      credits_per_month: input.creditsPerMonth,
      price_cents: input.priceCents,
      sale_price_cents: input.salePriceCents,
      sale_until: input.saleUntil,
      payment_link: input.paymentLink,
      active: input.active,
      most_chosen: input.mostChosen,
      sort_order: input.sortOrder,
    })
    .eq("id", id)
  if (error) throw error
}

export async function deleteSubscriptionPlan(id: string): Promise<void> {
  const { error } = await supabase.from("subscription_plans").delete().eq("id", id)
  if (error) throw error
}

/* ================= Subscriptions (mine + admin) ================= */

export async function fetchMySubscription(): Promise<UserSubscription | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle()
  if (error) throw error
  return data ? mapSubscriptionRow(data) : null
}

export async function subscribeToPlan(planId: string, isAnnual = false): Promise<void> {
  const { error } = await supabase.rpc("subscribe_to_plan", { p_plan_id: planId, p_is_annual: isAnnual })
  if (error) throw error
}

export async function cancelMySubscription(): Promise<void> {
  const { error } = await supabase.rpc("cancel_my_subscription")
  if (error) throw error
}

/** Platform-admin only. */
export async function fetchAllSubscriptions(): Promise<UserSubscription[]> {
  const { data, error } = await supabase.from("user_subscriptions").select("*").order("started_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapSubscriptionRow)
}

/** Platform-admin only sandbox tool: there's no real calendar to wait a
 * month on, so this simulates one renewal cycle (grant + rollover cap). */
export async function adminSimulateRenewal(subscriptionId: string): Promise<number> {
  const { data, error } = await supabase.rpc("admin_simulate_renewal", { p_subscription_id: subscriptionId })
  if (error) throw error
  return Number(data)
}

/* ================= Pending subscription purchase (sandbox-only) =================
 * Same pattern as savePendingCreditPurchase in lib/booking.ts: no payment
 * webhook exists, so /betalen records the plan about to be bought right
 * before redirecting to Stripe, and /betaal-succes activates it on return.
 * Not secure — see the note in lib/booking.ts, same caveat applies here. */

const PENDING_SUBSCRIPTION_KEY = "courtpass-pending-subscription"
const PENDING_SUBSCRIPTION_MAX_AGE_MS = 30 * 60 * 1000

interface PendingSubscription {
  planId: string
  isAnnual: boolean
  ts: number
}

export function savePendingSubscriptionPurchase(planId: string, isAnnual: boolean): void {
  if (typeof window === "undefined") return
  const purchase: PendingSubscription = { planId, isAnnual, ts: Date.now() }
  window.localStorage.setItem(PENDING_SUBSCRIPTION_KEY, JSON.stringify(purchase))
}

export function consumePendingSubscriptionPurchase(): { planId: string; isAnnual: boolean } | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(PENDING_SUBSCRIPTION_KEY)
  window.localStorage.removeItem(PENDING_SUBSCRIPTION_KEY)
  if (!raw) return null
  try {
    const purchase = JSON.parse(raw) as PendingSubscription
    if (Date.now() - purchase.ts > PENDING_SUBSCRIPTION_MAX_AGE_MS) return null
    return { planId: purchase.planId, isAnnual: purchase.isAnnual }
  } catch {
    return null
  }
}
