import { beforeEach, describe, expect, it, vi } from 'vitest';

const regionList = vi.fn();
const productList = vi.fn();
const clientFetch = vi.fn();

vi.mock('@medusajs/js-sdk', () => ({
  default: class {
    store = { region: { list: regionList }, product: { list: productList } };
    client = { fetch: clientFetch };
  },
}));

type MedusaModule = typeof import('../medusa');

const CHILE = { id: 'reg_cl', currency_code: 'clp' };
const USA = { id: 'reg_us', currency_code: 'usd' };

describe('medusa store helpers', () => {
  let medusa: MedusaModule;

  // Varias funciones guardan caché a nivel de módulo: cada test parte con uno nuevo.
  beforeEach(async () => {
    vi.resetModules();
    regionList.mockReset();
    productList.mockReset();
    clientFetch.mockReset();
    regionList.mockResolvedValue({ regions: [USA, CHILE] });
    medusa = await import('../medusa');
  });

  describe('getChileRegion', () => {
    it('elige la región en pesos y la guarda en caché', async () => {
      expect(await medusa.getChileRegion()).toBe(CHILE);
      expect(await medusa.getChileRegion()).toBe(CHILE);
      expect(regionList).toHaveBeenCalledTimes(1);
    });

    it('cae a la primera región si no hay una en pesos', async () => {
      regionList.mockResolvedValue({ regions: [USA] });

      expect(await medusa.getChileRegion()).toBe(USA);
    });

    it('explica cómo sembrar datos cuando no hay regiones', async () => {
      regionList.mockResolvedValue({ regions: [] });

      await expect(medusa.getChileRegion()).rejects.toThrow(/seed-chile/);
    });
  });

  describe('resolveVariantId', () => {
    const product = { id: 'kinetic-whey' } as any;
    const flavor = { name: 'Chocolate' } as any;
    const size = { name: '2 lb' } as any;

    it('encuentra la variante por sabor y tamaño', async () => {
      productList.mockResolvedValue({
        products: [{ variants: [{ id: 'v1', title: 'Vainilla / 2 lb' }, { id: 'v2', title: 'Chocolate / 2 lb' }] }],
      });

      expect(await medusa.resolveVariantId(product, flavor, size)).toBe('v2');
      expect(productList).toHaveBeenCalledWith({ handle: 'kinetic-whey', fields: 'id,handle,*variants' });
    });

    it('usa "Único" para productos sin opciones', async () => {
      productList.mockResolvedValue({ products: [{ variants: [{ id: 'v1', title: 'Único' }] }] });

      expect(await medusa.resolveVariantId(product)).toBe('v1');
    });

    it('falla si el producto no existe en Medusa', async () => {
      productList.mockResolvedValue({ products: [] });

      await expect(medusa.resolveVariantId(product, flavor, size)).rejects.toThrow(/no existe en el backend/);
    });

    it('falla si no hay una variante con ese título', async () => {
      productList.mockResolvedValue({ products: [{ variants: [{ id: 'v1', title: 'Otra' }] }] });

      await expect(medusa.resolveVariantId(product, flavor, size)).rejects.toThrow(/Chocolate \/ 2 lb/);
    });

    it('falla si el producto no trae variantes', async () => {
      productList.mockResolvedValue({ products: [{}] });

      await expect(medusa.resolveVariantId(product, flavor, size)).rejects.toThrow(/No se encontró la variante/);
    });
  });

  describe('lookupOrder', () => {
    it('consulta con número de pedido y correo, y devuelve el pedido', async () => {
      clientFetch.mockResolvedValue({ order: { id: 'order1' } });

      expect(await medusa.lookupOrder('1042', 'ana@test.cl')).toEqual({ id: 'order1' });
      expect(clientFetch).toHaveBeenCalledWith('/store/order-lookup', {
        method: 'POST',
        body: { display_id: '1042', email: 'ana@test.cl' },
      });
    });
  });

  describe('listComunas', () => {
    it('devuelve las comunas y las guarda en caché', async () => {
      clientFetch.mockResolvedValue({ comunas: ['Providencia'] });

      expect(await medusa.listComunas()).toEqual(['Providencia']);
      expect(await medusa.listComunas()).toEqual(['Providencia']);
      expect(clientFetch).toHaveBeenCalledTimes(1);
    });

    it('devuelve una lista vacía, sin lanzar, si el backend falla, y reintenta después', async () => {
      clientFetch.mockRejectedValueOnce(new Error('sin credenciales'));
      expect(await medusa.listComunas()).toEqual([]);

      clientFetch.mockResolvedValueOnce({ comunas: ['Ñuñoa'] });
      expect(await medusa.listComunas()).toEqual(['Ñuñoa']);
    });
  });

  describe('mapMedusaProductToProduct', () => {
    const full = {
      id: 'prod_1',
      handle: 'kinetic-whey',
      title: 'Whey Protein',
      subtitle: 'Aislada',
      description: 'Descripción',
      thumbnail: 'https://img.test/whey.png',
      metadata: { original_price: 49990 },
      categories: [{ name: 'Proteínas' }],
      options: [
        { title: 'Sabor', values: [{ value: 'Chocolate Intenso' }, { value: 'Vainilla' }] },
        { title: 'Tamaño', values: [{ value: '2 lb' }, { value: '5 lb' }] },
      ],
      variants: [
        {
          id: 'v1',
          metadata: { weight: '907 g', servings: 30, original_price: 39990 },
          options: [{ value: 'Chocolate Intenso' }, { value: '2 lb' }],
          calculated_price: { calculated_amount: 34990 },
        },
        {
          id: 'v2',
          metadata: {},
          options: [{ value: 'Vainilla' }, { value: '5 lb' }],
          calculated_price: { calculated_amount: 69990 },
        },
      ],
      product_content: {
        badge: 'Más vendido',
        rating: 4.8,
        features: ['25 g de proteína'],
        nutrition_facts: [{ label: 'Proteína', value: '25 g' }],
      },
    } as any;

    it('traduce un producto completo al formato del storefront', () => {
      const product = medusa.mapMedusaProductToProduct(full);

      expect(product).toMatchObject({
        id: 'kinetic-whey',
        name: 'Whey Protein',
        subtitle: 'Aislada',
        category: 'Proteínas',
        description: 'Descripción',
        longDescription: 'Descripción',
        price: 34990,
        originalPrice: 49990,
        badge: 'Más vendido',
        rating: 4.8,
        image: 'https://img.test/whey.png',
        features: ['25 g de proteína'],
        nutritionFacts: [{ label: 'Proteína', value: '25 g' }],
      });
    });

    it('arma sabores con id legible y color por posición', () => {
      const { flavors } = medusa.mapMedusaProductToProduct(full);

      expect(flavors).toHaveLength(2);
      expect(flavors![0]).toMatchObject({ id: 'chocolate-intenso', name: 'Chocolate Intenso', color: 'bg-red-600' });
      expect(flavors![1].color).toBe('bg-amber-100');
    });

    it('arma tamaños con precio, peso y porciones de cada variante', () => {
      const { sizes } = medusa.mapMedusaProductToProduct(full);

      expect(sizes![0]).toEqual({
        id: '2-lb',
        name: '2 lb',
        weight: '907 g',
        servings: 30,
        price: 34990,
        originalPrice: 39990,
      });
      // Sin metadata: el peso es el nombre, sin porciones y sin precio original.
      expect(sizes![1]).toEqual({
        id: '5-lb',
        name: '5 lb',
        weight: '5 lb',
        servings: 0,
        price: 69990,
        originalPrice: 69990,
      });
    });

    it('reutiliza la paleta de colores cuando hay más sabores que colores', () => {
      const flavorNames = Array.from({ length: 10 }, (_, i) => ({ value: `Sabor ${i}` }));
      const product = medusa.mapMedusaProductToProduct({
        ...full,
        options: [{ title: 'Sabor', values: flavorNames }],
      });

      expect(product.flavors![8].color).toBe(product.flavors![0].color);
    });

    it('usa valores por defecto para un producto mínimo', () => {
      const product = medusa.mapMedusaProductToProduct({ id: 'prod_2', title: 'Shaker' } as any);

      expect(product).toMatchObject({
        id: 'prod_2',
        name: 'Shaker',
        subtitle: '',
        category: 'Suplementos',
        description: '',
        price: 0,
        rating: 5,
        image: '',
        features: [],
      });
      expect(product.originalPrice).toBeUndefined();
      expect(product.badge).toBeUndefined();
      expect(product.flavors).toBeUndefined();
      expect(product.sizes).toBeUndefined();
      expect(product.nutritionFacts).toBeUndefined();
    });

    it('toma el precio de la primera variante cuando no hay tamaños', () => {
      const product = medusa.mapMedusaProductToProduct({
        id: 'prod_3',
        title: 'Creatina',
        variants: [{ id: 'v1', calculated_price: { calculated_amount: 19990 } }],
      } as any);

      expect(product.price).toBe(19990);
    });

    it('ignora metadata con tipos inesperados', () => {
      const product = medusa.mapMedusaProductToProduct({
        ...full,
        metadata: { original_price: '49990' },
        variants: [
          { id: 'v1', metadata: { weight: 907, servings: '30', original_price: '1' }, options: [{ value: '2 lb' }] },
        ],
      });

      expect(product.originalPrice).toBeUndefined();
      expect(product.sizes![0]).toMatchObject({ weight: '2 lb', servings: 0 });
    });
  });

  describe('getProductCatalog', () => {
    it('pide el catálogo de la región de Chile y solo devuelve productos KINETIC', async () => {
      productList.mockResolvedValue({
        products: [
          { id: 'p1', handle: 'kinetic-whey', title: 'Whey' },
          { id: 'p2', handle: 'medusa-shorts', title: 'Shorts' },
          { id: 'p3', title: 'Sin handle' },
        ],
      });

      const catalog = await medusa.getProductCatalog();

      expect(catalog.map((p) => p.id)).toEqual(['kinetic-whey']);
      expect(productList).toHaveBeenCalledWith(expect.objectContaining({ region_id: 'reg_cl', limit: 100 }));
    });
  });
});
