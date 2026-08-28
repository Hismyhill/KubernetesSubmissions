const http = require("http");
const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PORT = process.env.PORT || 3000;
const DIR_PATH = process.env.VOLUME_PATH || path.join(os.tmpdir(), "app_files");
const FILE_PATH = path.join(DIR_PATH, "status.txt");
const IMAGE_PATH = path.join(DIR_PATH, "image.jpg");

if (!fs.existsSync(DIR_PATH)) {
  fs.mkdirSync(DIR_PATH, { recursive: true });
}

const randomString = crypto.randomUUID();
const logStatus = () => {
  console.log(`${new Date().toISOString()}: ${randomString}`);
};
logStatus();
setInterval(logStatus, 5000);

// Safe redirect-following image fetcher
const downloadImage = (url) => {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 5000 },
        (response) => {
          if (
            response.statusCode >= 300 &&
            response.statusCode < 400 &&
            response.headers.location
          ) {
            return downloadImage(response.headers.location)
              .then(resolve)
              .catch(reject);
          }
          if (response.statusCode !== 200) {
            return reject(
              new Error(`HTTP Status Code: ${response.statusCode}`),
            );
          }

          const fileStream = fs.createWriteStream(IMAGE_PATH);
          response.pipe(fileStream);

          fileStream.on("finish", () => {
            fileStream.close();
            if (fs.statSync(IMAGE_PATH).size === 0) {
              fs.unlinkSync(IMAGE_PATH);
              return reject(new Error("Empty image downloaded"));
            }
            resolve();
          });
          fileStream.on("error", reject);
        },
      )
      .on("error", reject);
  });
};

const getOrUpdateImage = async () => {
  const TEN_MINUTES_MS = 10 * 60 * 1000;
  if (fs.existsSync(IMAGE_PATH)) {
    try {
      const stats = fs.statSync(IMAGE_PATH);
      if (stats.size > 0 && Date.now() - stats.mtimeMs < TEN_MINUTES_MS) {
        return;
      }
      downloadImage("https://picsum.photos").catch(() => {});
      return;
    } catch (err) {}
  }
  await downloadImage("https://picsum.photos").catch(() => {});
};

const server = http.createServer(async (req, res) => {
  const [pathname] = req.url.split("?");

  if (req.method === "GET" && pathname === "/image.jpg") {
    if (fs.existsSync(IMAGE_PATH) && fs.statSync(IMAGE_PATH).size > 0) {
      res.writeHead(200, {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-cache",
      });
      return fs.createReadStream(IMAGE_PATH).pipe(res);
    }
    res.writeHead(302, { Location: "https://picsum.photos" }).end();
    return;
  }

  if (req.method === "GET" && pathname === "/") {
    await getOrUpdateImage();
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(htmlContent);
  }

  res.writeHead(404, { "Content-Type": "text/plain" }).end("404 Not Found");
});

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Todo App</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background-color: #ffffff;
      margin: 0;
      padding: 40px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      color: #212529;
    }
    .container {
      max-width: 550px;
      width: 100%;
      text-align: center;
    }
    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 24px;
    }
    h2 {
      font-size: 1.8rem;
      font-weight: 700;
      margin-top: 32px;
      margin-bottom: 20px;
    }
    .cached-image {
      width: 100%;
      max-width: 320px;
      height: auto;
      border-radius: 12px;
      display: inline-block;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      margin-bottom: 32px;
    }
    .todo-form {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      width: 100%;
    }
    .todo-input {
      flex: 1;
      padding: 14px 16px;
      font-size: 1rem;
      border: 2px solid #5cb85c;
      border-radius: 6px;
      outline: none;
    }
    .todo-input:focus {
      box-shadow: 0 0 5px rgba(92, 184, 92, 0.5);
    }
    .send-btn {
      background-color: #5cb85c;
      color: white;
      border: none;
      padding: 0 24px;
      font-size: 1rem;
      font-weight: 500;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    .send-btn:hover {
      background-color: #4cae4c;
    }
    .todo-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      text-align: left;
      padding: 0;
      margin: 0;
      list-style: none;
    }
    .todo-item {
      background-color: #f8f9fa;
      border: 1px solid #e9ecef;
      border-left: 5px solid #5cb85c;
      padding: 16px;
      border-radius: 0 6px 6px 0;
      font-size: 1.05rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Todo App</h1>
    <img src="/image.jpg" alt="Cached Nature Layout" class="cached-image" />
    
    <!-- Todo Action Interface Form Block -->
    <form class="todo-form" onsubmit="event.preventDefault(); alert('Todo registered locally!');">
      <input 
        type="text" 
        class="todo-input" 
        placeholder="Enter a new todo (max 140 characters)" 
        maxlength="140" 
        required 
      />
      <button type="submit" class="send-btn">Send</button>
    </form>

    <h2>Todos</h2>
    
    <!-- Rendered hardcoded sample todo listings -->
    <ul class="todo-list">
      <li class="todo-item">Learn Kubernetes basics</li>
      <li class="todo-item">Deploy application to cluster</li>
      <li class="todo-item">Configure persistent volumes</li>
    </ul>
  </div>
</body>
</html>
`;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
