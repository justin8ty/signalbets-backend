import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    pollClients: Map<string, Set<WebSocket>>;
  }
}

const websocketPlugin: FastifyPluginAsync = async (app) => {
  const pollClients = new Map<string, Set<any>>(); // pollId => Set of sockets

  app.decorate("pollClients", pollClients);

  app.get("/ws/:pollId", { websocket: true }, (connection, req) => {
    const { pollId } = req.params as { pollId: string };
    const { socket } = connection;
    if (!socket || typeof socket.send !== "function") {
      console.error("❌ Not a WebSocket connection or send is unavailable.");
      return;
    }

    if (!pollClients.has(pollId)) {
      pollClients.set(pollId, new Set());
    }

    pollClients.get(pollId)!.add(connection.socket);
    console.log(`Client connected to poll ${pollId}`);

    connection.socket.send(`Connected to poll ${pollId}`);

    connection.socket.on("close", () => {
      pollClients.get(pollId)?.delete(connection.socket);
      console.log(`Client disconnected from poll ${pollId}`);
    });
  });
};

export default fp(websocketPlugin);
