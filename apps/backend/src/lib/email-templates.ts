/**
 * HTML for the transactional emails (order placed / shipped / delivered).
 * Email clients ignore most modern CSS, so everything is table-based with
 * inline styles. Colors follow the storefront: near-black + lime.
 */

const BG = "#0a0a0a"
const CARD = "#171717"
const BORDER = "#262626"
const TEXT = "#e5e5e5"
const MUTED = "#a3a3a3"
const LIME = "#a3e635"

const FONT = "Arial, Helvetica, sans-serif"

const currency = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
})

export const formatCLP = (amount: number | null | undefined): string => currency.format(amount ?? 0)

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Public storefront URL (no trailing slash), or null when not configured. */
export function storefrontUrl(): string | null {
  const url = process.env.STOREFRONT_URL?.trim()
  return url ? url.replace(/\/+$/, "") : null
}

export const heading = (text: string): string =>
  `<h1 style="margin:0 0 12px;font-family:${FONT};font-size:26px;line-height:1.2;color:#ffffff;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(text)}</h1>`

/** `html` must already be escaped by the caller where it contains user data. */
export const paragraph = (html: string): string =>
  `<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.6;color:${TEXT};">${html}</p>`

export const strong = (text: string): string => `<strong style="color:#ffffff;">${escapeHtml(text)}</strong>`

export const link = (href: string, label: string): string =>
  `<a href="${escapeHtml(href)}" style="color:${LIME};text-decoration:underline;">${escapeHtml(label)}</a>`

export const button = (href: string, label: string): string => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 4px;">
    <tr><td style="background:${LIME};border-radius:8px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:14px;font-weight:bold;color:#0a0a0a;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`

/** Page shell: dark background, KINETIC wordmark, card with the content, footer. */
export function emailLayout(content: string, options: { preheader?: string } = {}): string {
  const siteUrl = storefrontUrl()
  const trackUrl = siteUrl ? `${siteUrl}/seguimiento` : null
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"></head>
<body style="margin:0;padding:0;background:${BG};">
  ${
    options.preheader
      ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BG};">${escapeHtml(options.preheader)}</div>`
      : ""
  }
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding:0 4px 18px;font-family:${FONT};font-size:22px;font-weight:bold;letter-spacing:3px;color:${LIME};">
          ${siteUrl ? `<a href="${escapeHtml(siteUrl)}" style="color:${LIME};text-decoration:none;">KINETIC</a>` : "KINETIC"}
          <span style="font-size:11px;letter-spacing:2px;color:${MUTED};font-weight:normal;"> SPORTS NUTRITION</span>
        </td></tr>
        <tr><td style="background:${CARD};border:1px solid ${BORDER};border-radius:14px;padding:28px 24px;">
          ${content}
        </td></tr>
        <tr><td style="padding:18px 4px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED};">
          ${
            trackUrl
              ? `Puedes seguir tu pedido en cualquier momento en ${link(trackUrl, "Seguimiento de pedido")} con tu número de pedido y tu correo.<br>`
              : "Puedes seguir tu pedido en cualquier momento con tu número de pedido y tu correo.<br>"
          }
          KINETIC Sports Nutrition
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

const trackButton = (): string => {
  const siteUrl = storefrontUrl()
  return siteUrl ? button(`${siteUrl}/seguimiento`, "Seguir mi pedido") : ""
}

export type OrderEmailItem = {
  product_title?: string | null
  variant_title?: string | null
  quantity?: number | null
  total?: number | null
  thumbnail?: string | null
}

export type OrderEmailData = {
  display_id: number
  total?: number | null
  item_subtotal?: number | null
  discount_total?: number | null
  shipping_total?: number | null
  items?: OrderEmailItem[]
  shipping_address?: { address_1?: string | null; address_2?: string | null; city?: string | null } | null
}

const summaryRow = (label: string, value: string, emphasize = false): string => `
  <tr>
    <td style="padding:5px 0;font-family:${FONT};font-size:${emphasize ? 17 : 14}px;color:${emphasize ? "#ffffff" : MUTED};${emphasize ? "font-weight:bold;" : ""}">${label}</td>
    <td align="right" style="padding:5px 0;font-family:${FONT};font-size:${emphasize ? 17 : 14}px;color:${emphasize ? LIME : TEXT};${emphasize ? "font-weight:bold;" : ""}">${value}</td>
  </tr>`

export function orderPlacedEmail(order: OrderEmailData): { subject: string; html: string } {
  const items = (order.items ?? [])
    .map((item) => {
      const variant =
        item.variant_title && item.variant_title !== "Único" ? ` · ${escapeHtml(item.variant_title)}` : ""
      // Only https images: http/localhost thumbnails are blocked or broken in mail clients.
      const image = item.thumbnail?.startsWith("https://")
        ? `<img src="${escapeHtml(item.thumbnail)}" width="56" height="56" alt="" style="display:block;border-radius:8px;border:1px solid ${BORDER};object-fit:cover;">`
        : ""
      return `
      <tr>
        ${image ? `<td width="68" valign="top" style="padding:10px 12px 10px 0;border-top:1px solid ${BORDER};">${image}</td>` : ""}
        <td valign="top" style="padding:10px 0;border-top:1px solid ${BORDER};font-family:${FONT};font-size:14px;color:${TEXT};">
          ${strong(item.product_title ?? "Producto")}<span style="color:${MUTED};">${variant}</span><br>
          <span style="color:${MUTED};font-size:13px;">Cantidad: ${item.quantity ?? 1}</span>
        </td>
        <td valign="top" align="right" style="padding:10px 0;border-top:1px solid ${BORDER};font-family:${FONT};font-size:14px;color:${TEXT};white-space:nowrap;">${formatCLP(item.total)}</td>
      </tr>`
    })
    .join("")

  const address = order.shipping_address
  const addressLine = address
    ? [address.address_1, address.address_2, address.city]
        .filter(Boolean)
        .map((part) => escapeHtml(String(part)))
        .join(", ")
    : ""
  const discount = order.discount_total ?? 0

  const html = emailLayout(
    `
    ${heading("¡Gracias por tu compra!")}
    ${paragraph(`Tu pedido ${strong(`#${order.display_id}`)} fue confirmado. Te avisaremos por correo cuando salga a despacho.`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 6px;">${items}</table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${BORDER};margin-top:4px;padding-top:6px;">
      ${summaryRow("Subtotal", formatCLP(order.item_subtotal))}
      ${discount > 0 ? summaryRow("Descuento", `-${formatCLP(discount)}`) : ""}
      ${summaryRow("Envío", formatCLP(order.shipping_total))}
      ${summaryRow("Total", formatCLP(order.total), true)}
    </table>
    ${
      addressLine
        ? `<p style="margin:18px 0 0;font-family:${FONT};font-size:13px;color:${MUTED};">Dirección de envío<br><span style="color:${TEXT};font-size:14px;">${addressLine}</span></p>`
        : ""
    }
    ${trackButton()}`,
    { preheader: `Pedido #${order.display_id} confirmado` }
  )

  return { subject: `Confirmación de tu pedido #${order.display_id} — KINETIC Sports Nutrition`, html }
}

export function shipmentEmail(args: {
  displayId: number
  trackingNumbers: string[]
  trackingPageUrl: string | null
}): { subject: string; html: string } {
  const numbers = args.trackingNumbers.map(escapeHtml).join(", ")
  const html = emailLayout(
    `
    ${heading("Tu pedido va en camino")}
    ${paragraph(`Tu pedido ${strong(`#${args.displayId}`)} fue enviado.`)}
    ${
      numbers
        ? `<div style="margin:6px 0 16px;padding:14px 16px;background:${BG};border:1px solid ${BORDER};border-radius:10px;font-family:${FONT};">
             <div style="font-size:12px;color:${MUTED};text-transform:uppercase;letter-spacing:1px;">N° de seguimiento</div>
             <div style="font-size:20px;font-weight:bold;color:${LIME};letter-spacing:1px;margin-top:4px;">${numbers}</div>
           </div>`
        : ""
    }
    ${
      args.trackingPageUrl && numbers
        ? paragraph(`Pega ese número en ${link(args.trackingPageUrl, "el sitio de Chilexpress")} para ver el detalle de tu envío.`)
        : ""
    }
    ${trackButton()}`,
    { preheader: `Tu pedido #${args.displayId} fue enviado` }
  )
  return { subject: `Tu pedido #${args.displayId} fue enviado — KINETIC Sports Nutrition`, html }
}

export function documentoEmail(args: {
  tipo: "boleta" | "factura"
  displayId: number
  folio: number
  ambiente: 0 | 1
}): { subject: string; html: string } {
  const label = args.tipo === "factura" ? "factura" : "boleta"
  const html = emailLayout(
    `
    ${heading(`Tu ${label} electrónica`)}
    ${paragraph(`Adjuntamos la ${label} electrónica N° ${strong(String(args.folio))} de tu pedido ${strong(`#${args.displayId}`)}.`)}
    ${
      args.ambiente === 0
        ? paragraph(`<span style="color:${MUTED};">Documento emitido en ambiente de certificación: no tiene validez tributaria.</span>`)
        : ""
    }
    ${trackButton()}`,
    { preheader: `${label[0].toUpperCase()}${label.slice(1)} N° ${args.folio} de tu pedido #${args.displayId}` }
  )
  return { subject: `Tu ${label} del pedido #${args.displayId} — KINETIC Sports Nutrition`, html }
}

export function deliveryEmail(args: {
  displayId: number
  certificateUrl: string | null
}): { subject: string; html: string } {
  const html = emailLayout(
    `
    ${heading("Tu pedido fue entregado")}
    ${paragraph(`Tu pedido ${strong(`#${args.displayId}`)} fue entregado. ¡Que lo disfrutes y a entrenar!`)}
    ${args.certificateUrl ? paragraph(link(args.certificateUrl, "Ver certificado de entrega")) : ""}
    ${trackButton()}`,
    { preheader: `Tu pedido #${args.displayId} fue entregado` }
  )
  return { subject: `Tu pedido #${args.displayId} fue entregado — KINETIC Sports Nutrition`, html }
}

export function passwordResetEmail(args: { resetUrl: string }): { subject: string; html: string } {
  const html = emailLayout(
    `
    ${heading("Restablece tu contraseña")}
    ${paragraph("Recibimos una solicitud para cambiar la contraseña de tu cuenta KINETIC. El enlace es válido por 15 minutos.")}
    ${button(args.resetUrl, "Crear nueva contraseña")}
    ${paragraph("Si tú no lo pediste, ignora este correo: tu contraseña actual sigue funcionando.")}`,
    { preheader: "Crea una nueva contraseña para tu cuenta KINETIC" }
  )
  return { subject: "Restablece tu contraseña — KINETIC Sports Nutrition", html }
}

export function welcomeEmail(args: { firstName?: string | null }): { subject: string; html: string } {
  const siteUrl = storefrontUrl()
  const name = args.firstName?.trim()
  const html = emailLayout(
    `
    ${heading(name ? `¡Bienvenido, ${name}!` : "¡Bienvenido a KINETIC!")}
    ${paragraph("Tu cuenta quedó creada. Desde ahora puedes ver el estado de tus pedidos, seguir tus envíos y comprar más rápido con tus datos guardados.")}
    ${siteUrl ? button(siteUrl, "Ir a la tienda") : ""}`,
    { preheader: "Tu cuenta KINETIC está lista" }
  )
  return { subject: "Bienvenido a KINETIC Sports Nutrition", html }
}

export function orderPaymentPendingEmail(order: { display_id: number; total?: number | null }): {
  subject: string
  html: string
} {
  const html = emailLayout(
    `
    ${heading("Recibimos tu pedido")}
    ${paragraph(`Tu pedido ${strong(`#${order.display_id}`)} por ${strong(formatCLP(order.total))} quedó registrado, pero todavía estamos esperando que se confirme tu pago.`)}
    ${paragraph("En cuanto lo recibamos te enviaremos la confirmación del pedido y tu boleta. Si ya pagaste, puede tardar unos minutos en reflejarse.")}
    ${trackButton()}`,
    { preheader: `Pedido #${order.display_id}: esperando la confirmación de tu pago` }
  )
  return { subject: `Recibimos tu pedido #${order.display_id}: esperando tu pago — KINETIC Sports Nutrition`, html }
}
