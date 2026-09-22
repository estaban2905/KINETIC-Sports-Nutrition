import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Star, ShieldCheck, Truck, RefreshCw, Check, Zap, Flame, Info } from 'lucide-react';
import { FLAGSHIP_PROTEIN } from '../data/products';
import { ProductFlavor, ProductSize } from '../types';
import { ProteinVisual } from './ProteinVisual';
import confetti from 'canvas-confetti';

interface ProductSectionProps {
  onAddToCart: (flavor: ProductFlavor, size: ProductSize, quantity: number) => void;
  selectedFlavor: ProductFlavor;
  onSelectFlavor: (flavor: ProductFlavor) => void;
  selectedSize?: ProductSize;
  onSelectSize?: (size: ProductSize) => void;
}

export const ProductSection: React.FC<ProductSectionProps> = ({
  onAddToCart,
  selectedFlavor,
  onSelectFlavor,
  selectedSize: controlledSize,
  onSelectSize
}) => {
  const [internalSize, setInternalSize] = useState<ProductSize>(
    controlledSize || FLAGSHIP_PROTEIN.sizes![1] // Default to 2 Libras ($65.990) as shown in user screenshot
  );

  const currentSize = controlledSize || internalSize;

  const handleSizeChange = (size: ProductSize) => {
    setInternalSize(size);
    onSelectSize?.(size);
  };

  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'info' | 'nutrition' | 'usage'>('info');
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);

  const handleAdd = () => {
    onAddToCart(selectedFlavor, currentSize, quantity);
    setAddedSuccess(true);
    
    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#a3e635', '#ffffff', '#22c55e']
      });
    } catch {
      // ignore
    }

    setTimeout(() => {
      setAddedSuccess(false);
    }, 2000);
  };

  const discountPercent = Math.round(
    ((currentSize.originalPrice - currentSize.price) / currentSize.originalPrice) * 100
  );

  return (
    <section id="producto" className="relative py-24 bg-neutral-950 overflow-hidden">
      
      {/* Background glow effects */}
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-lime-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-lime-400 text-xs font-mono uppercase tracking-widest mb-3">
            <Flame className="w-3.5 h-3.5" />
            PRODUCTO PRINCIPAL
          </div>
          <h2 className="text-3xl sm:text-5xl font-black italic tracking-tighter uppercase font-display text-white">
            PROTEÍNA PREMIUM
          </h2>
          <p className="mt-3 text-lg sm:text-xl text-neutral-300 font-display italic tracking-wide">
            "Construida para quienes entrenan con un objetivo."
          </p>
        </div>

        {/* Product Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* LEFT: Large Product Visual Showcase */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center relative">
            <div className="w-full max-w-md bg-gradient-to-b from-neutral-900/60 to-neutral-950/80 rounded-3xl p-6 sm:p-10 border border-neutral-800 relative">
              
              {/* Special Offer Ribbon */}
              <div className="absolute top-4 left-4 z-20">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-lime-400 text-neutral-950 text-xs font-black uppercase font-display tracking-wider shadow-lg">
                  <Zap className="w-3 h-3 fill-neutral-950" />
                  OFERTA ESPECIAL -{discountPercent}%
                </span>
              </div>

              {/* Clean Product Visual */}
              <ProteinVisual
                flavor={selectedFlavor}
                sizeWeight={currentSize.weight}
                sizeServings={currentSize.servings}
                sizeId={currentSize.id}
                interactive={true}
                showBadges={false}
                className="w-full"
              />

              {/* Quick Spec Bar under product */}
              <div className="mt-8 pt-4 border-t border-neutral-800/80 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="text-neutral-400 text-[10px] uppercase font-mono">Porciones</div>
                  <div className="font-bold text-white font-display text-base">{currentSize.servings} Dosis</div>
                </div>
                <div className="border-x border-neutral-800">
                  <div className="text-neutral-400 text-[10px] uppercase font-mono">Proteína</div>
                  <div className="font-bold text-amber-400 font-display text-base">24g / Scoop</div>
                </div>
                <div>
                  <div className="text-neutral-400 text-[10px] uppercase font-mono">BCAAs</div>
                  <div className="font-bold text-white font-display text-base">5.5g Activos</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Product Buy Box & Configuration */}
          <div className="lg:col-span-6 flex flex-col">
            
            {/* Title & Rating */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-mono uppercase tracking-widest text-lime-400 font-bold">
                KINETIC PERFORMANCE // CFM SERIES
              </span>
              <div className="flex items-center space-x-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
                <span className="text-xs font-semibold text-neutral-300 ml-1">
                  4.9 (342 reseñas)
                </span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black italic uppercase font-display text-white tracking-tight">
              {FLAGSHIP_PROTEIN.name}
            </h1>

            <p className="mt-3 text-neutral-300 text-sm leading-relaxed">
              {FLAGSHIP_PROTEIN.description}
            </p>

            {/* Pricing Section */}
            <div className="mt-6 p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex items-baseline justify-between">
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-black text-lime-400 font-display tracking-tight">
                    ${currentSize.price.toLocaleString('es-CL')}
                  </span>
                  <span className="text-lg text-neutral-500 line-through font-display">
                    ${currentSize.originalPrice.toLocaleString('es-CL')}
                  </span>
                </div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  Hasta 3 cuotas sin interés de ${Math.round(currentSize.price / 3).toLocaleString('es-CL')}
                </div>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 rounded bg-lime-400/10 text-lime-400 text-xs font-mono font-bold uppercase border border-lime-400/20">
                  Ahorras ${(currentSize.originalPrice - currentSize.price).toLocaleString('es-CL')}
                </span>
              </div>
            </div>

            {/* Size Selector - Segmented design exactly matching user's reference image */}
            <div className="mt-6">
              <label className="block text-xs font-mono tracking-wider text-neutral-300 uppercase mb-2.5">
                1. Selecciona Tamaño: <span className="text-lime-400 font-bold">{currentSize.name} ({currentSize.weight})</span>
              </label>
              
              <div className="rounded-2xl border border-neutral-700/80 bg-neutral-900/90 overflow-hidden shadow-lg grid grid-cols-3 divide-x divide-neutral-800">
                {FLAGSHIP_PROTEIN.sizes!.map((size) => {
                  const isSelected = currentSize.id === size.id;
                  const hasDiscount = size.originalPrice > size.price;

                  return (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => handleSizeChange(size)}
                      className={`px-2 py-3 sm:px-4 sm:py-3.5 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-[#3b1968] text-white shadow-inner'
                          : 'bg-transparent text-neutral-300 hover:bg-neutral-800/60'
                      }`}
                    >
                      <span className={`text-xs sm:text-sm tracking-tight ${isSelected ? 'font-black text-white' : 'font-bold text-neutral-200'}`}>
                        {size.name}
                      </span>
                      
                      <div className="mt-1 flex items-center justify-center flex-wrap gap-x-1.5 leading-none">
                        <span className={`text-xs sm:text-sm ${isSelected ? 'font-black text-white' : 'font-bold text-neutral-100'}`}>
                          ${size.price.toLocaleString('es-CL')}
                        </span>
                        {hasDiscount && (
                          <span className={`text-[10px] sm:text-xs line-through ${isSelected ? 'text-purple-200/80 font-normal' : 'text-neutral-500 font-normal'}`}>
                            ${size.originalPrice.toLocaleString('es-CL')}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Flavor Selector */}
            <div className="mt-6">
              <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 mb-2">
                2. Selecciona Sabor: <span className="text-lime-400 font-bold">{selectedFlavor.name}</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {FLAGSHIP_PROTEIN.flavors!.map((flavor) => (
                  <button
                    key={flavor.id}
                    type="button"
                    onClick={() => onSelectFlavor(flavor)}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                      selectedFlavor.id === flavor.id
                        ? 'border-lime-400 bg-neutral-900 shadow-md ring-1 ring-lime-400'
                        : 'border-neutral-800 bg-neutral-950/70 hover:border-neutral-700'
                    }`}
                  >
                    <span 
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: flavor.accentHex }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">{flavor.name}</div>
                      {flavor.badge && (
                        <div className="text-[9px] text-lime-400 font-mono uppercase tracking-wider font-bold">
                          {flavor.badge}
                        </div>
                      )}
                    </div>
                    {selectedFlavor.id === flavor.id && (
                      <Check className="w-4 h-4 text-lime-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Selector & Add to Cart CTA */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch gap-4">
              {/* Quantity counter */}
              <div className="flex items-center justify-between border border-neutral-700 bg-neutral-900 rounded-xl p-1 w-full sm:w-36">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg hover:bg-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white transition-colors text-lg font-bold"
                  aria-label="Disminuir cantidad"
                >
                  -
                </button>
                <span className="font-mono font-bold text-base text-white">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-lg hover:bg-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white transition-colors text-lg font-bold"
                  aria-label="Aumentar cantidad"
                >
                  +
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                id="product-add-to-cart-btn"
                type="button"
                onClick={handleAdd}
                className="flex-1 py-4 px-6 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-black font-display text-lg uppercase tracking-wider shadow-[0_0_25px_rgba(163,230,53,0.3)] hover:shadow-[0_0_35px_rgba(163,230,53,0.45)] transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <ShoppingBag className="w-5 h-5 text-neutral-950 fill-neutral-950/20" />
                <span>{addedSuccess ? '¡AGREGADO AL CARRITO!' : 'AGREGAR AL CARRITO'}</span>
              </button>
            </div>

            {/* Security and Trust Guarantees */}
            <div className="mt-8 pt-6 border-t border-neutral-800/80 grid grid-cols-3 gap-3 text-center">
              <div className="flex flex-col items-center text-center">
                <Truck className="w-4 h-4 text-lime-400 mb-1" />
                <span className="text-[11px] font-bold text-neutral-200">Envío Rápido</span>
                <span className="text-[9px] text-neutral-400">24-48 hrs hábiles</span>
              </div>
              <div className="flex flex-col items-center text-center border-x border-neutral-800">
                <ShieldCheck className="w-4 h-4 text-lime-400 mb-1" />
                <span className="text-[11px] font-bold text-neutral-200">Pago Seguro</span>
                <span className="text-[9px] text-neutral-400">Encriptación SSL</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <RefreshCw className="w-4 h-4 text-lime-400 mb-1" />
                <span className="text-[11px] font-bold text-neutral-200">Satisfacción</span>
                <span className="text-[9px] text-neutral-400">100% Garantizada</span>
              </div>
            </div>

          </div>

        </div>

        {/* Nutritional Facts and Technical Accordion */}
        <div className="mt-16 bg-neutral-900/50 border border-neutral-800/80 rounded-2xl p-6 sm:p-8">
          
          <div className="flex border-b border-neutral-800 pb-4 mb-6 space-x-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('info')}
              className={`pb-2 text-sm font-bold font-display uppercase tracking-wider transition-colors relative ${
                activeTab === 'info' ? 'text-lime-400' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Detalles de la Fórmula
              {activeTab === 'info' && (
                <motion.div layoutId="productTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('nutrition')}
              className={`pb-2 text-sm font-bold font-display uppercase tracking-wider transition-colors relative ${
                activeTab === 'nutrition' ? 'text-lime-400' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Información Nutricional Configurable
              {activeTab === 'nutrition' && (
                <motion.div layoutId="productTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`pb-2 text-sm font-bold font-display uppercase tracking-wider transition-colors relative ${
                activeTab === 'usage' ? 'text-lime-400' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Modo de Consumo Óptimo
              {activeTab === 'usage' && (
                <motion.div layoutId="productTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime-400" />
              )}
            </button>
          </div>

          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-neutral-300">
              <div>
                <h4 className="font-bold text-white font-display text-base uppercase mb-2">
                  Aislamiento por Flujo Cruzado (CFM)
                </h4>
                <p className="leading-relaxed text-xs sm:text-sm text-neutral-400">
                  {FLAGSHIP_PROTEIN.longDescription}
                </p>
              </div>
              <div>
                <h4 className="font-bold text-white font-display text-base uppercase mb-2">
                  Ventajas Clave
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm">
                  {FLAGSHIP_PROTEIN.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-lime-400 flex-shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'nutrition' && (
            <div>
              <div className="flex items-center gap-2 mb-4 text-xs text-neutral-400 font-mono">
                <Info className="w-4 h-4 text-lime-400" />
                <span>Valores referenciales calculados para formato {currentSize.name} ({currentSize.weight}):</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {FLAGSHIP_PROTEIN.nutritionFacts!.map((fact, idx) => {
                  const displayValue = fact.label === 'Porciones por Envase'
                    ? `${currentSize.servings} Porciones (${currentSize.name})`
                    : fact.value;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border ${
                        fact.highlight 
                          ? 'bg-neutral-900 border-lime-400/40 text-lime-400' 
                          : 'bg-neutral-950 border-neutral-800 text-neutral-200'
                      }`}
                    >
                      <div className="text-[10px] text-neutral-400 uppercase font-mono">{fact.label}</div>
                      <div className="text-xl font-bold font-display tracking-tight text-white mt-0.5">{displayValue}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="text-sm text-neutral-300 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                <div className="font-bold text-lime-400 font-display text-base uppercase mb-1">Post-Entrenamiento</div>
                <p className="text-xs text-neutral-400">
                  Tomar dentro de los 30-45 minutos posteriores a finalizar el entrenamiento para optimizar la síntesis proteica muscular.
                </p>
              </div>
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                <div className="font-bold text-lime-400 font-display text-base uppercase mb-1">En el Desayuno</div>
                <p className="text-xs text-neutral-400">
                  Ideal para romper el ayuno nocturno con una fuente de aminoácidos limpia de absorción inmediata.
                </p>
              </div>
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                <div className="font-bold text-lime-400 font-display text-base uppercase mb-1">Preparación</div>
                <p className="text-xs text-neutral-400">
                  Disolver 1 scoop (30g) en 250ml de agua fría o leche vegetal en tu shaker durante 10 segundos.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>
    </section>
  );
};
