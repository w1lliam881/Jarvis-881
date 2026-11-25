import { describe, expect, it } from 'vitest';
import { formatStats, marketerState, parseTikTokUrl } from '../../src/domain/tiktok';
import { baseRecord, emptyDataset } from '../../src/domain/defaults';
import type { VideoPost } from '../../src/domain/types';

const vid = (p: Partial<VideoPost>): VideoPost => ({
  ...baseRecord(), platform: 'TikTok', title: '', type: 'Styling', postedAt: '2026-11-20T18:00:00Z', lengthSec: 15, song: '', views: 0, likes: 0, comments: 0, shares: 0, saves: 0, dropIds: [], itemIds: [], ideaKey: null, note: '', ...p,
});

describe('tiktok', () => {
  it('känner igen länkar', () => {
    expect(parseTikTokUrl('https://www.tiktok.com/@881denim/video/7312345678901234567?is_from_webapp=1')).toEqual({ url: 'https://www.tiktok.com/@881denim/video/7312345678901234567', user: '881denim', id: '7312345678901234567' });
    expect(parseTikTokUrl('https://vm.tiktok.com/ZMabc123/')?.id).toBeNull();
    expect(parseTikTokUrl('https://instagram.com/p/x')).toBeNull();
  });
  it('Marketer väntar tills fem klipp har siffror', () => {
    const d = emptyDataset();
    d.videos = [vid({ views: 100 }), vid({ views: 0 }), vid({ views: 300 })];
    expect(marketerState(d)).toEqual({ ready: false, logged: 3, withStats: 2, need: 3 });
    d.videos.push(vid({ views: 1 }), vid({ views: 2 }), vid({ views: 3 }));
    expect(marketerState(d).ready).toBe(true);
  });
  it('visar vilka kryss som går bättre än snittet', () => {
    const vs = [
      vid({ views: 1000, likes: 100, formats: ['På kropp / try-on'] }),
      vid({ views: 800, likes: 80, formats: ['På kropp / try-on', 'Text på skärmen'] }),
      vid({ views: 100, likes: 5, formats: ['Flatlay uppifrån', 'Text på skärmen'] }),
      vid({ views: 100, likes: 5, formats: ['Flatlay uppifrån'] }),
    ];
    const s = formatStats(vs);
    expect(s[0].format).toBe('På kropp / try-on');
    expect(s[0].vsAvg).toBeCloseTo(900 / 500, 5);
    expect(s.at(-1)!.format).toBe('Flatlay uppifrån');
  });
});
