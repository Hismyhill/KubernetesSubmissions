// index.js
const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { Pool } = require("pg"); // Added PostgreSQL connection module

const app = express();

// === CONFIGURATION (Strictly via Environment Variables) ===
const PORT = process.env.PORT;
const BACKEND_URL = process.env.BACKEND_URL;
const CLIENT_POST_URL = process.env.CLIENT_POST_URL || "/todos";
const DIR_PATH = process.env.VOLUME_PATH || path.join(os.tmpdir(), "app_files");
const IMAGE_PATH = path.join(DIR_PATH, "image.jpg");

if (!fs.existsSync(DIR_PATH)) {
  fs.mkdirSync(DIR_PATH, { recursive: true });
}

// Set up PostgreSQL connection pool using the provided database URL string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create tables automatically if they do not exist inside your stateful set volume
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      text VARCHAR(140) NOT NULL
    );
  `);
}

// Layout configuration image caching logic
const downloadImage = async (url) => {
  try {
    const response = await axios({
      method: "get",
      url,
      responseType: "stream",
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 5000,
    });
    const fileStream = fs.createWriteStream(IMAGE_PATH);
    response.data.pipe(fileStream);
    return new Promise((resolve, reject) => {
      fileStream.on("finish", () => {
        fileStream.close();
        if (fs.statSync(IMAGE_PATH).size === 0) {
          fs.unlinkSync(IMAGE_PATH);
          reject(new Error("Empty image"));
        } else resolve();
      });
      fileStream.on("error", reject);
    });
  } catch (error) {
    throw error;
  }
};

const getOrUpdateImage = async () => {
  if (fs.existsSync(IMAGE_PATH)) {
    try {
      const stats = fs.statSync(IMAGE_PATH);
      if (stats.size > 0 && Date.now() - stats.mtimeMs < 10 * 60 * 1000) return;
    } catch (err) {}
  }
  await downloadImage("https://picsum.photos").catch(() => {});
};

app.use(express.json());

// === API BACKEND ROUTE ENDPOINT ===

// === REQUEST LOGGING MIDDLEWARE ===
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    // Structured JSON log format easily parsed by Promtail/Loki into Grafana
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        status: res.statusCode,
        durationMs: duration,
        userAgent: req.get("User-Agent"),
      }),
    );
  });
  next();
});

// Fetches list of items directly from PostgreSQL
app.get("/api/todos", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, text FROM todos");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database Read Error\n");
  }
});

// Creates a new item inside PostgreSQL
app.post("/todos", async (req, res) => {
  const text = req?.body.text;
  if (!text) {
    return res.status(400).send("Missing text field");
  }

  if (text.length > 140) {
    // Explicit structural message that Grafana filters can easily match
    console.warn(
      `[VALIDATION FAILED] Todo rejected. Length was ${text.length} characters (Max: 140). Content snapshot: "${text.substring(0, 20)}..."`,
    );
    return res.status(400).send("Todo text cannot exceed 140 characters.");
  }

  try {
    const newId = crypto.randomUUID();
    await pool.query("INSERT INTO todos (id, text) VALUES ($1, $2)", [
      newId,
      text,
    ]);
    res.status(201).send("Todo created");
  } catch (err) {
    console.error(err);
    res.status(500).send("Database Write Error\n");
  }
});

// Image serving proxy route
app.get("/image.jpg", (req, res) => {
  if (fs.existsSync(IMAGE_PATH) && fs.statSync(IMAGE_PATH).size > 0) {
    res.setHeader("Cache-Control", "no-cache");
    return res.sendFile(IMAGE_PATH);
  }
  res.redirect("https://picsum.photos");
});

// === FRONTEND UI RENDER ROUTE ===
app.get("/", async (req, res) => {
  await getOrUpdateImage();

  let currentTodos = [];
  try {
    // Intercepts and reads live list content using the configurable BACKEND_URL variable
    const response = await axios.get(BACKEND_URL, { timeout: 3000 });
    currentTodos = response.data;
  } catch (error) {
    console.error("Failed to collect backend data values:", error.message);
  }

  const todoItemsMarkup = currentTodos
    .map((todo) => `<li class="todo-item">${escapeHtml(todo.text)}</li>`)
    .join("\n");

  res.send(generateHtmlPage(todoItemsMarkup, CLIENT_POST_URL));
});

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function generateHtmlPage(todoMarkup, clientPostUrl) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Todo App</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background-color: #ffffff; margin: 0; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; color: #212529; }
    .container { max-width: 550px; width: 100%; text-align: center; }
    h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 24px; }
    h2 { font-size: 1.8rem; font-weight: 700; margin-top: 32px; margin-bottom: 20px; }
    .cached-image { width: 100%; max-width: 320px; height: auto; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); margin-bottom: 32px; }
    .todo-form { display: flex; gap: 12px; margin-bottom: 24px; width: 100%; }
    .todo-input { flex: 1; padding: 14px 16px; font-size: 1rem; border: 2px solid #5cb85c; border-radius: 6px; outline: none; }
    .send-btn { background-color: #5cb85c; color: white; border: none; padding: 0 24px; font-size: 1rem; font-weight: 500; border-radius: 6px; cursor: pointer; }
    .send-btn:hover { background-color: #4cae4c; }
    .todo-list { display: flex; flex-direction: column; gap: 12px; text-align: left; padding: 0; margin: 0; list-style: none; }
    .todo-item { background-color: #f8f9fa; border: 1px solid #e9ecef; border-left: 5px solid #5cb85c; padding: 16px; border-radius: 0 6px 6px 0; font-size: 1.05rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Todo App</h1>
    <img src="/image.jpg" alt="Cached Nature Layout" class="cached-image" />
    
    <form class="todo-form" id="todoForm">
      <input type="text" id="todoInput" class="todo-input" placeholder="Enter a new todo (max 140 characters)" maxlength="140" required />
      <button type="submit" class="send-btn">Send</button>
    </form>

    <h2>Todos</h2>
    <ul class="todo-list" id="todoList">
      ${todoMarkup}
    </ul>
  </div>

  <script>
    const todoForm = document.getElementById('todoForm');
    const todoInput = document.getElementById('todoInput');

    todoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = todoInput.value.trim();
      if (!text) return;

      try {
        await fetch('${clientPostUrl}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify( {text} )
        });
        todoInput.value = '';
        window.location.reload();
      } catch (err) {
        console.error('Failed to create todo:', err);
      }
    });
  </script>
</body>
</html>
  `;
}

// Ensure the schema is ready before binding port targets
initDb()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Application online on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection initialization failure:", err);
    process.exit(1);
  });
