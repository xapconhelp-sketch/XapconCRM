import express from "express";
import path from "path";
import dotenv from "dotenv";
import { contractorWeatherMiddleware } from "./server/contractorWeather";
import { createProductionApp } from "./server/productionApp";

dotenv.config({ path: [".env.local", ".env"] });

const app = process.env.NODE_ENV === 'production'
  ? createProductionApp(path.join(process.cwd(), 'dist', 'client'))
  : express();
const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || "0.0.0.0";

// Configure Vite or serve production bundle
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
    app.use("/api/contractor-weather", contractorWeatherMiddleware);
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer().catch(error => { console.error('No se pudo iniciar el servidor:', error); process.exitCode = 1; });
