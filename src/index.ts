import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { handleTakePayment, handleCreateInvoice } from "./handlers/authorizeNetHandlers.js";
import { z } from "zod";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

// Validate environment variables at startup
if (!process.env.AUTHORIZE_NET_API_LOGIN_ID || !process.env.AUTHORIZE_NET_TRANSACTION_KEY) {
  process.stderr.write('Error: Authorize.net credentials not set in environment variables\n');
  process.exit(1);
}

// Initialize the MCP server with metadata
const server = new McpServer({
  name: "authorize-net-mcp", 
  version: "1.0.0"
});

// Register the takePayment tool
server.tool(
  "takePayment",
  "Charge a credit card for a given amount using Authorize.net",
  {
    amount: z.number().describe("Amount in USD to charge"),
    cardNumber: z.string().describe("Credit card number"),
    expirationDate: z.string().describe("Card expiration date (MMYY format)"),
    cardCode: z.string().describe("Card security code (CVV)")
  },
  async (args, extra) => {
    return await handleTakePayment(args);
  }
);

// Register the createInvoice tool
server.tool(
  "createInvoice",
  "Generate a hosted payment page (invoice) for a customer to pay",
  {
    amount: z.number().describe("Amount due for the invoice"),
    invoiceNumber: z.string().optional().describe("Invoice number (optional)"),
    description: z.string().optional().describe("Description (optional)")
  },
  async (args, extra) => {
    return await handleCreateInvoice(args);
  }
);

// Start the server using STDIO transport (so it can communicate with an MCP host)
const transport = new StdioServerTransport();
await server.connect(transport);
