import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";

const websocketPlugin: FastifyPluginAsync = async (app) => {
  app.get("/ws/:pollId", { websocket: true }, (connection, req) => {
    const { pollId } = req.params as { pollId: string };
    console.log("WebSocket client connected for poll:", pollId);

    // Listen for messages directly on connection
    connection.on("message", (message: Buffer) => {
      console.log("Received message from client:", message.toString());
    });

    // Send a welcome message back to the client
    connection.send(`Connected to poll ${pollId}`);
  });
};

export default websocketPlugin;
