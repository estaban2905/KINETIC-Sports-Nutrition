import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { LandingPage } from './pages/LandingPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { OrderLookupPage } from './pages/OrderLookupPage';
import { ConfirmCheckoutPage } from './pages/ConfirmCheckoutPage';

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pedido/:orderId" element={<OrderConfirmationPage />} />
          <Route path="/seguimiento" element={<OrderLookupPage />} />
          <Route path="/checkout/confirmar" element={<ConfirmCheckoutPage />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}
