import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Star, CheckCircle2, MessageSquareQuote } from 'lucide-react';
import { TESTIMONIALS } from '../data/products';
import { getLandingTestimonials } from '../lib/landing';

type TestimonialItem = {
  id: string;
  name: string;
  role: string;
  comment: string;
  rating: number;
  verified: boolean;
  avatar: string;
  productPurchased: string;
};

export const Testimonials: React.FC = () => {
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(TESTIMONIALS);

  useEffect(() => {
    getLandingTestimonials().then((fetched) => {
      if (fetched && fetched.length > 0) {
        setTestimonials(
          fetched.map((t) => ({
            id: t.id,
            name: t.customer_name,
            role: t.role || '',
            comment: t.content,
            rating: t.rating,
            verified: t.verified,
            avatar: t.customer_image || '',
            productPurchased: t.product_purchased || '',
          }))
        );
      }
    });
  }, []);

  return (
    <section className="relative py-24 bg-neutral-950 overflow-hidden">
      
      {/* Subtle Background Ambience */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-lime-400 text-xs font-mono uppercase tracking-widest mb-3">
            <Star className="w-3.5 h-3.5 fill-lime-400" />
            OPINIONES VERIFICADAS
          </div>
          <h2 className="text-3xl sm:text-5xl font-black italic tracking-tighter uppercase font-display text-white">
            EXPERIENCIAS DE ATLETAS
          </h2>
          <p className="mt-3 text-neutral-400 text-sm sm:text-base leading-relaxed">
            Testimonios reales de la comunidad KINETIC sobre digestibilidad, sabor y resultados de recuperación.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {testimonials.map((review, idx) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              whileHover={{ y: -5 }}
              className="rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-6 sm:p-7 flex flex-col justify-between backdrop-blur-sm relative"
            >
              {/* Quote icon watermark */}
              <MessageSquareQuote className="absolute top-6 right-6 w-8 h-8 text-neutral-800/60 pointer-events-none" />

              <div>
                {/* 5 Stars */}
                <div className="flex items-center space-x-1 text-amber-400 mb-4">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>

                {/* Comment Text */}
                <p className="text-sm sm:text-base text-neutral-200 leading-relaxed font-normal italic">
                  "{review.comment}"
                </p>
              </div>

              {/* Author Info */}
              <div className="mt-6 pt-4 border-t border-neutral-800/80 flex items-center gap-3">
                <img
                  src={review.avatar}
                  alt={review.name}
                  loading="lazy"
                  decoding="async"
                  width={40}
                  height={40}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-neutral-700"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white font-display uppercase tracking-wide">
                      {review.name}
                    </span>
                    {review.verified && (
                      <span className="flex items-center gap-0.5 text-[10px] text-lime-400 font-mono">
                        <CheckCircle2 className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    {review.role}
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                    {review.productPurchased}
                  </div>
                </div>
              </div>

            </motion.div>
          ))}
        </div>

        {/* Trust Badges Bar */}
        <div className="mt-14 pt-8 border-t border-neutral-900 flex flex-wrap items-center justify-center gap-8 text-xs font-mono text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="text-lime-400 font-bold">★ 4.9/5</span>
            <span>Calificación Promedio</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-neutral-700 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-lime-400 font-bold">98.4%</span>
            <span>Tasa de Recomendación</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-neutral-700 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-lime-400 font-bold">+10,000</span>
            <span>Servicios Despachados</span>
          </div>
        </div>

      </div>
    </section>
  );
};
