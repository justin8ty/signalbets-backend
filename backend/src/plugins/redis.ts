import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import Redis from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

async function redisPlugin(app: FastifyInstance) {
  // const redis = new Redis(process.env.REDIS_URL!);

  // app.decorate('redis', redis);

  // app.addHook('onClose', async (instance) => {
  //   await instance.redis.quit();
  // });
}

export default fp(redisPlugin);
