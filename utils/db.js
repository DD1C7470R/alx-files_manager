import MongoClient from 'mongodb/lib/mongo_client';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '27017';
    const database = process.env.DB_DATABASE || 'files_manager';

    const url = `mongodb://${host}:${port}/${database}`;
    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.client.connect((err) => {
      if (err) {
        console.log('connection failed', err);
      }
    });
    this.db = this.client.db();
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    const userDocs = this.db.collection('users');
    return userDocs.countDocuments();
  }

  async nbFiles() {
    const fileCollection = this.db.collection('files');
    return fileCollection.countDocuments();
  }
}
const dbClient = new DBClient();
export default dbClient;
