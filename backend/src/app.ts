import Fastify from "fastify";
import dbPlugin from "./plugins/db";
import dotenv from "dotenv";
import { pollRoutes } from "./routes/polls";
import { authRoutes } from "./routes/auth";
import websocket from "@fastify/websocket";
import jwt from "@fastify/jwt";

dotenv.config();

const app = Fastify({
  logger: true,
});

app.register(dbPlugin);
app.register(websocket);

app.register(jwt, {
  secret: process.env.JWT_SECRET!,
});

app.register(authRoutes);
app.register(pollRoutes);

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
