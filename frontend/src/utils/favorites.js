import axios from "axios";
import API_BASE_URL from "../apiBase";

export const FAVORITES_CHANGED_EVENT = "favorites-changed";
const CACHE_KEY = "favoritesCache";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
});

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCache(list) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch {}
  window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
}

// Synchronous read of the last-known favorites list. This is just a local
// cache for instant badge counts / first paint — it is NOT the source of
// truth anymore, so it will legitimately be empty on a device/browser
// that hasn't called refreshFavorites() yet (e.g. a fresh incognito
// window before login finishes).
export function getFavorites() {
  return readCache();
}

export function getFavoritesCount() {
  return readCache().length;
}

// Pulls the authoritative list from the server and refreshes the local
// cache. Call this on mount, after login, and after logout.
export async function refreshFavorites() {
  const token = localStorage.getItem("token");
  if (!token) {
    writeCache([]);
    return [];
  }
  try {
    const res = await api.get("/api/favorites", { headers: authHeaders() });
    const list = res.data?.data || [];
    writeCache(list);
    return list;
  } catch (err) {
    console.error("[Favorites] refresh failed:", err.message);
    return readCache();
  }
}

// Optimistically adds to the cache immediately (so the heart icon updates
// instantly), then syncs with the server. Accepts either a full motorcycle
// object (preferred, so the Favorites page has something to render right
// away) or just an id.
export async function addFavorite(motorcycle) {
  const id =
    typeof motorcycle === "object"
      ? (motorcycle._id ?? motorcycle.id)
      : motorcycle;
  if (!id) return;

  const current = readCache();
  if (!current.some((m) => (m._id ?? m.id) === id)) {
    const entry = typeof motorcycle === "object" ? motorcycle : { _id: id };
    writeCache([entry, ...current]);
  }

  try {
    await api.post(`/api/favorites/${id}`, {}, { headers: authHeaders() });
  } catch (err) {
    console.error("[Favorites] add failed:", err.message);
    await refreshFavorites(); // roll cache back to server truth
  }
}

export async function removeFavorite(id) {
  const current = readCache();
  writeCache(current.filter((m) => (m._id ?? m.id) !== id));

  try {
    await api.delete(`/api/favorites/${id}`, { headers: authHeaders() });
  } catch (err) {
    console.error("[Favorites] remove failed:", err.message);
    await refreshFavorites();
  }
}

// Convenience check used by listing/detail pages to decide whether the
// heart icon should render filled or outlined.
export function isFavorite(id) {
  return readCache().some((m) => (m._id ?? m.id) === id);
}

// Backward-compatible toggle, kept for callers like Motorcycles.jsx that
// just want "flip favorited state for this motorcycle" without caring
// whether it's currently favorited.
export async function toggleFavorite(motorcycle) {
  const id =
    typeof motorcycle === "object"
      ? (motorcycle._id ?? motorcycle.id)
      : motorcycle;
  if (!id) return;

  if (isFavorite(id)) {
    await removeFavorite(id);
  } else {
    await addFavorite(motorcycle);
  }
}
