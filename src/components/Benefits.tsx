import React from 'react';
import { motion } from 'motion/react';
import { Dumbbell, Zap, RotateCcw, Sparkles } from 'lucide-react';
import { BENEFITS } from '../data/products';

export const Benefits: React.FC = () => {
  const iconMap: Record<string, React.ReactNode> = {
    Dumbbell: <Dumbbell className="w-7 h-7 text-lime-400" />,
    Zap: <Zap className="w-7 h-7 text-lime-400" />,
    RotateCcw: <RotateCcw className="w-7 h-7 text-lime-400" />,
    Sparkles: <Sparkles className="w-7 h-7 text-lime-400" />,
  };

  return (
    <section id="beneficios" className="relative py-24 bg-neutral-950/80 border-t border-b border-neutral-900 overflow-hidden">
      {/* Background Subtle Ambience */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-lime-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-lime-400 text-xs font-mono uppercase tracking-widest mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400" />
            VENTAJA COMPETITIVA
          </div>
          <h2 className="text-3xl sm:text-5xl font-black italic tracking-tighter uppercase font-display text-white">
            ¿POR QUÉ ESTA PROTEÍNA?
          </h2>
          <p className="mt-4 text-neutral-400 text-sm sm:text-base leading-relaxed">
            Ingeniería nutricional de vanguardia. Cada porción está diseñada para aportar combustible biológico de máxima biodisponibilidad y cero desperdicio.
          </p>
        </div>

        {/* Benefits Grid (4 Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {BENEFITS.map((benefit, index) => (
            <motion.div
              key={benefit.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -6 }}
              className="group relative rounded-2xl bg-neutral-900/70 border border-neutral-800/80 p-6 sm:p-7 backdrop-blur-sm transition-all duration-300 hover:border-lime-400/50 hover:shadow-[0_10px_30px_-10px_rgba(163,230,53,0.15)] flex flex-col justify-between"
            >
              {/* Top Row: Icon & Stat */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-13 h-13 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center group-hover:border-lime-400/40 transition-colors shadow-inner">
                    {iconMap[benefit.icon]}
                  </div>
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-black italic text-white font-display leading-none group-hover:text-lime-300 transition-colors">
                      {benefit.stat}
                    </span>
                    <span className="block text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                      {benefit.statLabel}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl font-black italic tracking-tight uppercase font-display text-white mb-3 group-hover:text-lime-400 transition-colors">
                  {benefit.title}
                </h3>

                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  {benefit.description}
                </p>
              </div>

              {/* Bottom Subtle Indicator */}
              <div className="mt-6 pt-4 border-t border-neutral-800/60 flex items-center justify-between text-[11px] font-mono text-neutral-400">
                <span className="uppercase">MÁXIMA EFICIENCIA</span>
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 group-hover:bg-lime-400 transition-colors" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Technical Guarantee Strip */}
        <div className="mt-12 rounded-xl bg-neutral-900/40 border border-neutral-800/60 p-4 flex flex-wrap items-center justify-around gap-4 text-center">
          <div className="flex items-center gap-2">
            <span className="text-lime-400 font-bold font-mono text-xs">✓</span>
            <span className="text-xs text-neutral-300 font-medium">Libre de Gluten</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lime-400 font-bold font-mono text-xs">✓</span>
            <span className="text-xs text-neutral-300 font-medium">Sin Rellenos Amino Spiking</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lime-400 font-bold font-mono text-xs">✓</span>
            <span className="text-xs text-neutral-300 font-medium">Lactosa Ultra Reducida (&lt;0.2%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lime-400 font-bold font-mono text-xs">✓</span>
            <span className="text-xs text-neutral-300 font-medium">Fabricación con Certificación BPM</span>
          </div>
        </div>

      </div>
    </section>
  );
};
