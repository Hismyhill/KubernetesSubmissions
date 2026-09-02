// index.js
const http = require("http");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const MODE = process.env.MODE || "reader"; // Options: "writer" or "reader"

// Read the internal Kubernetes service URL from environment variables
const PINGPONG_URL =
  process.env.PINGPONG_URL || "http://pingpong-svc:2523/pings";

// State variable to store the latest logs globally in application memory
let latestStatus = "Waiting for data...";

// Generate the random string once upon application initialization
const randomString = crypto.randomUUID();

// Helper function to fetch the current pong counter from the ping-pong app via HTTP
const fetchPongs = () => {
  return new Promise((resolve) => {
    http
      .get(PINGPONG_URL, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve(data.trim());
        });
      })
      .on("error", (err) => {
        console.error(`Error connecting to pingpong service: ${err.message}`);
        resolve("N/A (service unreachable)");
      });
  });
};

if (MODE === "writer") {
  // === WRITER MODE ===
  const logStatus = async () => {
    const timestamp = new Date().toISOString();
    const pongs = await fetchPongs();

    // Construct the payload matching the target output format
    const logLine = `${timestamp}: ${randomString}.\nPing / Pongs: ${pongs}`;

    console.log("=== Current Status ===");
    console.log(logLine);
    console.log("======================");
  };

  // Run immediately and repeat every 5 seconds
  logStatus();
  setInterval(logStatus, 5000);
} else {
  // === READER MODE (Web Server) ===
  const server = http.createServer(async (req, res) => {
    // GET / endpoint to return the status directly to the browser
    if (req.method === "GET" && req.url === "/") {
      const timestamp = new Date().toISOString();
      const pongs = await fetchPongs();

      const responseText = `${timestamp}: ${randomString}.\nPing / Pongs: ${pongs}\n`;

      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end(responseText);
    }

    // Preserving the old status route if needed for compatibility
    if (req.method === "GET" && req.url === "/status") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end(latestStatus);
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Web server started on port ${PORT}`);
  });
}
