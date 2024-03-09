import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.isConnected = false;

    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
    this.client.on('connect', () => {
      this.isConnected = true;
    });
    this.promisifiedClientDel = promisify(this.client.DEL).bind(this.client);
    this.promisifiedClientSet = promisify(this.client.SETEX).bind(this.client);
    this.promisifiedClientGet = promisify(this.client.GET).bind(this.client);
    this.promisifiedClientEx = promisify(this.client.expire).bind(this.client);
  }

  isAlive() {
    return this.isConnected;
  }

  async get(value) {
    return this.promisifiedClientGet(value);
  }

  async set(key, value, expireTime) {
    return this.promisifiedClientSet(key, expireTime, value);
  }

  async del(key) {
    return this.promisifiedClientDel(key);
  }
}
const redisClient = new RedisClient();
export default redisClient;

