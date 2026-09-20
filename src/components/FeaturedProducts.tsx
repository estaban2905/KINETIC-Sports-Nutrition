import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, ShoppingBag, Star, Zap, ArrowRight, Check } from 'lucide-react';
import { FEATURED_PRODUCTS } from '../data/products';
import { Product } from '../types';

interface FeaturedProductsProps {
  onQuickView: (product: Product) => void;
  onAddToCartDirect: (product: Product) => void;
}

export const FeaturedProducts: React.FC<FeaturedProductsProps> = ({
  onQuickView,
  onAddToCartDirect
}) => {
  const [filter, setFilter] = useState<string>('Todos');
  const [addedId, setAddedId] = useState<string | null>(null);

  const categories = ['Todos', 'Rendimiento', 'Energía', 'Accesorios', 'Snacks', 'Ropa'];

  const filteredProducts = filter === 'Todos'
    ? FEATURED_PRODUCTS
    : FEATURED_PRODUCTS.filter(p => p.category === filter);

  const handleAdd = (p: Product) => {
    onAddToCartDirect(p);
    setAddedId(p.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  return (
    <section id="productos" className="relative py-24 bg-neutral-950 overflow-hidden">
      
      {/* Background accents */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-lime-500/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-lime-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Zap className="w-3.5 h-3.5" />
              ECOSISTEMA DE ENTRENAMIENTO
            </div>
            <h2 className="text-3xl sm:text-5xl font-black italic tracking-tighter uppercase font-display text-white">
              COMPLETA TU ENTRENAMIENTO
            </h2>
          </div>
          
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all ${
                  filter === cat
                    ? 'bg-lime-400 text-neutral-950 shadow-md shadow-lime-400/20'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid with 3D Hover & Clean Presentation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              whileHover={{ 
                y: -8,
                rotateX: 2,
                rotateY: -2,
                transition: { duration: 0.2 }
              }}
              style={{ transformStyle: 'preserve-3d' }}
              className="group rounded-2xl bg-neutral-900/60 border border-neutral-800/90 overflow-hidden backdrop-blur-sm flex flex-col justify-between transition-shadow duration-300 hover:border-lime-400/50 hover:shadow-[0_15px_35px_-10px_rgba(163,230,53,0.15)]"
            >
              <div>
                {/* Product Image Stage */}
                <div className="relative aspect-[4/3] bg-gradient-to-b from-neutral-800/40 to-neutral-950/80 overflow-hidden flex items-center justify-center p-6">
                  {/* Badge */}
                  {product.badge && (
                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-2.5 py-1 rounded-md bg-lime-400 text-neutral-950 text-[10px] font-black uppercase font-display tracking-wider shadow">
                        {product.badge}
                      </span>
                    </div>
                  )}

                  {/* Rating */}
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-neutral-950/80 backdrop-blur-md px-2 py-0.5 rounded border border-neutral-800 text-amber-400 text-[11px] font-bold">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>{product.rating}</span>
                  </div>

                  {/* Product Image */}
                  <img
                    src={product.image}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center rounded-xl group-hover:scale-105 transition-transform duration-500 filter contrast-115"
                  />

                  {/* Quick View Hover Button */}
                  <button
                    type="button"
                    onClick={() => onQuickView(product)}
                    className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs uppercase font-display tracking-wider"
                  >
                    <span className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center gap-2 hover:bg-neutral-800">
                      <Eye className="w-4 h-4 text-lime-400" />
                      Vista Rápida
                    </span>
                  </button>
                </div>

                {/* Card Content */}
                <div className="p-5">
                  <div className="text-[10px] font-mono text-lime-400 uppercase tracking-widest font-semibold mb-1">
                    {product.category}
                  </div>

                  <h3 className="text-lg font-black uppercase font-display tracking-tight text-white group-hover:text-lime-400 transition-colors">
                    {product.name}
                  </h3>

                  <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>

                  {/* Feature bullet */}
                  <div className="mt-3 text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                    <span>{product.features[0]}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer: Price & CTA */}
              <div className="p-5 pt-0 border-t border-neutral-800/60 mt-2 flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg sm:text-xl font-black text-white font-display">
                    ${product.price.toLocaleString('es-CL')}
                  </div>
                  {product.originalPrice && (
                    <div className="text-[11px] text-neutral-500 line-through">
                      ${product.originalPrice.toLocaleString('es-CL')}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onQuickView(product)}
                    className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold font-display uppercase tracking-wider transition-colors"
                  >
                    VER PRODUCTO
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAdd(product)}
                    className="p-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 transition-all hover:scale-105 active:scale-95"
                    aria-label="Agregar al carrito"
                  >
                    {addedId === product.id ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <ShoppingBag className="w-4 h-4 fill-neutral-950/20" />
                    )}
                  </button>
                </div>
              </div>

            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
