import fp from "fastify-plugin";
import fastify, { FastifyPluginAsync } from "fastify";

const dbPlugin: FastifyPluginAsync = async (fastify, opts) => {
  fastify.register(require("@fastify/postgres"), {
    connectionString: process.env.DATABASE_URL,
  });
};

export default fp(dbPlugin);
