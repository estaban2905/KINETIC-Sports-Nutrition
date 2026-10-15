import { MedusaService } from "@medusajs/framework/utils"
import InvoiceDocument from "./models/invoice-document"

class InvoicingModuleService extends MedusaService({
  InvoiceDocument,
}) {}

export default InvoicingModuleService
