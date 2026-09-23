import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Instagram, MessageCircle, ArrowUp, ShieldCheck } from 'lucide-react';
import { LandingSettings, LandingNavLink, getLandingNavLinks } from '../lib/landing';

const FALLBACK_BRAND_NAME = 'KINETIC';
const FALLBACK_BRAND_TAGLINE = 'SPORTS NUTRITION';
const FALLBACK_COPYRIGHT = `© ${new Date().getFullYear()} KINETIC Sports Nutrition. Todos los derechos reservados.`;
const FALLBACK_WHATSAPP = '56912345678';
const FALLBACK_CONTACT_EMAIL = 'contacto@kineticnutrition.com';
const FALLBACK_BRAND_DESCRIPTION =
  'Nutrición deportiva diseñada con precisión científica para atletas y personas comprometidas con su máximo rendimiento físico.';

const FALLBACK_PRODUCT_LINKS: LandingNavLink[] = [
  { id: 'fallback-1', label: 'KINETIC Iso-Whey Pro', url: '#producto', group: 'footer_productos' },
  { id: 'fallback-2', label: 'Creatina Creapure®', url: '#productos', group: 'footer_productos' },
  { id: 'fallback-3', label: 'Pre-Workout Nitro', url: '#productos', group: 'footer_productos' },
  { id: 'fallback-4', label: 'Shaker Pro Steel', url: '#productos', group: 'footer_productos' },
  { id: 'fallback-5', label: 'Barras Proteicas', url: '#productos', group: 'footer_productos' },
];

const FALLBACK_SUPPORT_LINKS: LandingNavLink[] = [
  { id: 'fallback-1', label: 'Preguntas Frecuentes', url: '#faq', group: 'footer_soporte' },
  { id: 'fallback-2', label: 'Modo de Preparación', url: '#beneficios', group: 'footer_soporte' },
  { id: 'fallback-3', label: 'Políticas de Envíos', url: '#faq', group: 'footer_soporte' },
  { id: 'fallback-4', label: 'Medios de Pago', url: '#faq', group: 'footer_soporte' },
];

const FALLBACK_LEGAL_LINKS: LandingNavLink[] = [
  { id: 'fallback-1', label: 'Garantía de Satisfacción', url: '#', group: 'footer_legal' },
  { id: 'fallback-2', label: 'Políticas de Devolución', url: '#', group: 'footer_legal' },
];

interface FooterProps {
  settings: LandingSettings | null;
}

export const Footer: React.FC<FooterProps> = ({ settings }) => {
  const [brandName, ...brandTaglineParts] = (settings?.brand_name ?? FALLBACK_BRAND_NAME).split(' ');
  const brandTagline = brandTaglineParts.length
    ? brandTaglineParts.join(' ').toUpperCase()
    : FALLBACK_BRAND_TAGLINE;
  const whatsappDigits = (settings?.whatsapp_number ?? FALLBACK_WHATSAPP).replace(/[^0-9]/g, '');
  const contactEmail = settings?.contact_email ?? FALLBACK_CONTACT_EMAIL;

  const [productLinks, setProductLinks] = useState<LandingNavLink[] | null>(null);
  const [supportLinks, setSupportLinks] = useState<LandingNavLink[] | null>(null);
  const [legalLinks, setLegalLinks] = useState<LandingNavLink[] | null>(null);

  useEffect(() => {
    getLandingNavLinks('footer_productos').then(setProductLinks);
    getLandingNavLinks('footer_soporte').then(setSupportLinks);
    getLandingNavLinks('footer_legal').then(setLegalLinks);
  }, []);

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
                  {brandName}
                </span>
                <span className="text-[8px] font-mono tracking-[0.2em] text-neutral-400 uppercase -mt-0.5">
                  {brandTagline}
                </span>
              </div>
            </a>

            <p className="text-neutral-400 leading-relaxed max-w-sm text-xs mb-6">
              {settings?.footer_description ?? FALLBACK_BRAND_DESCRIPTION}
            </p>

            <div className="flex items-center space-x-3">
              <a
                href={settings?.instagram_url ?? 'https://instagram.com'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-lime-400 hover:border-lime-400/60 transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href={settings?.tiktok_url ?? 'https://tiktok.com'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-lime-400 hover:border-lime-400/60 transition-colors font-bold text-xs"
              >
                <span className="font-mono text-xs">TT</span>
              </a>
              <a
                href={`https://wa.me/${whatsappDigits}`}
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
              {(productLinks && productLinks.length > 0 ? productLinks : FALLBACK_PRODUCT_LINKS).map((link) => (
                <li key={link.id}>
                  <a href={link.url} className="hover:text-lime-400 transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Links: Soporte */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase font-display tracking-wider mb-4">
              Soporte
            </h4>
            <ul className="space-y-2.5">
              {(supportLinks && supportLinks.length > 0 ? supportLinks : FALLBACK_SUPPORT_LINKS).map((link) => (
                <li key={link.id}>
                  <a href={link.url} className="hover:text-lime-400 transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <Link to="/seguimiento" className="hover:text-lime-400 transition-colors">
                  Seguimiento de Pedido
                </Link>
              </li>
              <li>
                <a href={`mailto:${contactEmail}`} className="hover:text-lime-400 transition-colors">
                  {contactEmail}
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
                <a href={settings?.terms_and_conditions ?? '#'} className="hover:text-lime-400 transition-colors">
                  Términos y Condiciones
                </a>
              </li>
              <li>
                <a href={settings?.privacy_policy ?? '#'} className="hover:text-lime-400 transition-colors">
                  Política de Privacidad
                </a>
              </li>
              {(legalLinks && legalLinks.length > 0 ? legalLinks : FALLBACK_LEGAL_LINKS).map((link) => (
                <li key={link.id}>
                  <a href={link.url} className="hover:text-lime-400 transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Copyright, Payment Badges & Back to top */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500">
          <div>
            {settings?.footer_text ?? FALLBACK_COPYRIGHT}
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
