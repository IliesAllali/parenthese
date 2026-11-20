import { describe, expect, it } from 'vitest'
import { isInAppBrowser, providerBlockedHere } from './inAppBrowser'

const UA = {
  messengerIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/470.0.0.37.104;FBBV/123;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBCR/;FBID/phone;FBLC/fr_FR;FBOP/5]',
  facebookAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/485.0.0.66.77;]',
  instagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.25.97 (iPhone15,2; iOS 17_5; fr_FR; fr; scale=3.00; 1179x2556; 640917018)',
  linkedin: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.30.1234',
  androidWebView: 'Mozilla/5.0 (Linux; Android 13; SM-A536B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36',
  safariIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  chromeDesktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
}

describe('isInAppBrowser', () => {
  it('reconnaît les navigateurs des applis', () => {
    for (const key of ['messengerIos', 'facebookAndroid', 'instagram', 'linkedin', 'androidWebView']) {
      expect(isInAppBrowser(UA[key]), key).toBe(true)
    }
  })

  it('laisse passer les vrais navigateurs', () => {
    for (const key of ['safariIos', 'chromeAndroid', 'chromeDesktop', 'samsung']) {
      expect(isInAppBrowser(UA[key]), key).toBe(false)
    }
  })
})

describe('providerBlockedHere', () => {
  it('cache Google dans une appli, pas ailleurs', () => {
    expect(providerBlockedHere('Google', UA.instagram)).toBe(true)
    expect(providerBlockedHere('Google', UA.safariIos)).toBe(false)
  })

  it('ne touche pas aux autres fournisseurs', () => {
    expect(providerBlockedHere('Authentik', UA.instagram)).toBe(false)
    expect(providerBlockedHere('', UA.instagram)).toBe(false)
  })
})
