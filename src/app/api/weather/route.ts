import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/weather?lat=33.0&lon=-117.0
 *
 * Uses Open-Meteo (free, no API key needed).
 */
export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get('lat')
  const lon = request.nextUrl.searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon required' }, { status: 400 })
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=1&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code`

    const res = await fetch(url, { next: { revalidate: 1800 } })
    if (!res.ok) {
      return NextResponse.json({ error: 'Weather API failed' }, { status: 502 })
    }

    const data = await res.json()
    const code = data.current?.weather_code ?? 0

    return NextResponse.json({
      current: {
        temp: Math.round(data.current?.temperature_2m ?? 0),
        humidity: data.current?.relative_humidity_2m ?? 0,
        wind_mph: Math.round(data.current?.wind_speed_10m ?? 0),
        condition: weatherCodeToText(code),
        icon: weatherCodeToIcon(code),
      },
      today: {
        high: Math.round(data.daily?.temperature_2m_max?.[0] ?? 0),
        low: Math.round(data.daily?.temperature_2m_min?.[0] ?? 0),
        rain_pct: data.daily?.precipitation_probability_max?.[0] ?? 0,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 })
  }
}

function weatherCodeToText(code: number): string {
  if (code === 0) return 'Clear'
  if (code <= 3) return 'Partly Cloudy'
  if (code <= 49) return 'Foggy'
  if (code <= 59) return 'Drizzle'
  if (code <= 69) return 'Rain'
  if (code <= 79) return 'Snow'
  if (code <= 84) return 'Showers'
  if (code <= 99) return 'Thunderstorm'
  return 'Unknown'
}

function weatherCodeToIcon(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 3) return '⛅'
  if (code <= 49) return '🌫️'
  if (code <= 59) return '🌦️'
  if (code <= 69) return '🌧️'
  if (code <= 79) return '❄️'
  if (code <= 84) return '🌧️'
  if (code <= 99) return '⛈️'
  return '🌤️'
}
