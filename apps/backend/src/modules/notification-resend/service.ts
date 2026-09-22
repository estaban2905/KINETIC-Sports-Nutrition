import { AbstractNotificationProviderService } from "@medusajs/framework/utils"
import type {
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import { Resend } from "resend"

type ResendOptions = {
  apiKey: string
  fromEmail: string
}

class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "resend"

  protected options_: ResendOptions
  protected client_: Resend

  constructor(_cradle: Record<string, unknown>, options: ResendOptions) {
    super()
    this.options_ = options
    this.client_ = new Resend(options.apiKey)
  }

  static validateOptions(options: Record<string, unknown>) {
    if (!options.apiKey) {
      throw new Error("Resend: apiKey es obligatorio en las opciones del provider.")
    }
    if (!options.fromEmail) {
      throw new Error("Resend: fromEmail es obligatorio en las opciones del provider.")
    }
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const { data, error } = await this.client_.emails.send({
      from: notification.from || this.options_.fromEmail,
      to: notification.to,
      subject: notification.content?.subject ?? "Notificación de KINETIC Sports Nutrition",
      html: notification.content?.html ?? notification.content?.text ?? "",
    })

    if (error) {
      throw new Error(`Resend no pudo enviar el email: ${error.message}`)
    }

    return { id: data?.id }
  }
}

export default ResendNotificationProviderService
