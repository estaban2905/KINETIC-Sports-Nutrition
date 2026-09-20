import React from 'react';
import { motion } from 'motion/react';
import { Zap, Activity, Flame, Shield } from 'lucide-react';

export const ExperienceSection: React.FC = () => {
  const steps = [
    {
      word: 'ENTRENA.',
      desc: 'Entrega cada repetición con máxima intensidad y disciplina.',
      img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop',
      accent: 'text-lime-400',
      tag: 'FASE 01'
    },
    {
      word: 'SUPERA TUS LÍMITES.',
      desc: 'Rompe barreras físicas y mentales en cada sesión de levantamiento.',
      img: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=800&auto=format&fit=crop',
      accent: 'text-white',
      tag: 'FASE 02'
    },
    {
      word: 'RECUPERA.',
      desc: 'Reabastece tus fibras musculares con aminoácidos de biodisponibilidad superior.',
      img: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=800&auto=format&fit=crop',
      accent: 'text-lime-400',
      tag: 'FASE 03'
    },
    {
      word: 'REPITE.',
      desc: 'La consistencia forja el progreso. Vuelve más fuerte al día siguiente.',
      img: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop',
      accent: 'text-white',
      tag: 'FASE 04'
    }
  ];

  return (
    <section id="experiencia" className="relative py-24 bg-neutral-950 border-t border-b border-neutral-900 overflow-hidden">
      
      {/* Background Graphic Lines */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-lime-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Activity className="w-3.5 h-3.5" />
              FILOSOFÍA ATLÉTICA
            </div>
            <h2 className="text-4xl sm:text-6xl font-black italic tracking-tighter uppercase font-display text-white">
              EL CICLO DEL RENDIMIENTO
            </h2>
          </div>
          <p className="max-w-md text-neutral-400 text-sm leading-relaxed font-normal">
            No existen atajos. El verdadero cambio se construye con trabajo duro, nutrición precisa y una mentalidad inquebrantable.
          </p>
        </div>

        {/* 4 Kinetic Athlete Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: index * 0.12 }}
              whileHover={{ y: -8 }}
              className="group relative h-[420px] rounded-2xl overflow-hidden border border-neutral-800/80 shadow-2xl flex flex-col justify-end p-6 bg-neutral-900"
            >
              {/* Background Athlete Image with Dark Gradient Overlay */}
              <img
                src={item.img}
                alt={item.word}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700 filter brightness-75 contrast-125 -z-10"
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent pointer-events-none -z-10" />
              
              {/* Top Tag */}
              <div className="absolute top-4 left-4">
                <span className="px-2.5 py-1 rounded bg-neutral-950/80 backdrop-blur-md border border-neutral-700/60 text-[10px] font-mono text-lime-400 tracking-widest uppercase font-bold">
                  {item.tag}
                </span>
              </div>

              {/* Text Info */}
              <div className="relative z-10">
                <h3 className={`text-2xl sm:text-3xl font-black italic tracking-tighter uppercase font-display mb-2 group-hover:text-lime-300 transition-colors ${item.accent}`}>
                  {item.word}
                </h3>
                <p className="text-xs text-neutral-300 line-clamp-3 leading-relaxed">
                  {item.desc}
                </p>

                <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                    KINETIC ATHLETICS
                  </span>
                  <div className="w-2 h-2 rounded-full bg-lime-400 group-hover:scale-150 transition-transform shadow-[0_0_8px_#a3e635]" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
