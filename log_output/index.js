// index.js
const http = require("http");
const crypto = require("crypto");
const fs = require("fs"); // Added missing import to allow file operations

const PORT = process.env.PORT || 3000;
const MODE = process.env.MODE || "reader"; // Options: "writer" or "reader"

// Read the internal Kubernetes service URL from environment variables
const PINGPONG_URL =
  process.env.PINGPONG_URL || "http://ping-pong-svc:8666/pings";

const CONFIG_FILE_PATH = "/usr/share/app/config/information.txt";

// Generate the random string once upon application initialization
const randomString = crypto.randomUUID();

const getConfigFileContent = () => {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      return fs.readFileSync(CONFIG_FILE_PATH, "utf8").trim();
    }
  } catch (err) {
    console.error("Error reading config file:", err.message);
  }
  return "file missing or unreadable";
};

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
        resolve("N/A");
      });
  });
};

if (MODE === "writer") {
  // === WRITER MODE ===
  const logStatus = async () => {
    const timestamp = new Date().toISOString();
    const pongs = await fetchPongs();
    const fileContent = getConfigFileContent();
    const envMessage = process.env.MESSAGE || "not set";

    // Prints exactly matching your task format structure
    console.log(`file content: ${fileContent}`);
    console.log(`env variable: MESSAGE=${envMessage}`);
    console.log(`${timestamp}: ${randomString}.`);
    console.log(`Ping / Pongs: ${pongs}`);
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
      const fileContent = getConfigFileContent();
      const envMessage = process.env.MESSAGE || "not set";

      // Aggregated response output matching style expectations
      const responseText = `file content: ${fileContent}\nenv variable: MESSAGE=${envMessage}\n${timestamp}: ${randomString}.\nPing / Pongs: ${pongs}\n`;

      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end(responseText);
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Web server started on port ${PORT}`);
  });
}
