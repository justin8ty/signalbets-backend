import "@fastify/postgres";
import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: {
      id: string;
      role: string;
    };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    pg: import("@fastify/postgres").FastifyPostgresPlugin;
  }
}
