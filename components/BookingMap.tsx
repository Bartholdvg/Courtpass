"use client"

import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet"
import { DivIcon } from "leaflet"
import "leaflet/dist/leaflet.css"
import type { Club } from "@/lib/booking"

interface BookingMapProps {
  clubs: Club[]
  selectedClubId: string | null
  onSelectClub: (id: string) => void
}

function markerIcon(club: Club, selected: boolean): DivIcon {
  const tierLetter = club.tier.replace("Tier ", "")
  return new DivIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 30],
    html: `<div style="
        width:34px;height:34px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);
        background:${selected ? "#BFEF45" : "#132015"};
        border:2px solid ${selected ? "#BFEF45" : "#9FCF35"};
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 4px 12px rgba(0,0,0,.4);
      ">
        <span style="transform:rotate(45deg);font-weight:700;font-size:11px;color:${selected ? "#0B1508" : "#BFEF45"}">${tierLetter}</span>
      </div>`,
  })
}

function FlyToSelected({ clubs, selectedClubId }: { clubs: Club[]; selectedClubId: string | null }) {
  const map = useMap()
  const club = clubs.find((c) => c.id === selectedClubId)
  if (club) map.flyTo([club.lat, club.lng], 13, { duration: 0.6 })
  return null
}

export default function BookingMap({ clubs, selectedClubId, onSelectClub }: BookingMapProps) {
  return (
    // isolate: Leaflet's own CSS gives its panes/controls z-index values up to
    // 1000 (see .leaflet-top/.leaflet-bottom in leaflet.css). Without this,
    // those values aren't scoped to the map and leak out to outrank the site's
    // own fixed nav/mobile-menu (z-40/z-50) whenever this map is on screen.
    <div className="h-full w-full isolate">
      <MapContainer
        center={[52.365, 4.89]}
        zoom={12}
        style={{ height: "100%", width: "100%", background: "#0A140C" }}
        className="leaflet-container"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        {clubs.map((club) => (
          <Marker
            key={club.id}
            position={[club.lat, club.lng]}
            icon={markerIcon(club, club.id === selectedClubId)}
            eventHandlers={{ click: () => onSelectClub(club.id) }}
          />
        ))}
        <FlyToSelected clubs={clubs} selectedClubId={selectedClubId} />
      </MapContainer>
    </div>
  )
}
