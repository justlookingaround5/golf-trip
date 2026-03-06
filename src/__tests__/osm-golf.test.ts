import { fetchOsmGolfData, OsmHoleData } from '@/lib/osm-golf'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe('fetchOsmGolfData', () => {
  afterEach(() => {
    mockFetch.mockReset()
  })

  it('returns null when fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    const result = await fetchOsmGolfData(42.9, -85.5)
    expect(result).toBeNull()
  })

  it('returns null when API returns non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })
    const result = await fetchOsmGolfData(42.9, -85.5)
    expect(result).toBeNull()
  })

  it('returns null when no hole ways are found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          { type: 'node', id: 1, lat: 42.9, lon: -85.5 },
          { type: 'way', id: 100, nodes: [1], tags: { golf: 'fairway' } },
        ],
      }),
    })
    const result = await fetchOsmGolfData(42.9, -85.5)
    expect(result).toBeNull()
  })

  it('parses hole ways with correct hole number and par', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          { type: 'node', id: 1, lat: 42.9, lon: -85.5 },
          { type: 'node', id: 2, lat: 42.901, lon: -85.501 },
          { type: 'node', id: 3, lat: 42.902, lon: -85.502 },
          {
            type: 'way',
            id: 100,
            nodes: [1, 2, 3],
            tags: { golf: 'hole', ref: '1', par: '4' },
          },
        ],
      }),
    })

    const result = await fetchOsmGolfData(42.9, -85.5)
    expect(result).not.toBeNull()
    expect(result!.length).toBe(1)
    expect(result![0].holeNumber).toBe(1)
    expect(result![0].par).toBe(4)
    expect(result![0].holePath).toHaveLength(3)
  })

  it('assigns greens to the closest hole by green end', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          // Hole 1 nodes (tee to green)
          { type: 'node', id: 1, lat: 42.900, lon: -85.500 },
          { type: 'node', id: 2, lat: 42.901, lon: -85.501 },
          { type: 'node', id: 3, lat: 42.902, lon: -85.502 },
          // Hole 2 nodes
          { type: 'node', id: 4, lat: 42.910, lon: -85.510 },
          { type: 'node', id: 5, lat: 42.911, lon: -85.511 },
          { type: 'node', id: 6, lat: 42.912, lon: -85.512 },
          // Green polygon nodes (near hole 1 green end)
          { type: 'node', id: 10, lat: 42.9019, lon: -85.5019 },
          { type: 'node', id: 11, lat: 42.9021, lon: -85.5019 },
          { type: 'node', id: 12, lat: 42.9021, lon: -85.5021 },
          { type: 'node', id: 13, lat: 42.9019, lon: -85.5021 },
          // Hole ways
          {
            type: 'way', id: 100, nodes: [1, 2, 3],
            tags: { golf: 'hole', ref: '1', par: '4' },
          },
          {
            type: 'way', id: 101, nodes: [4, 5, 6],
            tags: { golf: 'hole', ref: '2', par: '3' },
          },
          // Green way (near hole 1)
          {
            type: 'way', id: 200, nodes: [10, 11, 12, 13],
            tags: { golf: 'green' },
          },
        ],
      }),
    })

    const result = await fetchOsmGolfData(42.9, -85.5)
    expect(result).not.toBeNull()
    expect(result!.length).toBe(2)

    const hole1 = result!.find(h => h.holeNumber === 1)!
    const hole2 = result!.find(h => h.holeNumber === 2)!

    expect(hole1.greens.length).toBe(1)
    expect(hole2.greens.length).toBe(0)
  })

  it('sorts holes by hole number', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          { type: 'node', id: 1, lat: 42.900, lon: -85.500 },
          { type: 'node', id: 2, lat: 42.910, lon: -85.510 },
          { type: 'node', id: 3, lat: 42.920, lon: -85.520 },
          // Hole 3 first, then hole 1
          {
            type: 'way', id: 100, nodes: [3],
            tags: { golf: 'hole', ref: '3', par: '5' },
          },
          {
            type: 'way', id: 101, nodes: [1],
            tags: { golf: 'hole', ref: '1', par: '4' },
          },
          {
            type: 'way', id: 102, nodes: [2],
            tags: { golf: 'hole', ref: '2', par: '3' },
          },
        ],
      }),
    })

    const result = await fetchOsmGolfData(42.9, -85.5)
    expect(result!.map(h => h.holeNumber)).toEqual([1, 2, 3])
  })

  it('assigns bunkers and water hazards correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          { type: 'node', id: 1, lat: 42.900, lon: -85.500 },
          { type: 'node', id: 2, lat: 42.901, lon: -85.501 },
          { type: 'node', id: 3, lat: 42.902, lon: -85.502 },
          // Bunker nodes near green end
          { type: 'node', id: 20, lat: 42.9019, lon: -85.5019 },
          { type: 'node', id: 21, lat: 42.9021, lon: -85.5021 },
          { type: 'node', id: 22, lat: 42.9020, lon: -85.5022 },
          // Water nodes near midpoint
          { type: 'node', id: 30, lat: 42.9009, lon: -85.5009 },
          { type: 'node', id: 31, lat: 42.9011, lon: -85.5011 },
          { type: 'node', id: 32, lat: 42.9010, lon: -85.5012 },
          // Hole
          {
            type: 'way', id: 100, nodes: [1, 2, 3],
            tags: { golf: 'hole', ref: '1', par: '4' },
          },
          // Bunker
          {
            type: 'way', id: 200, nodes: [20, 21, 22],
            tags: { golf: 'bunker' },
          },
          // Water
          {
            type: 'way', id: 300, nodes: [30, 31, 32],
            tags: { golf: 'water_hazard' },
          },
        ],
      }),
    })

    const result = await fetchOsmGolfData(42.9, -85.5)
    expect(result![0].bunkers.length).toBe(1)
    expect(result![0].water.length).toBe(1)
  })
})
