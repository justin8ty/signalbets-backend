import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import fastifyPostgres from "@fastify/postgres";

const dbPlugin: FastifyPluginAsync = async (fastify, opts) => {
  await fastify.register(fastifyPostgres, {
    connectionString: process.env.DATABASE_URL,
  });
};

export default fp(dbPlugin);
