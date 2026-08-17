const crypto = require("crypto");

// Generate random string on startup and store in memory
const storedString = crypto.randomBytes(16).toString("hex");
console.log(`[INIT] Generated and stored string in memory: ${storedString}`);

// Output stored string with a timestamp every 5 seconds
setInterval(() => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Stored String: ${storedString}`);
}, 5000);
