import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, Truck, Check, Loader2, Copy } from 'lucide-react';
import { CartItem } from '../types';
import confetti from 'canvas-confetti';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart
}) => {
  const [couponCode, setCouponCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [couponFeedback, setCouponFeedback] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: ''
  });
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [copiedOrder, setCopiedOrder] = useState(false);
  
  // Checkout form mock
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: ''
  });

  // Modal accessibility: Escape key and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const subtotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const freeShippingThreshold = 50000;
  const missingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100);
  
  const discountAmount = discountApplied ? Math.round(subtotal * 0.1) : 0;
  const shippingCost = subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : 3990;
  const total = Math.max(0, subtotal - discountAmount + (subtotal > 0 ? shippingCost : 0));

  const applyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = couponCode.trim().toUpperCase();
    if (clean === 'KINETIC10' || clean === 'PRO10') {
      setDiscountApplied(true);
      setCouponFeedback({
        type: 'success',
        message: '¡Cupón de 10% de descuento aplicado con éxito!'
      });
    } else {
      setCouponFeedback({
        type: 'error',
        message: 'Cupón no válido. Prueba con "KINETIC10" para un 10% de descuento.'
      });
    }
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    const generatedId = `#KNT-${Math.floor(100000 + Math.random() * 900000)}`;
    setOrderId(generatedId);

    // Realistic checkout processing simulation
    setTimeout(() => {
      setIsSubmitting(false);
      setOrderComplete(true);

      try {
        localStorage.setItem(
          'kinetic_last_order',
          JSON.stringify({
            orderId: generatedId,
            date: new Date().toISOString(),
            total,
            itemsCount: items.length,
            customerName: formData.name
          })
        );
      } catch {
        // ignore
      }

      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#a3e635', '#ffffff', '#22c55e']
        });
      } catch {
        // ignore
      }
    }, 1200);
  };

  const copyOrderId = () => {
    if (!orderId) return;
    navigator.clipboard?.writeText(orderId);
    setCopiedOrder(true);
    setTimeout(() => setCopiedOrder(false), 2000);
  };

  const handleFinishOrder = () => {
    setOrderComplete(false);
    setIsCheckingOut(false);
    setCouponFeedback({ type: null, message: '' });
    onClearCart();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="cart-drawer-title"
              className="w-screen max-w-md bg-neutral-950 border-l border-neutral-800 shadow-2xl flex flex-col justify-between text-neutral-100"
            >
              
              {/* Cart Header */}
              <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center text-lime-400">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 id="cart-drawer-title" className="font-bold text-lg uppercase font-display tracking-wide text-white">
                      Tu Carrito
                    </h3>
                    <span className="text-xs text-neutral-400">
                      {items.length} {items.length === 1 ? 'producto' : 'productos'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
                  aria-label="Cerrar carrito"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Free Shipping Progress Bar */}
              <div className="bg-neutral-900/90 px-5 py-3 border-b border-neutral-800 text-xs">
                <div className="flex items-center justify-between mb-1.5 font-mono">
                  <span className="flex items-center gap-1.5 text-neutral-300">
                    <Truck className="w-3.5 h-3.5 text-lime-400" />
                    {missingForFreeShipping === 0 ? (
                      <span className="text-lime-400 font-bold">¡Tienes Envío Gratis Desbloqueado!</span>
                    ) : (
                      <span>Faltan <strong className="text-white">${missingForFreeShipping.toLocaleString('es-CL')}</strong> para Envío Gratis</span>
                    )}
                  </span>
                  <span className="text-neutral-400 font-bold">{freeShippingProgress.toFixed(0)}%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-lime-500 to-lime-300 transition-all duration-300"
                    style={{ width: `${freeShippingProgress}%` }}
                  />
                </div>
              </div>

              {/* Items List or Checkout view */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-600 mb-4">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <h4 className="text-base font-bold font-display uppercase tracking-wide text-neutral-300">
                      Tu carrito está vacío
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                      Agrega tu Proteína Premium o accesorios de entrenamiento para comenzar.
                    </p>
                    <button
                      onClick={onClose}
                      className="mt-6 px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-lime-400 text-xs font-bold uppercase font-display tracking-wider"
                    >
                      Explorar Productos
                    </button>
                  </div>
                ) : isCheckingOut ? (
                  // Checkout Form Simulator
                  <div className="space-y-4">
                    {orderComplete ? (
                      <div className="py-8 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-lime-400/20 border border-lime-400 text-lime-400 flex items-center justify-center mx-auto">
                          <Check className="w-8 h-8 stroke-[3]" />
                        </div>
                        <h4 className="text-2xl font-black uppercase font-display text-white">
                          ¡ORDEN RECIBIDA!
                        </h4>
                        <p className="text-xs text-neutral-300 leading-relaxed">
                          Gracias por tu compra, <strong>{formData.name || 'Atleta'}</strong>. Hemos enviado la confirmación y detalles de despacho a <strong>{formData.email || 'tu correo'}</strong>.
                        </p>
                        
                        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-left text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-400 font-mono">Número de orden:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-lime-400 font-mono font-bold">{orderId}</span>
                              <button
                                type="button"
                                onClick={copyOrderId}
                                className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                                title="Copiar código de orden"
                                aria-label="Copiar código de orden"
                              >
                                {copiedOrder ? (
                                  <Check className="w-3.5 h-3.5 text-lime-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="text-neutral-400 font-mono">Total pagado: <strong className="text-white">${total.toLocaleString('es-CL')}</strong></div>
                          <div className="text-neutral-400 font-mono">Despacho estimado: 24-48 horas hábiles</div>
                          <div className="text-neutral-400 font-mono">Destino: {formData.address || 'Domicilio'}, {formData.city}</div>
                        </div>

                        <button
                          type="button"
                          onClick={handleFinishOrder}
                          className="w-full py-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold uppercase font-display text-sm tracking-wider shadow-lg transition-all"
                        >
                          Entendido, volver a la tienda
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleCheckoutSubmit} className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                          <h4 className="text-sm font-bold uppercase font-display text-white">
                            Datos de Envío & Pago Seguro
                          </h4>
                          <button
                            type="button"
                            onClick={() => setIsCheckingOut(false)}
                            className="text-xs text-neutral-400 hover:text-white underline"
                          >
                            Volver al carrito
                          </button>
                        </div>

                        <div>
                          <label htmlFor="checkout-name" className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                            Nombre Completo
                          </label>
                          <input
                            id="checkout-name"
                            name="name"
                            autoComplete="name"
                            required
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ej: Matías Silva"
                            className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-lime-400"
                          />
                        </div>

                        <div>
                          <label htmlFor="checkout-email" className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                            Correo Electrónico
                          </label>
                          <input
                            id="checkout-email"
                            name="email"
                            autoComplete="email"
                            required
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="tu@email.com"
                            className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-lime-400"
                          />
                        </div>

                        <div>
                          <label htmlFor="checkout-phone" className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                            Teléfono / WhatsApp
                          </label>
                          <input
                            id="checkout-phone"
                            name="tel"
                            autoComplete="tel"
                            required
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+56 9 1234 5678"
                            className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-lime-400"
                          />
                        </div>

                        <div>
                          <label htmlFor="checkout-address" className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                            Dirección de Entrega
                          </label>
                          <input
                            id="checkout-address"
                            name="address"
                            autoComplete="street-address"
                            required
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Calle, número, depto"
                            className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-lime-400"
                          />
                        </div>

                        <div>
                          <label htmlFor="checkout-city" className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                            Ciudad / Comuna
                          </label>
                          <input
                            id="checkout-city"
                            name="city"
                            autoComplete="address-level2"
                            required
                            type="text"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            placeholder="Ej: Las Condes, Santiago"
                            className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-lime-400"
                          />
                        </div>

                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full py-3.5 rounded-xl font-black uppercase font-display text-base tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 ${
                              isSubmitting
                                ? 'bg-lime-400/60 text-neutral-900 cursor-not-allowed'
                                : 'bg-lime-400 hover:bg-lime-300 text-neutral-950 active:scale-[0.98]'
                            }`}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>PROCESANDO PAGO SEGURO...</span>
                              </>
                            ) : (
                              <span>PAGAR AHORA (${total.toLocaleString('es-CL')})</span>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  // Items List with stable composite keys and accessible touch areas
                  items.map((item, idx) => {
                    const itemKey = `${item.product.id}-${item.selectedFlavor?.id || 'base'}-${item.selectedSize?.id || 'base'}`;
                    return (
                      <div
                        key={itemKey}
                        className="p-3 rounded-xl bg-neutral-900/70 border border-neutral-800 flex gap-3 items-center"
                      >
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-lg object-cover bg-neutral-950 border border-neutral-800 flex-shrink-0"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white uppercase font-display tracking-tight truncate">
                            {item.product.name}
                          </h4>
                          
                          {item.selectedFlavor && (
                            <div className="text-[10px] text-lime-400 font-mono">
                              Sabor: {item.selectedFlavor.name}
                            </div>
                          )}
                          {item.selectedSize && (
                            <div className="text-[10px] text-neutral-400 font-mono">
                              Tamaño: {item.selectedSize.weight}
                            </div>
                          )}

                          <div className="mt-1 flex items-center justify-between">
                            <span className="font-bold text-sm text-white font-display">
                              ${(item.unitPrice * item.quantity).toLocaleString('es-CL')}
                            </span>

                            {/* Quantity control */}
                            <div className="flex items-center border border-neutral-700 rounded-lg bg-neutral-950">
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(idx, -1)}
                                className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                                aria-label="Restar unidad"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-mono font-bold px-2">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(idx, 1)}
                                className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                                aria-label="Sumar unidad"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveItem(idx)}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition-colors flex-shrink-0"
                          aria-label={`Eliminar ${item.product.name} del carrito`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}

              </div>

              {/* Cart Footer Summary */}
              {items.length > 0 && !isCheckingOut && (
                <div className="p-5 border-t border-neutral-800 bg-neutral-950 space-y-3">
                  
                  {/* Coupon Form */}
                  <div>
                    <form onSubmit={applyCoupon} className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Cupón (ej: KINETIC10)"
                        className="flex-1 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white placeholder-neutral-500 font-mono uppercase focus:outline-none focus:border-lime-400"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold font-display uppercase tracking-wider transition-colors"
                      >
                        Aplicar
                      </button>
                    </form>

                    {/* Inline Coupon Feedback */}
                    {couponFeedback.message && (
                      <div
                        className={`mt-2 text-[11px] font-mono px-2.5 py-1.5 rounded border ${
                          couponFeedback.type === 'success'
                            ? 'bg-lime-500/10 border-lime-500/30 text-lime-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        }`}
                        role="alert"
                      >
                        {couponFeedback.message}
                      </div>
                    )}
                  </div>

                  {/* Calculations */}
                  <div className="space-y-1.5 text-xs font-mono pt-1">
                    <div className="flex justify-between text-neutral-400">
                      <span>Subtotal</span>
                      <span>${subtotal.toLocaleString('es-CL')}</span>
                    </div>

                    {discountApplied && (
                      <div className="flex justify-between text-lime-400">
                        <span>Descuento Cupón (10%)</span>
                        <span>-${discountAmount.toLocaleString('es-CL')}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-neutral-400">
                      <span>Despacho</span>
                      <span>{shippingCost === 0 ? 'GRATIS' : `$${shippingCost.toLocaleString('es-CL')}`}</span>
                    </div>

                    <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-neutral-800 font-display">
                      <span className="uppercase">TOTAL</span>
                      <span className="text-lime-400 text-xl font-black">
                        ${total.toLocaleString('es-CL')}
                      </span>
                    </div>
                  </div>

                  {/* Checkout Action Button */}
                  <button
                    id="cart-checkout-btn"
                    onClick={() => setIsCheckingOut(true)}
                    className="w-full py-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-black uppercase font-display text-base tracking-wider shadow-[0_0_25px_rgba(163,230,53,0.3)] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <span>FINALIZAR COMPRA</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[10px] text-neutral-500 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-lime-400" />
                    <span>Pago 100% Encriptado SSL · Despacho Inmediato</span>
                  </div>

                </div>
              )}

            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
