/** Server-side Pendo Track Events sent to the Pendo Track API (POST {dataHost}/data/track). */

export type PendoTrackProperties = Record<string, string | number | boolean>;

// TODO: PENDO_TRACK_EVENT_SECRET (the Pendo Track Event shared secret / integration key) is required
// for server-side tracking. Events are skipped while it is unset.
const trackEventSecret = process.env.PENDO_TRACK_EVENT_SECRET;
// TODO: Set PENDO_DATA_HOST if this subscription uses a regional data host (e.g. https://data.eu.pendo.io).
const dataHost = process.env.PENDO_DATA_HOST ?? "https://data.pendo.io";

export function pendoTrack(
  event: string,
  visitorId: string | undefined,
  accountId: string | undefined,
  properties: PendoTrackProperties = {}
): void {
  if (!trackEventSecret) return;
  try {
    const body = {
      type: "track",
      event,
      visitorId: visitorId ?? "system",
      accountId: accountId ?? "system",
      timestamp: Date.now(),
      properties,
    };
    void fetch(`${dataHost}/data/track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-pendo-integration-key": trackEventSecret,
      },
      body: JSON.stringify(body),
    })
      .then((response) => {
        if (!response.ok) {
          console.error(`Pendo track "${event}" failed with ${response.status}`);
        }
      })
      .catch((err: unknown) => {
        console.error(`Pendo track "${event}" failed`, err);
      });
  } catch (err) {
    console.error(`Pendo track "${event}" failed`, err);
  }
}
