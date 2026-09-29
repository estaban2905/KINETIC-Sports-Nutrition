import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { LandingPage } from './pages/LandingPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { OrderLookupPage } from './pages/OrderLookupPage';
import { ConfirmCheckoutPage } from './pages/ConfirmCheckoutPage';
import { AccountPage } from './pages/AccountPage';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <AuthModal />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/cuenta" element={<AccountPage />} />
            <Route path="/mi-cuenta" element={<AccountPage />} />
            <Route path="/perfil" element={<AccountPage />} />
            <Route path="/pedido/:orderId" element={<OrderConfirmationPage />} />
            <Route path="/seguimiento" element={<OrderLookupPage />} />
            <Route path="/checkout/confirmar" element={<ConfirmCheckoutPage />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
