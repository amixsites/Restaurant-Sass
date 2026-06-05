/**
 * WhatsApp Utilities
 * 
 * Professional customer-facing WhatsApp message generation and utilities
 * for sending digital bills after restaurant visits.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BillDetails {
  /** Customer's full name */
  customerName: string;
  /** Restaurant name */
  restaurantName: string;
  /** Unique bill/invoice ID from database */
  billId: string;
  /** Total bill amount in currency units (e.g., ₹1250) */
  billAmount: number;
  /** Visit date in ISO format or Date object */
  visitDate: string | Date;
  /** Optional table number */
  tableNumber?: string | number;
  /** Optional custom message to append */
  customMessage?: string;
}

export interface WhatsAppLinkOptions {
  /** Phone number in international format (with country code, no + or spaces) */
  phoneNumber: string;
  /** Message to pre-fill in WhatsApp chat */
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// Get base URL from environment variable or fallback to production URL
const getBaseBillUrl = (): string => {
  // Try Vite environment variable first
  if (import.meta.env.VITE_PUBLIC_APP_URL) {
    return `${import.meta.env.VITE_PUBLIC_APP_URL}/bill`;
  }
  
  // Fallback to production URL
  return 'https://dineinflowd.vercel.app/bill';
};

const BASE_BILL_URL = getBaseBillUrl();

// ─────────────────────────────────────────────────────────────────────────────
// Core Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a customer-facing bill URL
 * 
 * @param billId - Unique bill/invoice ID from database
 * @returns Full URL to view the digital bill
 * 
 * @example
 * generateBillUrl('abc123')
 * // Returns: 'https://dineinflowd.vercel.app/bill/abc123'
 */
export function generateBillUrl(billId: string): string {
  if (!billId || typeof billId !== 'string') {
    throw new Error('Invalid billId: must be a non-empty string');
  }
  
  return `${BASE_BILL_URL}/${billId}`;
}

/**
 * Format currency amount with proper symbol and separators
 * 
 * @param amount - Numeric amount
 * @returns Formatted currency string (e.g., '₹1,250')
 */
function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Format date for display in WhatsApp message
 * 
 * @param date - ISO date string or Date object
 * @returns Formatted date string (e.g., '05 June 2026')
 */
function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided');
  }
  
  return dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Generate a professional WhatsApp message for customer bill
 * 
 * Creates a polished, customer-facing message with bill details and
 * a link to view the digital bill online.
 * 
 * @param details - Bill and customer details
 * @returns Formatted WhatsApp message text
 * 
 * @example
 * generateWhatsAppMessage({
 *   customerName: 'John Doe',
 *   restaurantName: 'DineFlow Restaurant',
 *   billId: 'abc123',
 *   billAmount: 1250,
 *   visitDate: '2026-06-05',
 *   tableNumber: 12
 * })
 */
export function generateWhatsAppMessage(details: BillDetails): string {
  const {
    customerName,
    restaurantName,
    billId,
    billAmount,
    visitDate,
    tableNumber,
    customMessage,
  } = details;

  // Validate required fields
  if (!customerName || !restaurantName || !billId || billAmount == null || !visitDate) {
    throw new Error('Missing required fields for WhatsApp message generation');
  }

  const billUrl = generateBillUrl(billId);
  const formattedAmount = formatCurrency(billAmount);
  const formattedDate = formatDate(visitDate);

  // Build the message
  let message = `🍽️ *Thank You for Dining with ${restaurantName}*\n\n`;
  message += `Dear ${customerName},\n\n`;
  message += `Thank you for visiting ${restaurantName}. We truly appreciate your patronage and hope you had a wonderful dining experience.\n\n`;
  message += `*Visit Details:*\n`;
  message += `• Date: ${formattedDate}\n`;
  
  if (tableNumber) {
    message += `• Table: ${tableNumber}\n`;
  }
  
  message += `• Bill Amount: ${formattedAmount}\n\n`;
  message += `*View Your Bill:*\n`;
  message += `🔗 ${billUrl}\n\n`;
  message += `For your convenience, your digital bill is available online and can be accessed anytime using the link above.\n\n`;
  
  if (customMessage) {
    message += `${customMessage}\n\n`;
  }
  
  message += `We look forward to welcoming you again soon.\n\n`;
  message += `*Warm Regards,*\n`;
  message += `${restaurantName} Team`;

  return message;
}

/**
 * Generate WhatsApp Click-to-Chat URL
 * 
 * Creates a wa.me URL that opens WhatsApp with a pre-filled message.
 * Works on both mobile and desktop.
 * 
 * @param options - Phone number and message
 * @returns WhatsApp Click-to-Chat URL
 * 
 * @example
 * generateWhatsAppLink({
 *   phoneNumber: '919876543210',
 *   message: 'Hello, here is your bill...'
 * })
 * // Returns: 'https://wa.me/919876543210?text=Hello%2C%20here%20is%20your%20bill...'
 */
export function generateWhatsAppLink(options: WhatsAppLinkOptions): string {
  const { phoneNumber, message } = options;

  if (!phoneNumber || !message) {
    throw new Error('Phone number and message are required');
  }

  // Remove any non-numeric characters from phone number
  const cleanPhone = phoneNumber.replace(/\D/g, '');

  if (cleanPhone.length < 10) {
    throw new Error('Invalid phone number: must be at least 10 digits');
  }

  // URL encode the message
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Complete Flow Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate complete WhatsApp link with bill message
 * 
 * Convenience function that combines message generation and link creation.
 * 
 * @param phoneNumber - Customer's WhatsApp number (with country code)
 * @param billDetails - Bill and customer details
 * @returns WhatsApp Click-to-Chat URL with pre-filled bill message
 * 
 * @example
 * generateBillWhatsAppLink('919876543210', {
 *   customerName: 'John Doe',
 *   restaurantName: 'DineFlow Restaurant',
 *   billId: 'abc123',
 *   billAmount: 1250,
 *   visitDate: '2026-06-05',
 *   tableNumber: 12
 * })
 */
export function generateBillWhatsAppLink(
  phoneNumber: string,
  billDetails: BillDetails
): string {
  const message = generateWhatsAppMessage(billDetails);
  return generateWhatsAppLink({ phoneNumber, message });
}

/**
 * Send bill via WhatsApp (alias for generateBillWhatsAppLink)
 * 
 * This is the main function to use for complete WhatsApp bill sharing workflow.
 * 
 * @param phoneNumber - Customer's phone number (will be formatted automatically)
 * @param billDetails - Bill and customer information
 * @returns WhatsApp Click-to-Chat URL ready to open
 * 
 * @example
 * const whatsappUrl = sendBillViaWhatsApp('9876543210', {
 *   customerName: 'John Doe',
 *   restaurantName: 'DineFlow Restaurant',
 *   billId: 'INV-202606-1234',
 *   billAmount: 1250,
 *   visitDate: '2026-06-05',
 *   tableNumber: 12
 * });
 * 
 * window.open(whatsappUrl, '_blank');
 */
export function sendBillViaWhatsApp(
  phoneNumber: string,
  billDetails: BillDetails
): string {
  // Format phone number first
  const formattedPhone = formatPhoneNumber(phoneNumber);
  return generateBillWhatsAppLink(formattedPhone, billDetails);
}

/**
 * Format and validate phone number for WhatsApp
 * 
 * Cleans phone number and adds country code if missing.
 * 
 * @param phoneNumber - Raw phone number input (any format)
 * @param defaultCountryCode - Country code to add if missing (default: '91' for India)
 * @returns Cleaned phone number with country code
 * 
 * @example
 * formatPhoneNumber('9876543210')           // Returns: '919876543210'
 * formatPhoneNumber('+91 98765 43210')      // Returns: '919876543210'
 * formatPhoneNumber('091-98765-43210')      // Returns: '919876543210'
 * formatPhoneNumber('1234567890', '1')      // Returns: '11234567890'
 */
export function formatPhoneNumber(
  phoneNumber: string,
  defaultCountryCode: string = '91'
): string {
  if (!phoneNumber) {
    throw new Error('Phone number is required');
  }

  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');

  // If phone number is empty after cleaning, throw error
  if (cleaned.length === 0) {
    throw new Error('Invalid phone number: no digits found');
  }

  // Remove leading zero if present (common in local formats)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // If number doesn't start with country code, add it
  if (!cleaned.startsWith(defaultCountryCode)) {
    cleaned = defaultCountryCode + cleaned;
  }

  // Validate minimum length
  if (cleaned.length < 10) {
    throw new Error(`Invalid phone number: too short (${cleaned.length} digits)`);
  }

  return cleaned;
}

/**
 * Generate a compact bill message for SMS or short notifications
 * 
 * @param billDetails - Bill information
 * @returns Short message string
 * 
 * @example
 * generateCompactBillMessage({
 *   customerName: 'John',
 *   restaurantName: 'DineFlow',
 *   billId: 'INV-123',
 *   billAmount: 1250,
 *   visitDate: '2026-06-05'
 * })
 * // Returns: "Thank you for dining at DineFlow! Your bill of ₹1,250 is ready. View: https://dineinflowd.vercel.app/bill/INV-123"
 */
export function generateCompactBillMessage(billDetails: BillDetails): string {
  const { restaurantName, billId, billAmount } = billDetails;
  const billUrl = generateBillUrl(billId);
  const formattedAmount = formatCurrency(billAmount);
  
  return `Thank you for dining at ${restaurantName}! Your bill of ${formattedAmount} is ready. View: ${billUrl}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Example Usage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Example usage demonstrating the complete flow:
 * 
 * ```typescript
 * import {
 *   generateBillUrl,
 *   generateWhatsAppMessage,
 *   generateWhatsAppLink,
 *   generateBillWhatsAppLink
 * } from '@/lib/whatsapp-utils';
 * 
 * // 1. Generate just the bill URL
 * const billUrl = generateBillUrl('abc123');
 * console.log(billUrl);
 * // Output: 'https://dineinflowd.vercel.app/bill/abc123'
 * 
 * // 2. Generate the WhatsApp message
 * const message = generateWhatsAppMessage({
 *   customerName: 'John Doe',
 *   restaurantName: 'DineFlow Restaurant',
 *   billId: 'abc123',
 *   billAmount: 1250,
 *   visitDate: '2026-06-05T18:30:00Z',
 *   tableNumber: 12,
 * });
 * console.log(message);
 * 
 * // 3. Generate WhatsApp link manually
 * const waLink = generateWhatsAppLink({
 *   phoneNumber: '919876543210',
 *   message: message
 * });
 * console.log(waLink);
 * 
 * // 4. Or use the convenience function for complete flow
 * const completeLink = generateBillWhatsAppLink('919876543210', {
 *   customerName: 'John Doe',
 *   restaurantName: 'DineFlow Restaurant',
 *   billId: 'abc123',
 *   billAmount: 1250,
 *   visitDate: new Date(),
 *   tableNumber: 12,
 * });
 * 
 * // Use the link in your UI:
 * // <a href={completeLink} target="_blank">Send Bill via WhatsApp</a>
 * ```
 */
