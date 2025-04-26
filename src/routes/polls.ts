import { FastifyInstance } from "fastify";
import { request } from "http";

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
            [pollId, option]
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

  app.post(
    "/polls/:id/vote",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["optionId"],
          properties: {
            optionId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    async (request, reply) => {
      const { id: pollId } = request.params as { id: string };
      const { optionId } = request.body as { optionId: string };

      const client = await app.pg.connect();

      try {
        await client.query("BEGIN");

        // check poll and option exist
        const optionCheck = await client.query(
          `
          SELECT id FROM options
          WHERE id = $1 AND poll_id = $2
          `,
          [optionId, pollId]
        );
        if (optionCheck.rowCount === 0) {
          await client.query("ROLLBACK");
          return reply
            .code(400)
            .send({ message: "Invalid option for this poll." });
        }

        // insert vote
        await client.query(
          `
          INSERT INTO votes (poll_id, option_id)
          VALUES ($1, $2)
          `,
          [pollId, optionId]
        );

        await client.query(
          `
          UPDATE options
          SET vote_count = vote_count + 1
          WHERE id = $1
          `,
          [optionId]
        );

        await client.query("COMMIT");
        return reply.code(200).send({ message: "Vote cast successfully." });
      } catch (error: any) {
        await client.query("ROLLBACK");

        // for duplicate vote
        if (error.code === "23505") {
          return reply
            .code(400)
            .send({ message: "Already voted in this poll." });
        }

        throw error;
      } finally {
        client.release();
      }
    }
  );

  app.get(
    "/polls/:id",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const client = await app.pg.connect();

      try {
        const pollResult = await client.query(
          "SELECT id, question FROM polls WHERE id = $1",
          [id]
        );
        if (pollResult.rowCount === 0) {
          return reply.code(404).send({ message: "Poll not found." });
        }

        const optionsResult = await client.query(
          "SELECT id, text FROM options WHERE poll_id = $1",
          [id]
        );

        return {
          id: pollResult.rows[0].id,
          question: pollResult.rows[0].question,
          options: optionsResult.rows,
        };
      } finally {
        client.release();
      }
    }
  );
}
