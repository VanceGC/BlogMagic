import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { setupGoogleAuth } from "./googleAuth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Stripe webhook needs raw body, so register before JSON parser
  app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Google OAuth authentication
  setupGoogleAuth(app);
  
  // Email/password authentication
  const { default: emailAuthRoutes } = await import('../routes/emailAuthRoutes.js');
  app.use('/api/auth', emailAuthRoutes);
  
  // Stripe webhook
  const { default: stripeRoutes } = await import('../routes/stripeRoutes.js');
  app.use('/api/stripe', stripeRoutes);
  
  // Serve locally stored images
  // This serves files from the uploads directory with proper caching
  app.use('/uploads', express.static('uploads', {
    maxAge: '1y', // Cache for 1 year
    immutable: true,
  }));
  
  // Image serving endpoint (legacy - for database-stored images)
  app.get('/api/images/:id', async (req, res) => {
    try {
      const { getImageById } = await import('../db');
      const imageId = parseInt(req.params.id);
      const image = await getImageById(imageId);
      
      if (!image) {
        return res.status(404).send('Image not found');
      }
      
      // Convert base64 back to buffer
      const buffer = Buffer.from(image.data, 'base64');
      
      // Set appropriate headers
      res.setHeader('Content-Type', image.mimeType);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      
      res.send(buffer);
    } catch (error) {
      console.error('Error serving image:', error);
      res.status(500).send('Internal server error');
    }
  });
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
