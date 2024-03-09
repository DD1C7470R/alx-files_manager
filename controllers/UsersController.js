import crypto from 'crypto';

import dbClient from '../utils/db';

class UsersController {
  static
  async postNew(req, res) {
    const { email } = req.body;
    const { password } = req.body;

    if (!email || !password) {
      res.statusCode = 400;
      return res.json({ error: `Missing ${email ? 'password' : 'email'}` });
    }

    try {
      const usersCollection = dbClient.db.collection('users');
      const user = await usersCollection.find({ email }).toArray();

      if (user.length) {
        res.statusCode = 400;
        return res.json({ error: 'Already exist' });
      }

      const hashedpassword = hashPassword(password);
      const savedUser = await usersCollection.insertOne({
        email,
        password: hashedpassword,
      });

      res.statusCode = 200;
      res.json({
        id: savedUser.insertedId,
        email,
      });
    } catch (error) {
      res.statusCode = 500;
      res.json({ message: 'An error occured' });
    }
  }

  static
  async getMe(req, res) {
    const user = req.currentUser;
    try {
      res.statusCode = 200;
      res.json({
        id: user._id,
        email: user.email,
      });
    } catch (error) {
      res.statusCode = 500;
      res.json({ message: 'An error occured' });
    }
  }
}

function hashPassword(password) {
  const sha1 = crypto.createHash('sha1');
  sha1.update(password);
  return sha1.digest('hex');
}
export default UsersController;
