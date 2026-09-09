const express = require("express");
const { Pool } = require("pg");
const app = express();
const PORT = process.env.PORT || 3001;
// Set up PostgreSQL connection pool using the environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
// Helper function to ensure the database table exists
async function initDb() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS counters ( id SERIAL PRIMARY KEY, counter_value INT NOT NULL );`,
  );
  // Seed the counter row if the table is empty
  const res = await pool.query("SELECT COUNT(*) FROM counters");
  if (parseInt(res.rows[0].count) === 0) {
    // FIX: Added [0] here as well
    await pool.query("INSERT INTO counters (counter_value) VALUES (0)");
  }
}
// Route to handle ping-pong requests
app.get("/pingpong", async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE counters SET counter_value = counter_value + 1 WHERE id = 1 RETURNING counter_value",
    );
    // FIX: Added [0] to target the first returned row
    const currentCounter = result.rows[0].counter_value - 1;
    res.type("text/plain").send(`pong ${currentCounter}\n`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database Error\n");
  }
});

// Route to fetch just the current ping count
app.get("/pings", async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE counters SET counter_value = counter_value + 1 WHERE id = 1 RETURNING counter_value",
    );
    // FIX: Added [0] to target the first returned row
    const currentCounter = result.rows[0].counter_value - 1;
    res.type("text/plain").send(`${currentCounter}\n`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database Error\n");
  }
});

// Fallback for unmatched routes
app.use((req, res) => {
  res.status(404).type("text/plain").send("404 Not Found");
});
// Initialize database schema then start the server
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Ping-Pong Express server started on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
