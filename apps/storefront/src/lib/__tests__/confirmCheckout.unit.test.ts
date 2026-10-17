import { describe, expect, it, vi } from 'vitest';
import { completeWithRetries } from '../confirmCheckout';

const order = { type: 'order', order: { id: 'order_1' } } as never;
const pending = { type: 'cart', error: { message: 'pendiente' } } as never;
const sleep = () => Promise.resolve();

describe('completeWithRetries', () => {
  it('returns the order on first success', async () => {
    const complete = vi.fn().mockResolvedValue(order);
    expect(await completeWithRetries(complete, { sleep })).toEqual({ kind: 'order', orderId: 'order_1' });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('retries a pending payment until it becomes an order', async () => {
    const complete = vi.fn().mockResolvedValueOnce(pending).mockResolvedValueOnce(order);
    expect(await completeWithRetries(complete, { sleep })).toEqual({ kind: 'order', orderId: 'order_1' });
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('retries after a network error', async () => {
    const complete = vi.fn().mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce(order);
    expect((await completeWithRetries(complete, { sleep })).kind).toBe('order');
  });

  it('reports unconfirmed after exhausting attempts', async () => {
    const complete = vi.fn().mockResolvedValue(pending);
    expect(await completeWithRetries(complete, { sleep, attempts: 3 })).toEqual({
      kind: 'unconfirmed',
      message: 'pendiente',
    });
    expect(complete).toHaveBeenCalledTimes(3);
  });
});
