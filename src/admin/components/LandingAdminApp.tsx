import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Layers,
  Settings as SettingsIcon,
  Package,
  ShoppingBag,
  HelpCircle,
  Award,
  CheckCircle2,
  RefreshCw,
  Save,
  Tag,
  Truck,
  ArrowRight,
  X,
} from "lucide-react";
import { HeroContent, LandingSettings } from "../../modules/landing/types.ts";
import { Product, Order } from "../../modules/ecommerce/types.ts";

interface LandingAdminAppProps {
  onClose?: () => void;
}

export const LandingAdminApp: React.FC<LandingAdminAppProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<
    "hero" | "benefits" | "faq" | "banners" | "settings" | "inventory" | "orders"
  >("hero");

  const [hero, setHero] = useState<HeroContent | null>(null);
  const [settings, setSettings] = useState<LandingSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [heroRes, settingsRes, prodRes, ordersRes] = await Promise.all([
        fetch("/store/landing/hero").then((r) => r.json()),
        fetch("/store/landing/settings").then((r) => r.json()),
        fetch("/store/products").then((r) => r.json()),
        fetch("/admin/orders").then((r) => r.json()),
      ]);
      if (heroRes.hero) setHero(heroRes.hero);
      if (settingsRes.settings) setSettings(settingsRes.settings);
      if (prodRes.products) setProducts(prodRes.products);
      if (ordersRes.orders) setOrders(ordersRes.orders);
    } catch (err) {
      console.error("Error cargando datos de Medusa Admin:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHero = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hero) return;
    try {
      const res = await fetch("/admin/landing/hero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hero),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Error guardando Hero:", err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const res = await fetch("/admin/landing/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Error guardando Settings:", err);
    }
  };

  const handleUpdateStock = async (variantId: string, quantity: number) => {
    try {
      const res = await fetch(`/admin/inventory/${variantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      if (res.ok) {
        fetchInitialData();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Error actualizando inventario:", err);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order["status"], fulfillment: Order["fulfillment_status"]) => {
    try {
      const res = await fetch(`/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, fulfillment_status: fulfillment }),
      });
      if (res.ok) {
        fetchInitialData();
      }
    } catch (err) {
      console.error("Error actualizando pedido:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-md flex flex-col text-neutral-100 font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 px-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-lime-400 text-neutral-950 flex items-center justify-center font-bold text-sm">
            M2
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              Medusa Admin Dashboard
              <span className="text-[10px] px-2 py-0.5 rounded bg-lime-400/20 text-lime-400 border border-lime-400/30 font-mono">
                v2.x Engine
              </span>
            </h1>
            <p className="text-xs text-neutral-400">
              Gestión Comercial & Landing Content Module para KINETIC Nutrition
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-xs text-lime-400 flex items-center gap-1 bg-lime-400/10 px-3 py-1 rounded-full border border-lime-400/30 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" /> Cambios sincronizados con la API
            </span>
          )}
          <button
            onClick={fetchInitialData}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            title="Recargar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              title="Cerrar Admin"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <aside className="w-64 border-r border-neutral-800 bg-neutral-900/40 p-4 space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 px-3 py-1">
            Landing Content Module
          </div>
          <button
            onClick={() => setActiveTab("hero")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "hero"
                ? "bg-lime-400 text-neutral-950 font-bold"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <Sparkles className="w-4 h-4" /> Hero de la Landing
          </button>
          <button
            onClick={() => setActiveTab("benefits")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "benefits"
                ? "bg-lime-400 text-neutral-950 font-bold"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <Award className="w-4 h-4" /> Beneficios Destacados
          </button>
          <button
            onClick={() => setActiveTab("faq")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "faq"
                ? "bg-lime-400 text-neutral-950 font-bold"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <HelpCircle className="w-4 h-4" /> Preguntas Frecuentes
          </button>
          <button
            onClick={() => setActiveTab("banners")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "banners"
                ? "bg-lime-400 text-neutral-950 font-bold"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <Tag className="w-4 h-4" /> Banners Promocionales
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "settings"
                ? "bg-lime-400 text-neutral-950 font-bold"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <SettingsIcon className="w-4 h-4" /> Marca & Configuración SEO
          </button>

          <div className="pt-4 text-[11px] font-mono uppercase tracking-wider text-neutral-500 px-3 py-1">
            Medusa Core Commerce
          </div>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "inventory"
                ? "bg-lime-400 text-neutral-950 font-bold"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <Package className="w-4 h-4" /> Productos & Stock
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "orders"
                ? "bg-lime-400 text-neutral-950 font-bold"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Pedidos Recibidos ({orders.length})
          </button>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto">
          {/* TAB: HERO */}
          {activeTab === "hero" && hero && (
            <div className="space-y-6">
              <div className="border-b border-neutral-800 pb-4">
                <h2 className="text-lg font-bold text-white">Hero Content Entity</h2>
                <p className="text-xs text-neutral-400">
                  Modifica los titulares, insignias y llamados a la acción consumidos por <code className="text-lime-400">GET /store/landing/hero</code>
                </p>
              </div>

              <form onSubmit={handleSaveHero} className="space-y-4 max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Título Principal</label>
                    <input
                      type="text"
                      value={hero.title}
                      onChange={(e) => setHero({ ...hero, title: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Insignia (Badge)</label>
                    <input
                      type="text"
                      value={hero.badge}
                      onChange={(e) => setHero({ ...hero, badge: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Subtítulo Descriptivo</label>
                  <textarea
                    rows={3}
                    value={hero.subtitle}
                    onChange={(e) => setHero({ ...hero, subtitle: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">CTA Principal Texto</label>
                    <input
                      type="text"
                      value={hero.primary_cta_text}
                      onChange={(e) => setHero({ ...hero, primary_cta_text: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">CTA Secundario Texto</label>
                    <input
                      type="text"
                      value={hero.secondary_cta_text}
                      onChange={(e) => setHero({ ...hero, secondary_cta_text: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hero.active}
                      onChange={(e) => setHero({ ...hero, active: e.target.checked })}
                      className="rounded border-neutral-700 text-lime-400 focus:ring-lime-400"
                    />
                    Sección Activa en la Landing
                  </label>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-lime-400 text-neutral-950 font-bold text-xs flex items-center gap-2 hover:bg-lime-300 transition-colors shadow-lg"
                >
                  <Save className="w-4 h-4" /> Guardar Cambios en Medusa
                </button>
              </form>
            </div>
          )}

          {/* TAB: INVENTORY */}
          {activeTab === "inventory" && (
            <div className="space-y-6">
              <div className="border-b border-neutral-800 pb-4">
                <h2 className="text-lg font-bold text-white">Inventario de Productos & Variantes</h2>
                <p className="text-xs text-neutral-400">
                  Valida y modifica las existencias comerciales en tiempo real. La API protege contra sobreventas.
                </p>
              </div>

              {products.map((product) => (
                <div key={product.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        {product.title}
                        {product.metadata?.landing_featured && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-lime-400/10 text-lime-400 border border-lime-400/20">
                            Destacado (Orden #{product.metadata.landing_order as number})
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-neutral-400">{product.subtitle}</p>
                    </div>
                    <span className="text-xs font-mono text-neutral-400">
                      Handle: {product.handle}
                    </span>
                  </div>

                  <div className="divide-y divide-neutral-800 border-t border-neutral-800">
                    {product.variants.map((v) => (
                      <div key={v.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-white">{v.title}</div>
                          <div className="text-neutral-400 font-mono text-[11px]">
                            SKU: {v.sku} | Precio: ${v.price.toLocaleString("es-CL")} CLP
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              v.inventory_quantity === 0
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : v.inventory_quantity < 5
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-lime-400/20 text-lime-400 border border-lime-400/30"
                            }`}
                          >
                            {v.status === "in_stock" ? "EN STOCK" : v.status === "low_stock" ? "ÚLTIMAS UNIDADES" : "AGOTADO"}
                          </span>

                          <div className="flex items-center gap-2">
                            <label className="text-[11px] text-neutral-400">Stock:</label>
                            <input
                              type="number"
                              defaultValue={v.inventory_quantity}
                              onBlur={(e) => handleUpdateStock(v.id, parseInt(e.target.value) || 0)}
                              className="w-20 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-right text-xs text-white focus:border-lime-400 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB: ORDERS */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              <div className="border-b border-neutral-800 pb-4">
                <h2 className="text-lg font-bold text-white">Gestión de Pedidos</h2>
                <p className="text-xs text-neutral-400">
                  Consulte clientes, direcciones de entrega, montos y gestione el estado de fulfillment.
                </p>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-12 bg-neutral-900/50 rounded-xl border border-neutral-800 text-neutral-400 text-xs">
                  No hay pedidos registrados todavía. Realiza un checkout en la landing para ver la orden aquí en tiempo real.
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((o) => (
                    <div key={o.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-lime-400 text-sm">
                            #{o.display_id}
                          </span>
                          <span className="text-neutral-300 font-medium">{o.email}</span>
                          <span className="text-neutral-500 font-mono text-[11px]">
                            {new Date(o.created_at).toLocaleString("es-CL")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                            {o.payment_status.toUpperCase()}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                            {o.fulfillment_status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-neutral-200">
                            {o.shipping_address.first_name} {o.shipping_address.last_name} ({o.shipping_address.phone})
                          </div>
                          <div className="text-neutral-400 text-[11px]">
                            {o.shipping_address.address_1}, {o.shipping_address.city}, {o.shipping_address.province}
                          </div>
                          <div className="text-neutral-500 text-[11px]">
                            Método: {o.shipping_option?.name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-white">
                            ${o.total.toLocaleString("es-CL")} CLP
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            Subtotal: ${o.subtotal.toLocaleString("es-CL")} | Descuento: -${o.discount_total.toLocaleString("es-CL")}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="text-neutral-400 text-[11px]">
                          Items: {o.items.map((i) => `${i.quantity}x ${i.variant_title}`).join(", ")}
                        </div>
                        <div className="flex items-center gap-2">
                          {o.fulfillment_status === "not_fulfilled" && (
                            <button
                              onClick={() => handleUpdateOrderStatus(o.id, "completed", "shipped")}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-medium flex items-center gap-1"
                            >
                              <Truck className="w-3 h-3" /> Despachar Pedido
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === "settings" && settings && (
            <div className="space-y-6">
              <div className="border-b border-neutral-800 pb-4">
                <h2 className="text-lg font-bold text-white">Configuración de Marca & SEO</h2>
                <p className="text-xs text-neutral-400">
                  Endpoint público: <code className="text-lime-400">GET /store/landing/settings</code>. No expone credenciales privadas.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4 max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Nombre de la Marca</label>
                    <input
                      type="text"
                      value={settings.brand_name}
                      onChange={(e) => setSettings({ ...settings, brand_name: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">WhatsApp de Ventas</label>
                    <input
                      type="text"
                      value={settings.whatsapp_number}
                      onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Email de Contacto</label>
                    <input
                      type="email"
                      value={settings.contact_email}
                      onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Título SEO</label>
                    <input
                      type="text"
                      value={settings.seo_title}
                      onChange={(e) => setSettings({ ...settings, seo_title: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Descripción SEO (Meta)</label>
                  <textarea
                    rows={2}
                    value={settings.seo_description}
                    onChange={(e) => setSettings({ ...settings, seo_description: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-lime-400 text-neutral-950 font-bold text-xs flex items-center gap-2 hover:bg-lime-300 transition-colors shadow-lg"
                >
                  <Save className="w-4 h-4" /> Guardar Ajustes de Marca
                </button>
              </form>
            </div>
          )}

          {/* TAB: BENEFITS / FAQ / BANNERS PREVIEW */}
          {(activeTab === "benefits" || activeTab === "faq" || activeTab === "banners") && (
            <div className="space-y-4">
              <div className="border-b border-neutral-800 pb-4">
                <h2 className="text-lg font-bold text-white capitalize">{activeTab} Entity Management</h2>
                <p className="text-xs text-neutral-400">
                  Consumido directamente por los endpoints <code className="text-lime-400">GET /store/landing/{activeTab}</code>
                </p>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 text-xs text-neutral-300 space-y-3">
                <div className="flex items-center gap-2 text-lime-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" /> Entidad Administrable en Línea
                </div>
                <p>
                  Las entidades de <strong>{activeTab}</strong> se encuentran configuradas con ordenamiento por <code>sort_order</code>, banderas <code>active</code>, y filtros automáticos de fechas para banners.
                </p>
                <p className="text-neutral-400">
                  Los cambios realizados desde este panel de administración o mediante peticiones HTTP a <code>/admin/landing/{activeTab}</code> actualizan el estado de la Store API en tiempo real.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
