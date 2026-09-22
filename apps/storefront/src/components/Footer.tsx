import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Instagram, MessageCircle, ArrowUp, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-neutral-950 border-t border-neutral-800/80 pt-16 pb-12 text-neutral-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-neutral-800/80">
          
          {/* Brand Col */}
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center space-x-2.5 mb-4 group">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center text-lime-400 group-hover:border-lime-400 transition-colors">
                <Zap className="w-4 h-4 fill-lime-400/20 text-lime-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black italic tracking-tight uppercase font-display text-white">
                  KINETIC
                </span>
                <span className="text-[8px] font-mono tracking-[0.2em] text-neutral-400 uppercase -mt-0.5">
                  SPORTS NUTRITION
                </span>
              </div>
            </a>

            <p className="text-neutral-400 leading-relaxed max-w-sm text-xs mb-6">
              Nutrición deportiva diseñada con precisión científica para atletas y personas comprometidas con su máximo rendimiento físico.
            </p>

            <div className="flex items-center space-x-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-lime-400 hover:border-lime-400/60 transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-lime-400 hover:border-lime-400/60 transition-colors font-bold text-xs"
              >
                <span className="font-mono text-xs">TT</span>
              </a>
              <a
                href="https://wa.me/56912345678"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-lime-400 hover:border-lime-400/60 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links: Productos */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase font-display tracking-wider mb-4">
              Productos
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a href="#producto" className="hover:text-lime-400 transition-colors">
                  KINETIC Iso-Whey Pro
                </a>
              </li>
              <li>
                <a href="#productos" className="hover:text-lime-400 transition-colors">
                  Creatina Creapure®
                </a>
              </li>
              <li>
                <a href="#productos" className="hover:text-lime-400 transition-colors">
                  Pre-Workout Nitro
                </a>
              </li>
              <li>
                <a href="#productos" className="hover:text-lime-400 transition-colors">
                  Shaker Pro Steel
                </a>
              </li>
              <li>
                <a href="#productos" className="hover:text-lime-400 transition-colors">
                  Barras Proteicas
                </a>
              </li>
            </ul>
          </div>

          {/* Links: Soporte */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase font-display tracking-wider mb-4">
              Soporte
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a href="#faq" className="hover:text-lime-400 transition-colors">
                  Preguntas Frecuentes
                </a>
              </li>
              <li>
                <a href="#beneficios" className="hover:text-lime-400 transition-colors">
                  Modo de Preparación
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-lime-400 transition-colors">
                  Políticas de Envíos
                </a>
              </li>
              <li>
                <Link to="/seguimiento" className="hover:text-lime-400 transition-colors">
                  Seguimiento de Pedido
                </Link>
              </li>
              <li>
                <a href="#faq" className="hover:text-lime-400 transition-colors">
                  Medios de Pago
                </a>
              </li>
              <li>
                <a href="mailto:contacto@kineticnutrition.com" className="hover:text-lime-400 transition-colors">
                  contacto@kineticnutrition.com
                </a>
              </li>
            </ul>
          </div>

          {/* Links: Legal */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase font-display tracking-wider mb-4">
              Legal
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a href="#" className="hover:text-lime-400 transition-colors">
                  Términos y Condiciones
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-lime-400 transition-colors">
                  Política de Privacidad
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-lime-400 transition-colors">
                  Garantía de Satisfacción
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-lime-400 transition-colors">
                  Políticas de Devolución
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Copyright, Payment Badges & Back to top */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500">
          <div>
            © {new Date().getFullYear()} KINETIC Sports Nutrition. Todos los derechos reservados.
          </div>

          <div className="flex items-center gap-3 text-neutral-400">
            <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] font-mono">VISA</span>
            <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] font-mono">MASTERCARD</span>
            <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] font-mono">WEBPAY</span>
            <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] font-mono">MERCADO PAGO</span>
          </div>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 text-neutral-400 hover:text-lime-400 transition-colors"
          >
            <span>Volver arriba</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </footer>
  );
};
