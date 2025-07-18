import Fastify from "fastify";
import dotenv from "dotenv";
import fastifyPostgres from "@fastify/postgres";
import { pollRoutes } from "./routes/polls";
import websocket from "@fastify/websocket";

import websocketPlugin from "./plugins/websocket";

dotenv.config();

const app = Fastify({
  logger: true,
});

app.register(pollRoutes);

app.register(websocket);

app.register(fastifyPostgres, {
  connectionString: process.env.DATABASE_URL,
});

app.get("/", async (request, reply) => {
  const client = await app.pg.connect();
  try {
    const { rows } = await client.query("SELECT NOW()");
    return { server_time: rows[0].now };
  } finally {
    client.release();
  }
});

const start = async () => {
  try {
    await app.listen({ port: 3000, host: "0.0.0.0" });
    console.log("Server running on http://localhost:3000");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
