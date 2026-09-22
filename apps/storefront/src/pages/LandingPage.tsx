import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { Benefits } from '../components/Benefits';
import { ProductSection } from '../components/ProductSection';
import { ExperienceSection } from '../components/ExperienceSection';
import { FeaturedProducts } from '../components/FeaturedProducts';
import { SpecialOffer } from '../components/SpecialOffer';
import { Testimonials } from '../components/Testimonials';
import { FAQ } from '../components/FAQ';
import { FinalCTA } from '../components/FinalCTA';
import { Footer } from '../components/Footer';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { FLAGSHIP_PROTEIN } from '../data/products';
import { Product, ProductFlavor, ProductSize } from '../types';
import { useCart } from '../context/CartContext';

// Lazy load non-critical and overlay components for faster initial page load
const CartDrawer = React.lazy(() => import('../components/CartDrawer').then(m => ({ default: m.CartDrawer })));
const QuickViewModal = React.lazy(() => import('../components/QuickViewModal').then(m => ({ default: m.QuickViewModal })));

export function LandingPage() {
  const { itemCount, addItem, error } = useCart();

  // Flagship state
  const [selectedFlavor, setSelectedFlavor] = useState<ProductFlavor>(
    FLAGSHIP_PROTEIN.flavors![0]
  );
  const [selectedSize, setSelectedSize] = useState<ProductSize>(
    FLAGSHIP_PROTEIN.sizes![1] // Default to 2 Libras ($65.990)
  );

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [showErrorToast, setShowErrorToast] = useState(false);

  const handleAddFlagshipToCart = async (
    flavor: ProductFlavor,
    size: ProductSize,
    quantity: number = 1
  ) => {
    try {
      await addItem(FLAGSHIP_PROTEIN, flavor, size, quantity);
      setIsCartOpen(true);
    } catch {
      setShowErrorToast(true);
    }
  };

  const handleAddProductDirect = async (
    product: Product,
    flavor?: ProductFlavor,
    quantity: number = 1
  ) => {
    try {
      await addItem(product, flavor || product.flavors?.[0], product.sizes?.[0], quantity);
      setIsCartOpen(true);
    } catch {
      setShowErrorToast(true);
    }
  };

  // Scroll actions
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBuyNow = () => {
    scrollToSection('producto');
  };

  const handleViewProduct = () => {
    scrollToSection('beneficios');
  };

  const handleClaimOffer = () => {
    handleAddFlagshipToCart(selectedFlavor, selectedSize, 1);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-lime-400 selection:text-neutral-950 overflow-x-hidden">

      {/* Sticky Navbar */}
      <Navbar
        cartCount={itemCount}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Main Content Sections */}
      <main className="flex-1">

        {/* 1. Full Screen Hero Section */}
        <Hero
          onBuyNow={handleBuyNow}
          onViewProduct={handleViewProduct}
          selectedFlavor={selectedFlavor}
          selectedSize={selectedSize}
        />

        {/* 2. Value Props / Benefits Section ("¿Por qué esta proteína?") */}
        <Benefits />

        {/* 3. Dedicated Flagship Product Section */}
        <ProductSection
          onAddToCart={handleAddFlagshipToCart}
          selectedFlavor={selectedFlavor}
          onSelectFlavor={setSelectedFlavor}
          selectedSize={selectedSize}
          onSelectSize={setSelectedSize}
        />

        {/* 4. Experience / Athlete Results Section ("ENTRENA. SUPERA. RECUPERA. REPITE.") */}
        <ExperienceSection />

        {/* 5. Featured Products Section ("COMPLETA TU ENTRENAMIENTO") */}
        <FeaturedProducts
          onQuickView={(p) => setQuickViewProduct(p)}
          onAddToCartDirect={(p) => handleAddProductDirect(p)}
        />

        {/* 6. Special High-Impact Offer with Countdown */}
        <SpecialOffer
          onClaimOffer={handleClaimOffer}
          selectedFlavor={selectedFlavor}
          selectedSize={selectedSize}
        />

        {/* 7. Customer Testimonials */}
        <Testimonials />

        {/* 8. Frequently Asked Questions Accordion */}
        <FAQ />

        {/* 9. Final CTA with Product Display */}
        <FinalCTA
          onBuyNow={handleBuyNow}
          selectedFlavor={selectedFlavor}
          selectedSize={selectedSize}
        />

      </main>

      {/* 10. Comprehensive Footer */}
      <Footer />

      <React.Suspense fallback={null}>
        {/* Slide-out Cart Drawer with real Medusa checkout */}
        {isCartOpen && (
          <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
          />
        )}

        {/* Quick View Modal for Other Products */}
        {quickViewProduct && (
          <QuickViewModal
            product={quickViewProduct}
            onClose={() => setQuickViewProduct(null)}
            onAddToCart={handleAddProductDirect}
          />
        )}
      </React.Suspense>

      {/* Floating WhatsApp Support Button */}
      <WhatsAppButton />

      {/* Error toast: shown when the cart couldn't reach the Medusa backend */}
      {showErrorToast && error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] max-w-sm w-[calc(100%-2rem)] bg-neutral-900 border border-rose-500/40 rounded-xl p-4 shadow-2xl">
          <p className="text-rose-400 text-sm font-bold mb-1">No pudimos conectar con la tienda</p>
          <p className="text-neutral-400 text-xs mb-3">{error}</p>
          <div className="flex justify-end">
            <button
              onClick={() => setShowErrorToast(false)}
              className="text-xs text-neutral-300 hover:text-white underline"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
