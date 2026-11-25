/**
 * iPhone eller iPad? Bara där har appen på hemskärmen en egen inloggning, skild från Safari,
 * så att inloggningslänken behöver följas av en kod. På dator, Chromebook och Android loggas man in direkt.
 */
export function isIOSDevice(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
}
