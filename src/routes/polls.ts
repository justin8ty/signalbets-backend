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

      // check duplicate
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

        await client.query(`NOTIFY poll_votes, '${pollId}'`);

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
    "/polls/:id/results/ws",
    { websocket: true },
    async (connection, req) => {
      const { id: pollId } = req.params as { id: string };
      const client = await app.pg.connect();

      const onNotification = async (msg: any) => {
        if (msg.payload === pollId) {
          const pollResult = await client.query(
            `
            SELECT p.id, p.question, o.id AS option_id, o.text, o.vote_count
            FROM polls p
            JOIN options o ON p.id = o.poll_id
            WHERE p.id = $1
            ORDER BY o.created_at ASC
            `,
            [pollId]
          );
          connection.send(JSON.stringify(pollResult.rows));
        }
      };

      try {
        await client.query("LISTEN poll_votes");
        client.on("notification", onNotification);

        // send current results on connection
        const initialResult = await client.query(
          `
          SELECT p.id, p.question, o.id AS option_id, o.text, o.vote_count
          FROM polls p
          JOIN options o ON p.id = o.poll_id
          WHERE p.id = $1
          ORDER BY o.created_at ASC
          `,
          [pollId]
        );
        connection.send(JSON.stringify(initialResult.rows));

        connection.on("close", async () => {
          await client.query("UNLISTEN poll_votes");
          client.release();
        });
      } catch (e) {
        req.log.error(e, `An error occurred in the WebSocket route for pollId: ${pollId}`);
        client.release();
      }
    }
  );

  // fetch poll
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
      const { id } = request.params as { id: string };
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

  // fetch results
  app.get(
    "/polls/:id/results",
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
      const { id } = request.params as { id: string };
      const client = await app.pg.connect();

      try {
        const pollResult = await client.query(
          `
        SELECT p.id, p.question, o.id AS option_id, o.text, COALESCE(v.vote_count, 0) AS vote_count
        FROM polls p
        LEFT JOIN options o ON p.id = o.poll_id
        LEFT JOIN (
          SELECT option_id, COUNT(*) AS vote_count
          FROM votes
          WHERE poll_id = $1
          GROUP BY option_id
        ) v ON o.id = v.option_id
        WHERE p.id = $1
        `,
          [id]
        );

        if (pollResult.rowCount === 0) {
          return reply.code(404).send({ message: "Poll not found." });
        }

        return reply.send(pollResult.rows);
      } finally {
        client.release();
      }
    }
  );
}
