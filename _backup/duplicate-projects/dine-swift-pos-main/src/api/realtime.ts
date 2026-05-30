import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { API_BASE_URL, getAuthSession } from "@/api/http";

type PosRealtimeEvent =
  | { type: "ORDER_CREATED"; message?: string }
  | { type: "ORDER_READY"; message?: string }
  | { type: "ORDER_STATUS_CHANGED"; message?: string }
  | { type: "TABLE_UPDATED"; message?: string }
  | { type: "MENU_UPDATED"; message?: string }
  | { type: "BILL_PAID"; message?: string };

const invalidateForEvent = (queryClient: QueryClient, event: PosRealtimeEvent) => {
  if (event.type === "MENU_UPDATED") {
    queryClient.invalidateQueries({ queryKey: ["menu"] });
    return;
  }

  if (event.type === "TABLE_UPDATED") {
    queryClient.invalidateQueries({ queryKey: ["tables"] });
    return;
  }

  queryClient.invalidateQueries({ queryKey: ["orders"] });
  queryClient.invalidateQueries({ queryKey: ["kitchen"] });
  queryClient.invalidateQueries({ queryKey: ["analytics"] });
};

export function usePosRealtime(queryClient: QueryClient) {
  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }

    const session = getAuthSession();
    const url = new URL(`${API_BASE_URL}/realtime`, window.location.origin);
    if (session?.accessToken) {
      url.searchParams.set("token", session.accessToken);
    }

    const events = new EventSource(url.toString());

    events.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as PosRealtimeEvent;
        invalidateForEvent(queryClient, event);

        if (event.message) {
          toast(event.message);
        }
      } catch {
        queryClient.invalidateQueries();
      }
    };

    return () => events.close();
  }, [queryClient]);
}
