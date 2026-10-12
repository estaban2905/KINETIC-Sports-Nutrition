import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_STATUS_COPY,
  PROGRESS_STEPS,
  formatEventDate,
  isStepComplete,
  progressStepIndex,
  type CustomerStatus,
} from '../orderStatus';

const ALL_STATUSES = Object.keys(CUSTOMER_STATUS_COPY) as CustomerStatus[];

describe('customer status copy', () => {
  it('has a title and description for every status', () => {
    for (const status of ALL_STATUSES) {
      expect(CUSTOMER_STATUS_COPY[status].title).not.toBe('');
      expect(CUSTOMER_STATUS_COPY[status].description).not.toBe('');
    }
  });
});

describe('progress steps', () => {
  it('maps each active status to a step inside the bar', () => {
    for (const status of ALL_STATUSES.filter((s) => s !== 'canceled')) {
      const index = progressStepIndex(status);
      expect(index).not.toBeNull();
      expect(index!).toBeGreaterThanOrEqual(0);
      expect(index!).toBeLessThan(PROGRESS_STEPS.length);
    }
  });

  it('shows no progress for a canceled order', () => {
    expect(progressStepIndex('canceled')).toBeNull();
    expect(isStepComplete(0, 'canceled')).toBe(false);
  });

  it('marks earlier steps complete and the current one pending', () => {
    // preparing is step 1: "Pago" done, "Preparación" in progress.
    expect(isStepComplete(0, 'preparing')).toBe(true);
    expect(isStepComplete(1, 'preparing')).toBe(false);
    expect(isStepComplete(0, 'payment_pending')).toBe(false);
  });

  it('completes every step once delivered', () => {
    PROGRESS_STEPS.forEach((_, i) => expect(isStepComplete(i, 'delivered')).toBe(true));
  });
});

describe('formatEventDate', () => {
  it('shows the wall-clock time Chilexpress sent, ignoring its trailing Z', () => {
    // es-CL uses a 12-hour clock: 16:06 is "4:06 p. m.". Read as real UTC in
    // America/Santiago this would have shown "1:06 p. m.".
    const formatted = formatEventDate('2018-10-29T16:06:00Z');
    expect(formatted).toContain('4:06');
    expect(formatted).not.toContain('1:06');
  });

  it('returns the raw text when it is not a date', () => {
    expect(formatEventDate('no es fecha')).toBe('no es fecha');
  });
});
