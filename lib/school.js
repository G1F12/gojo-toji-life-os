import { fetchFeed } from "./providers/feed.js";
import { fetchHebeCE } from "./providers/hebece.js";

export async function fetchSchoolData() {
  const provider = (process.env.SCHOOL_PROVIDER || "").toLowerCase();
  if (provider === "hebece") return {provider, items: await fetchHebeCE()};
  if (provider === "feed") return {provider, items: await fetchFeed()};
  if (!provider) {
    // Auto-select when only one backend is configured.
    if ((process.env.EDUVULCAN_API_AP || (process.env.EDUVULCAN_LOGIN && process.env.EDUVULCAN_PASSWORD)) && process.env.EDUVULCAN_KEYPAIR_JSON) {
      return {provider:"hebece", items: await fetchHebeCE()};
    }
    if (process.env.SCHOOL_FEED_URL) return {provider:"feed", items: await fetchFeed()};
  }
  throw new Error("No School provider configured. Set SCHOOL_PROVIDER=hebece or feed.");
}
