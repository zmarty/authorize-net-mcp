import z from "zod";

/**
 * Define input schemas using Zod for validation and JSON schema generation.
 * These schemas will be transformed into the JSON schemas advertised to MCP clients.
 */
export const takePaymentSchema = z.object({
  amount: z.number().describe("Amount in USD to charge"),
  cardNumber: z.string().describe("Credit card number"),
  expirationDate: z.string().describe("Card expiration date (MMYY format)"),
  cardCode: z.string().describe("Card security code (CVV)")
});

export const createInvoiceSchema = z.object({
  amount: z.number().describe("Amount due for the invoice"),
  invoiceNumber: z.string().optional().describe("Invoice number (optional)"),
  description: z.string().optional().describe("Description (optional)")
});

/** Tools specification array to be returned in ListTools handler. */
export const toolsSpec = [
  {
    name: "takePayment",
    description: "Charge a credit card for a given amount using Authorize.net",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Amount in USD to charge" },
        cardNumber: { type: "string", description: "Credit card number" },
        expirationDate: { type: "string", description: "Expiration date (MMYY)" },
        cardCode: { type: "string", description: "Card security code (CVV)" }
      },
      required: ["amount", "cardNumber", "expirationDate", "cardCode"]
    },
    outputSchema: {
      type: "object",
      properties: {
        content: {
          type: "array",
          description: "Response message(s)",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              text: { type: "string" }
            },
            required: ["type", "text"]
          }
        },
        isError: { type: "boolean" }
      }
    }
  },
  {
    name: "createInvoice",
    description: "Generate a hosted payment page (invoice) for a customer to pay",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Amount due for the invoice" },
        invoiceNumber: { type: "string", description: "Invoice number (optional)" },
        description: { type: "string", description: "Description (optional)" }
      },
      required: ["amount"]
    },
    outputSchema: {
      type: "object",
      properties: {
        content: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              text: { type: "string" }
            },
            required: ["type", "text"]
          }
        },
        isError: { type: "boolean" }
      }
    }
  }
];
