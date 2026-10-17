import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as landing from '../landing';

const okResponse = (body: unknown) => ({ ok: true, json: async () => body }) as Response;

describe('landing content fetchers', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // [función, recurso del backend, clave de la respuesta]
  const simple = [
    ['getLandingHero', 'hero', 'hero'],
    ['getLandingBenefits', 'benefits', 'benefits'],
    ['getLandingTestimonials', 'testimonials', 'testimonials'],
    ['getLandingFAQs', 'faq', 'faq'],
    ['getLandingSettings', 'settings', 'settings'],
    ['getLandingBanners', 'banners', 'banners'],
    ['getLandingTrustBadges', 'trust-badges', 'trust_badges'],
    ['getLandingFinalCta', 'final-cta', 'final_cta'],
    ['getLandingProductSection', 'product-section', 'product_section'],
    ['getLandingGuarantees', 'guarantees', 'guarantees'],
    ['getLandingUsageTips', 'usage-tips', 'usage_tips'],
  ] as const;

  describe.each(simple)('%s', (fn, resource, key) => {
    const call = () => (landing as unknown as Record<string, () => Promise<unknown>>)[fn]();

    it('devuelve el contenido del recurso correcto', async () => {
      fetchMock.mockResolvedValue(okResponse({ [key]: { marker: fn } }));

      expect(await call()).toEqual({ marker: fn });
      expect(fetchMock.mock.calls[0][0]).toMatch(new RegExp(`/store/landing/${resource}$`));
    });

    it('devuelve null si el backend responde con error', async () => {
      fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) } as Response);

      expect(await call()).toBeNull();
    });

    it('devuelve null si la red falla', async () => {
      fetchMock.mockRejectedValue(new Error('offline'));

      expect(await call()).toBeNull();
    });

    it('devuelve null si la respuesta no trae el contenido', async () => {
      fetchMock.mockResolvedValue(okResponse({}));

      expect(await call()).toBeNull();
    });
  });

  describe('getLandingNavLinks', () => {
    it('pide todos los enlaces cuando no se indica grupo', async () => {
      fetchMock.mockResolvedValue(okResponse({ nav_links: [{ id: '1' }] }));

      expect(await landing.getLandingNavLinks()).toEqual([{ id: '1' }]);
      expect(fetchMock.mock.calls[0][0]).toMatch(/\/store\/landing\/nav-links$/);
    });

    it('filtra por grupo y escapa el valor', async () => {
      fetchMock.mockResolvedValue(okResponse({ nav_links: [] }));

      await landing.getLandingNavLinks('footer legal&x=1');

      expect(fetchMock.mock.calls[0][0]).toMatch(/nav-links\?group=footer%20legal%26x%3D1$/);
    });

    it('devuelve null si falla', async () => {
      fetchMock.mockRejectedValue(new Error('offline'));

      expect(await landing.getLandingNavLinks('navbar')).toBeNull();
    });
  });
});
