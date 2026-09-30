import "server-only";
import { after } from "next/server";
import { processOutbox } from "./outbox";

/** Sends queued emails right after the response is returned, so users never wait on email delivery. */
export function flushOutboxAfterResponse() {
  after(async () => {
    try {
      await processOutbox(25);
    } catch (e) {
      console.error("[outbox] inline flush failed", e);
    }
  });
}
