import { useCallback, useEffect, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowPath } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Select, Table, Text } from "@medusajs/ui"

type Subscription = {
  id: string
  customer_email: string | null
  customer_id: string
  quantity: number
  status: "pending_card" | "active" | "paused" | "past_due" | "cancelled"
  frequency_days: number
  discount_percent: number
  next_billing_date: string | null
  failed_attempts: number
  has_card: boolean
  card: string | null
  welcome_gift_given: boolean
  reminder_sent_for: string | null
  terms_accepted_at: string | null
  shipping_address: { address_1?: string; city?: string } | null
}

type Cycle = {
  id: string
  period_key: string
  status: "reserved" | "charged_pending_order" | "completed" | "failed"
  attempt: number
  amount: number | null
  order_id: string | null
  error: string | null
}

const STATUS_COLOR: Record<Subscription["status"], "green" | "orange" | "red" | "grey" | "blue"> = {
  active: "green",
  paused: "orange",
  past_due: "red",
  pending_card: "blue",
  cancelled: "grey",
}

const STATUS_LABEL: Record<Subscription["status"], string> = {
  active: "Activa",
  paused: "Pausada",
  past_due: "Vencida (past_due)",
  pending_card: "Sin tarjeta",
  cancelled: "Cancelada",
}

const CYCLE_COLOR: Record<Cycle["status"], "green" | "orange" | "red" | "grey"> = {
  completed: "green",
  failed: "red",
  charged_pending_order: "orange",
  reserved: "grey",
}

const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })

async function api<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "include" })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json()
}

const CycleList = ({ subscriptionId }: { subscriptionId: string }) => {
  const [cycles, setCycles] = useState<Cycle[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api<{ cycles: Cycle[] }>(`/admin/subscriptions/${subscriptionId}`)
      .then((d) => setCycles(d.cycles))
      .catch(() => setError(true))
  }, [subscriptionId])

  if (error) return <Text className="text-ui-fg-error">No se pudo cargar el historial.</Text>
  if (!cycles) return <Text className="text-ui-fg-subtle">Cargando…</Text>
  if (!cycles.length) return <Text className="text-ui-fg-subtle">Sin ciclos todavía.</Text>

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Día de cobro</Table.HeaderCell>
          <Table.HeaderCell>Intento</Table.HeaderCell>
          <Table.HeaderCell>Estado</Table.HeaderCell>
          <Table.HeaderCell>Monto</Table.HeaderCell>
          <Table.HeaderCell>Pedido</Table.HeaderCell>
          <Table.HeaderCell>Detalle</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {cycles.map((c) => (
          <Table.Row key={c.id}>
            <Table.Cell>{c.period_key}</Table.Cell>
            <Table.Cell>{c.attempt}</Table.Cell>
            <Table.Cell>
              <Badge color={CYCLE_COLOR[c.status]} size="2xsmall">
                {c.status === "charged_pending_order" ? "cobrado sin pedido" : c.status}
              </Badge>
            </Table.Cell>
            <Table.Cell>{c.amount != null ? clp.format(c.amount) : "—"}</Table.Cell>
            <Table.Cell>
              {c.order_id ? <a className="text-ui-fg-interactive" href={`/app/orders/${c.order_id}`}>Ver pedido</a> : "—"}
            </Table.Cell>
            <Table.Cell className="max-w-[360px] truncate" title={c.error ?? ""}>
              {c.error ?? ""}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  )
}

const SubscriptionsPage = () => {
  const [status, setStatus] = useState<string>("all")
  const [rows, setRows] = useState<Subscription[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const selected = rows.find((r) => r.id === openId) ?? null

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const qs = new URLSearchParams({ limit: "100" })
      if (status !== "all") qs.set("status", status)
      const data = await api<{ subscriptions: Subscription[]; count: number }>(`/admin/subscriptions?${qs}`)
      setRows(data.subscriptions)
      setCount(data.count)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    load()
  }, [load])

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Suscripciones</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {count} en total. Vista de soporte: solo lectura.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={setStatus}>
            <Select.Trigger className="w-[200px]">
              <Select.Value placeholder="Estado" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">Todas</Select.Item>
              <Select.Item value="past_due">Vencidas (past_due)</Select.Item>
              <Select.Item value="active">Activas</Select.Item>
              <Select.Item value="paused">Pausadas</Select.Item>
              <Select.Item value="pending_card">Sin tarjeta</Select.Item>
              <Select.Item value="cancelled">Canceladas</Select.Item>
            </Select.Content>
          </Select>
          <Button variant="secondary" size="small" onClick={load} isLoading={loading}>
            <ArrowPath /> Actualizar
          </Button>
        </div>
      </div>

      {error ? (
        <div className="px-6 py-8">
          <Text className="text-ui-fg-error">No se pudieron cargar las suscripciones.</Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Cliente</Table.HeaderCell>
              <Table.HeaderCell>Estado</Table.HeaderCell>
              <Table.HeaderCell>Próximo cobro</Table.HeaderCell>
              <Table.HeaderCell>Tarjeta</Table.HeaderCell>
              <Table.HeaderCell>Rechazos</Table.HeaderCell>
              <Table.HeaderCell>Cant.</Table.HeaderCell>
              <Table.HeaderCell>Comuna</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((s) => (
              <Table.Row
                key={s.id}
                className={`cursor-pointer ${openId === s.id ? "bg-ui-bg-highlight" : ""}`}
                onClick={() => setOpenId(openId === s.id ? null : s.id)}
              >
                <Table.Cell>{s.customer_email ?? s.customer_id}</Table.Cell>
                <Table.Cell>
                  <Badge color={STATUS_COLOR[s.status]} size="2xsmall">
                    {STATUS_LABEL[s.status]}
                  </Badge>
                </Table.Cell>
                <Table.Cell>{s.next_billing_date ?? "—"}</Table.Cell>
                <Table.Cell>{s.card ?? (s.has_card ? "Sí" : "Sin tarjeta")}</Table.Cell>
                <Table.Cell>{s.failed_attempts}</Table.Cell>
                <Table.Cell>{s.quantity}</Table.Cell>
                <Table.Cell>{s.shipping_address?.city ?? "—"}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {!error && !rows.length && !loading && (
        <div className="px-6 py-6">
          <Text className="text-ui-fg-subtle">No hay suscripciones con este filtro.</Text>
        </div>
      )}

      {selected && (
        <div className="flex flex-col gap-3 bg-ui-bg-subtle px-6 py-4">
          <Heading level="h3">{selected.customer_email ?? selected.customer_id}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            ID {selected.id} · {selected.discount_percent}% de descuento · cada {selected.frequency_days} días · regalo de
            bienvenida {selected.welcome_gift_given ? "entregado" : "pendiente"}
            {selected.reminder_sent_for ? ` · aviso previo enviado para ${selected.reminder_sent_for}` : ""}
            {selected.terms_accepted_at ? ` · términos aceptados ${selected.terms_accepted_at.slice(0, 10)}` : ""}
          </Text>
          <CycleList key={selected.id} subscriptionId={selected.id} />
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Suscripciones",
  icon: ArrowPath,
})

export default SubscriptionsPage
