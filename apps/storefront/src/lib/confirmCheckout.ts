import type { HttpTypes } from '@medusajs/types';

export type CompletionOutcome =
  | { kind: 'order'; orderId: string }
  | { kind: 'unconfirmed'; message?: string };

interface Options {
  attempts?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Calls cart.complete() until it yields an order. A provider can legitimately
 * answer "not yet" (Mercado Pago leaves a payment pending/in_process), so a
 * non-order result or a transient network error is retried a few times before
 * being reported as unconfirmed — never as a definitive payment failure.
 */
export async function completeWithRetries(
  complete: () => Promise<HttpTypes.StoreCompleteCartResponse>,
  { attempts = 3, delayMs = 2500, sleep = defaultSleep }: Options = {}
): Promise<CompletionOutcome> {
  let message: string | undefined;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(delayMs);
    try {
      const result = await complete();
      if (result.type === 'order') return { kind: 'order', orderId: result.order.id };
      message = result.error?.message;
    } catch (err) {
      message = err instanceof Error ? err.message : undefined;
    }
  }
  return { kind: 'unconfirmed', message };
}
