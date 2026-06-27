export function getPixelsStoreUrl(): string {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'https://apps.apple.com/us/app/pixels-mood-tracker-journal/id1668460700'
  if (/Android/i.test(ua)) return 'https://play.google.com/store/apps/details?id=ar.teovogel.yip'
  return 'https://pixelstracker.app'
}
