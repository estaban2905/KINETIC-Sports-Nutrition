import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, ShieldCheck, Zap, Sparkles, CheckCircle2 } from 'lucide-react';
import { ProteinVisual } from './ProteinVisual';
import { FLAGSHIP_PROTEIN } from '../data/products';
import { ProductFlavor, ProductSize } from '../types';

interface HeroProps {
  onBuyNow: () => void;
  onViewProduct: () => void;
  selectedFlavor?: ProductFlavor;
  selectedSize?: ProductSize;
}

export const Hero: React.FC<HeroProps> = ({ 
  onBuyNow, 
  onViewProduct, 
  selectedFlavor,
  selectedSize
}) => {
  const heroRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  // Parallax transforms
  const yText = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const yProduct = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const scaleProduct = useTransform(scrollYProgress, [0, 1], [1, 0.95]);
  const bgGridY = useTransform(scrollYProgress, [0, 1], [0, 60]);

  return (
    <section
      id="hero-section"
      ref={heroRef}
      className="relative min-h-screen w-full flex items-center justify-center pt-24 pb-16 lg:py-0 overflow-hidden bg-neutral-950"
    >
      {/* Background Lighting Gradients & Radial Glow */}
      <motion.div 
        style={{ y: bgGridY }}
        className="absolute inset-0 bg-grid-pattern opacity-15 pointer-events-none" 
      />
      
      {/* Cinematic Ambient Glow Orbs */}
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-lime-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute -bottom-20 left-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      
      {/* Diagonal energetic graphic line accent */}
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none -z-10 opacity-20">
        <div className="absolute -top-40 right-1/3 w-[1px] h-[1000px] bg-gradient-to-b from-transparent via-lime-400 to-transparent rotate-[35deg]" />
        <div className="absolute -top-20 right-1/4 w-[1px] h-[1000px] bg-gradient-to-b from-transparent via-neutral-700 to-transparent rotate-[35deg]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center min-h-[calc(100vh-6rem)]">
          
          {/* LEFT COLUMN: Headlines & CTAs */}
          <motion.div 
            style={{ y: yText }}
            className="lg:col-span-7 flex flex-col justify-center z-10 text-center lg:text-left"
          >
            {/* Top Quality Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900/90 border border-neutral-800 self-center lg:self-start mb-6 shadow-md"
            >
              <span className="w-2 h-2 rounded-full bg-lime-400 animate-ping" />
              <span className="text-[11px] font-mono uppercase tracking-widest text-lime-400 font-bold">
                100% CFM WHEY ISOLATE // EDICIÓN LIMITADA
              </span>
            </motion.div>

            {/* Main Headline */}
            <h1
              className="text-4xl sm:text-6xl xl:text-7xl font-black italic tracking-tighter uppercase font-display leading-[0.95] text-white"
            >
              CONVIERTE TU ENTRENAMIENTO EN{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-lime-300 to-emerald-400 inline-block pr-3 pb-1">
                RESULTADOS
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="mt-6 text-base sm:text-lg text-neutral-300 max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed"
            >
              Proteína premium diseñada para ayudarte a recuperar, desarrollar y llevar tu rendimiento al siguiente nivel.
            </p>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            >
              <button
                id="hero-buy-now-btn"
                onClick={onBuyNow}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-black font-display text-lg uppercase tracking-wider shadow-[0_0_30px_rgba(163,230,53,0.35)] hover:shadow-[0_0_40px_rgba(163,230,53,0.5)] transition-all flex items-center justify-center gap-3 group active:scale-[0.98]"
              >
                <span>COMPRAR AHORA</span>
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                id="hero-view-product-btn"
                onClick={onViewProduct}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 hover:text-white font-bold font-display text-lg uppercase tracking-wider border border-neutral-700/80 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <span>VER PRODUCTO</span>
              </button>
            </motion.div>

            {/* Micro Trust Indicators & Specs Bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.45 }}
              className="mt-10 pt-6 border-t border-neutral-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-lime-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-neutral-300 tracking-wide">24g Proteína Pura</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-lime-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-neutral-300 tracking-wide">0g Azúcar Añadida</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-lime-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-neutral-300 tracking-wide">5.5g BCAAs Reales</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-lime-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-neutral-300 tracking-wide">Sin Grumos / CFM</span>
              </div>
            </motion.div>

          </motion.div>

          {/* RIGHT COLUMN: Protagonist Large Product Showcase */}
          <motion.div 
            style={{ y: yProduct, scale: scaleProduct }}
            className="lg:col-span-5 flex items-center justify-center relative py-6 lg:py-0"
          >
            {/* Cinematic Background Fog Ring */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-80 h-80 sm:w-96 sm:h-96 rounded-full border border-lime-400/20 bg-lime-400/5 blur-xl -z-10 animate-pulse" />
            </div>

            {/* Protein Visual */}
            <ProteinVisual
              flavor={selectedFlavor}
              sizeWeight={selectedSize?.weight || "2 LB (907 G)"}
              sizeServings={selectedSize?.servings || 29}
              sizeId={selectedSize?.id || "2lb"}
              interactive={true}
              showBadges={true}
              className="w-full max-w-md mx-auto"
            />
          </motion.div>

        </div>
      </div>

      {/* Subtle Scroll Down Indicator */}
      <div className="hidden md:flex absolute bottom-4 left-1/2 -translate-x-1/2 flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity pointer-events-none">
        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Scroll para explorar</span>
        <div className="w-4 h-7 rounded-full border border-neutral-600 flex items-start justify-center p-1">
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-1 h-1.5 rounded-full bg-lime-400"
          />
        </div>
      </div>
    </section>
  );
};
