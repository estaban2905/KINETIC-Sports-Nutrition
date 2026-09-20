import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { FAQS } from '../data/products';

export const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="relative py-24 bg-neutral-950 border-t border-neutral-900 overflow-hidden">
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-lime-400 text-xs font-mono uppercase tracking-widest mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            RESOLUCIÓN DE DUDAS
          </div>
          <h2 className="text-3xl sm:text-5xl font-black italic tracking-tighter uppercase font-display text-white">
            PREGUNTAS FRECUENTES
          </h2>
          <p className="mt-3 text-neutral-400 text-sm sm:text-base leading-relaxed">
            Todo lo que necesitas saber sobre consumo, despachos, porciones y medios de pago.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3.5">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'bg-neutral-900/90 border-lime-400/50 shadow-lg'
                    : 'bg-neutral-900/40 border-neutral-800/80 hover:border-neutral-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleIndex(index)}
                  className="w-full py-5 px-6 text-left flex items-center justify-between gap-4 focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="text-base sm:text-lg font-bold uppercase font-display tracking-wide text-white">
                    {faq.question}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full border flex items-center justify-center transition-transform duration-300 flex-shrink-0 ${
                      isOpen
                        ? 'border-lime-400 bg-lime-400/10 text-lime-400 rotate-180'
                        : 'border-neutral-700 text-neutral-400'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                      <div className="px-6 pb-6 pt-1 text-sm text-neutral-300 leading-relaxed border-t border-neutral-800/60 mt-1">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Contact info below FAQ */}
        <div className="mt-12 text-center p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800/60">
          <p className="text-sm text-neutral-300">
            ¿Tienes otra duda técnica o requieres asesoría para elegir tu producto?
          </p>
          <a
            href="https://wa.me/56912345678?text=Hola,%20tengo%20una%20consulta%20sobre%20la%20proteina%20KINETIC"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-lime-400 hover:text-lime-300 font-bold text-xs uppercase font-mono tracking-wider transition-colors"
          >
            <span>Habla con un especialista por WhatsApp</span>
            <span>→</span>
          </a>
        </div>

      </div>
    </section>
  );
};
