// In-memory cache of the last successful response for each authenticated GET.
//
// Powers "stale-while-revalidate": a page renders instantly from whatever
// this cache holds (peek), while its normal fetch runs in the background and
// replaces the data when it arrives. Moving between pages therefore never
// starts from a blank "Loading…" screen once the data has been seen once.
//
// Correctness rules:
//  - Cleared on every write (POST/PATCH) so a page never flashes data that
//    the user's own action just made wrong.
//  - Cleared on login/logout (see tokenStorage.js) so one account's data can
//    never show up for the next person on a shared device.
//  - Memory only (not localStorage): nothing personal is left on disk.
const cache = new Map();

export function cacheResponse(path, data) {
  cache.set(path, data);
}

export function peekResponse(path) {
  return cache.get(path);
}

export function clearApiCache() {
  cache.clear();
}
