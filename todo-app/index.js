// index.js
// A simple Node.js web server that dynamically binds to an environment variable port
const http = require("http");

// Fallback to 3000 if PORT environment variable is not provided
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Todo App is running!\n");
});

// Outputs the exact string required by the assignment instructions
server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`);
});
