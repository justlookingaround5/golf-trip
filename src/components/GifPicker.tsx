'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface GiphyGif {
  id: string
  images: {
    fixed_height_small: { url: string }
    original: { url: string }
  }
}

interface GifPickerProps {
  onSelect: (gifUrl: string) => void
  onClose: () => void
}

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState<GiphyGif[]>([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY

  const fetchGifs = useCallback(async (searchQuery: string) => {
    if (!apiKey) return
    setLoading(true)
    try {
      const endpoint = searchQuery.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(searchQuery)}&limit=20&rating=pg`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=20&rating=pg`
      const res = await fetch(endpoint)
      const data = await res.json()
      setGifs(data.data ?? [])
    } catch {
      setGifs([])
    } finally {
      setLoading(false)
    }
  }, [apiKey])

  // Load trending on mount
  useEffect(() => { fetchGifs('') }, [fetchGifs])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchGifs(query), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, fetchGifs])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 mb-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-[300px] flex flex-col"
    >
      <div className="p-2 border-b border-gray-100">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search GIFs..."
          className="w-full text-sm text-gray-700 placeholder-gray-400 bg-gray-50 rounded px-2 py-1.5 border border-gray-200 outline-none focus:border-blue-400"
          autoFocus
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <p className="text-xs text-gray-400 text-center py-4">Loading...</p>
        ) : gifs.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No GIFs found</p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {gifs.map(gif => (
              <button
                key={gif.id}
                onClick={() => onSelect(gif.images.original.url)}
                className="rounded overflow-hidden hover:opacity-80 transition"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={gif.images.fixed_height_small.url}
                  alt="GIF"
                  className="w-full h-auto"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
