export const API_BASE = "https://YOUR_WORKER_DOMAIN";
export const USER_ID = "123";

export async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "X-User-Id": USER_ID }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": USER_ID },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
