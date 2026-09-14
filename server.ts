import express from "express";
import path from "path";
import feedsHandler from "./api/feeds.js";
import generateHandler from "./api/generate.js";

const app = express();
const PORT = 3000;

app.use(express.json());

// Mount API routes
app.all("/api/feeds", (req, res) => feedsHandler(req, res));
app.all("/api/generate", (req, res) => generateHandler(req, res));

// ---------------------------------------------------------
// LOCAL DEVELOPMENT & PRODUCTION SERVER START
// (Used by npm run dev / start in AI Studio environment)
// ---------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

export default app;
