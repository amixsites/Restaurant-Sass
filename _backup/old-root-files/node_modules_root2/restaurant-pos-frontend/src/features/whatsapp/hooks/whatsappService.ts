/**
 * WhatsApp Service Abstraction
 * 
 * This service provides the structural logic for integrating with the Meta WhatsApp Cloud API.
 * In a real production environment, you would use actual credentials from the .env file.
 * 
 * Flow:
 * 1. Customer places an order via QR.
 * 2. Order triggers a WhatsApp confirmation to the customer (if phone number collected).
 * 3. Daily summary can be sent to Restaurant Admin.
 */

export const sendWhatsAppMessage = async (phoneNumber: string, message: string) => {
  console.log(`[WhatsApp Mock] Sending message to ${phoneNumber}: ${message}`);
  
  // Real implementation would look like:
  /*
  const response = await fetch(`https://graph.facebook.com/v17.0/${process.env.VITE_WA_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VITE_WA_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phoneNumber,
      type: "text",
      text: { body: message }
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to send WhatsApp message');
  }
  return response.json();
  */
  
  return Promise.resolve({ success: true, mocked: true });
};

export const sendOrderConfirmation = async (phoneNumber: string, orderId: string, amount: number) => {
  const message = `Hello! Your order #${orderId.substring(0,6)} has been received. Total: ?${amount}. We'll notify you when it's ready.`;
  return sendWhatsAppMessage(phoneNumber, message);
};

export const sendOrderReady = async (phoneNumber: string, orderId: string) => {
  const message = `Your order #${orderId.substring(0,6)} is ready! Enjoy your meal.`;
  return sendWhatsAppMessage(phoneNumber, message);
};

