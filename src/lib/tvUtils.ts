import { MediaItem } from '../types';

export function isCompleteTvSeries(item: MediaItem): boolean {
  if (item.type !== 'tv' && !(item.type === 'anime' && item.seasons && item.seasons.length > 0)) {
    return false;
  }

  // If detailed seasons list is present
  if (item.seasons && item.seasons.length > 0) {
    const totalSeasons = item.seasons.length;
    const ownedSeasons = item.seasons.filter(s => s.ownedInVault !== false);
    const expectedCount = item.numberOfSeasons && item.numberOfSeasons > 0 ? item.numberOfSeasons : totalSeasons;

    // If there are unowned seasons in the list, it's NOT complete
    if (ownedSeasons.length < totalSeasons) {
      return false;
    }

    // If all seasons in list are owned and owned count matches or exceeds expected count
    if (ownedSeasons.length >= expectedCount && ownedSeasons.length > 0) {
      return true;
    }
  }

  // Fallbacks if no detailed seasons array is present
  if (item.tvCollectionType === 'complete') return true;
  if (item.isCompleteSeries) return true;
  if (item.format === 'Box Set') return true;

  return false;
}
