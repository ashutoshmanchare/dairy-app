export const sendSMS = async (mobile, message) => {
  const apiKey = process.env.FAST2SMS_API_KEY;
  
  // Clean mobile number to extract 10 digits
  const cleanMobile = mobile.replace(/[^0-9]/g, "");
  const targetMobile = cleanMobile.length > 10 ? cleanMobile.slice(-10) : cleanMobile;
  
  if (!targetMobile || targetMobile.length < 10) {
    console.warn(`[SMS Warning] Invalid mobile number: "${mobile}"`);
    return { success: false, error: "Invalid mobile number" };
  }

  if (!apiKey) {
    console.log(`\n--- [SMS SIMULATOR] ---`);
    console.log(`To: ${targetMobile}`);
    console.log(`Message: ${message}`);
    console.log(`-----------------------\n`);
    return { success: true, simulated: true };
  }
  
  try {
    const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        "authorization": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        route: "q",
        message: message,
        language: "english",
        numbers: targetMobile
      })
    });
    
    const data = await response.json();
    if (data.return) {
      console.log(`SMS sent successfully to ${targetMobile} via Fast2SMS`);
      return { success: true, data };
    } else {
      console.error(`Fast2SMS error: ${data.message}`);
      return { success: false, error: data.message };
    }
  } catch (error) {
    console.error("Failed to send SMS via Fast2SMS:", error.message);
    return { success: false, error: error.message };
  }
};
