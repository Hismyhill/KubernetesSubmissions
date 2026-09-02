// pingpong.js
const http = require("http");

const PORT = process.env.PORT || 3001;
let requestCounter = 0;

const server = http.createServer((req, res) => {
  // Respond specifically to the /pingpong route
  if (req.method === "GET" && req.url === "/pingpong") {
    const responseText = `pong ${requestCounter}\n`;
    requestCounter++; // Increment the in-memory counter

    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end(responseText);
  }
  if (req.method === "GET" && req.url === "/pings") {
    const responseText = `${requestCounter}\n`;
    requestCounter++; // Increment the in-memory counter

    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end(responseText);
  }

  // Fallback route
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("404 Not Found");
});

server.listen(PORT, () => {
  console.log(`Ping-Pong server started on port ${PORT}`);
});
