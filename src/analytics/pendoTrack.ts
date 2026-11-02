/** Server-side Pendo Track Events sent to the Pendo Track API (`POST /data/track`). */

export type PendoTrackProperties = Record<string, string | number | boolean>;

export interface PendoTrackEvent {
  event: string;
  visitorId?: string;
  accountId?: string;
  properties?: PendoTrackProperties;
}

const pendoDataHost = process.env.PENDO_DATA_HOST ?? "data.pendo.io";
// Server-side integration key; supply via the environment, never commit it.
const pendoIntegrationKey = process.env.PENDO_INTEGRATION_KEY;

/** Fire-and-forget: tracking failures are logged and never break the request flow. */
export function trackPendoEvent({
  event,
  visitorId,
  accountId,
  properties,
}: PendoTrackEvent): void {
  if (!pendoIntegrationKey) return;
  try {
    const body = {
      type: "track",
      event,
      visitorId: visitorId ?? "system",
      accountId: accountId ?? "system",
      timestamp: Date.now(),
      properties: properties ?? {},
    };
    void fetch(`https://${pendoDataHost}/data/track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-pendo-integration-key": pendoIntegrationKey,
      },
      body: JSON.stringify(body),
    })
      .then((response) => {
        if (!response.ok) {
          console.error(`Pendo track "${event}" failed with ${response.status}`);
        }
      })
      .catch((err: unknown) => {
        console.error(`Pendo track "${event}" request failed`, err);
      });
  } catch (err) {
    console.error(`Pendo track "${event}" could not be sent`, err);
  }
}
