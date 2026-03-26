'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'

interface Club {
  name: string
  premium: boolean
  location: string
  facilities: string[]
  status: string
  courts: number
  price: string
  lat: number
  lng: number
}

interface MapProps {
  clubs: Club[]
}

export default function Map({ clubs }: MapProps) {
  useEffect(() => {
    // Fix for default markers in react-leaflet
    delete (Icon.Default.prototype as any)._getIconUrl
    Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    })
  }, [])

  return (
    <div className="h-96 w-full rounded-2xl overflow-hidden border border-border">
      <MapContainer
        center={[52.1326, 5.2913]} // Center of Netherlands
        zoom={8}
        style={{ height: '100%', width: '100%' }}
        className="leaflet-container"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        {clubs.map((club) => (
          <Marker key={club.name} position={[club.lat, club.lng]}>
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-black">{club.name}</h3>
                {club.premium && <span className="text-xs bg-lime text-dark px-1 py-0.5 rounded ml-2">⭐ Premium</span>}
                <p className="text-sm text-gray-600 mt-1">{club.location}</p>
                <p className="text-sm text-gray-600">Status: {club.status}</p>
                <p className="text-sm text-gray-600">{club.courts} banen</p>
                <p className="text-sm text-gray-600">{club.price}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {club.facilities.map((facility) => (
                    <span key={facility} className="text-xs bg-gray-100 text-black px-1 py-0.5 rounded">
                      {facility}
                    </span>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}