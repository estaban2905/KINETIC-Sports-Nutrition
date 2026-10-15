import React, { useState } from 'react';
import { useSearchParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package,
  Repeat,
  MapPin,
  HelpCircle,
  LogOut,
  Truck,
  CheckCircle2,
  ExternalLink,
  Zap,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Edit2,
  Gift,
  MessageCircle,
  Save,
  Check,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ENABLE_ACCOUNTS, ENABLE_SUBSCRIPTIONS } from '../lib/features';
import { ComunaAutocomplete } from '../components/ComunaAutocomplete';
import { listComunas } from '../lib/medusa';
import { validateContactForm } from '../lib/checkoutValidation';
import { validateProfileForm, splitName, describeAuthError } from '../lib/accountValidation';
import {
  CHILEXPRESS_TRACKING_URL,
  CUSTOMER_STATUS_COPY,
  PROGRESS_STEPS,
  isStepComplete,
  progressStepIndex,
} from '../lib/orderStatus';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const FLAVOR_OPTIONS = [
  { id: 'chocolate-suizo', name: 'Chocolate Suizo', hex: '#78350f' },
  { id: 'vainilla-bourbon', name: 'Vainilla Bourbon', hex: '#ca8a04' },
  { id: 'frutilla-silvestre', name: 'Frutilla Silvestre', hex: '#e11d48' },
  { id: 'cookies-cream', name: 'Cookies & Cream', hex: '#525252' },
];

const INPUT_CLASS =
  'w-full bg-neutral-800 border rounded-xl px-4 py-3 text-sm text-neutral-100 focus:outline-none focus:border-lime-400 transition-colors';

const TONE_CLASS = {
  done: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
  progress: 'bg-sky-500/10 text-sky-400 border border-sky-500/30',
  warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
  canceled: 'bg-red-500/10 text-red-400 border border-red-500/30',
} as const;

const EMPTY_ADDRESS_FORM = { street: '', streetNumber: '', apartment: '', city: '', province: 'Región Metropolitana' };

export const AccountPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab') || 'orders';
  // La pestaña de membresía no existe mientras no haya cobro recurrente.
  const currentTab = requestedTab === 'membership' && !ENABLE_SUBSCRIPTIONS ? 'orders' : requestedTab;
  const navigate = useNavigate();

  const {
    user,
    initializing,
    orders,
    ordersStatus,
    refreshOrders,
    addresses,
    createAddress,
    deleteAddress,
    isAuthenticated,
    openAuthModal,
    logout,
    updateProfile,
    changeMembershipFlavor,
    pauseMembership,
    resumeMembership,
    cancelMembership,
    subscribeMembership,
  } = useAuth();

  // Profile form state
  const [formData, setFormData] = useState({
    name: user?.name || '',
    rut: user?.rut || '',
    phone: user?.phone || '',
  });
  const [profileErrors, setProfileErrors] = useState<{ name?: string; rut?: string; phone?: string }>({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Address form state
  const [comunas, setComunas] = useState<string[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);
  const [addressErrors, setAddressErrors] = useState<Record<string, string | undefined>>({});
  const [addressSaving, setAddressSaving] = useState(false);

  // Flavor modal state
  const [isChangingFlavor, setIsChangingFlavor] = useState(false);
  const [selectedNewFlavor, setSelectedNewFlavor] = useState(
    user?.membership?.flavorId || FLAVOR_OPTIONS[0].id
  );

  // Notification / Toast state
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  React.useEffect(() => {
    if (currentTab === 'addresses') listComunas().then(setComunas);
  }, [currentTab]);

  // Cuando el perfil llega (o cambia) desde el servidor, el formulario lo refleja.
  React.useEffect(() => {
    if (user) setFormData({ name: user.name, rut: user.rut, phone: user.phone });
  }, [user?.id, user?.name, user?.rut, user?.phone]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateProfileForm(formData);
    setProfileErrors(found);
    if (Object.keys(found).length) return;

    setProfileSaving(true);
    try {
      await updateProfile(formData);
      setSaveSuccess(true);
      showNotice('Tus datos fueron actualizados.');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      showNotice(describeAuthError(err));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    // Se reutiliza la validación del checkout; solo importan calle, número y comuna.
    const found = validateContactForm(
      {
        name: 'Nombre Apellido',
        email: user.email,
        phone: '+56 9 1234 5678',
        street: addressForm.street,
        streetNumber: addressForm.streetNumber,
        apartment: addressForm.apartment,
        city: addressForm.city,
      },
      comunas
    );
    const relevant = { street: found.street, streetNumber: found.streetNumber, city: found.city };
    setAddressErrors(relevant);
    if (Object.values(relevant).some(Boolean)) return;

    setAddressSaving(true);
    try {
      const { first_name, last_name } = splitName(user.name);
      await createAddress({
        first_name,
        last_name: last_name || first_name,
        address_1: `${addressForm.street.trim()} ${addressForm.streetNumber.trim()}`,
        address_2: addressForm.apartment.trim() || undefined,
        city: addressForm.city.trim(),
        province: addressForm.province.trim() || undefined,
        phone: user.phone || undefined,
        country_code: 'cl',
        is_default_shipping: addresses.length === 0,
      });
      setAddressForm(EMPTY_ADDRESS_FORM);
      setShowAddressForm(false);
      showNotice('Dirección guardada.');
    } catch (err) {
      showNotice(describeAuthError(err));
    } finally {
      setAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await deleteAddress(id);
      showNotice('Dirección eliminada.');
    } catch (err) {
      showNotice(describeAuthError(err));
    }
  };

  const handleConfirmFlavorChange = () => {
    const chosen = FLAVOR_OPTIONS.find((f) => f.id === selectedNewFlavor);
    if (chosen) {
      changeMembershipFlavor(chosen.id, chosen.name);
      setIsChangingFlavor(false);
      showNotice(`Sabor actualizado a ${chosen.name} para tu próximo envío.`);
    }
  };

  // Las cuentas están apagadas en producción hasta que se active el flag.
  if (!ENABLE_ACCOUNTS) return <Navigate to="/" replace />;

  if (initializing) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-lime-400 animate-spin" aria-label="Cargando" />
      </div>
    );
  }

  // If not authenticated, prompt to sign in
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center items-center px-4 py-20">
        <div className="max-w-md w-full text-center space-y-6 bg-neutral-900 border border-neutral-800 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-lime-400/10 border border-lime-400/30 flex items-center justify-center text-lime-400 mx-auto">
            <Zap className="w-8 h-8 fill-lime-400/20" />
          </div>

          <div>
            <h1 className="text-3xl font-black font-display uppercase tracking-tight text-white">
              KINETIC <span className="text-lime-400">CLUB</span>
            </h1>
            <p className="text-neutral-400 text-sm mt-2">
              Ingresa o crea tu cuenta para revisar el estado de tus envíos Chilexpress y consultar tu historial de pedidos.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={openAuthModal}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold font-display uppercase tracking-wider text-sm rounded-xl shadow-lg transition-all transform active:scale-95"
            >
              <span>Ingresar o crear cuenta</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <Link
              to="/"
              className="block text-center text-xs text-neutral-400 hover:text-white pt-2 transition-colors"
            >
              ← Volver a la tienda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-24 pt-8">
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {actionNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 max-w-md bg-neutral-900 border border-lime-400/60 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-lime-400 flex-shrink-0" />
            <span className="text-sm font-medium">{actionNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 hover:text-lime-400 transition-colors"
          >
            <span>← Volver a la Tienda</span>
          </Link>
          <span className="text-xs font-mono uppercase tracking-widest text-neutral-500">
            KINETIC Portal Atleta
          </span>
        </div>

        {/* Profile Banner */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 mb-8 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-neutral-700 shadow-md"
                />
                <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-lime-400 border-2 border-neutral-900" />
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-tight text-white">
                    {user.name}
                  </h1>
                  {user.membership && user.membership.status === 'active' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase font-mono bg-lime-400/10 text-lime-400 border border-lime-400/30">
                      <Zap className="w-3 h-3 fill-lime-400" />
                      Membresía Activa (15% OFF)
                    </span>
                  )}
                </div>
                <p className="text-neutral-400 text-sm mt-0.5">{user.email}</p>
                <div className="flex items-center gap-4 text-xs font-mono text-neutral-400 mt-2">
                  <span>RUT: {user.rut || 'Pendiente'}</span>
                  <span>•</span>
                  <span>Fono: {user.phone || 'Pendiente'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white border border-neutral-700/80 text-xs font-semibold transition-all"
              >
                <LogOut className="w-4 h-4 text-neutral-400" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 mb-8 overflow-x-auto no-scrollbar gap-2 sm:gap-4">
          <button
            onClick={() => handleTabChange('orders')}
            className={`flex items-center gap-2 py-3 px-4 font-display font-bold uppercase tracking-wider text-sm border-b-2 transition-all whitespace-nowrap ${
              currentTab === 'orders'
                ? 'border-lime-400 text-lime-400 bg-lime-400/5 rounded-t-xl'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Mis Pedidos & Envíos</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono ml-1">
              {ordersStatus === 'ready' ? orders.length : '…'}
            </span>
          </button>

          {ENABLE_SUBSCRIPTIONS && (
          <button
            onClick={() => handleTabChange('membership')}
            className={`flex items-center gap-2 py-3 px-4 font-display font-bold uppercase tracking-wider text-sm border-b-2 transition-all whitespace-nowrap ${
              currentTab === 'membership'
                ? 'border-lime-400 text-lime-400 bg-lime-400/5 rounded-t-xl'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Repeat className="w-4 h-4" />
            <span>Mi Membresía Mensual</span>
            {user.membership && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-lime-400/20 text-lime-400 font-mono font-bold ml-1">
                15% OFF
              </span>
            )}
          </button>
          )}

          <button
            onClick={() => handleTabChange('addresses')}
            className={`flex items-center gap-2 py-3 px-4 font-display font-bold uppercase tracking-wider text-sm border-b-2 transition-all whitespace-nowrap ${
              currentTab === 'addresses'
                ? 'border-lime-400 text-lime-400 bg-lime-400/5 rounded-t-xl'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Dirección & Datos</span>
          </button>

          <button
            onClick={() => handleTabChange('support')}
            className={`flex items-center gap-2 py-3 px-4 font-display font-bold uppercase tracking-wider text-sm border-b-2 transition-all whitespace-nowrap ${
              currentTab === 'support'
                ? 'border-lime-400 text-lime-400 bg-lime-400/5 rounded-t-xl'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Soporte & Ayuda</span>
          </button>
        </div>

        {/* Tab 1: Mis Pedidos & Envíos */}
        {currentTab === 'orders' && (
          <div className="space-y-6">
            {ordersStatus === 'loading' || ordersStatus === 'idle' ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 text-lime-400 animate-spin" aria-label="Cargando pedidos" />
              </div>
            ) : ordersStatus === 'error' ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10 text-center max-w-lg mx-auto">
                <p className="text-neutral-300 text-sm mb-4">No pudimos cargar tus pedidos.</p>
                <button
                  type="button"
                  onClick={refreshOrders}
                  className="px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold font-display uppercase tracking-wider text-xs"
                >
                  Reintentar
                </button>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center max-w-lg mx-auto">
                <Package className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold font-display uppercase text-white">
                  Aún no tienes pedidos registrados
                </h3>
                <p className="text-neutral-400 text-sm mt-1 mb-6">
                  Descubre nuestra proteína aislada CFM y recibe despacho prioritario en todo Chile.
                </p>
                <Link
                  to="/#productos"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-lime-400 text-neutral-950 font-bold font-display uppercase tracking-wider text-sm hover:bg-lime-300 transition-colors shadow-lg"
                >
                  <span>Explorar Productos</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              orders.map((order) => {
                const statusCopy = CUSTOMER_STATUS_COPY[order.status];
                const stepIndex = progressStepIndex(order.status);

                return (
                  <div
                    key={order.id}
                    className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6"
                  >
                    {/* Order Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-800 gap-4">
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xl font-black font-display uppercase tracking-wide text-white">
                            Pedido #{order.displayId}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase ${TONE_CLASS[statusCopy.tone]}`}
                          >
                            {statusCopy.title}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-1 font-mono">
                          Realizado el{' '}
                          {new Date(order.createdAt).toLocaleDateString('es-CL', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-xs text-neutral-400 block uppercase font-mono">Total</span>
                        <span className="text-2xl font-black font-display text-lime-400">
                          {currencyFormatter.format(order.total)}
                        </span>
                      </div>
                    </div>

                    {/* Estado del envío */}
                    <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 sm:p-6">
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Truck className="w-5 h-5 text-lime-400" />
                          <span className="text-sm font-bold uppercase tracking-wider text-neutral-200">
                            Estado del envío
                          </span>
                        </div>
                        {order.trackingCodes.length > 0 && (
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-mono text-neutral-400">
                              N° de OT: <strong className="text-white">{order.trackingCodes.join(', ')}</strong>
                            </span>
                            <a
                              href={CHILEXPRESS_TRACKING_URL}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-lime-400 text-xs font-semibold border border-neutral-700 transition-colors"
                            >
                              <span>Rastrear en Chilexpress</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mb-5">{statusCopy.description}</p>

                      {stepIndex !== null && (
                        <ol className="grid grid-cols-1 sm:grid-cols-5 gap-4 sm:gap-2">
                          {PROGRESS_STEPS.map((label, i) => {
                            const complete = isStepComplete(i, order.status);
                            const current = !complete && i === stepIndex;
                            return (
                              <li key={label} className="flex sm:flex-col items-center gap-3 sm:gap-2 sm:text-center">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md ${
                                    complete
                                      ? 'bg-lime-400 text-neutral-950'
                                      : current
                                      ? 'bg-sky-400 text-neutral-950 animate-pulse'
                                      : 'bg-neutral-800 text-neutral-500'
                                  }`}
                                >
                                  {complete ? <Check className="w-4 h-4 stroke-[3]" /> : i + 1}
                                </div>
                                <p
                                  className={`text-xs font-bold uppercase ${
                                    complete ? 'text-white' : current ? 'text-sky-400' : 'text-neutral-500'
                                  }`}
                                >
                                  {label}
                                </p>
                              </li>
                            );
                          })}
                        </ol>
                      )}
                    </div>

                    {/* Products in this order */}
                    <div className="space-y-3">
                      <span className="text-xs uppercase font-mono tracking-wider text-neutral-400 block">
                        Detalle de Productos
                      </span>
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3.5 bg-neutral-950/60 rounded-xl border border-neutral-800"
                        >
                          <div className="flex items-center gap-4">
                            {item.thumbnail ? (
                              <img
                                src={item.thumbnail}
                                alt={item.title}
                                className="w-12 h-12 object-cover rounded-lg border border-neutral-800"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg border border-neutral-800 bg-neutral-900 flex items-center justify-center">
                                <Package className="w-5 h-5 text-neutral-600" />
                              </div>
                            )}
                            <div>
                              <h4 className="text-sm font-bold text-neutral-100">{item.title}</h4>
                              <p className="text-xs text-neutral-400 font-mono">
                                {item.variantTitle} {item.variantTitle && '•'} Cantidad: {item.quantity}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-bold font-mono text-neutral-200">
                            {currencyFormatter.format(item.unitPrice * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {order.shippingAddress && (
                      <div className="text-xs text-neutral-400 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-lime-400" />
                        <span>
                          Destino: {order.shippingAddress.address_1}, {order.shippingAddress.city}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Mi Membresía Mensual */}
        {ENABLE_SUBSCRIPTIONS && currentTab === 'membership' && (
          <div className="space-y-8">
            {user.membership ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-lime-400/10 rounded-full blur-3xl pointer-events-none" />

                {/* Membership Top Status Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-800 gap-4 relative z-10">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-2xl font-black font-display uppercase tracking-wide text-white">
                        Membresía KINETIC Club
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase ${
                          user.membership.status === 'active'
                            ? 'bg-lime-400/20 text-lime-400 border border-lime-400/30'
                            : user.membership.status === 'paused'
                            ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                            : 'bg-red-400/20 text-red-400 border border-red-400/30'
                        }`}
                      >
                        {user.membership.status === 'active'
                          ? '● Activa (Despacho Automático)'
                          : user.membership.status === 'paused'
                          ? '❚❚ Pausada Temporalmente'
                          : 'Cancelada'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">
                      Ahorro continuo del 15% en cada entrega mensual con despacho prioritario.
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs text-neutral-400 block uppercase font-mono">
                      Cuota Mensual
                    </span>
                    <div className="flex items-baseline sm:justify-end gap-2">
                      <span className="text-sm line-through text-neutral-500 font-mono">
                        {currencyFormatter.format(user.membership.originalPrice)}
                      </span>
                      <span className="text-2xl font-black font-display text-lime-400">
                        {currencyFormatter.format(user.membership.price)} / mes
                      </span>
                    </div>
                  </div>
                </div>

                {/* Current Delivery & Flavor Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-neutral-800 relative z-10">
                  {/* Next Delivery */}
                  <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800">
                    <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 uppercase mb-2">
                      <Calendar className="w-4 h-4 text-lime-400" />
                      <span>Próximo Cobro & Envío</span>
                    </div>
                    <p className="text-xl font-black font-display text-white">
                      {user.membership.nextBillingDate}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      Estimado de entrega en domicilio:{' '}
                      <strong className="text-neutral-200">{user.membership.nextDeliveryEstimate}</strong>
                    </p>
                  </div>

                  {/* Flavor Selected */}
                  <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-neutral-400 uppercase">
                          Sabor Seleccionado
                        </span>
                        <span className="text-[10px] bg-neutral-800 px-2 py-0.5 rounded text-neutral-300 font-mono">
                          Editable
                        </span>
                      </div>
                      <p className="text-xl font-black font-display text-white">
                        {user.membership.flavorName}
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">
                        Puedes rotar sabores en cualquier momento antes de cada cobro.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsChangingFlavor(true)}
                      className="mt-4 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-lime-400 font-semibold text-xs border border-neutral-700 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Cambiar Sabor del Mes</span>
                    </button>
                  </div>

                  {/* Member Perks */}
                  <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 space-y-2.5">
                    <span className="text-xs font-mono text-neutral-400 uppercase block mb-1">
                      Beneficios Incluidos
                    </span>
                    <div className="flex items-center gap-2 text-xs text-neutral-300">
                      <Check className="w-3.5 h-3.5 text-lime-400 flex-shrink-0" />
                      <span>15% OFF garantizado en cada pote</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-300">
                      <Check className="w-3.5 h-3.5 text-lime-400 flex-shrink-0" />
                      <span>Despacho con Chilexpress y seguimiento</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-300">
                      <Gift className="w-3.5 h-3.5 text-lime-400 flex-shrink-0" />
                      <span>Shaker de Acero KINETIC en tu 1er mes</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-lime-400 flex-shrink-0" />
                      <span>Sin compromiso: pausa o cancela en 1 clic</span>
                    </div>
                  </div>
                </div>

                {/* Self-service management buttons */}
                <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
                  <div className="text-xs text-neutral-400 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-neutral-500" />
                    <span>Método de pago: {user.membership.paymentMethod}</span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {user.membership.status === 'active' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            showNotice('¡Genial! Hemos programado el despacho prioritario para las próximas 24 horas.');
                          }}
                          className="px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-xs uppercase font-display tracking-wider transition-all shadow-md"
                        >
                          Adelantar Envío Ahora
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            pauseMembership();
                            showNotice('Membresía pausada por 30 días. No se realizarán cobros.');
                          }}
                          className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-colors"
                        >
                          Pausar 1 Mes
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            cancelMembership();
                            showNotice('Tu membresía ha sido cancelada. Puedes reactivarla cuando desees.');
                          }}
                          className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-red-500/10 text-neutral-400 hover:text-red-400 text-xs font-semibold border border-neutral-800 transition-colors"
                        >
                          Cancelar Membresía
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          resumeMembership();
                          showNotice('¡Membresía reactivada con éxito! Bienvenido de nuevo a KINETIC Club.');
                        }}
                        className="px-6 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-xs uppercase font-display tracking-wider transition-all shadow-lg"
                      >
                        Reanudar mi Membresía
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* No Membership banner */
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-lime-400/10 border border-lime-400/30 flex items-center justify-center text-lime-400 mx-auto">
                  <Repeat className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-tight text-white">
                    Suscríbete a KINETIC Club y <span className="text-lime-400">Ahorra 15%</span>
                  </h3>
                  <p className="text-neutral-400 text-sm mt-2 max-w-md mx-auto">
                    Recibe tu tarro de PROTEIN X CFM cada mes en la puerta de tu casa. Nunca te quedes sin proteína,
                    con despacho por Chilexpress y Shaker de regalo en tu primer pedido.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-lg mx-auto">
                  <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                    <span className="text-lime-400 font-bold text-lg font-display block">15% OFF</span>
                    <span className="text-xs text-neutral-400">$34.390 en vez de $42.990</span>
                  </div>
                  <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                    <span className="text-lime-400 font-bold text-lg font-display block">Chilexpress</span>
                    <span className="text-xs text-neutral-400">Despacho a todo Chile con seguimiento</span>
                  </div>
                  <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                    <span className="text-lime-400 font-bold text-lg font-display block">1-Click</span>
                    <span className="text-xs text-neutral-400">Cancela o pausa sin preguntas</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    subscribeMembership('chocolate-suizo', 'Chocolate Suizo');
                    showNotice('¡Membresía KINETIC activada! Te enviaremos tu primer pedido con Shaker de regalo.');
                  }}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold font-display uppercase tracking-wider text-sm transition-all shadow-xl transform active:scale-95"
                >
                  <Zap className="w-4 h-4 fill-neutral-950" />
                  <span>Activar Membresía Mensual ($34.390/mes)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Dirección & Datos Personales */}
        {currentTab === 'addresses' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl">
              <div className="mb-6">
                <h2 className="text-2xl font-black font-display uppercase tracking-tight text-white">
                  Mis datos
                </h2>
                <p className="text-neutral-400 text-xs sm:text-sm mt-1">
                  Se usan para precargar tu compra y emitir tu boleta electrónica.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4" noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300 block mb-1.5">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      aria-invalid={!!profileErrors.name}
                      className={`${INPUT_CLASS} ${profileErrors.name ? 'border-red-500/70' : 'border-neutral-700'}`}
                    />
                    {profileErrors.name && <p className="text-xs text-red-400 mt-1.5">{profileErrors.name}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300 block mb-1.5">
                      RUT (Para Boleta SII)
                    </label>
                    <input
                      type="text"
                      placeholder="12.345.678-9"
                      value={formData.rut}
                      onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                      aria-invalid={!!profileErrors.rut}
                      className={`${INPUT_CLASS} ${profileErrors.rut ? 'border-red-500/70' : 'border-neutral-700'}`}
                    />
                    {profileErrors.rut && <p className="text-xs text-red-400 mt-1.5">{profileErrors.rut}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300 block mb-1.5">
                    Teléfono Móvil (Para que Chilexpress te llame)
                  </label>
                  <input
                    type="tel"
                    placeholder="+56 9 1234 5678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    aria-invalid={!!profileErrors.phone}
                    className={`${INPUT_CLASS} ${profileErrors.phone ? 'border-red-500/70' : 'border-neutral-700'}`}
                  />
                  {profileErrors.phone && <p className="text-xs text-red-400 mt-1.5">{profileErrors.phone}</p>}
                </div>

                <button
                  type="submit"
                  disabled={profileSaving}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold font-display uppercase tracking-wider text-sm transition-all shadow-lg disabled:opacity-50"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>¡Información Guardada!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{profileSaving ? 'Guardando...' : 'Guardar Información'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-black font-display uppercase tracking-tight text-white">
                    Direcciones de despacho
                  </h2>
                  <p className="text-neutral-400 text-xs sm:text-sm mt-1">
                    La primera que guardes se precarga al comprar.
                  </p>
                </div>
                {!showAddressForm && (
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(true)}
                    className="flex-shrink-0 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-lime-400 text-xs font-semibold border border-neutral-700 transition-colors"
                  >
                    + Agregar
                  </button>
                )}
              </div>

              {addresses.length === 0 && !showAddressForm && (
                <p className="text-sm text-neutral-400">Aún no tienes direcciones guardadas.</p>
              )}

              <ul className="space-y-3">
                {addresses.map((address) => (
                  <li
                    key={address.id}
                    className="flex items-start justify-between gap-4 p-4 bg-neutral-950/60 rounded-xl border border-neutral-800"
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-lime-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-neutral-200">
                        <p className="font-semibold">
                          {address.address_1}
                          {address.address_2 ? `, ${address.address_2}` : ''}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {[address.city, address.province].filter(Boolean).join(', ')}
                          {address.is_default_shipping && ' • Predeterminada'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(address.id)}
                      aria-label="Eliminar dirección"
                      className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>

              {showAddressForm && (
                <form onSubmit={handleAddAddress} className="space-y-4 mt-4" noValidate>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300 block mb-1.5">Calle</label>
                      <input
                        type="text"
                        value={addressForm.street}
                        onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                        className={`${INPUT_CLASS} ${addressErrors.street ? 'border-red-500/70' : 'border-neutral-700'}`}
                      />
                      {addressErrors.street && <p className="text-xs text-red-400 mt-1.5">{addressErrors.street}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300 block mb-1.5">Número</label>
                      <input
                        type="text"
                        value={addressForm.streetNumber}
                        onChange={(e) => setAddressForm({ ...addressForm, streetNumber: e.target.value })}
                        className={`${INPUT_CLASS} ${addressErrors.streetNumber ? 'border-red-500/70' : 'border-neutral-700'}`}
                      />
                      {addressErrors.streetNumber && <p className="text-xs text-red-400 mt-1.5">{addressErrors.streetNumber}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300 block mb-1.5">Depto / Casa (opcional)</label>
                    <input
                      type="text"
                      value={addressForm.apartment}
                      onChange={(e) => setAddressForm({ ...addressForm, apartment: e.target.value })}
                      className={`${INPUT_CLASS} border-neutral-700`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300 block mb-1.5">Comuna</label>
                      <ComunaAutocomplete
                        value={addressForm.city}
                        onChange={(city) => setAddressForm({ ...addressForm, city })}
                        onBlur={() => undefined}
                        comunas={comunas}
                        error={addressErrors.city}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300 block mb-1.5">Región</label>
                      <input
                        type="text"
                        value={addressForm.province}
                        onChange={(e) => setAddressForm({ ...addressForm, province: e.target.value })}
                        className={`${INPUT_CLASS} border-neutral-700`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddressForm(false);
                        setAddressErrors({});
                      }}
                      className="w-1/2 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold border border-neutral-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={addressSaving}
                      className="w-1/2 py-3 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold font-display uppercase tracking-wider text-xs transition-colors shadow-lg disabled:opacity-50"
                    >
                      {addressSaving ? 'Guardando...' : 'Guardar dirección'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Soporte & Ayuda */}
        {currentTab === 'support' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Quick WhatsApp Support Card */}
            <div className="bg-gradient-to-r from-emerald-950/60 to-neutral-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="space-y-2 text-center sm:text-left">
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5 justify-center sm:justify-start">
                  <MessageCircle className="w-4 h-4" />
                  Atención Inmediata
                </span>
                <h3 className="text-2xl font-black font-display uppercase text-white">
                  ¿Dudas con tu pedido?
                </h3>
                <p className="text-neutral-300 text-sm max-w-md">
                  Habla directamente con nuestro equipo de nutricionistas y despacho por WhatsApp. Respondemos en minutos.
                </p>
              </div>

              <a
                href={`https://wa.me/56912345678?text=Hola%20KINETIC%2C%20soy%20${encodeURIComponent(
                  user.name
                )}%2C%20tengo%20una%20consulta%20sobre%20mi%20pedido.`}
                target="_blank"
                rel="noreferrer"
                className="flex-shrink-0 flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold font-display uppercase tracking-wider text-sm transition-all shadow-lg"
              >
                <MessageCircle className="w-5 h-5 fill-neutral-950" />
                <span>Chatear por WhatsApp</span>
              </a>
            </div>

            {/* Support FAQs */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <h4 className="text-xl font-bold font-display uppercase tracking-wide text-white">
                Preguntas Frecuentes de Clientes
              </h4>

              <div className="space-y-4">
                {ENABLE_SUBSCRIPTIONS && (
                  <>
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                  <h5 className="text-sm font-bold text-neutral-200">
                    ¿Cómo funciona el cobro automático de la membresía?
                  </h5>
                  <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                    Cada 30 días, el sistema procesa el valor con 15% de descuento ($34.390 CLP) en tu tarjeta guardada
                    y automáticamente emite la orden de empaque y etiqueta de Chilexpress. No tienes que hacer nada.
                  </p>
                </div>

                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                  <h5 className="text-sm font-bold text-neutral-200">
                    ¿Puedo cambiar de sabor para la próxima entrega?
                  </h5>
                  <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                    ¡Sí! Desde la pestaña &quot;Mi Membresía Mensual&quot; pulsa &quot;Cambiar Sabor&quot; y elige entre
                    Chocolate Suizo, Vainilla Bourbon, Frutilla Silvestre o Cookies &amp; Cream en cualquier momento antes
                    de la fecha de corte.
                  </p>
                </div>
                  </>
                )}

                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                  <h5 className="text-sm font-bold text-neutral-200">
                    ¿Cuánto tarda en llegar mi pedido por Chilexpress?
                  </h5>
                  <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                    En Santiago entregamos en 24 a 48 horas hábiles. En regiones principales de 2 a 3 días hábiles.
                    Recibirás el código de seguimiento por correo y puedes verlo en tiempo real en la pestaña &quot;Mis Pedidos&quot;.
                  </p>
                </div>

                {ENABLE_SUBSCRIPTIONS && (
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                  <h5 className="text-sm font-bold text-neutral-200">
                    ¿Hay penalización por cancelar o pausar?
                  </h5>
                  <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                    Ninguna. En KINETIC creemos en la libertad de nuestros atletas. Puedes pausar 1 mes o cancelar tu
                    suscripción con 1 clic en cualquier momento sin letra chica ni cargos extra.
                  </p>
                </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: CAMBIAR SABOR DE MEMBRESÍA */}
      <AnimatePresence>
        {isChangingFlavor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChangingFlavor(false)}
              className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 space-y-6"
            >
              <div>
                <h3 className="text-xl font-black font-display uppercase tracking-tight text-white">
                  Elige el Sabor para tu Próximo Envío
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Tu próximo tarro de PROTEIN X CFM vendrá con el sabor que elijas aquí:
                </p>
              </div>

              <div className="space-y-2.5">
                {FLAVOR_OPTIONS.map((f) => {
                  const isSelected = selectedNewFlavor === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedNewFlavor(f.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-neutral-800 border-lime-400 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-4 h-4 rounded-full border border-neutral-700"
                          style={{ backgroundColor: f.hex }}
                        />
                        <span className="text-sm font-bold">{f.name}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-lime-400 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangingFlavor(false)}
                  className="w-1/2 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-semibold border border-neutral-700 transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmFlavorChange}
                  className="w-1/2 py-3 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold font-display uppercase tracking-wider text-xs transition-colors shadow-lg"
                >
                  Confirmar Sabor
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
