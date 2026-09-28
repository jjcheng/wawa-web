export function applyGoogleMapsTheme(url: URL, theme: "light" | "dark") {
  const mapId = theme === "dark"
    ? process.env.NEXT_PUBLIC_GOOGLE_DARK_MAP_ID
    : process.env.NEXT_PUBLIC_GOOGLE_LIGHT_MAP_ID;
  if (mapId) url.searchParams.set("map_id", mapId);
  return url;
}