import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";

export async function authRoutes(app: FastifyInstance) {
  app.post(
    "/register",
    {
      schema: {
        body: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string" },
            password: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { username, password } = request.body as {
        username: string;
        password: string;
      };

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const client = await app.pg.connect();
      try {
        const result = await client.query(
          "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id",
          [username, passwordHash]
        );
        return reply.status(201).send({ userId: result.rows[0].id });
      } catch (error: any) { 
        if (error.code === "23505") {
          return reply.status(409).send({ message: "Username already exists." });
        }
        throw error;
      } finally {
        client.release();
      }
    }
  );

  app.post(
    "/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string" },
            password: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { username, password } = request.body as {
        username: string;
        password: string;
      };

      const client = await app.pg.connect();
      try {
        const result = await client.query(
          "SELECT id, password_hash, role FROM users WHERE username = $1",
          [username]
        );

        if (result.rowCount === 0) {
          return reply.status(401).send({ message: "Invalid credentials." });
        }

        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
          return reply.status(401).send({ message: "Invalid credentials." });
        }

        const token = app.jwt.sign({ id: user.id, role: user.role });
        return { token };
      } finally {
        client.release();
      }
    }
  );
}
