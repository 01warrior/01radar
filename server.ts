import express from "express";
import path from "path";
import app from "./api/app.js";

const PORT = 3000;

// ---------------------------------------------------------
// LOCAL DEVELOPMENT & PRODUCTION SERVER START
// (Ignored by Vercel, used by npm run dev / start)
// ---------------------------------------------------------
async function startServer() {
  // Vite middleware for development
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

// Only start the server if we're not in a Vercel environment
if (process.env.VERCEL !== "1") {
  startServer();
}

export default app;
