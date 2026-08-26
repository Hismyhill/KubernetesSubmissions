// index.js
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const MODE = process.env.MODE || "reader"; // Options: "writer" or "reader"
const FILE_PATH = path.join("/usr/share/app/files", "status.txt");

// Ensure the directory exists before doing any operations
const dir = path.dirname(FILE_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

if (MODE === "writer") {
  // === WRITER MODE ===
  const randomString = crypto.randomUUID();

  const logStatus = () => {
    const timestamp = new Date().toISOString();
    const logLine = `${timestamp}: ${randomString}\n`;

    // Overwrite the file with the latest timestamp and the same random string
    fs.writeFileSync(FILE_PATH, logLine, "utf8");
    console.log(`Wrote to shared file: ${logLine.trim()}`);
  };

  // Run immediately and repeat every 5 seconds
  logStatus();
  setInterval(logStatus, 5000);
} else {
  // === READER MODE (Web Server) ===
  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/status") {
      try {
        if (fs.existsSync(FILE_PATH)) {
          const fileContent = fs.readFileSync(FILE_PATH, "utf8");
          res.writeHead(200, { "Content-Type": "text/plain" });
          return res.end(fileContent);
        } else {
          res.writeHead(200, { "Content-Type": "text/plain" });
          return res.end(
            "Waiting for log generator to write first status...\n",
          );
        }
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        return res.end("Error reading status file\n");
      }
    }

    // Original SPA route
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(htmlContent);
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  });

  const htmlContent = `<!DOCTYPE html><html><body><h1>Vanilla Node SPA</h1></body></html>`;

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Web server started in port ${PORT}`);
  });
}
