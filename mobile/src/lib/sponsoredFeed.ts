import { mockRestaurants } from "../data/mockData";
import { Restaurant } from "../types/models";

const MAX_SPONSORED_PLACEMENTS = 4;
const MIN_ORGANIC_BETWEEN_SPONSORED = 3;

export const isSponsoredFeedPlacement = (restaurant: Restaurant) => Boolean(restaurant.is_sponsored);

export const isExternalSponsoredPlacement = (restaurant: Restaurant) =>
  isSponsoredFeedPlacement(restaurant) && restaurant.sponsored_mode === "external";

export const isNativeSponsoredPlacement = (restaurant: Restaurant) =>
  isSponsoredFeedPlacement(restaurant) && restaurant.sponsored_mode !== "external";

const pickSponsoredPlacements = (items: Restaurant[]) => {
  const mockSponsoredRestaurants = mockRestaurants.filter(isSponsoredFeedPlacement);
  const merged = [...items.filter(isSponsoredFeedPlacement), ...mockSponsoredRestaurants];
  const seen = new Set<number>();

  return merged.filter((restaurant) => {
    if (seen.has(restaurant.id)) return false;
    seen.add(restaurant.id);
    return true;
  }).slice(0, MAX_SPONSORED_PLACEMENTS);
};

export const buildSponsoredFeed = (items: Restaurant[], organicLimit?: number) => {
  const sponsored = pickSponsoredPlacements(items);
  const sponsoredIds = new Set(sponsored.map((restaurant) => restaurant.id));
  const organic = items.filter((item) => !sponsoredIds.has(item.id) && !isSponsoredFeedPlacement(item));
  const visibleOrganic = organicLimit ? organic.slice(0, organicLimit) : organic;
  const ordered: Restaurant[] = [];
  let organicIndex = 0;
  let sponsoredIndex = 0;

  while (organicIndex < visibleOrganic.length) {
    const nextOrganicChunk = visibleOrganic.slice(organicIndex, organicIndex + MIN_ORGANIC_BETWEEN_SPONSORED);
    ordered.push(...nextOrganicChunk);
    organicIndex += nextOrganicChunk.length;

    if (nextOrganicChunk.length === MIN_ORGANIC_BETWEEN_SPONSORED && sponsoredIndex < sponsored.length) {
      ordered.push(sponsored[sponsoredIndex]);
      sponsoredIndex += 1;
    }
  }

  const seen = new Set<number>();
  const deduped = ordered.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  return deduped;
};
