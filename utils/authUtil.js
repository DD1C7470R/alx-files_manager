import { ObjectID } from 'mongodb';

import dbClient from './db';
import redisClient from './redis';

export async function verifyUser(req, res, next) {
  const token = req.headers['x-token'];

  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    res.statusCode = 401;
    return res.json({ error: 'Unauthorized' });
  }
  const userCollections = dbClient.db.collection('users');
  const user = await userCollections.find({ _id: new ObjectID(userId) }).toArray();
  if (!user.length) {
    res.statusCode = 403;
    return res.json({ error: 'forbiden' });
  }
  req.currentUser = user[0];
  next();
}

export async function verifyUserEx(req, res, next) {
  const token = req.headers['x-token'];

  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    res.statusCode = 401;
    return res.json({ error: 'Unauthorized' });
  }
  const userCollections = dbClient.db.collection('users');
  const user = await userCollections.find({ _id: new ObjectID(userId) }).toArray();
  if (!user.length) {
    res.statusCode = 403;
    return res.json({ error: 'forbiden' });
  }
  req.currentUser = user;
  next();
}
