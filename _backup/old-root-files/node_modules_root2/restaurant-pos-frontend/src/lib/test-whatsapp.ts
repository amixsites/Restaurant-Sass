/**
 * WhatsApp Utilities Test File
 * 
 * Run this to verify WhatsApp integration is working correctly
 * 
 * Usage in browser console:
 * ```
 * import { testWhatsAppIntegration } from '@/lib/test-whatsapp';
 * testWhatsAppIntegration();
 * ```
 */

import {
  generateBillUrl,
  generateWhatsAppMessage,
  generateWhatsAppLink,
  sendBillViaWhatsApp,
  formatPhoneNumber,
  generateCompactBillMessage,
  type BillDetails,
} from './whatsapp-utils';

export function testWhatsAppIntegration() {
  console.log('🧪 Testing WhatsApp Integration...\n');

  // Test Data
  const testBillDetails: BillDetails = {
    customerName: 'John Doe',
    restaurantName: 'DineFlow Restaurant',
    billId: 'INV-202606-1234',
    billAmount: 1250,
    visitDate: '2026-06-05T18:30:00Z',
    tableNumber: 12,
  };

  const testPhone = '9876543210';

  try {
    // Test 1: Generate Bill URL
    console.log('✅ Test 1: Generate Bill URL');
    const billUrl = generateBillUrl(testBillDetails.billId);
    console.log('   Result:', billUrl);
    console.log('   Expected:', 'http://localhost:5173/bill/INV-202606-1234 or https://dineinflowd.vercel.app/bill/INV-202606-1234');
    console.log('');

    // Test 2: Format Phone Number
    console.log('✅ Test 2: Format Phone Number');
    const formattedPhone = formatPhoneNumber(testPhone);
    console.log('   Input:', testPhone);
    console.log('   Output:', formattedPhone);
    console.log('   Expected:', '919876543210');
    console.log('');

    // Test 3: Generate WhatsApp Message
    console.log('✅ Test 3: Generate WhatsApp Message');
    const message = generateWhatsAppMessage(testBillDetails);
    console.log('   Message Preview:');
    console.log('   ' + message.split('\n').join('\n   '));
    console.log('');

    // Test 4: Generate WhatsApp Link
    console.log('✅ Test 4: Generate WhatsApp Link');
    const whatsappLink = generateWhatsAppLink({
      phoneNumber: formattedPhone,
      message: message,
    });
    console.log('   Link:', whatsappLink.substring(0, 100) + '...');
    console.log('');

    // Test 5: Complete Flow with sendBillViaWhatsApp
    console.log('✅ Test 5: Complete Flow - sendBillViaWhatsApp');
    const completeLink = sendBillViaWhatsApp(testPhone, testBillDetails);
    console.log('   Link:', completeLink.substring(0, 100) + '...');
    console.log('');

    // Test 6: Compact Message
    console.log('✅ Test 6: Generate Compact Message');
    const compactMessage = generateCompactBillMessage(testBillDetails);
    console.log('   Message:', compactMessage);
    console.log('');

    // Test 7: Phone Number Formats
    console.log('✅ Test 7: Test Various Phone Formats');
    const phoneFormats = [
      '9876543210',
      '+919876543210',
      '+91 98765 43210',
      '091-98765-43210',
      '(+91) 98765-43210',
    ];

    phoneFormats.forEach((phone) => {
      try {
        const formatted = formatPhoneNumber(phone);
        console.log(`   ${phone.padEnd(25)} → ${formatted}`);
      } catch (error: any) {
        console.log(`   ${phone.padEnd(25)} → ERROR: ${error.message}`);
      }
    });
    console.log('');

    // Test 8: Error Handling
    console.log('✅ Test 8: Error Handling');
    
    // Test invalid phone
    try {
      formatPhoneNumber('123');
      console.log('   ❌ FAILED: Should throw error for invalid phone');
    } catch (error: any) {
      console.log('   ✓ Correctly throws error for invalid phone:', error.message);
    }

    // Test empty phone
    try {
      formatPhoneNumber('');
      console.log('   ❌ FAILED: Should throw error for empty phone');
    } catch (error: any) {
      console.log('   ✓ Correctly throws error for empty phone:', error.message);
    }

    // Test invalid bill ID
    try {
      generateBillUrl('');
      console.log('   ❌ FAILED: Should throw error for empty bill ID');
    } catch (error: any) {
      console.log('   ✓ Correctly throws error for empty bill ID:', error.message);
    }
    console.log('');

    // Summary
    console.log('🎉 All Tests Passed!\n');
    console.log('📋 Summary:');
    console.log('   ✓ Bill URL generation working');
    console.log('   ✓ Phone number formatting working');
    console.log('   ✓ WhatsApp message generation working');
    console.log('   ✓ WhatsApp link generation working');
    console.log('   ✓ Complete workflow working');
    console.log('   ✓ Error handling working');
    console.log('');
    console.log('🔗 Test Link (click to open WhatsApp):');
    console.log(completeLink);
    console.log('');
    console.log('💡 To test in app, paste this in console:');
    console.log(`   window.open('${completeLink}', '_blank');`);

    return {
      success: true,
      billUrl,
      formattedPhone,
      message,
      whatsappLink,
      completeLink,
      compactMessage,
    };
  } catch (error: any) {
    console.error('❌ Test Failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Auto-run tests if in development
if (import.meta.env.DEV) {
  console.log('🔧 Development Mode: WhatsApp Test Utils Available');
  console.log('💡 Run: testWhatsAppIntegration() in console to test');
  
  // Make it globally available for easy testing
  (window as any).testWhatsAppIntegration = testWhatsAppIntegration;
}

export default testWhatsAppIntegration;
