import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Benefits } from './components/Benefits';
import { ProductSection } from './components/ProductSection';
import { ExperienceSection } from './components/ExperienceSection';
import { FeaturedProducts } from './components/FeaturedProducts';
import { SpecialOffer } from './components/SpecialOffer';
import { Testimonials } from './components/Testimonials';
import { FAQ } from './components/FAQ';
import { FinalCTA } from './components/FinalCTA';
import { Footer } from './components/Footer';
import { WhatsAppButton } from './components/WhatsAppButton';
import { FLAGSHIP_PROTEIN } from './data/products';
import { CartItem, Product, ProductFlavor, ProductSize } from './types';

// Lazy load non-critical and overlay components for faster initial page load
const CartDrawer = React.lazy(() => import('./components/CartDrawer').then(m => ({ default: m.CartDrawer })));
const QuickViewModal = React.lazy(() => import('./components/QuickViewModal').then(m => ({ default: m.QuickViewModal })));
const LandingAdminApp = React.lazy(() => import('./admin/components/LandingAdminApp').then(m => ({ default: m.LandingAdminApp })));

export default function App() {
  // Flagship state
  const [selectedFlavor, setSelectedFlavor] = useState<ProductFlavor>(
    FLAGSHIP_PROTEIN.flavors![0]
  );
  const [selectedSize, setSelectedSize] = useState<ProductSize>(
    FLAGSHIP_PROTEIN.sizes![1] // Default to 2 Libras ($65.990)
  );

  // Cart state with localStorage
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('kinetic_cart_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('kinetic_cart_items', JSON.stringify(cartItems));
    } catch {
      // ignore
    }
  }, [cartItems]);

  // Cart actions
  const handleAddFlagshipToCart = (
    flavor: ProductFlavor,
    size: ProductSize,
    quantity: number = 1
  ) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) =>
          item.product.id === FLAGSHIP_PROTEIN.id &&
          item.selectedFlavor?.id === flavor.id &&
          item.selectedSize?.id === size.id
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        return updated;
      } else {
        return [
          ...prev,
          {
            product: FLAGSHIP_PROTEIN,
            selectedFlavor: flavor,
            selectedSize: size,
            quantity,
            unitPrice: size.price
          }
        ];
      }
    });

    setIsCartOpen(true);
  };

  const handleAddProductDirect = (
    product: Product,
    flavor?: ProductFlavor,
    quantity: number = 1
  ) => {
    const chosenFlavor = flavor || product.flavors?.[0];
    const unitPrice = product.price;

    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedFlavor?.id === chosenFlavor?.id
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        return updated;
      } else {
        return [
          ...prev,
          {
            product,
            selectedFlavor: chosenFlavor,
            quantity,
            unitPrice
          }
        ];
      }
    });

    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    setCartItems((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearCart = () => {
    setCartItems([]);
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
    // Add flagship protein with current size
    handleAddFlagshipToCart(
      selectedFlavor,
      selectedSize,
      1
    );
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-lime-400 selection:text-neutral-950 overflow-x-hidden">
      
      {/* Sticky Navbar */}
      <Navbar
        cartCount={totalCartCount}
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
        {/* Slide-out Cart Drawer with Order Simulator */}
        {isCartOpen && (
          <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
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

        {/* Medusa Admin Overlay */}
        {isAdminOpen && (
          <LandingAdminApp onClose={() => setIsAdminOpen(false)} />
        )}
      </React.Suspense>

      {/* Floating WhatsApp Support Button */}
      <WhatsAppButton />

      {/* Floating Medusa Admin Switcher */}
      <button
        onClick={() => setIsAdminOpen(true)}
        className="fixed bottom-6 left-6 z-40 px-3 py-2 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-lime-400 border border-lime-400/40 backdrop-blur-md shadow-2xl flex items-center gap-2 text-xs font-mono font-bold transition-transform hover:scale-105"
        title="Abrir Panel de Administración Medusa"
      >
        <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
        Medusa Admin Dashboard
      </button>

    </div>
  );
}
