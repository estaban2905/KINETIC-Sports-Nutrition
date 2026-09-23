import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Flame, Clock, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { Product, ProductFlavor, ProductSize } from '../types';
import { getLandingBanners, getLandingSettings, LandingBanner, LandingSettings } from '../lib/landing';

interface SpecialOfferProps {
  product: Product;
  onClaimOffer: () => void;
  selectedFlavor?: ProductFlavor;
  selectedSize?: ProductSize;
}

const FALLBACK_CTA_TEXT = 'QUIERO MI PROTEÍNA';
const FALLBACK_TAG = 'VENTA RELÁMPAGO // 20% OFF INMEDIATO';
const FALLBACK_HEADLINE_PREFIX = 'TU PRÓXIMO ENTRENAMIENTO';
const FALLBACK_HEADLINE_HIGHLIGHT = 'EMPIEZA AQUÍ';

type Countdown = { unit1: number; label1: string; unit2: number; label2: string; unit3: number; label3: string };

/** Adapts the unit shown in the first slot to how far away end_date actually
 * is — a "14:32:45" hours countdown looks broken once a promo runs for
 * weeks, so past 2 days it switches to Days/Horas/Min instead. */
function computeCountdown(endDate: string): Countdown {
  const totalSeconds = Math.max(0, Math.floor((new Date(endDate).getTime() - Date.now()) / 1000));
  const days = Math.floor(totalSeconds / 86400);

  if (days >= 2) {
    return {
      unit1: days,
      label1: 'Días',
      unit2: Math.floor((totalSeconds % 86400) / 3600),
      label2: 'Horas',
      unit3: Math.floor((totalSeconds % 3600) / 60),
      label3: 'Min',
    };
  }

  return {
    unit1: Math.floor(totalSeconds / 3600),
    label1: 'Horas',
    unit2: Math.floor((totalSeconds % 3600) / 60),
    label2: 'Minutos',
    unit3: totalSeconds % 60,
    label3: 'Segundos',
  };
}

export const SpecialOffer: React.FC<SpecialOfferProps> = ({ product, onClaimOffer, selectedFlavor, selectedSize }) => {
  const currentSize = selectedSize || product.sizes![1];
  const [banner, setBanner] = useState<LandingBanner | null>(null);
  const [settings, setSettings] = useState<LandingSettings | null>(null);
  const [timeLeft, setTimeLeft] = useState<Countdown>({
    unit1: 14, label1: 'Horas', unit2: 32, label2: 'Minutos', unit3: 45, label3: 'Segundos',
  });

  useEffect(() => {
    getLandingBanners().then((banners) => {
      if (banners?.length) setBanner(banners[0]);
    });
    getLandingSettings().then(setSettings);
  }, []);

  useEffect(() => {
    if (!banner) return;
    setTimeLeft(computeCountdown(banner.end_date));
    const timer = setInterval(() => setTimeLeft(computeCountdown(banner.end_date)), 1000);
    return () => clearInterval(timer);
  }, [banner]);

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
                <span>{banner?.tag || FALLBACK_TAG}</span>
              </div>

              {banner ? (
                <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black italic tracking-tighter uppercase font-display text-white leading-none">
                  {banner.title}
                </h2>
              ) : settings?.offer_fallback_headline ? (
                <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black italic tracking-tighter uppercase font-display text-white leading-none">
                  {settings.offer_fallback_headline}
                </h2>
              ) : (
                <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black italic tracking-tighter uppercase font-display text-white leading-none">
                  {FALLBACK_HEADLINE_PREFIX}{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-lime-300 to-emerald-400 inline-block pr-2 pb-1">
                    {FALLBACK_HEADLINE_HIGHLIGHT}
                  </span>
                </h2>
              )}

              <p className="mt-4 text-neutral-300 text-sm sm:text-base max-w-xl leading-relaxed">
                {banner?.subtitle ??
                  settings?.offer_fallback_subtitle ??
                  `Obtén tu envase ${currentSize.name} de ${currentSize.weight} con envío prioritario gratuito a todo el país y shaker térmico de regalo con tu primera orden.`}
              </p>

              {/* Countdown Timer Block */}
              <div className="mt-8">
                <div className="flex items-center justify-center lg:justify-start gap-2 text-xs font-mono text-neutral-400 uppercase tracking-widest mb-3">
                  <Clock className="w-3.5 h-3.5 text-lime-400" />
                  <span>La promoción finaliza en:</span>
                </div>

                <div className="flex items-center justify-center lg:justify-start gap-3 sm:gap-4 font-display">
                  <div className="flex flex-col items-center bg-neutral-950 border border-neutral-800 rounded-xl p-3 w-16 sm:w-20 shadow-inner">
                    <span className="text-2xl sm:text-4xl font-black text-white leading-none">
                      {String(timeLeft.unit1).padStart(2, '0')}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider mt-1">{timeLeft.label1}</span>
                  </div>

                  <span className="text-2xl font-bold text-neutral-600">:</span>

                  <div className="flex flex-col items-center bg-neutral-950 border border-neutral-800 rounded-xl p-3 w-16 sm:w-20 shadow-inner">
                    <span className="text-2xl sm:text-4xl font-black text-lime-400 leading-none">
                      {String(timeLeft.unit2).padStart(2, '0')}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider mt-1">{timeLeft.label2}</span>
                  </div>

                  <span className="text-2xl font-bold text-neutral-600">:</span>

                  <div className="flex flex-col items-center bg-neutral-950 border border-neutral-800 rounded-xl p-3 w-16 sm:w-20 shadow-inner">
                    <span className="text-2xl sm:text-4xl font-black text-white leading-none">
                      {String(timeLeft.unit3).padStart(2, '0')}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider mt-1">{timeLeft.label3}</span>
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
                  <span>{banner?.button_text ?? FALLBACK_CTA_TEXT}</span>
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
              <div className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-gradient-to-b from-neutral-800/40 to-neutral-950/80 border border-neutral-800 p-8 flex flex-col items-center shadow-2xl group">
                <div
                  className="absolute inset-0 opacity-20 filter blur-2xl transition-colors duration-500 pointer-events-none"
                  style={{ backgroundColor: selectedFlavor?.accentHex || '#dc2626' }}
                />
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  width={340}
                  height={340}
                  referrerPolicy="no-referrer"
                  className="relative z-10 w-60 h-60 sm:w-68 sm:h-68 object-contain filter drop-shadow-[0_20px_25px_rgba(0,0,0,0.8)] group-hover:scale-105 transition-transform duration-500"
                />
                <div className="mt-4 text-center relative z-10">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold bg-neutral-900/90 border border-neutral-700 text-lime-400 uppercase tracking-wider mb-2">
                    {currentSize.name} · {currentSize.servings} Servicios
                  </span>
                  <div className="text-sm font-display font-black text-white uppercase tracking-tight">
                    {selectedFlavor?.name || 'Double Rich Chocolate'}
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
