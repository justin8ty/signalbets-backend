import { FastifyInstance } from "fastify";

export async function pollRoutes(app: FastifyInstance) {
  app.post(
    "/polls",
    {
      schema: {
        body: {
          type: "object",
          required: ["question", "options"],
          properties: {
            question: { type: "string", maxLength: 255 },
            options: {
              type: "array",
              minItems: 2,
              maxItems: 5,
              items: { type: "string", maxLength: 100 },
            },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              pollId: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { question, options } = request.body as {
        question: string;
        options: string[];
      };

      const uniqueOptions = new Set(options);
      if (uniqueOptions.size !== options.length) {
        return reply.status(400).send({ message: "Options must be unique." });
      }

      const client = await app.pg.connect();
      try {
        await client.query("BEGIN");

        const pollResult = await client.query<[{ id: string }]>(
          `
          INSERT INTO polls (question)
          VALUES ($1)
          RETURNING id
          `,
          [question]
        );
        const pollId = pollResult.rows[0].id;

        for (const option of options) {
          await client.query(
            `
            INSERT INTO options (poll_id, text)
            VALUES ($1, $2)
            `,
            [pollId, question]
          );
        }

        await client.query("COMMIT");

        return reply.status(201).send({ pollId });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }
  );
}
