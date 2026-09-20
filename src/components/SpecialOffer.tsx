import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Flame, Clock, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { ProteinVisual } from './ProteinVisual';
import { ProductFlavor, ProductSize } from '../types';
import { FLAGSHIP_PROTEIN } from '../data/products';

interface SpecialOfferProps {
  onClaimOffer: () => void;
  selectedFlavor?: ProductFlavor;
  selectedSize?: ProductSize;
}

export const SpecialOffer: React.FC<SpecialOfferProps> = ({ onClaimOffer, selectedFlavor, selectedSize }) => {
  const currentSize = selectedSize || FLAGSHIP_PROTEIN.sizes![1];
  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    hours: 14,
    minutes: 32,
    seconds: 45
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative py-20 sm:py-28 overflow-hidden bg-neutral-950 border-t border-b border-neutral-900">
      
      {/* Dynamic Background Glow & Energy Flares */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-lime-500/10 rounded-full blur-[160px] pointer-events-none -z-10" />

      {/* Cyber Grid Texture */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="rounded-3xl bg-gradient-to-r from-neutral-900/90 via-neutral-900/60 to-neutral-950/90 border border-neutral-800 p-8 sm:p-12 lg:p-16 shadow-2xl relative overflow-hidden">
          
          {/* Subtle Accent Glow Ring */}
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-lime-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 flex flex-col text-center lg:text-left">
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 text-xs font-mono uppercase tracking-widest self-center lg:self-start mb-6">
                <Flame className="w-4 h-4 text-lime-400 fill-lime-400/20" />
                <span>VENTA RELÁMPAGO // 20% OFF INMEDIATO</span>
              </div>

              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black italic tracking-tighter uppercase font-display text-white leading-none">
                TU PRÓXIMO ENTRENAMIENTO{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-lime-300 to-emerald-400">
                  EMPIEZA AQUÍ
                </span>
              </h2>

              <p className="mt-4 text-neutral-300 text-sm sm:text-base max-w-xl leading-relaxed">
                Obtén tu envase {currentSize.name} de {currentSize.weight} con envío prioritario gratuito a todo el país y shaker térmico de regalo con tu primera orden.
              </p>

              {/* Countdown Timer Block */}
              <div className="mt-8">
                <div className="flex items-center justify-center lg:justify-start gap-2 text-xs font-mono text-neutral-400 uppercase tracking-widest mb-3">
                  <Clock className="w-3.5 h-3.5 text-lime-400" />
                  <span>La promoción finaliza en:</span>
                </div>

                <div className="flex items-center justify-center lg:justify-start gap-3 sm:gap-4 font-display">
                  <div className="flex flex-col items-center bg-neutral-950 border border-neutral-800 rounded-xl p-3 w-18 sm:w-20 shadow-inner">
                    <span className="text-2xl sm:text-4xl font-black text-white leading-none">
                      {String(timeLeft.hours).padStart(2, '0')}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider mt-1">Horas</span>
                  </div>

                  <span className="text-2xl font-bold text-neutral-600">:</span>

                  <div className="flex flex-col items-center bg-neutral-950 border border-neutral-800 rounded-xl p-3 w-18 sm:w-20 shadow-inner">
                    <span className="text-2xl sm:text-4xl font-black text-lime-400 leading-none">
                      {String(timeLeft.minutes).padStart(2, '0')}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider mt-1">Minutos</span>
                  </div>

                  <span className="text-2xl font-bold text-neutral-600">:</span>

                  <div className="flex flex-col items-center bg-neutral-950 border border-neutral-800 rounded-xl p-3 w-18 sm:w-20 shadow-inner">
                    <span className="text-2xl sm:text-4xl font-black text-white leading-none">
                      {String(timeLeft.seconds).padStart(2, '0')}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider mt-1">Segundos</span>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <button
                  id="claim-offer-btn"
                  onClick={onClaimOffer}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-black font-display text-lg uppercase tracking-wider shadow-[0_0_35px_rgba(163,230,53,0.35)] hover:shadow-[0_0_45px_rgba(163,230,53,0.5)] transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <span>QUIERO MI PROTEÍNA</span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
                  <ShieldCheck className="w-4 h-4 text-lime-400" />
                  <span>Stock limitado por lote</span>
                </div>
              </div>

            </div>

            {/* Right Product Spotlight */}
            <div className="lg:col-span-5 flex items-center justify-center">
              <div className="relative w-full max-w-sm">
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
