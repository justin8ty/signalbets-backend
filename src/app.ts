import Fastify from "fastify";
import { request } from "http";
import dbPlugin from "./plugins/db";
import dotenv from "dotenv";
import fastifyPostgres from "@fastify/postgres";

dotenv.config();

const app = Fastify({
  logger: true,
});

app.register(fastifyPostgres, {
  connectionString: process.env.DATABASE_URL, // or whatever your local db connection is
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
