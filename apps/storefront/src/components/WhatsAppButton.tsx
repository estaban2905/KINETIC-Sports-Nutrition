import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LandingSettings } from '../lib/landing';

const FALLBACK_PHONE = '56912345678';
const FALLBACK_MESSAGE = '¡Hola! Me gustaría hacer una consulta sobre la Proteína Premium KINETIC y los envíos.';
const FALLBACK_TOOLTIP = '¿Dudas con tu suplementación? Chatea con un asesor';

interface WhatsAppButtonProps {
  settings: LandingSettings | null;
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({ settings }) => {
  const [showTooltip, setShowTooltip] = useState(true);
  const phoneNumber = (settings?.whatsapp_number ?? FALLBACK_PHONE).replace(/[^0-9]/g, '');

  const message = encodeURIComponent(settings?.whatsapp_message_template ?? FALLBACK_MESSAGE);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
  const tooltipText = settings?.whatsapp_tooltip_text ?? FALLBACK_TOOLTIP;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
      {/* Interactive Tooltip bubble */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs shadow-2xl backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{tooltipText}</span>
            <button
              onClick={() => setShowTooltip(false)}
              className="text-neutral-500 hover:text-white ml-1 p-0.5"
              aria-label="Cerrar sugerencia"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chatear por WhatsApp"
        className="relative group p-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-[0_4px_25px_rgba(16,185,129,0.4)] hover:shadow-[0_6px_35px_rgba(16,185,129,0.6)] transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center"
      >
        {/* Pulsing ring */}
        <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-75 animate-ping -z-10 group-hover:opacity-0" />
        <MessageCircle className="w-6 h-6 fill-current stroke-1" />
      </a>
    </div>
  );
};
