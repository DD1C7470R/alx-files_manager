import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';


function hashPassword(password) {
  const sha1 = crypto.createHash('sha1');
  sha1.update(password);
  return sha1.digest('hex');
}


class AuthController {
  static
  async getConnect(req, res) {
    const { authorization } = req.headers;
    const authToken = authorization.split('Basic ')[1];
    const decodedToken = Buffer.from(authToken, 'base64').toString();
    const credentials = decodedToken.split(':');
    const [email, password] = credentials;

    if (!email || !password) {
      res.statusCode = 400;
      return res.json({ error: `Missing ${email ? 'password' : 'email'}` });
    }

    try {
      const usersCollection = dbClient.db.collection('users');
      const user = await usersCollection.find({ email }).toArray();

      if (!user.length) {
        res.statusCode = 401;
        return res.json({ error: 'Unauthorized' });
      }

      const hashedpassword = hashPassword(password);

      if (hashedpassword !== user[0].password) {
        res.statusCode = 401;
        return res.json({ error: 'password is incorrect' });
      }

      const token = uuidv4();
      const expireTime = 24 * 60 * 60; // Current timestamp + 24 hours
      redisClient.set(`auth_${token}`, user[0]._id, expireTime);

      res.statusCode = 200;
      return res.json({ token });
    } catch (error) {
      res.statusCode = 500;
      return res.json({ message: 'An error occured' });
    }
  }

  static
  async getDisconnect(req, res) {
    const token = req.headers['x-token'];

    try {
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        res.statusCode = 401;
        return res.json({ error: 'Unauthorized' });
      }
	  await redisClient.del(`auth_${token}`);
      res.statusCode = 204;
      res.json();
    } catch (error) {
      res.statusCode = 500;
      res.json({ error: 'An error occured' });
    }
  }
}
export default AuthController;
