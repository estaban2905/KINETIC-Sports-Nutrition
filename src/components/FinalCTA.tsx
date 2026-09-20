import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Zap, ShieldCheck } from 'lucide-react';
import { ProteinVisual } from './ProteinVisual';
import { ProductFlavor, ProductSize } from '../types';
import { FLAGSHIP_PROTEIN } from '../data/products';

interface FinalCTAProps {
  onBuyNow: () => void;
  selectedFlavor?: ProductFlavor;
  selectedSize?: ProductSize;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onBuyNow, selectedFlavor, selectedSize }) => {
  const currentSize = selectedSize || FLAGSHIP_PROTEIN.sizes![1];
  return (
    <section className="relative py-28 bg-neutral-950 overflow-hidden border-t border-neutral-900">
      
      {/* Background Energy Burst */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-lime-500/10 rounded-full blur-[180px] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="relative rounded-3xl bg-gradient-to-b from-neutral-900 via-neutral-900/80 to-neutral-950 border border-neutral-800 p-8 sm:p-14 lg:p-16 overflow-hidden shadow-2xl">
          
          {/* Subtle background glow */}
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-lime-400/15 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 text-center lg:text-left">
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 text-xs font-mono uppercase tracking-widest mb-6">
                <Zap className="w-3.5 h-3.5 fill-lime-400/20" />
                <span>MÁXIMA CALIDAD COMPROBADA</span>
              </div>

              <h2 className="text-4xl sm:text-6xl xl:text-7xl font-black italic tracking-tighter uppercase font-display text-white leading-none">
                ¿LISTO PARA SUBIR DE{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-lime-300 to-emerald-400">
                  NIVEL?
                </span>
              </h2>

              <p className="mt-6 text-base sm:text-lg text-neutral-300 max-w-xl leading-relaxed">
                Equipa tu entrenamiento con productos diseñados para acompañar tus objetivos. Sin rellenos, sin compromisos.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <button
                  id="final-cta-buy-now-btn"
                  onClick={onBuyNow}
                  className="w-full sm:w-auto px-10 py-5 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-black font-display text-xl uppercase tracking-wider shadow-[0_0_35px_rgba(163,230,53,0.35)] hover:shadow-[0_0_45px_rgba(163,230,53,0.5)] transition-all flex items-center justify-center gap-3 group active:scale-[0.98]"
                >
                  <span>COMPRAR AHORA</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>

                <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
                  <ShieldCheck className="w-4 h-4 text-lime-400" />
                  <span>Garantía de Satisfacción 30 Días</span>
                </div>
              </div>

            </div>

            {/* Right Product Visual */}
            <div className="lg:col-span-5 flex items-center justify-center">
              <div className="w-full max-w-sm">
                <ProteinVisual
                  flavor={selectedFlavor}
                  sizeWeight={currentSize.weight}
                  sizeServings={currentSize.servings}
                  interactive={true}
                  showBadges={false}
                  className="w-full"
                />
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
