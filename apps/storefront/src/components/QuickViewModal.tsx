import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, ShoppingBag, Check } from 'lucide-react';
import { Product, ProductFlavor } from '../types';

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, flavor?: ProductFlavor, quantity?: number) => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  product,
  onClose,
  onAddToCart
}) => {
  const [selectedFlavor, setSelectedFlavor] = useState<ProductFlavor | undefined>(
    product?.flavors?.[0]
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // Synchronize state when selected product changes
  useEffect(() => {
    if (product) {
      setSelectedFlavor(product.flavors?.[0]);
      setQuantity(1);
      setAdded(false);
    }
  }, [product]);

  // Modal accessibility: Escape key and body scroll lock
  useEffect(() => {
    if (!product) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [product, onClose]);

  if (!product) return null;

  const handleAdd = () => {
    onAddToCart(product, selectedFlavor, quantity);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 900);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-view-title"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl z-10 my-8"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Cerrar vista rápida"
            className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-neutral-900/80 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2">
            
            {/* Image side */}
            <div className="relative aspect-square md:aspect-auto bg-neutral-900 flex items-center justify-center p-6">
              <img
                src={product.image}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-2xl filter contrast-110"
              />
              {product.badge && (
                <div className="absolute top-4 left-4">
                  <span className="px-2.5 py-1 rounded-md bg-lime-400 text-neutral-950 text-xs font-black uppercase font-display tracking-wider">
                    {product.badge}
                  </span>
                </div>
              )}
            </div>

            {/* Content side */}
            <div className="p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1 text-xs">
                  <span className="font-mono text-lime-400 uppercase tracking-widest font-semibold">
                    {product.category}
                  </span>
                  <div className="flex items-center text-amber-400 text-xs font-bold gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{product.rating}</span>
                  </div>
                </div>

                <h3 id="quick-view-title" className="text-2xl font-black uppercase font-display text-white tracking-tight">
                  {product.name}
                </h3>
                <p className="text-xs text-neutral-400 font-mono mt-0.5">
                  {product.subtitle}
                </p>

                <p className="text-xs sm:text-sm text-neutral-300 mt-3 leading-relaxed">
                  {product.longDescription || product.description}
                </p>

                {/* Flavor selector if product has flavors */}
                {product.flavors && product.flavors.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-[11px] font-mono text-neutral-400 uppercase mb-2">
                      Sabor: <span className="text-white font-bold">{selectedFlavor?.name}</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {product.flavors.map((fl) => (
                        <button
                          key={fl.id}
                          type="button"
                          onClick={() => setSelectedFlavor(fl)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                            selectedFlavor?.id === fl.id
                              ? 'border-lime-400 bg-neutral-900 text-white'
                              : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: fl.accentHex }}
                          />
                          <span>{fl.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Features list */}
                <div className="mt-4 pt-3 border-t border-neutral-800/80">
                  <ul className="space-y-1 text-xs text-neutral-300 font-mono">
                    {product.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-lime-400 flex-shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Price and CTA */}
              <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between gap-4">
                <div>
                  <div className="text-2xl font-black text-lime-400 font-display">
                    ${product.price.toLocaleString('es-CL')}
                  </div>
                  {product.originalPrice && (
                    <div className="text-xs text-neutral-500 line-through">
                      ${product.originalPrice.toLocaleString('es-CL')}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAdd}
                  className="flex-1 py-3 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold uppercase font-display text-sm tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <ShoppingBag className="w-4 h-4 fill-neutral-950/20" />
                  <span>{added ? '¡AGREGADO!' : 'AGREGAR AL CARRITO'}</span>
                </button>
              </div>

            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
