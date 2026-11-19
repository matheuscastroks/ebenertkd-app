import "server-only";

import { Query } from "node-appwrite";
import { summarizeEvents, type EventsSummary } from "@/features/events/rules/summary-rules";
import type { Event, EventRegistration, EventResult } from "@/features/events/types";
import { listAllRows } from "@/lib/appwrite/all-rows";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { cachedRead } from "@/lib/cache/cached-read";
import { CACHE_TAGS } from "@/lib/cache/tags";

function loadEventsDataset() {
  return cachedRead(
    { name: "events-summary-dataset", key: [], tags: [CACHE_TAGS.events], revalidate: 120 },
    async () => {
      const [events, presentRegistrations, results] = await Promise.all([
        listAllRows<Event>(APPWRITE_IDS.tables.events),
        listAllRows<EventRegistration>(APPWRITE_IDS.tables.eventRegistrations, [Query.equal("status", ["checked_in", "completed"])]),
        listAllRows<EventResult>(APPWRITE_IDS.tables.eventResults)
      ]);
      return {
        events: events.map((event) => ({ $id: event.$id, event_type: event.event_type, status: event.status, starts_at: event.starts_at })),
        presentRegistrations: presentRegistrations.map((registration) => ({ event_id: registration.event_id })),
        results: results.map((result) => ({ event_id: result.event_id, medal: result.medal }))
      };
    }
  );
}

/** Eventos realizados num período (`YYYY` ou `YYYY-MM`): campeonatos, presenças e medalhas. Alimenta o relatório anual e o fechamento. */
export async function getEventsSummary(prefix: string): Promise<EventsSummary> {
  return summarizeEvents({ ...(await loadEventsDataset()), prefix });
}
