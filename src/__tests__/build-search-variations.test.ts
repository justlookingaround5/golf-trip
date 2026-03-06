import { buildSearchVariations } from '@/lib/golf-course-api'

describe('buildSearchVariations', () => {
  it('returns original query as first variation', () => {
    const result = buildSearchVariations('Pebble Beach')
    expect(result[0]).toBe('Pebble Beach')
  })

  it('expands "Country Club" to "CC"', () => {
    const result = buildSearchVariations('Egypt Valley Country Club')
    expect(result).toContain('Egypt Valley CC')
  })

  it('expands "CC" to "Country Club"', () => {
    const result = buildSearchVariations('Egypt Valley CC')
    expect(result).toContain('Egypt Valley Country Club')
  })

  it('expands "Golf Club" to "GC"', () => {
    const result = buildSearchVariations('Augusta National Golf Club')
    expect(result).toContain('Augusta National GC')
  })

  it('expands "GC" to "Golf Club"', () => {
    const result = buildSearchVariations('Augusta National GC')
    expect(result).toContain('Augusta National Golf Club')
  })

  it('expands "Golf Course" to "GC"', () => {
    const result = buildSearchVariations('Torrey Pines Golf Course')
    expect(result).toContain('Torrey Pines GC')
  })

  it('strips trailing suffix as fallback', () => {
    const result = buildSearchVariations('Egypt Valley Country Club')
    expect(result).toContain('Egypt Valley')
  })

  it('strips "Golf Club" suffix', () => {
    const result = buildSearchVariations('Augusta National Golf Club')
    expect(result).toContain('Augusta National')
  })

  it('does not duplicate variations', () => {
    const result = buildSearchVariations('Egypt Valley Country Club')
    const unique = [...new Set(result)]
    expect(result).toEqual(unique)
  })

  it('returns only original for plain name with no suffix', () => {
    const result = buildSearchVariations('Pebble Beach')
    expect(result).toEqual(['Pebble Beach'])
  })

  it('handles case-insensitive matching', () => {
    const result = buildSearchVariations('egypt valley country club')
    expect(result).toContain('egypt valley CC')
  })
})
