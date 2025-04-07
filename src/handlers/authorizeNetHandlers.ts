import pkg from "authorizenet";
const { APIContracts, APIControllers } = pkg;
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * IMPORTANT: Set your Authorize.net API credentials.
 * For security, load these from environment variables in production.
 */
const API_LOGIN_ID = process.env.AUTHORIZE_NET_API_LOGIN_ID || "YOUR_API_LOGIN_ID";
const TRANSACTION_KEY = process.env.AUTHORIZE_NET_TRANSACTION_KEY || "YOUR_TRANSACTION_KEY";

/**
 * Environment setting for Authorize.net API.
 * Set AUTHORIZE_NET_SANDBOX=true to use sandbox environment, otherwise production is used.
 */
const USE_SANDBOX = process.env.AUTHORIZE_NET_SANDBOX === "true";
// Define endpoints based on Authorize.net constants.js
const ENDPOINTS = {
  sandbox: "https://apitest.authorize.net/xml/v1/request.api",
  production: "https://api.authorize.net/xml/v1/request.api"
};
const API_ENVIRONMENT = USE_SANDBOX ? ENDPOINTS.sandbox : ENDPOINTS.production;

/**
 * Handler for charging a credit card immediately (AUTH_CAPTURE).
 * Expects: { amount, cardNumber, expirationDate, cardCode }
 */
export async function handleTakePayment(args: any): Promise<CallToolResult> {
  const { amount, cardNumber, expirationDate, cardCode } = args;

  // Minimal check if the fields are present
  if (amount == null || !cardNumber || !expirationDate || !cardCode) {
    return {
      isError: true,
      content: [{ type: "text", text: "Missing required payment information." }]
    };
  }

  // Merchant credentials
  const merchantAuth = new APIContracts.MerchantAuthenticationType();
  merchantAuth.setName(API_LOGIN_ID);
  merchantAuth.setTransactionKey(TRANSACTION_KEY);

  // Payment info
  const creditCard = new APIContracts.CreditCardType();
  creditCard.setCardNumber(cardNumber);
  creditCard.setExpirationDate(expirationDate);
  creditCard.setCardCode(cardCode);

  const paymentType = new APIContracts.PaymentType();
  paymentType.setCreditCard(creditCard);

  // Transaction request: AUTH_CAPTURE to immediately charge
  const transactionRequest = new APIContracts.TransactionRequestType();
  transactionRequest.setTransactionType(APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
  transactionRequest.setPayment(paymentType);
  transactionRequest.setAmount(amount);

  // CreateTransaction request
  const createRequest = new APIContracts.CreateTransactionRequest();
  createRequest.setMerchantAuthentication(merchantAuth);
  createRequest.setTransactionRequest(transactionRequest);

  const ctrl = new APIControllers.CreateTransactionController(createRequest.getJSON());
  
  // Set the environment (production by default, sandbox if configured)
  ctrl.setEnvironment(API_ENVIRONMENT);

  return new Promise((resolve) => {
    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new APIContracts.CreateTransactionResponse(apiResponse);

      let resultText;
      let isError = false;

      if (response && response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
        const transResp = response.getTransactionResponse();
        if (transResp && transResp.getMessages()) {
          // Successful transaction
          const transId = transResp.getTransId();
          const msg = transResp.getMessages().getMessage()[0].getDescription();
          resultText = `Payment successful. Transaction ID: ${transId}. ${msg}`;
        } else if (transResp && transResp.getErrors()) {
          // Rejected or declined
          const err = transResp.getErrors().getError()[0];
          resultText = `Payment failed: ${err.getErrorCode()} - ${err.getErrorText()}`;
          isError = true;
        } else {
          resultText = "Payment failed: Unknown response error.";
          isError = true;
        }
      } else {
        // API-level error or missing data
        if (response && response.getTransactionResponse() && response.getTransactionResponse().getErrors()) {
          const err = response.getTransactionResponse().getErrors().getError()[0];
          resultText = `Payment failed: ${err.getErrorCode()} - ${err.getErrorText()}`;
        } else if (response && response.getMessages() && response.getMessages().getMessage().length > 0) {
          const errMsg = response.getMessages().getMessage()[0];
          resultText = `Payment request error: ${errMsg.getCode()} - ${errMsg.getText()}`;
        } else {
          resultText = "Payment failed due to unknown error.";
        }
        isError = true;
      }

      resolve({ isError, content: [{ type: "text", text: resultText }] });
    });
  });
}

/**
 * Handler for creating a hosted invoice (Accept Hosted).
 * Expects: { amount, invoiceNumber?, description? }
 */
export async function handleCreateInvoice(args: any): Promise<CallToolResult> {
  const { amount, invoiceNumber, description } = args;
  if (amount == null) {
    return {
      isError: true,
      content: [{ type: "text", text: "Amount is required to create an invoice." }]
    };
  }

  // Merchant auth
  const merchantAuth = new APIContracts.MerchantAuthenticationType();
  merchantAuth.setName(API_LOGIN_ID);
  merchantAuth.setTransactionKey(TRANSACTION_KEY);

  // Transaction request for a hosted form
  const transactionRequest = new APIContracts.TransactionRequestType();
  transactionRequest.setTransactionType(APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
  transactionRequest.setAmount(amount);

  // Optional invoice details
  if (invoiceNumber || description) {
    const order = new APIContracts.OrderType();
    if (invoiceNumber) order.setInvoiceNumber(invoiceNumber);
    if (description) order.setDescription(description);
    transactionRequest.setOrder(order);
  }

  // Hosted payment settings
  const setting1 = new APIContracts.SettingType();
  setting1.setSettingName('hostedPaymentButtonOptions');
  setting1.setSettingValue('{\"text\": \"Pay Now\"}');

  const setting2 = new APIContracts.SettingType();
  setting2.setSettingName('hostedPaymentOrderOptions');
  setting2.setSettingValue('{\"show\": true}');
  
  // Add a return URL setting with the correct name and format
  const setting3 = new APIContracts.SettingType();
  setting3.setSettingName('hostedPaymentReturnOptions');
  setting3.setSettingValue('{\"url\": \"https://example.com/thankyou\", \"cancelUrl\": \"https://example.com/cancel\", \"showReceipt\": true}');

  const settingsList: any[] = [setting1, setting2, setting3];
  const hostingSettings = new APIContracts.ArrayOfSetting();
  hostingSettings.setSetting(settingsList);

  // Build the GetHostedPaymentPage request
  const tokenRequest = new APIContracts.GetHostedPaymentPageRequest();
  tokenRequest.setMerchantAuthentication(merchantAuth);
  tokenRequest.setTransactionRequest(transactionRequest);
  tokenRequest.setHostedPaymentSettings(hostingSettings);

  const ctrl = new APIControllers.GetHostedPaymentPageController(tokenRequest.getJSON());
  
  // Set the environment (production by default, sandbox if configured)
  ctrl.setEnvironment(API_ENVIRONMENT);

  return new Promise((resolve) => {
    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new APIContracts.GetHostedPaymentPageResponse(apiResponse);

      let resultText;
      let isError = false;

      if (response && response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
        const token = response.getToken();
        if (token) {
          // Use the appropriate URL based on environment setting
          const baseUrl = USE_SANDBOX ? "https://test.authorize.net" : "https://accept.authorize.net";
          const invoiceUrl = `${baseUrl}/payment/payment?token=${token}`;
          resultText = `Invoice created. Pay at: ${invoiceUrl}`;
        } else {
          resultText = "No token returned; invoice URL generation failed.";
          isError = true;
        }
      } else {
        if (response && response.getMessages().getMessage().length > 0) {
          const errMsg = response.getMessages().getMessage()[0];
          resultText = `Invoice creation error: ${errMsg.getCode()} - ${errMsg.getText()}`;
        } else {
          resultText = "Invoice creation failed due to unknown error.";
        }
        isError = true;
      }

      resolve({
        isError,
        content: [{ type: "text", text: resultText }]
      });
    });
  });
}
