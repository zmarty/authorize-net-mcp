# authorize-net-mcp

This project is a **Model Context Protocol (MCP) server** that integrates with the [Authorize.net Node SDK](https://github.com/AuthorizeNet/sample-code-node) to provide two primary payment operations:

1. **`takePayment`** – Immediately charge a credit card (AUTH_CAPTURE).  
2. **`createInvoice`** – Generate a hosted payment page (invoice) for customers to pay online.

By exposing these operations as **MCP tools**, AI agents and other platforms using the [MCP Node SDK](https://github.com/modelcontextprotocol/typescript-sdk) can seamlessly call Authorize.net functionality without directly handling credit card or transaction logic themselves.

## What Is the Model Context Protocol (MCP)?

**Model Context Protocol (MCP)** is a specification and software development kit (SDK) that standardizes how AI models (e.g., large language models) communicate with external tools and services. MCP servers provide “tools” (methods) that an AI assistant or automation platform can discover and invoke programmatically. The goals of MCP include:

- **Discoverability**: Tools advertise their functionality and input/output schemas.  
- **Standardized I/O**: An AI model or any client can call a tool with a JSON-based schema and receive structured output, making automation workflows more reliable.  
- **Security & Compatibility**: Tools run in isolated processes and communicate via well-defined channels (e.g., stdio), which helps sandbox them from the AI model environment.

In this project, the **`takePayment`** and **`createInvoice`** methods are defined as MCP tools with input schemas (amount, card details, invoice info) and structured JSON output. This means any AI model or system that implements the MCP protocol can query this server to learn about available tools, then call them with the correct parameters to process payments via Authorize.net.

---

## How It Works

1. **MCP Node SDK** – Provides the framework for creating and running MCP servers in Node.js. We use classes like `Server`, `StdioServerTransport`, and schema definitions (`ListToolsRequestSchema`, `CallToolRequestSchema`) to register tools and respond to requests over stdio.  

2. **Authorize.net Node SDK** – Manages the low-level payment transaction calls. Inside our MCP tool handlers, we import the [`authorizenet`](https://www.npmjs.com/package/authorizenet) package and build requests (e.g., `CreateTransactionRequest`) with your Authorize.net credentials.  

3. **MCP Tools** – 
   - **`takePayment`**: Takes a credit card number, expiration date, CVV, and amount, then charges the card immediately.  
   - **`createInvoice`**: Prepares a transaction with no card data (the card data is collected via a hosted Authorize.net form) and returns a URL to which the customer can be directed to pay the invoice securely.  

When the server starts, it advertises these two tools (and their input schemas) to any connected MCP client. The client can then call them as needed.

---

## Project Structure

```bash
authorize-net-mcp/
├── package.json
├── tsconfig.json
├── src
│   ├── index.ts               # MCP server initialization
│   ├── models
│   │   └── authorizeNetModel.ts   # JSON schemas & tool specifications
│   └── handlers
│       └── authorizeNetHandlers.ts # Implementations of takePayment & createInvoice
└── README.md
```

- **`src/index.ts`**: Creates an MCP `Server`, registers tool handlers, and listens for requests via stdio.  
- **`src/models/authorizeNetModel.ts`**: Defines the input/output schemas for the two tools in JSON schema format (advertised to MCP clients when they call `ListTools`).  
- **`src/handlers/authorizeNetHandlers.ts`**: Contains the core logic that integrates with Authorize.net (charging cards, creating hosted invoices).  

---

## Getting Started

### 1. Installation

1. **Clone** or download this repository.  
2. **Install** dependencies:

   ```bash
   npm install
   ```

### 2. Set Environment Variables

You must provide your Authorize.net API credentials. For testing, you can use [Authorize.net Sandbox credentials](https://developer.authorize.net/hello_world/sandbox/). The server will look for:

- `AUTHORIZE_NET_API_LOGIN_ID`  
- `AUTHORIZE_NET_TRANSACTION_KEY`
- `AUTHORIZE_NET_SANDBOX` (optional, set to "true" for sandbox mode)

Set them before you build or start the server:

#### For Linux/Mac:
```bash
export AUTHORIZE_NET_API_LOGIN_ID="YOUR_SANDBOX_LOGIN_ID"
export AUTHORIZE_NET_TRANSACTION_KEY="YOUR_SANDBOX_TRANSACTION_KEY"
export AUTHORIZE_NET_SANDBOX="true"
```

#### For Windows (Command Prompt):
```cmd
set AUTHORIZE_NET_API_LOGIN_ID=YOUR_SANDBOX_LOGIN_ID
set AUTHORIZE_NET_TRANSACTION_KEY=YOUR_SANDBOX_TRANSACTION_KEY
set AUTHORIZE_NET_SANDBOX=true
```

#### For Windows (PowerShell):
```powershell
$env:AUTHORIZE_NET_API_LOGIN_ID="YOUR_SANDBOX_LOGIN_ID"
$env:AUTHORIZE_NET_TRANSACTION_KEY="YOUR_SANDBOX_TRANSACTION_KEY"
$env:AUTHORIZE_NET_SANDBOX="true"
```

#### For Claude Desktop:
You can configure this MCP server in the Claude Desktop settings by adding this to your `config.json`:

```json
{
  "mcpServers": {
    "authorize-net-mcp": {
      "command": "node",
      "args": ["C:\\git\\authorize-net-mcp\\build\\index.js"],
      "env": {
        "DEBUG": "*",
        "AUTHORIZE_NET_API_LOGIN_ID": "YOUR-LOGIN-ID-HERE",
        "AUTHORIZE_NET_TRANSACTION_KEY": "YOUR-KEY-HERE",
        "AUTHORIZE_NET_SANDBOX": "true"
      }
    }
  }
}
```

Make sure to replace the placeholder values with your actual Authorize.net credentials.

### 3. Build and Run

```bash
# Build the TypeScript
npm run build

# Start the MCP server (listening on stdio)
npm start
```

The server will run and wait for MCP requests. Typically, an AI assistant or automation tool that understands MCP will spawn or connect to this process and invoke the `takePayment` or `createInvoice` tools by name.

---

## Using the MCP Tools

Within an MCP-compatible environment (e.g., an AI chat that supports MCP), the workflow might be:

1. **List available tools** (the server returns `[takePayment, createInvoice]` plus their schemas).  
2. **Call** the `takePayment` tool with arguments:
   ```json
   {
     "amount": 19.99,
     "cardNumber": "4242424242424242",
     "expirationDate": "0825",
     "cardCode": "123"
   }
   ```
   - The server returns whether the payment was successful and includes transaction details in the response message.

3. **Call** the `createInvoice` tool with arguments:
   ```json
   {
     "amount": 50.0,
     "invoiceNumber": "INV-1001",
     "description": "T-shirt order"
   }
   ```
   - The server responds with a URL for the hosted payment page. Direct the customer to that link to enter card details securely.

---

## Notes on Production Usage

- **Security**: Never commit real API keys to source control. Use environment variables or secret management solutions in production.  
- **HTTPS**: In a real deployment, ensure you’re using HTTPS endpoints or secure tunnels for any inbound requests, if you plan to call it outside of an MCP host.  
- **Sandbox vs. Production**: Switch the base URL in the `authorizeNetHandlers.ts` file to production endpoints once you’re ready to go live.  

---

## Further Reading

- [MCP TypeScript SDK (GitHub)](https://github.com/modelcontextprotocol/typescript-sdk) – how to create and host Model Context Protocol tools.  
- [Authorize.net Sample Code (GitHub)](https://github.com/AuthorizeNet/sample-code-node) – examples of using the Authorize.net Node SDK.  
- [Authorize.net Developer Docs](https://developer.authorize.net/) – official docs on building transactions, creating hosted invoices, and managing production vs. sandbox credentials.

---

### License

This project is released under the MIT License. Please see the repository's [LICENSE](LICENSE) file for details.
