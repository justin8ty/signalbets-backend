import { FastifyInstance } from "fastify";

export async function pollRoutes(app: FastifyInstance) {
  app.post(
    "/polls",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 hour",
        },
      },
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
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
      preHandler: [async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch (err) {
          reply.code(401).send({ message: 'Unauthorized' });
        }
      }],
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
      const userId = request.user.id;

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
          INSERT INTO votes (poll_id, option_id, user_id)
          VALUES ($1, $2, $3)
          `,
          [pollId, optionId, userId]
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

        // await app.redis.del(`poll-results:${pollId}`);
        // app.log.info({ pollId }, "Cache invalidated");

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

      const sendResults = async () => {
        try {
          type PollResultRow = {
            option_id: string;
            vote_count: string;
          };

          const pollResult = await client.query<PollResultRow>(
            `
            SELECT o.id as option_id, o.vote_count
            FROM options o
            WHERE o.poll_id = $1
            ORDER BY o.created_at ASC
            `,
            [pollId]
          );

          const results = pollResult.rows.reduce((acc: Record<string, number>, row: PollResultRow) => {
            acc[row.option_id] = parseInt(row.vote_count, 10) || 0;
            return acc;
          }, {});

          const total_votes = pollResult.rows.reduce((acc: number, row: PollResultRow) => acc + (parseInt(row.vote_count, 10) || 0), 0);

          const payload = {
            type: "VOTE_UPDATE",
            poll_id: pollId,
            results: results,
            total_votes: total_votes,
            timestamp: new Date().toISOString(),
          };

          connection.send(JSON.stringify(payload));
        } catch (e) {
          req.log.error(e, `Failed to send results for pollId: ${pollId}`);
        }
      };

      const onNotification = (msg: any) => {
        if (msg.payload === pollId) {
          sendResults();
        }
      };

      try {
        await client.query("LISTEN poll_votes");
        client.on("notification", onNotification);

        // send current results on connection
        await sendResults();

        connection.socket.on("close", () => {
          client.removeListener("notification", onNotification);
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
      // const { id } = request.params as { id: string };
      // const cacheKey = `poll-results:${id}`;

      // try {
      //   const cachedResults = await app.redis.get(cacheKey);
      //   if (cachedResults) {
      //     app.log.info({ pollId: id }, "Cache Hit");
      //     return reply.send(JSON.parse(cachedResults));
      //   }

      //   app.log.info({ pollId: id }, "Cache Miss");
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
            [(request.params as { id: string }).id]
          );

          if (pollResult.rowCount === 0) {
            return reply.code(404).send({ message: "Poll not found." });
          }

          const results = pollResult.rows;
          // await app.redis.set(cacheKey, JSON.stringify(results), "EX", 30);

          return reply.send(results);
        } finally {
          client.release();
        }
      // } catch (error) {
      //   app.log.error(error, "Error fetching poll results");
      //   throw error;
      // }
    }
  );

  app.delete(
    "/polls/:id",
    {
      config: {
        rateLimit: {
          max: 50,
          timeWindow: "1 minute",
          keyGenerator: (request: any) => request.user.id,
        },
      },
      preHandler: [async (request, reply) => {
        try {
          await request.jwtVerify();
          if (request.user.role !== 'admin') {
            reply.code(403).send({ message: 'Forbidden' });
          }
        } catch (err) {
          reply.code(401).send({ message: 'Unauthorized' });
        }
      }],
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
        await client.query("BEGIN");
        await client.query("DELETE FROM votes WHERE poll_id = $1", [id]);
        await client.query("DELETE FROM options WHERE poll_id = $1", [id]);
        const result = await client.query("DELETE FROM polls WHERE id = $1", [id]);
        await client.query("COMMIT");

        if (result.rowCount === 0) {
          return reply.code(404).send({ message: "Poll not found." });
        }

        return reply.code(204).send();
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }
  );

  app.get("/polls", {
    schema: {
      querystring: {
        type: "object",
        properties: {
          page: { type: "integer", minimum: 1, default: 1 },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
  }, async (request, reply) => {
    const { page, limit } = request.query as { page: number; limit: number };
    const offset = (page - 1) * limit;

    const client = await app.pg.connect();
    try {
      const totalResult = await client.query("SELECT COUNT(*) FROM polls");
      const total = parseInt(totalResult.rows[0].count, 10);

      const pollsResult = await client.query(
        `
        SELECT id, question, created_at
        FROM polls
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        `,
        [limit, offset]
      );

      return {
        polls: pollsResult.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } finally {
      client.release();
    }
  });
}
