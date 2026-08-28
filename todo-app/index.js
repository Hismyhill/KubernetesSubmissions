const http = require("http");
const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const DIR_PATH = process.env.VOLUME_PATH || path.join(__dirname, "files");
const FILE_PATH = path.join(DIR_PATH, "status.txt");
const IMAGE_PATH = path.join(DIR_PATH, "image.jpg");

if (!fs.existsSync(DIR_PATH)) {
  fs.mkdirSync(DIR_PATH, { recursive: true });
}

const randomString = crypto.randomUUID();

const logStatus = () => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp}: ${randomString}`);
};
logStatus();
setInterval(logStatus, 5000);

// Robust helper following redirects explicitly with absolute configurations
const downloadImage = (url) => {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "NodeJS-App" } }, (response) => {
        // 301/302 Redirect Handler
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
            new Error(
              `Failed to get image: Status Code ${response.statusCode}`,
            ),
          );
        }

        const fileStream = fs.createWriteStream(IMAGE_PATH);
        response.pipe(fileStream);

        fileStream.on("finish", () => {
          fileStream.close();

          // Final sanity check: Make sure we didn't save an empty file
          const stats = fs.statSync(IMAGE_PATH);
          if (stats.size === 0) {
            fs.unlink(IMAGE_PATH, () => {});
            return reject(
              new Error("Downloaded file is 0 bytes. Trying again..."),
            );
          }
          resolve();
        });

        fileStream.on("error", (err) => {
          fs.unlink(IMAGE_PATH, () => {});
          reject(err);
        });
      })
      .on("error", reject);
  });
};

const getOrUpdateImage = async () => {
  const TEN_MINUTES_MS = 10 * 60 * 1000;

  if (fs.existsSync(IMAGE_PATH)) {
    try {
      const stats = fs.statSync(IMAGE_PATH);

      // Ensure the existing file isn't empty/broken
      if (stats.size > 0) {
        const age = Date.now() - stats.mtimeMs;
        if (age < TEN_MINUTES_MS) {
          return; // Image is good and fresh
        }

        console.log(
          "Image older than 10 mins. Serving old pic, fetching new one in background.",
        );
        downloadImage("https://picsum.photos").catch((err) => {
          console.error("Background image download failed:", err.message);
        });
        return;
      }
    } catch (err) {
      console.error("Error checking file stats:", err.message);
    }
  }

  console.log("No valid cached image found. Fetching initial image...");
  await downloadImage("https://picsum.photos");
};

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/status") {
    try {
      if (fs.existsSync(FILE_PATH)) {
        const fileContent = fs.readFileSync(FILE_PATH, "utf8");
        res.writeHead(200, { "Content-Type": "text/plain" });
        return res.end(fileContent);
      } else {
        res.writeHead(200, { "Content-Type": "text/plain" });
        return res.end("Waiting for log generator to write first status...\n");
      }
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      return res.end("Error reading status file\n");
    }
  }

  // Serve image locally
  if (req.method === "GET" && req.url.startsWith("/image.jpg")) {
    try {
      if (fs.existsSync(IMAGE_PATH) && fs.statSync(IMAGE_PATH).size > 0) {
        res.writeHead(200, {
          "Content-Type": "image/jpeg",
          "Cache-Control": "no-cache, no-store, must-revalidate", // Break aggressive browser caching
        });
        const readStream = fs.createReadStream(IMAGE_PATH);
        return readStream.pipe(res);
      } else {
        // Fallback: If cache file failed to download properly, redirect user directly to a live picture placeholder
        res.writeHead(302, { Location: "https://picsum.photos" });
        return res.end();
      }
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      return res.end("Error serving image file");
    }
  }

  // App Root
  if (req.method === "GET" && req.url === "/") {
    try {
      await getOrUpdateImage();
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(htmlContent);
    } catch (err) {
      console.error("Error details:", err);
      res.writeHead(500, { "Content-Type": "text/plain" });
      return res.end(`Internal Server Error: ${err.message}`);
    }
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("404 Not Found");
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
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #ffffff;
      margin: 0;
      padding: 40px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      color: #222222;
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
      color: #212529;
    }
    .image-wrapper {
      width: 100%;
      margin-bottom: 24px;
    }
    .cached-image {
      width: 100%;
      height: auto;
      border-radius: 8px;
      display: block;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    .footer-text {
      font-size: 1.1rem;
      color: #666666;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Todo App</h1>
    <div class="image-wrapper">
      <!-- Added a cache buster parameter to guarantee UI updates when image updates on server -->
      <img src="/image.jpg?t=${Date.now()}" alt="Cached Hourly Picture" class="cached-image" />
    </div>
    <div class="footer-text">DevOps with Kubernetes 2026</div>
  </div>
</body>
</html>
`;

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`);
});
