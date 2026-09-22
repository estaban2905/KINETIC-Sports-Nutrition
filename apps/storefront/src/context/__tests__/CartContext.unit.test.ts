import { describe, expect, it } from 'vitest';
import { describeCartError } from '../CartContext';

describe('describeCartError', () => {
  it.each([
    'Failed to fetch',
    'NetworkError when attempting to fetch resource.',
    'Load failed',
    'connect ECONNREFUSED 127.0.0.1:9000',
  ])('gives an actionable message when the backend is unreachable (%s)', (rawMessage) => {
    const result = describeCartError(new Error(rawMessage));
    expect(result).toContain('No pudimos conectar con el servidor de la tienda');
  });

  it('passes through a specific error message for anything else', () => {
    expect(describeCartError(new Error('Stock insuficiente'))).toBe('Stock insuficiente');
  });

  it('falls back to a generic message for a non-Error with no text', () => {
    expect(describeCartError('')).toBe('No se pudo agregar el producto al carrito.');
  });
});
