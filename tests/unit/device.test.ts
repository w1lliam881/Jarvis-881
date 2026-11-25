import { describe, expect, it } from 'vitest';
import { isIOSDevice } from '../../src/domain/device';

describe('inloggningskod bara på iPhone och iPad', () => {
  it('iPhone och iPad får koden', () => {
    expect(isIOSDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_3_1 like Mac OS X) AppleWebKit/605.1.15', 'iPhone', 5)).toBe(true);
    expect(isIOSDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', 'MacIntel', 5)).toBe(true); // iPad i skrivbordsläge
  });
  it('Chromebook, Mac, Windows och Android loggas in direkt', () => {
    expect(isIOSDevice('Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 Chrome/156.0.0.0 Safari/537.36', 'Linux x86_64', 0)).toBe(false);
    expect(isIOSDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/156.0.0.0 Safari/537.36', 'MacIntel', 0)).toBe(false);
    expect(isIOSDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/156.0.0.0', 'Win32', 0)).toBe(false);
    expect(isIOSDevice('Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/156.0.0.0 Mobile', 'Linux armv8l', 5)).toBe(false);
  });
});
