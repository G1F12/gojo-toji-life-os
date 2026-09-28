
export async function fetchFeed() {
  const url = process.env.SCHOOL_FEED_URL;
  if (!url) throw new Error("SCHOOL_FEED_URL is not configured");
  const headers = {Accept:"application/json"};
  if (process.env.SCHOOL_FEED_TOKEN) headers.Authorization = `Bearer ${process.env.SCHOOL_FEED_TOKEN}`;
  const res = await fetch(url, {headers, cache:"no-store"});
  if (!res.ok) throw new Error(`School feed HTTP ${res.status}`);
  const json = await res.json();
  const items = Array.isArray(json) ? json : (json.items || []);
  return items.map((x, i) => ({
    externalId: x.externalId || x.id || `feed-${i}-${x.due || ""}`,
    type: x.type || "homework",
    subject: x.subject || "Bez przedmiotu",
    title: x.title || x.description || "",
    due: x.due || x.date || null,
    priority: Number(x.priority ?? 1),
    source: x.source || "school-feed"
  })).filter(x => x.due);
}
