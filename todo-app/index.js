// index.js
// A simple Node.js web server that dynamically binds to an environment variable port
const http = require("http");

// Fallback to 3000 if PORT environment variable is not provided
const PORT = process.env.PORT || 3000;

// const server = http.createServer((req, res) => {
//   res.writeHead(200, { "Content-Type": "text/plain" });
//   res.end("Todo App is running!\n");
// });
const server = http.createServer((req, res) => {
  // Check if the request is a GET method and targeting the root URL
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(htmlContent);
  } else {
    // Fallback for any other route
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  }
});

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Native Node.js SPA</title>
    <style>
        body { font-family: sans-serif; background: #f0f2f5; margin: 40px; text-align: center; }
        .card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: inline-block; max-width: 400px; }
        button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        #view { margin-top: 20px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Vanilla Node SPA</h1>
        <p>This page is served directly by Node's built-in HTTP module.</p>
        <button onclick="toggleView()">Click Me</button>
        <div id="view">Current View: Home</div>
    </div>

    <script>
        let currentView = 'Home';
        function toggleView() {
            currentView = currentView === 'Home' ? 'Dashboard' : 'Home';
            document.getElementById('view').innerText = 'Current View: ' + currentView;
        }
    </script>
</body>
</html>
`;

// Outputs the exact string required by the assignment instructions
server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`);
});
