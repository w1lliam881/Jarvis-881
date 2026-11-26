// Marketers påminnelse: klipp som lagts upp för minst 48 timmar sedan men saknar siffror.
import { live } from './metrics';
import type { Dataset, VideoPost } from './types';

const H = 3600000;

/** Klipp som är 48 timmar–30 dagar gamla och saknar visningar. Äldst först. */
export function clipsMissingStats(ds: Dataset, now: Date = new Date()): VideoPost[] {
  return live(ds.videos)
    .filter((v) => {
      const age = now.getTime() - new Date(v.postedAt).getTime();
      return !(v.views > 0) && age >= 48 * H && age <= 30 * 24 * H;
    })
    .sort((a, b) => (a.postedAt < b.postedAt ? -1 : 1));
}

/** Klipp som just passerat 48 timmar (inom den senaste timmen), för notisen som skickas en gång. */
export function clipsJustDue(videos: Pick<VideoPost, 'postedAt' | 'views'>[], now: Date = new Date()) {
  return videos.filter((v) => {
    const age = now.getTime() - new Date(v.postedAt).getTime();
    return !(v.views > 0) && age >= 48 * H && age < 49 * H;
  });
}
