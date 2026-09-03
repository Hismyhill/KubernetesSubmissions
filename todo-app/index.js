// index.js
const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 3000;
const DIR_PATH = process.env.VOLUME_PATH || path.join(os.tmpdir(), "app_files");
const IMAGE_PATH = path.join(DIR_PATH, "image.jpg");

// Internal cluster network URL pointing to your backend service
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000/todos";

if (!fs.existsSync(DIR_PATH)) {
  fs.mkdirSync(DIR_PATH, { recursive: true });
}

// Layout configuration image logic
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

let initialTodos = [];

app.post("/todos", (req, res) => {
  const text = req?.body.text;
  if (!text) {
    return res.status(400).send("Missing text field");
  }
  initialTodos.push({ id: crypto.randomUUID(), text });
  res.status(201).send("Todo created");
});

app.get("/image.jpg", (req, res) => {
  if (fs.existsSync(IMAGE_PATH) && fs.statSync(IMAGE_PATH).size > 0) {
    res.setHeader("Cache-Control", "no-cache");
    return res.sendFile(IMAGE_PATH);
  }
  res.redirect("https://picsum.photos");
});

// Primary Home Route: Fetches todos server-to-server, then populates the template string
app.get("/", async (req, res) => {
  await getOrUpdateImage();

  try {
    // Fetches the data directly over the internal K8s cluster network
    const response = await axios.get(BACKEND_URL, { timeout: 3000 });
    initialTodos = response.data;
  } catch (error) {
    console.error(
      "Failed to fetch initial todos from backend service:",
      error.message,
    );
  }

  // Turn data objects into server-rendered <li> string fragments
  const todoItemsMarkup = initialTodos
    .map((todo) => `<li class="todo-item">${escapeHtml(todo.text)}</li>`)
    .join("\n");

  res.send(generateHtmlPage(todoItemsMarkup));
});

// Security helper to sanitize text content
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Function that returns the base static template markup
function generateHtmlPage(todoMarkup) {
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
        // Send payload via Ingress mapped path
        await fetch('/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify( {text} )
        });
        todoInput.value = '';
        
        // Reload page to display the fresh layout generated by the server
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Frontend app server running on port ${PORT}`);
});
