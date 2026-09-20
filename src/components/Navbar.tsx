import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Menu, X, Zap, ChevronRight } from 'lucide-react';

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ cartCount, onOpenCart }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Productos', href: '#productos' },
    { label: 'Beneficios', href: '#beneficios' },
    { label: 'Nosotros', href: '#experiencia' },
    { label: 'FAQ', href: '#faq' },
  ];

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header
        id="main-navbar"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-neutral-950/85 backdrop-blur-xl border-b border-neutral-800/80 shadow-2xl py-3.5'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* LOGO */}
          <a
            id="nav-logo"
            href="#"
            className="flex items-center space-x-2.5 group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-lg bg-neutral-900 border border-neutral-700/80 flex items-center justify-center text-lime-400 group-hover:border-lime-400/80 transition-colors shadow-inner">
              <Zap className="w-5 h-5 fill-lime-400/20 text-lime-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase font-display leading-none text-white flex items-center gap-1">
                KINETIC
                <span className="w-1.5 h-1.5 rounded-full bg-lime-400 inline-block" />
              </span>
              <span className="text-[9px] font-mono tracking-[0.25em] text-neutral-400 uppercase -mt-0.5">
                SPORTS NUTRITION
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.href)}
                className="text-sm font-semibold tracking-wide text-neutral-300 hover:text-lime-400 transition-colors py-1 relative group"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-lime-400 transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </nav>

          {/* Right Actions: Cart & Mobile Menu */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Quick action button */}
            <a
              href="#producto"
              onClick={(e) => handleLinkClick(e, '#producto')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold font-display uppercase tracking-wider bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-all"
            >
              Comprar Ahora
            </a>

            {/* Shopping Cart Button */}
            <button
              id="cart-toggle-btn"
              onClick={onOpenCart}
              aria-label="Abrir carrito"
              className="relative p-2.5 rounded-xl bg-neutral-900 border border-neutral-700/80 text-neutral-200 hover:text-white hover:border-lime-400/80 hover:bg-neutral-800 transition-all focus:outline-none focus:ring-2 focus:ring-lime-400"
            >
              <ShoppingBag className="w-5 h-5 text-neutral-100" />
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-lime-400 text-neutral-950 font-black text-xs flex items-center justify-center shadow-lg font-mono"
                >
                  {cartCount}
                </motion.span>
              )}
            </button>

            {/* Mobile Menu Trigger */}
            <button
              id="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-200 hover:text-white focus:outline-none"
              aria-label="Alternar menú"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 md:hidden bg-neutral-950/95 backdrop-blur-2xl border-b border-neutral-800 p-6 shadow-2xl"
          >
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleLinkClick(e, link.href)}
                  className="flex items-center justify-between text-base font-bold text-neutral-200 hover:text-lime-400 py-2 border-b border-neutral-800/60"
                >
                  <span>{link.label}</span>
                  <ChevronRight className="w-4 h-4 text-neutral-500" />
                </a>
              ))}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenCart();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-lime-400 text-neutral-950 font-bold font-display uppercase tracking-wider text-sm shadow-lg hover:bg-lime-300 transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Ver Carrito ({cartCount})
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
