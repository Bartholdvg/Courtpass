import { supabase } from "@/lib/supabase"

export type SplitStatus = "pending" | "paid" | "covered_by_booker"

export interface BookingSplit {
  id: string
  bookingId: string
  userId: string | null
  guestName: string | null
  credits: number
  status: SplitStatus
  paidAt: string | null
}

export interface SplitParticipantDraft {
  userId: string | null
  guestName: string | null
  credits: number
  /** Client-side only, for the editor UI — not sent to the server. */
  label: string
}

function mapSplitRow(row: any): BookingSplit {
  return {
    id: row.id,
    bookingId: row.booking_id,
    userId: row.user_id,
    guestName: row.guest_name,
    credits: Number(row.credits),
    status: row.status,
    paidAt: row.paid_at,
  }
}

/** Resolves an email to a user id so a booker can add a co-player. Any
 * signed-in user may call this. Returns null if no account exists. */
export async function resolveUserIdByEmail(email: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("resolve_user_id_by_email", { p_email: email.trim() })
  if (error) throw error
  return data ?? null
}

/** Creates the split for a just-confirmed booking. participants must
 * include the booker's own share and sum exactly to the booking price. */
export async function createBookingSplit(
  bookingId: string,
  participants: { userId: string | null; guestName: string | null; credits: number }[],
): Promise<void> {
  const { error } = await supabase.rpc("create_booking_split", {
    p_booking_id: bookingId,
    p_participants: participants.map((p) => ({ user_id: p.userId, guest_name: p.guestName, credits: p.credits })),
  })
  if (error) throw error
}

export async function fetchBookingSplits(bookingId: string): Promise<BookingSplit[]> {
  const { data, error } = await supabase.from("booking_splits").select("*").eq("booking_id", bookingId)
  if (error) throw error
  return (data ?? []).map(mapSplitRow)
}

export interface OwedSplit extends BookingSplit {
  clubName: string
  courtName: string
  date: string
  startTime: string
  bookerId: string
}

/** My own pending payment requests, with just enough booking context to
 * show what it's for (I can see the booking row itself via is_my_split()
 * in the bookings RLS policy, but this keeps the shape simple). */
export async function fetchMyOwedSplits(): Promise<OwedSplit[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from("booking_splits")
    .select("*, bookings(user_id, club_name, court_name, date, start_time)")
    .eq("user_id", user.id)
    .eq("status", "pending")
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    ...mapSplitRow(row),
    clubName: row.bookings?.club_name ?? "",
    courtName: row.bookings?.court_name ?? "",
    date: row.bookings?.date ?? "",
    startTime: row.bookings?.start_time ?? "",
    bookerId: row.bookings?.user_id ?? "",
  }))
}

/** Every split row for a set of bookings, grouped by booking id — used to
 * show "who else is playing" on an owed request (needs the
 * "co-participants view all splits of their booking" policy from
 * migration 0010, otherwise a participant only sees their own row). */
export async function fetchSplitsForBookings(bookingIds: string[]): Promise<Record<string, BookingSplit[]>> {
  if (bookingIds.length === 0) return {}
  const { data, error } = await supabase.from("booking_splits").select("*").in("booking_id", bookingIds)
  if (error) throw error
  const byBooking: Record<string, BookingSplit[]> = {}
  for (const row of data ?? []) {
    const split = mapSplitRow(row)
    const list = byBooking[split.bookingId] ?? (byBooking[split.bookingId] = [])
    list.push(split)
  }
  return byBooking
}

/** Every split row across all of MY bookings (I'm the booker), grouped by
 * booking id — for showing "2 van 4 betaald" on the dashboard without an
 * extra query per booking. */
export async function fetchSplitsForMyBookings(): Promise<Record<string, BookingSplit[]>> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return {}
  const { data, error } = await supabase.from("booking_splits").select("*, bookings!inner(user_id)").eq("bookings.user_id", user.id)
  if (error) throw error
  const byBooking: Record<string, BookingSplit[]> = {}
  for (const row of data ?? []) {
    const split = mapSplitRow(row)
    const list = byBooking[split.bookingId] ?? (byBooking[split.bookingId] = [])
    list.push(split)
  }
  return byBooking
}

export async function payMySplitShare(splitId: string): Promise<number> {
  const { data, error } = await supabase.rpc("pay_my_split_share", { p_split_id: splitId })
  if (error) throw error
  return Number(data)
}

/** Platform-admin only sandbox tool: simulates the 2-hour-before-start
 * deadline passing for one unpaid share. */
export async function adminForceCaptureSplit(splitId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_force_capture_split", { p_split_id: splitId })
  if (error) throw error
}
