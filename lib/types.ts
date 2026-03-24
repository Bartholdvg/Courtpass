export interface User {
  id: string
  email: string
  fullName?: string
  createdAt: string
}

export interface Club {
  id: string
  name: string
  location: string
  courts: number
  image?: string
  description?: string
}

export interface Reservation {
  id: string
  userId: string
  clubId: string
  courtId: string
  date: string
  startTime: string
  endTime: string
  status: "confirmed" | "cancelled" | "pending"
  createdAt: string
}

export interface Subscription {
  id: string
  userId: string
  plan: "starter" | "weekender" | "pro"
  price: number
  sessions?: number
  startDate: string
  endDate: string
  status: "active" | "cancelled" | "paused"
}

export interface MobileMenuProps {
  onClose: () => void
}

export interface ScrollObserverProps {
  children: React.ReactNode
  delay?: number
  duration?: number
  staggerChildren?: boolean
}
