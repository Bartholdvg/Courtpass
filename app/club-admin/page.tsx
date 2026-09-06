"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  type Club,
  type Booking,
  type Profile,
  type ClubInput,
  type CourtInput,
  fetchMyProfile,
  fetchManagedClubs,
  fetchPricingModel,
  fetchAllBookings,
  createClub,
  updateClub,
  deleteClub,
  addCourt,
  updateCourt,
  deleteCourt,
  updatePricingSettings,
  updatePricingWeight,
  updateScoreRow,
  cancelBooking,
  getTimeSlots,
  findUserIdByEmail,
  assignClubOwner,
  fetchProfileEmails,
  fetchAllWalletsSummary,
  fetchUserLedger,
  adminAdjustCredits,
  type WalletSummary,
  type LedgerEntry,
} from "@/lib/booking"
import { calculatePrice, type PricingModel, type PricingInputs } from "@/lib/pricing"

type Section = "overzicht" | "clubs" | "prijsmodel" | "simulator" | "boekingen" | "wallets"
const SURFACES = ["Clay", "Hard court", "Grass", "Carpet", "Artificial grass"]

interface CourtDraft extends CourtInput {
  id?: string
  removed?: boolean
}

interface ClubDraft extends ClubInput {
  courts: CourtDraft[]
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function draftFromClub(club: Club): ClubDraft {
  return {
    name: club.name,
    address: club.address,
    lat: club.lat,
    lng: club.lng,
    tier: club.tier,
    openFrom: club.openFrom,
    openTo: club.openTo,
    demand: club.demand,
    histOccupancy: club.histOccupancy,
    courts: club.courts.map((c) => ({ id: c.id, name: c.name, indoor: c.indoor, surface: c.surface, active: c.active })),
  }
}

function emptyDraft(): ClubDraft {
  return {
    name: "Nieuwe club",
    address: "",
    lat: 52.37,
    lng: 4.9,
    tier: "Tier C",
    openFrom: "08:00",
    openTo: "22:00",
    demand: "Normaal",
    histOccupancy: "50-70%",
    courts: [{ name: "Court 1", indoor: false, surface: "Hard court", active: true }],
  }
}

export default function ClubAdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [profile, setProfile] = useState<Profile | null>(null)
  const [clubs, setClubs] = useState<Club[]>([])
  const [model, setModel] = useState<PricingModel | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [section, setSection] = useState<Section>("overzicht")
  const [toast, setToast] = useState("")

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(""), 2500)
  }

  async function reloadClubs(p: Profile) {
    const managed = await fetchManagedClubs(p.id, p.isPlatformAdmin)
    setClubs(managed)
    return managed
  }

  async function reloadBookings() {
    const b = await fetchAllBookings()
    setBookings(b)
    return b
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const p = await fetchMyProfile()
        if (!p) {
          router.push("/login?redirect=/club-admin")
          return
        }
        const managedClubs = await fetchManagedClubs(p.id, p.isPlatformAdmin)
        if (cancelled) return
        if (!p.isPlatformAdmin && managedClubs.length === 0) {
          setAccessDenied(true)
          setLoading(false)
          return
        }
        const [modelData, bookingsData] = await Promise.all([fetchPricingModel(), fetchAllBookings()])
        if (cancelled) return
        setProfile(p)
        setClubs(managedClubs)
        setModel(modelData)
        setBookings(bookingsData)
      } catch (err: any) {
        if (!cancelled) setLoadError(err.message || "Kon het admin-dashboard niet laden.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  if (loading) {
    return (
      <main className="min-h-screen pt-20 flex items-center justify-center">
        <p className="text-text2">Laden…</p>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="min-h-screen pt-20 flex items-center justify-center">
        <p className="text-red-400">{loadError}</p>
      </main>
    )
  }

  if (accessDenied || !profile || !model) {
    return (
      <main className="min-h-screen pt-20 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h1 className="font-playfair text-2xl font-bold mb-2">Geen toegang</h1>
          <p className="text-text2 text-sm">
            Dit account beheert nog geen club op CourtPass. Neem contact op als je clubeigenaar bent en toegang wilt.
          </p>
        </div>
      </main>
    )
  }

  const sections: { id: Section; label: string; adminOnly?: boolean }[] = [
    { id: "overzicht", label: "📊 Overzicht" },
    { id: "clubs", label: "🎾 Clubs & banen" },
    { id: "prijsmodel", label: "⚙️ Prijsmodel", adminOnly: true },
    { id: "simulator", label: "🧮 Simulator", adminOnly: true },
    { id: "boekingen", label: "📅 Boekingen" },
    { id: "wallets", label: "💳 Wallets", adminOnly: true },
  ]

  return (
    <main className="pt-20 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr]">
        <nav className="border-b lg:border-b-0 lg:border-r border-border bg-surface flex lg:flex-col gap-1 p-3 overflow-x-auto lg:overflow-visible">
          {sections
            .filter((s) => !s.adminOnly || profile.isPlatformAdmin)
            .map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`text-left px-3 py-2 rounded-lg text-sm whitespace-nowrap font-medium transition-colors ${
                  section === s.id ? "bg-lime/10 text-lime" : "text-text2 hover:text-text hover:bg-surface2"
                }`}
              >
                {s.label}
              </button>
            ))}
        </nav>

        <div className="p-5 md:p-8 max-w-4xl">
          {section === "overzicht" && <OverviewSection clubs={clubs} bookings={bookings} />}
          {section === "clubs" && (
            <ClubsSection
              clubs={clubs}
              profile={profile}
              onChanged={() => reloadClubs(profile)}
              showToast={showToast}
            />
          )}
          {section === "prijsmodel" && profile.isPlatformAdmin && (
            <PricingModelSection model={model} onChanged={setModel} showToast={showToast} />
          )}
          {section === "simulator" && profile.isPlatformAdmin && <SimulatorSection model={model} />}
          {section === "boekingen" && (
            <BookingsSection bookings={bookings} clubs={clubs} model={model} onChanged={() => reloadBookings()} showToast={showToast} />
          )}
          {section === "wallets" && profile.isPlatformAdmin && <WalletsSection showToast={showToast} />}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-lime text-dark font-semibold text-sm px-5 py-2.5 rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}
    </main>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="border border-border rounded-2xl p-4 bg-surface2">
      <div className="text-[10px] uppercase tracking-wider text-text3 font-bold mb-1">{label}</div>
      <div className="font-playfair text-2xl font-bold text-text">
        {value} {sub && <span className="text-xs text-text2 font-normal">{sub}</span>}
      </div>
    </div>
  )
}

function OverviewSection({ clubs, bookings }: { clubs: Club[]; bookings: Booking[] }) {
  const totalCourts = clubs.reduce((n, c) => n + c.courts.length, 0)
  const confirmed = bookings.filter((b) => b.status === "confirmed")
  const today = todayISO()
  const todays = confirmed.filter((b) => b.date === today)
  const revenueToday = todays.reduce((s, b) => s + b.priceCredits, 0)
  const avg = confirmed.length ? confirmed.reduce((s, b) => s + b.priceCredits, 0) / confirmed.length : 0

  return (
    <div>
      <h1 className="font-playfair text-3xl font-bold mb-1">Overzicht</h1>
      <p className="text-text2 text-sm mb-6">Live cijfers op basis van de daadwerkelijke boekingen.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Clubs" value={clubs.length} />
        <StatCard label="Banen" value={totalCourts} />
        <StatCard label="Boekingen vandaag" value={todays.length} />
        <StatCard label="Omzet vandaag" value={`${Math.round(revenueToday)} cr`} sub={`€${todays.reduce((s, b) => s + b.priceEuro, 0).toFixed(0)}`} />
      </div>
      <div className="border border-border rounded-2xl p-5 bg-surface2 mb-8">
        <h3 className="font-bold text-sm mb-1">Gemiddelde boekingsprijs</h3>
        <p className="font-mono text-2xl font-bold text-lime">
          {confirmed.length ? Math.round(avg) : "—"} <span className="text-sm text-text2 font-normal">credits</span>
        </p>
      </div>
      <div>
        <h3 className="font-bold text-sm mb-3">Recente boekingen</h3>
        {confirmed.slice(0, 5).length === 0 ? (
          <p className="text-sm text-text3">Nog geen boekingen.</p>
        ) : (
          <div className="space-y-2">
            {confirmed.slice(0, 5).map((b) => (
              <div key={b.id} className="flex justify-between items-center border border-border rounded-lg px-3 py-2 text-sm bg-surface2">
                <span>
                  {b.clubName} · {b.courtName} · {b.date} {b.startTime}
                </span>
                <span className="font-mono text-lime">{Math.round(b.priceCredits)} cr</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ClubsSection({
  clubs,
  profile,
  onChanged,
  showToast,
}: {
  clubs: Club[]
  profile: Profile
  onChanged: () => Promise<Club[]>
  showToast: (m: string) => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ClubDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [ownerEmails, setOwnerEmails] = useState<Record<string, string>>({})
  const [ownerInput, setOwnerInput] = useState("")
  const [assigningOwner, setAssigningOwner] = useState(false)

  useEffect(() => {
    if (!profile.isPlatformAdmin) return
    const ownerIds = clubs.map((c) => c.ownerId).filter((id): id is string => !!id)
    if (ownerIds.length === 0) return
    fetchProfileEmails(ownerIds).then(setOwnerEmails).catch(() => {})
  }, [clubs, profile.isPlatformAdmin])

  async function handleAssignOwner(clubId: string) {
    if (!ownerInput.trim()) return
    setAssigningOwner(true)
    try {
      const userId = await findUserIdByEmail(ownerInput.trim())
      if (!userId) {
        showToast("Geen account gevonden met dit e-mailadres")
        return
      }
      await assignClubOwner(clubId, userId)
      await onChanged()
      setOwnerInput("")
      showToast("Eigenaar toegewezen")
    } catch (err: any) {
      showToast(err.message || "Toewijzen mislukt")
    } finally {
      setAssigningOwner(false)
    }
  }

  async function handleRemoveOwner(clubId: string) {
    setAssigningOwner(true)
    try {
      await assignClubOwner(clubId, null)
      await onChanged()
      showToast("Eigenaar verwijderd — alleen platform-admins beheren deze club nu")
    } catch (err: any) {
      showToast(err.message || "Mislukt")
    } finally {
      setAssigningOwner(false)
    }
  }

  function expand(club: Club) {
    setExpandedId(club.id)
    setDraft(draftFromClub(club))
    setIsNew(false)
  }

  function startNewClub() {
    setExpandedId("__new__")
    setDraft(emptyDraft())
    setIsNew(true)
  }

  function close() {
    setExpandedId(null)
    setDraft(null)
  }

  function updateCourtDraft(idx: number, patch: Partial<CourtDraft>) {
    if (!draft) return
    const courts = draft.courts.map((c, i) => (i === idx ? { ...c, ...patch } : c))
    setDraft({ ...draft, courts })
  }

  function addCourtDraft() {
    if (!draft) return
    setDraft({ ...draft, courts: [...draft.courts, { name: `Court ${draft.courts.length + 1}`, indoor: false, surface: "Hard court", active: true }] })
  }

  function removeCourtDraft(idx: number) {
    if (!draft) return
    const courts = draft.courts.map((c, i) => (i === idx ? { ...c, removed: true } : c))
    setDraft({ ...draft, courts })
  }

  async function save() {
    if (!draft) return
    setSaving(true)
    try {
      const clubInput: ClubInput = {
        name: draft.name,
        address: draft.address,
        lat: draft.lat,
        lng: draft.lng,
        tier: draft.tier,
        openFrom: draft.openFrom,
        openTo: draft.openTo,
        demand: draft.demand,
        histOccupancy: draft.histOccupancy,
      }

      let clubId = expandedId
      if (isNew) {
        const created = await createClub(clubInput, profile.isPlatformAdmin ? null : profile.id)
        clubId = created.id
      } else if (clubId) {
        await updateClub(clubId, clubInput)
      }
      if (!clubId) throw new Error("Onbekende club")

      for (const court of draft.courts) {
        if (court.removed) {
          if (court.id) await deleteCourt(court.id)
        } else if (court.id) {
          await updateCourt(court.id, { name: court.name, indoor: court.indoor, surface: court.surface, active: court.active })
        } else {
          await addCourt(clubId, { name: court.name, indoor: court.indoor, surface: court.surface, active: court.active })
        }
      }

      await onChanged()
      showToast(isNew ? "Club aangemaakt" : "Wijzigingen opgeslagen")
      close()
    } catch (err: any) {
      showToast(err.message || "Opslaan mislukt")
    } finally {
      setSaving(false)
    }
  }

  async function remove(clubId: string) {
    if (!confirm("Deze club en alle bijbehorende boekingen verwijderen?")) return
    try {
      await deleteClub(clubId)
      await onChanged()
      showToast("Club verwijderd")
      if (expandedId === clubId) close()
    } catch (err: any) {
      showToast(err.message || "Verwijderen mislukt")
    }
  }

  return (
    <div>
      <h1 className="font-playfair text-3xl font-bold mb-1">Clubs &amp; banen</h1>
      <p className="text-text2 text-sm mb-6">Beheer clubs, hun banen, en de gegevens die de dynamische prijs beïnvloeden.</p>

      <div className="space-y-3 mb-6">
        {clubs.map((club) => (
          <div key={club.id} className="border border-border rounded-2xl bg-surface2 overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <span className="w-9 h-9 flex-none rounded-lg bg-dark border border-border flex items-center justify-center font-mono text-lime text-sm">
                {club.tier.replace("Tier ", "")}
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{club.name}</div>
                <div className="text-xs text-text3 truncate">
                  {club.address} · {club.courts.length} banen · open {club.openFrom}–{club.openTo}
                </div>
              </div>
              <div className="ml-auto flex gap-2 flex-none">
                <button onClick={() => (expandedId === club.id ? close() : expand(club))} className="text-xs border border-border rounded-lg px-3 py-1.5 hover:border-lime/50">
                  {expandedId === club.id ? "Sluiten" : "Bewerken"}
                </button>
                <button onClick={() => remove(club.id)} className="text-xs border border-red-500/30 text-red-400 rounded-lg px-3 py-1.5 hover:bg-red-500/10">
                  Verwijderen
                </button>
              </div>
            </div>

            {expandedId === club.id && draft && (
              <>
                {profile.isPlatformAdmin && (
                  <div className="border-t border-border p-4 bg-dark/30">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text3 mb-2">Clubeigenaar</h4>
                    {club.ownerId ? (
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="text-text2">
                          Toegewezen aan <span className="text-text font-medium">{ownerEmails[club.ownerId] || club.ownerId}</span>
                        </span>
                        <button
                          onClick={() => handleRemoveOwner(club.id)}
                          disabled={assigningOwner}
                          className="text-xs border border-red-500/30 text-red-400 rounded-lg px-3 py-1.5 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          Eigenaar verwijderen
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="email"
                          value={ownerInput}
                          onChange={(e) => setOwnerInput(e.target.value)}
                          placeholder="email@clubeigenaar.nl"
                          className="bg-dark border border-border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
                        />
                        <button
                          onClick={() => handleAssignOwner(club.id)}
                          disabled={assigningOwner || !ownerInput.trim()}
                          className="bg-lime text-dark px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-50"
                        >
                          {assigningOwner ? "Bezig…" : "Toewijzen"}
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] text-text3 mt-2">De persoon moet al een account hebben aangemaakt op de site met dit e-mailadres.</p>
                  </div>
                )}
                <ClubEditForm draft={draft} setDraft={setDraft} updateCourt={updateCourtDraft} addCourt={addCourtDraft} removeCourt={removeCourtDraft} onSave={save} saving={saving} />
              </>
            )}
          </div>
        ))}
      </div>

      {expandedId === "__new__" && draft ? (
        <div className="border border-lime/40 rounded-2xl bg-surface2 overflow-hidden">
          <div className="p-4 font-semibold text-sm">Nieuwe club</div>
          <ClubEditForm draft={draft} setDraft={setDraft} updateCourt={updateCourtDraft} addCourt={addCourtDraft} removeCourt={removeCourtDraft} onSave={save} saving={saving} />
        </div>
      ) : (
        <button onClick={startNewClub} className="bg-lime text-dark px-4 py-2.5 rounded-lg font-bold text-sm hover:opacity-90">
          + Club toevoegen
        </button>
      )}
    </div>
  )
}

function ClubEditForm({
  draft,
  setDraft,
  updateCourt,
  addCourt,
  removeCourt,
  onSave,
  saving,
}: {
  draft: ClubDraft
  setDraft: (d: ClubDraft) => void
  updateCourt: (idx: number, patch: Partial<CourtDraft>) => void
  addCourt: () => void
  removeCourt: (idx: number) => void
  onSave: () => void
  saving: boolean
}) {
  const field = "bg-dark border border-border rounded-lg px-3 py-2 text-sm w-full focus:border-lime focus:outline-none"
  return (
    <div className="border-t border-border p-4 space-y-4 bg-dark/40">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-text3 mb-1">Naam</label>
          <input className={field} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-text3 mb-1">Tier</label>
          <select className={field} value={draft.tier} onChange={(e) => setDraft({ ...draft, tier: e.target.value })}>
            {["Tier A", "Tier B", "Tier C", "Tier D", "Tier E"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] uppercase tracking-wider text-text3 mb-1">Adres</label>
          <input className={field} value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-text3 mb-1">Latitude</label>
          <input type="number" step="0.0001" className={field} value={draft.lat} onChange={(e) => setDraft({ ...draft, lat: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-text3 mb-1">Longitude</label>
          <input type="number" step="0.0001" className={field} value={draft.lng} onChange={(e) => setDraft({ ...draft, lng: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-text3 mb-1">Open vanaf</label>
          <input className={field} value={draft.openFrom} onChange={(e) => setDraft({ ...draft, openFrom: e.target.value })} placeholder="07:00" />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-text3 mb-1">Open tot</label>
          <input className={field} value={draft.openTo} onChange={(e) => setDraft({ ...draft, openTo: e.target.value })} placeholder="23:00" />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-text3 mb-1">Drukte-niveau (prijsinput)</label>
          <select className={field} value={draft.demand} onChange={(e) => setDraft({ ...draft, demand: e.target.value })}>
            {["Zeer laag", "Laag", "Normaal", "Hoog", "Zeer hoog"].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-text3 mb-1">Historische bezetting (prijsinput)</label>
          <select className={field} value={draft.histOccupancy} onChange={(e) => setDraft({ ...draft, histOccupancy: e.target.value })}>
            {["<30%", "30-50%", "50-70%", "70-90%", ">90%"].map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-text3 mb-2">Banen</h4>
        <div className="space-y-2">
          {draft.courts.map((court, idx) =>
            court.removed ? null : (
              <div key={court.id || `new-${idx}`} className="flex flex-wrap items-center gap-2 border border-border rounded-lg p-2 bg-dark">
                <input
                  className="bg-surface2 border border-border rounded-md px-2 py-1.5 text-sm flex-1 min-w-[100px]"
                  value={court.name}
                  onChange={(e) => updateCourt(idx, { name: e.target.value })}
                />
                <select
                  className="bg-surface2 border border-border rounded-md px-2 py-1.5 text-sm"
                  value={court.indoor ? "Indoor" : "Outdoor"}
                  onChange={(e) => updateCourt(idx, { indoor: e.target.value === "Indoor" })}
                >
                  <option>Outdoor</option>
                  <option>Indoor</option>
                </select>
                <select className="bg-surface2 border border-border rounded-md px-2 py-1.5 text-sm" value={court.surface} onChange={(e) => updateCourt(idx, { surface: e.target.value })}>
                  {SURFACES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-xs text-text2">
                  <input type="checkbox" checked={court.active} onChange={(e) => updateCourt(idx, { active: e.target.checked })} />
                  boekbaar
                </label>
                <button onClick={() => removeCourt(idx)} className="text-xs text-red-400 hover:underline ml-auto">
                  Verwijderen
                </button>
              </div>
            ),
          )}
        </div>
        <button onClick={addCourt} className="mt-2 text-xs border border-border rounded-lg px-3 py-1.5 hover:border-lime/50">
          + Baan toevoegen
        </button>
      </div>

      <button onClick={onSave} disabled={saving} className="bg-lime text-dark px-4 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-50">
        {saving ? "Bezig…" : "Wijzigingen opslaan"}
      </button>
    </div>
  )
}

function PricingModelSection({
  model,
  onChanged,
  showToast,
}: {
  model: PricingModel
  onChanged: (m: PricingModel) => void
  showToast: (m: string) => void
}) {
  const [settings, setSettings] = useState(model.settings)
  const [weights, setWeights] = useState(model.weights)
  const [savingSettings, setSavingSettings] = useState(false)
  const [savingWeights, setSavingWeights] = useState(false)

  const weightSum = weights.reduce((s, w) => s + w.weight * 100, 0)
  const weightsOk = Math.abs(weightSum - 100) < 0.01

  async function saveSettings() {
    setSavingSettings(true)
    try {
      await updatePricingSettings(settings)
      onChanged({ ...model, settings })
      showToast("Instellingen opgeslagen")
    } catch (err: any) {
      showToast(err.message || "Opslaan mislukt")
    } finally {
      setSavingSettings(false)
    }
  }

  async function saveWeights() {
    setSavingWeights(true)
    try {
      await Promise.all(weights.map((w) => updatePricingWeight(w.key, w.weight)))
      onChanged({ ...model, weights })
      showToast("Gewichten opgeslagen")
    } catch (err: any) {
      showToast(err.message || "Opslaan mislukt")
    } finally {
      setSavingWeights(false)
    }
  }

  async function saveScore(tableKey: string, value: string, score: number) {
    try {
      await updateScoreRow(tableKey, value, score)
      const scoreTables = { ...model.scoreTables }
      const table = scoreTables[tableKey]
      if (table) {
        table.rows = table.rows.map((r) => (r.value === value ? { ...r, score } : r))
      }
      onChanged({ ...model, scoreTables })
      showToast("Scoretabel opgeslagen")
    } catch (err: any) {
      showToast(err.message || "Opslaan mislukt")
    }
  }

  const field = "bg-dark border border-border rounded-lg px-3 py-2 text-sm w-full focus:border-lime focus:outline-none"

  return (
    <div>
      <h1 className="font-playfair text-3xl font-bold mb-1">Prijsmodel</h1>
      <p className="text-text2 text-sm mb-6">
        Gewogen scoremodel: elke factor scoort 1–10 op zijn eigen tabel, vermenigvuldigd met een gewicht (som moet 100% zijn).
      </p>

      <div className="border border-border rounded-2xl p-5 bg-surface2 mb-6">
        <h3 className="font-bold text-sm mb-4">Basisinstellingen</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text3 mb-1">Minimumprijs (credits)</label>
            <input type="number" className={field} value={settings.minPrice} onChange={(e) => setSettings({ ...settings, minPrice: +e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text3 mb-1">Maximumprijs (credits)</label>
            <input type="number" className={field} value={settings.maxPrice} onChange={(e) => setSettings({ ...settings, maxPrice: +e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text3 mb-1">Straal omgeving (km)</label>
            <input type="number" className={field} value={settings.radiusKm} onChange={(e) => setSettings({ ...settings, radiusKm: +e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text3 mb-1">€ per credit</label>
            <input type="number" step="0.001" className={field} value={settings.euroPerCredit} onChange={(e) => setSettings({ ...settings, euroPerCredit: +e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text3 mb-1">Boekingshorizon (dagen)</label>
            <input type="number" className={field} value={settings.bookingHorizonDays} onChange={(e) => setSettings({ ...settings, bookingHorizonDays: +e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text3 mb-1">Weerbron</label>
            <select className={field} value={settings.weatherApi ? "1" : "0"} onChange={(e) => setSettings({ ...settings, weatherApi: e.target.value === "1" })}>
              <option value="1">Live weerbericht</option>
              <option value="0">Handmatige waarde</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text3 mb-1">Regenkans (terugval)</label>
            <select className={field} value={settings.rainForecast} onChange={(e) => setSettings({ ...settings, rainForecast: e.target.value })}>
              {model.scoreTables.weather?.rows.map((r) => (
                <option key={r.value}>{r.value}</option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={saveSettings} disabled={savingSettings} className="bg-lime text-dark px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-50">
          {savingSettings ? "Bezig…" : "Instellingen opslaan"}
        </button>
      </div>

      <div className="border border-border rounded-2xl p-5 bg-surface2 mb-6">
        <h3 className="font-bold text-sm mb-4">Gewichten per factor</h3>
        <div className="space-y-2 mb-3">
          {weights.map((w, i) => (
            <div key={w.key} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-text2">
                {w.label} {w.noTable && <span className="text-[10px] text-text3">(geen scoretabel)</span>}
              </span>
              <input
                type="number"
                step="0.5"
                min={0}
                max={100}
                className="w-24 bg-dark border border-border rounded-md px-2 py-1 text-right font-mono text-sm"
                value={+(w.weight * 100).toFixed(2)}
                onChange={(e) => {
                  const next = weights.map((x, idx) => (idx === i ? { ...x, weight: (parseFloat(e.target.value) || 0) / 100 } : x))
                  setWeights(next)
                }}
              />
            </div>
          ))}
        </div>
        <div className={`rounded-lg px-3 py-2 text-sm font-semibold mb-3 ${weightsOk ? "bg-lime/10 text-lime" : "bg-yellow-500/10 text-yellow-400"}`}>
          Totaal: {weightSum.toFixed(1)}% {weightsOk ? "— klopt" : "— moet 100% zijn"}
        </div>
        <button onClick={saveWeights} disabled={savingWeights} className="bg-lime text-dark px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-50">
          {savingWeights ? "Bezig…" : "Gewichten opslaan"}
        </button>
      </div>

      <div className="border border-border rounded-2xl p-5 bg-surface2">
        <h3 className="font-bold text-sm mb-4">Scoretabellen</h3>
        <div className="space-y-2">
          {Object.entries(model.scoreTables).map(([key, table]) => (
            <details key={key} className="border border-border rounded-xl bg-dark">
              <summary className="px-4 py-3 text-sm font-semibold cursor-pointer">{table.title}</summary>
              <div className="px-4 pb-4 space-y-1.5">
                {table.rows.map((row) => (
                  <div key={row.value} className="flex items-center justify-between text-sm border-b border-border/40 last:border-0 py-1.5">
                    <span className="text-text2">{row.value}</span>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={10}
                      defaultValue={row.score}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value)
                        if (!isNaN(val) && val !== row.score) saveScore(key, row.value, val)
                      }}
                      className="w-20 bg-surface2 border border-border rounded-md px-2 py-1 text-right font-mono text-sm"
                    />
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}

function SimulatorSection({ model }: { model: PricingModel }) {
  const [values, setValues] = useState<PricingInputs>({
    tier: "Tier A",
    day: "Dinsdag",
    time: "08:00",
    season: "Lente",
    weather: "0-20%",
    freeClub: "4 banen",
    freeArea: "10+ banen",
    lastMinute: "1 uur",
    demand: "Zeer hoog",
    histOccupancy: "30-50%",
  })

  const fields: { key: keyof PricingInputs; label: string; table: string }[] = [
    { key: "tier", label: "Club tier", table: "tier" },
    { key: "day", label: "Dag van de week", table: "day" },
    { key: "time", label: "Tijdstip", table: values.day === "Zaterdag" || values.day === "Zondag" ? "timeWeekend" : "time" },
    { key: "season", label: "Seizoen", table: "season" },
    { key: "weather", label: "Regenkans", table: "weather" },
    { key: "freeClub", label: "Vrije banen bij club", table: "freeClub" },
    { key: "freeArea", label: "Vrije banen omgeving", table: "freeArea" },
    { key: "lastMinute", label: "Tijd tot starttijd", table: "lastMinute" },
    { key: "demand", label: "Vraag", table: "demand" },
    { key: "histOccupancy", label: "Historische bezetting", table: "histOccupancy" },
  ]

  const result = calculatePrice(model, values)

  return (
    <div>
      <h1 className="font-playfair text-3xl font-bold mb-1">Prijssimulator</h1>
      <p className="text-text2 text-sm mb-6">Kies een waarde per factor en zie direct de berekende prijs en volledige uitsplitsing.</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-[10px] uppercase tracking-wider text-text3 mb-1">{f.label}</label>
            <select
              className="bg-dark border border-border rounded-lg px-3 py-2 text-sm w-full"
              value={values[f.key]}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
            >
              {model.scoreTables[f.table]?.rows.map((r) => (
                <option key={r.value}>{r.value}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {result.error ? (
        <p className="text-red-400 text-sm">{result.error}</p>
      ) : (
        <div className="border border-border rounded-2xl p-5 bg-surface2">
          <h3 className="font-bold text-sm mb-3">Berekening</h3>
          <div className="space-y-1 mb-3">
            {result.breakdown.map((row) => (
              <div key={row.key} className="flex justify-between text-sm">
                <span className="text-text2">
                  {row.label} <span className="text-text3 text-xs">· {row.value}</span>
                </span>
                <span className="font-mono text-text">
                  {row.score} × {(row.weight * 100).toFixed(1).replace(/\.0$/, "")}%{" "}
                  <span className="text-text3">= {row.contribution.toFixed(2)}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm border-t border-border pt-2 mb-1">
            <span>Gewogen score (1–10)</span>
            <span className="font-mono">{result.totalScore.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm mb-3">
            <span>Ruwe prijs</span>
            <span className="font-mono">{result.rawPrice.toFixed(2)} cr</span>
          </div>
          <div className="flex justify-between items-baseline border-t border-dashed border-border pt-3">
            <span className="font-bold text-sm">Eindprijs</span>
            <span className="font-mono font-bold text-lime text-xl">
              {Math.round(result.finalPrice)} <small className="text-text3 text-xs font-normal">credits · €{result.euro.toFixed(0)}</small>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function BookingAuditBox({ booking }: { booking: Booking }) {
  return (
    <div className="border-t border-border p-4 bg-dark/40 text-sm space-y-1">
      {Object.entries(booking.pricingSnapshot.inputs).map(([k, v]) => (
        <div key={k} className="flex justify-between">
          <span className="text-text2">{k}</span>
          <span className="font-mono">{v}</span>
        </div>
      ))}
      <div className="flex justify-between border-t border-border/40 pt-1.5 mt-1.5">
        <span className="text-text2">Gewogen score</span>
        <span className="font-mono">{booking.pricingSnapshot.totalScore.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-text2">Weerbron</span>
        <span className="font-mono">{booking.pricingSnapshot.weatherSource}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-text2">Geboekt op</span>
        <span className="font-mono">{new Date(booking.createdAt).toLocaleString("nl-NL")}</span>
      </div>
    </div>
  )
}

function BookingsSection({
  bookings,
  clubs,
  model,
  onChanged,
  showToast,
}: {
  bookings: Booking[]
  clubs: Club[]
  model: PricingModel
  onChanged: () => Promise<Booking[]>
  showToast: (m: string) => void
}) {
  const [view, setView] = useState<"rooster" | "lijst">(clubs.length ? "rooster" : "lijst")
  const [openId, setOpenId] = useState<string | null>(null)
  const [gridClubId, setGridClubId] = useState<string>(clubs[0]?.id || "")
  const [gridDate, setGridDate] = useState<string>(todayISO())

  const gridClub = clubs.find((c) => c.id === gridClubId) || clubs[0] || null
  const timeSlots = gridClub ? getTimeSlots(gridClub, model) : []
  const dayBookings = bookings.filter((b) => b.clubId === (gridClub?.id ?? "__none__") && b.date === gridDate && b.status === "confirmed")
  const openBooking = bookings.find((b) => b.id === openId) || null

  async function handleCancel(id: string) {
    if (!confirm("Deze boeking annuleren?")) return
    try {
      await cancelBooking(id)
      await onChanged()
      showToast("Boeking geannuleerd")
    } catch (err: any) {
      showToast(err.message || "Annuleren mislukt")
    }
  }

  return (
    <div>
      <h1 className="font-playfair text-3xl font-bold mb-1">Boekingen</h1>
      <p className="text-text2 text-sm mb-6">
        Open &ldquo;Waarom deze prijs?&rdquo; om de exacte berekening te zien zoals die was op het moment van boeken — nooit opnieuw berekend met de huidige instellingen.
      </p>

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setView("rooster")}
          className={`text-sm px-4 py-2 rounded-lg font-semibold ${view === "rooster" ? "bg-lime text-dark" : "border border-border text-text2 hover:text-text"}`}
        >
          Rooster
        </button>
        <button
          onClick={() => setView("lijst")}
          className={`text-sm px-4 py-2 rounded-lg font-semibold ${view === "lijst" ? "bg-lime text-dark" : "border border-border text-text2 hover:text-text"}`}
        >
          Lijst
        </button>
      </div>

      {view === "rooster" ? (
        !gridClub ? (
          <p className="text-sm text-text3">Nog geen clubs om een rooster voor te tonen.</p>
        ) : (
          <div>
            <div className="flex flex-wrap gap-3 mb-4">
              <select
                value={gridClub.id}
                onChange={(e) => {
                  setGridClubId(e.target.value)
                  setOpenId(null)
                }}
                className="bg-dark border border-border rounded-lg px-3 py-2 text-sm"
              >
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={gridDate}
                onChange={(e) => {
                  setGridDate(e.target.value)
                  setOpenId(null)
                }}
                className="bg-dark border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="overflow-x-auto border border-border rounded-2xl">
              <table className="w-full text-sm border-collapse min-w-[480px]">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-text3 text-[10px] uppercase tracking-wider border-b border-border bg-surface2 sticky left-0">Tijd</th>
                    {gridClub.courts.map((court, i) => (
                      <th key={court.id} className="p-2 text-center text-xs border-b border-l border-border bg-surface2 font-semibold">
                        Baan {i + 1}
                        <div className="text-[10px] text-text3 font-normal">{court.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((t) => (
                    <tr key={t}>
                      <td className="p-2 text-xs text-text3 border-b border-border font-mono bg-surface2 sticky left-0">{t}</td>
                      {gridClub.courts.map((court) => {
                        const b = dayBookings.find((x) => x.courtId === court.id && x.startTime === t)
                        return (
                          <td key={court.id} className="p-1 border-b border-l border-border align-top">
                            {b ? (
                              <button
                                onClick={() => setOpenId(openId === b.id ? null : b.id)}
                                className={`w-full min-h-[2.75rem] rounded-lg border text-left p-1.5 transition-colors ${
                                  openId === b.id ? "border-lime bg-lime/20" : "border-lime/40 bg-lime/10 hover:bg-lime/15"
                                }`}
                              >
                                <div className="text-[11px] font-bold text-lime">{Math.round(b.priceCredits)} cr</div>
                                <div className="text-[10px] text-text3 font-mono truncate">{b.bookingCode}</div>
                              </button>
                            ) : (
                              <div className="w-full min-h-[2.75rem] rounded-lg bg-dark/30" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {openBooking && (
              <div className="border border-border rounded-2xl bg-surface2 overflow-hidden mt-4">
                <div className="flex flex-wrap items-center gap-3 p-3 text-sm">
                  <span className="font-semibold">
                    {openBooking.courtName} · {openBooking.startTime}–{openBooking.endTime}
                  </span>
                  <span className="ml-auto font-mono text-lime">{Math.round(openBooking.priceCredits)} cr</span>
                  <button onClick={() => handleCancel(openBooking.id)} className="text-xs border border-red-500/30 text-red-400 rounded-lg px-3 py-1.5 hover:bg-red-500/10">
                    Annuleren
                  </button>
                </div>
                <BookingAuditBox booking={openBooking} />
              </div>
            )}
            <p className="text-[10px] text-text3 mt-3">Klik op een geboekte baan voor de prijsberekening.</p>
          </div>
        )
      ) : bookings.length === 0 ? (
        <p className="text-sm text-text3">Nog geen boekingen.</p>
      ) : (
        <div className="space-y-2">
          {bookings.map((b) => (
            <div key={b.id} className="border border-border rounded-xl bg-surface2 overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 p-3 text-sm">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${b.status === "confirmed" ? "bg-lime/10 text-lime" : "bg-red-500/10 text-red-400"}`}>
                  {b.status === "confirmed" ? "Actief" : "Geannuleerd"}
                </span>
                <span className="font-semibold">{b.clubName}</span>
                <span className="text-text3">
                  {b.courtName} · {b.date} · {b.startTime}–{b.endTime}
                </span>
                <span className="ml-auto font-mono text-lime">{Math.round(b.priceCredits)} cr</span>
                <button onClick={() => setOpenId(openId === b.id ? null : b.id)} className="text-xs border border-border rounded-lg px-3 py-1.5 hover:border-lime/50">
                  {openId === b.id ? "Verbergen" : "Waarom deze prijs?"}
                </button>
                {b.status === "confirmed" && (
                  <button onClick={() => handleCancel(b.id)} className="text-xs border border-red-500/30 text-red-400 rounded-lg px-3 py-1.5 hover:bg-red-500/10">
                    Annuleren
                  </button>
                )}
              </div>
              {openId === b.id && <BookingAuditBox booking={b} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function WalletsSection({ showToast }: { showToast: (m: string) => void }) {
  const [wallets, setWallets] = useState<WalletSummary[] | null>(null)
  const [loadError, setLoadError] = useState("")
  const [openUserId, setOpenUserId] = useState<string | null>(null)
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [adjustAmount, setAdjustAmount] = useState("")
  const [adjustReason, setAdjustReason] = useState("")
  const [adjusting, setAdjusting] = useState(false)

  async function reload() {
    try {
      const data = await fetchAllWalletsSummary()
      setWallets(data)
      setLoadError("")
    } catch (err: any) {
      setLoadError(err.message || "Kon wallets niet laden.")
    }
  }

  useEffect(() => {
    reload()
  }, [])

  async function openWallet(userId: string) {
    if (openUserId === userId) {
      setOpenUserId(null)
      return
    }
    setOpenUserId(userId)
    setLedgerLoading(true)
    try {
      const data = await fetchUserLedger(userId)
      setLedger(data)
    } catch (err: any) {
      showToast(err.message || "Kon ledger niet laden.")
    } finally {
      setLedgerLoading(false)
    }
  }

  async function handleAdjust(userId: string) {
    const delta = Number(adjustAmount)
    if (!delta || !adjustReason.trim()) {
      showToast("Vul een aantal en een reden in")
      return
    }
    setAdjusting(true)
    try {
      await adminAdjustCredits(userId, delta, adjustReason.trim())
      showToast("Saldo aangepast")
      setAdjustAmount("")
      setAdjustReason("")
      await reload()
      const data = await fetchUserLedger(userId)
      setLedger(data)
    } catch (err: any) {
      showToast(err.message || "Aanpassen mislukt")
    } finally {
      setAdjusting(false)
    }
  }

  if (loadError) return <p className="text-red-400 text-sm">{loadError}</p>
  if (!wallets) return <p className="text-text2 text-sm">Laden…</p>

  const field = "bg-dark border border-border rounded-lg px-3 py-2 text-sm w-full focus:border-lime focus:outline-none"

  return (
    <div>
      <h1 className="font-playfair text-3xl font-bold mb-1">Wallets</h1>
      <p className="text-text2 text-sm mb-6">Creditsaldo per gebruiker, met de volledige mutatiegeschiedenis (ledger).</p>

      <div className="space-y-2">
        {wallets.map((w) => (
          <div key={w.userId} className="border border-border rounded-2xl bg-surface2 overflow-hidden">
            <button
              onClick={() => openWallet(w.userId)}
              className="w-full flex flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-surface transition-colors"
            >
              <span className="font-medium truncate">{w.email || w.userId}</span>
              <span className="ml-auto text-xs text-text3">
                totaal gekocht {Math.round(w.lifetimeTopUp)} · besteed {Math.round(w.lifetimeSpent)}
              </span>
              <span className="font-mono font-bold text-lime">{Math.round(w.balance)} cr</span>
            </button>

            {openUserId === w.userId && (
              <div className="border-t border-border p-4 bg-dark/40">
                <h3 className="text-sm font-bold mb-2">Ledger</h3>
                {ledgerLoading ? (
                  <p className="text-sm text-text2">Laden…</p>
                ) : ledger.length === 0 ? (
                  <p className="text-sm text-text2">Nog geen mutaties.</p>
                ) : (
                  <div className="space-y-1 mb-4 max-h-64 overflow-y-auto">
                    {ledger.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3 text-xs border-b border-border/30 pb-1 last:border-b-0">
                        <span className="text-text3 flex-none">{new Date(entry.createdAt).toLocaleString("nl-NL")}</span>
                        <span className="flex-1 truncate">{entry.type}{entry.description ? ` — ${entry.description}` : ""}</span>
                        <span className={`font-mono flex-none ${entry.credits >= 0 ? "text-lime" : "text-text2"}`}>
                          {entry.credits >= 0 ? "+" : ""}
                          {Math.round(entry.credits)}
                        </span>
                        <span className="font-mono text-text3 flex-none">→ {Math.round(entry.balanceAfter)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <h3 className="text-sm font-bold mb-2">Handmatige aanpassing</h3>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="number"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="bv. 50 of -20"
                    className={`${field} max-w-[140px]`}
                  />
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="Reden (verplicht)"
                    className={`${field} flex-1 min-w-[200px]`}
                  />
                  <button
                    onClick={() => handleAdjust(w.userId)}
                    disabled={adjusting}
                    className="bg-lime text-dark px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-50"
                  >
                    {adjusting ? "Bezig…" : "Toepassen"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
