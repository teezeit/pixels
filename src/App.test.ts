import { describe, it, expect, afterEach } from 'vitest'
import { getPixelsStoreUrl } from './utils'

const setUA = (ua: string) =>
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })

afterEach(() => setUA(''))

describe('getPixelsStoreUrl', () => {
  it('returns App Store URL on iPhone', () => {
    setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')
    expect(getPixelsStoreUrl()).toBe('https://apps.apple.com/us/app/pixels-mood-tracker-journal/id1668460700')
  })

  it('returns App Store URL on iPad', () => {
    setUA('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')
    expect(getPixelsStoreUrl()).toBe('https://apps.apple.com/us/app/pixels-mood-tracker-journal/id1668460700')
  })

  it('returns Google Play URL on Android', () => {
    setUA('Mozilla/5.0 (Linux; Android 14; Pixel 8)')
    expect(getPixelsStoreUrl()).toBe('https://play.google.com/store/apps/details?id=ar.teovogel.yip')
  })

  it('returns website URL on desktop', () => {
    setUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
    expect(getPixelsStoreUrl()).toBe('https://pixelstracker.app')
  })

  it('returns website URL for unknown user agent', () => {
    setUA('')
    expect(getPixelsStoreUrl()).toBe('https://pixelstracker.app')
  })
})
