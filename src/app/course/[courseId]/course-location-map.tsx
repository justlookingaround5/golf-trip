'use client'

import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

const PIN_PATH = 'M0,0 C-1,-6 -7,-10 -7,-16 A7,7,0,1,1,7,-16 C7,-10 1,-6 0,0z'

interface CourseLocationMapProps {
  latitude: number
  longitude: number
  courseName: string
}

export default function CourseLocationMap({ latitude, longitude }: CourseLocationMapProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <ComposableMap
        projection="geoAlbersUsa"
        style={{ width: '100%', height: 'auto' }}
        projectionConfig={{ scale: 900 }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#E5E7EB"
                stroke="#D1D5DB"
                strokeWidth={0.5}
                style={{
                  default: { outline: 'none' },
                  hover: { outline: 'none' },
                  pressed: { outline: 'none' },
                }}
              />
            ))
          }
        </Geographies>

        <Marker coordinates={[longitude, latitude]}>
          <g transform="scale(1.8)">
            <path
              d={PIN_PATH}
              fill="#ef4444"
              stroke="white"
              strokeWidth={1.5}
            />
            <circle cx={0} cy={-16} r={3} fill="white" opacity={0.9} />
          </g>
        </Marker>
      </ComposableMap>
    </div>
  )
}
