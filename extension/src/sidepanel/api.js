import { BACKEND_URL } from "../shared/config.js";

// Sends the task + page scan to the backend. Throws Error with a
// user-readable message on any failure.
export async function requestGuidance(task, page) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  let res;
  try {
    res = await fetch(`${BACKEND_URL}/api/guide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, page }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error("The request took too long. Please try again.");
    }
    throw new Error(
      `Cannot reach the backend. Is it running at ${BACKEND_URL}?`,
    );
  } finally {
    clearTimeout(timer);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("The backend returned an unreadable response.");
  }

  if (!res.ok || data.status !== "ok") {
    console.error("Backend error:", data); // includes validation details for debugging
    throw new Error(data?.error?.message ?? `Backend error (${res.status}).`);
  }
  return data;
}
