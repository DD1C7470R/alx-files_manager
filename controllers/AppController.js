import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  static
  getStatus(req, res) {
    try {
      if (redisClient.isAlive() && dbClient) {
        res.statusCode = 200;
        res.json({ redis: true, db: true });
      }
    } catch (error) {
      res.statusCode = 500;
      res.json({ message: 'An error occured' });
    }
  }

  static
  async getStats(req, res) {
    try {
      const numberOfUsers = await dbClient.nbUsers();
      const numberOfFiles = await dbClient.nbFiles();
      res.statusCode = 200;
      res.json({
        users: numberOfUsers,
        files: numberOfFiles,
      });
    } catch (error) {
      res.statusCode = 500;
      res.json({ message: 'An error occured' });
    }
  }
}

export default AppController;
