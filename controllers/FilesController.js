import { ObjectID } from 'mongodb';
import File from '../utils/file';
import dbClient from '../utils/db';
import fileQueue from '../worker';

class FilesController {
  static
  async postUpload(req, res) {
    const user = req.currentUser;
    const currentUser = { ...user, id: user.id };
    const {
      name, type, data, parentId, isPublic,
    } = req.body;

    try {
      const file = new File(
        currentUser.id, name, type, parentId, isPublic, data,
      );
      const savedFile = await file.save();
      if (savedFile.type === 'image') {
        fileQueue.add({
          userId: currentUser.id,
          fileId: savedFile.id,
        });
      }
      return res.status(201).json(savedFile);
    } catch (error) {
      console.log(error);
      res.statusCode = 500;
      return res.json({ error: 'An error occured' });
    }
  }

  static
  async getShow(req, res) {
    const { id } = req.params;
    const user = req.currentUser;

    try {
      const fileCollections = dbClient.db.collection('files');
      const results = await fileCollections.find({
        _id: new ObjectID(id), userId: user._id,
      }).toArray();
      if (!results.length) {
        res.statusCode = 404;
        return res.json({ error: 'Not found' });
      }
      res.statusCode = 200;
      return res.json(results[0]);
    } catch (error) {
      res.statusCode = 500;
      return res.json({ error: 'An error occured.' });
    }
  }

  static
  async getIndex(req, res) {
    const { parentId, page } = req.query;

    try {
      const nfiles = await dbClient.nbFiles();
      const nPages = Math.floor(nfiles / 20);

      const fileCollections = dbClient.db.collection('files');
      const results = await fileCollections.find({ parentId }).toArray();
      let row = results;
      let startIndex = 0;
      let endIndex = 19;
      if (results.length > 20) {
        if (page && (page <= 1 && page < nPages)) {
          startIndex = (page - 1) * 20;
          endIndex = startIndex + 19;
        }
        row = results.slice(startIndex, endIndex + 1);
      }

      res.statusCode = 200;
      res.json(row);
    } catch (error) {
      res.statusCode = 500;
      res.json({ error: 'An error occured.' });
    }
  }

  static
  async putPublish(req, res) {
    const { id } = req.params;
    const user = req.currentUser;

    try {
      const fileCollection = dbClient.db.collection('files');
      const result = await fileCollection.find({
        _id: new ObjectID(id), userId: user.id,
      }).toArray();
      if (!result.length) {
        res.statusCode = 404;
        return res.json({ error: 'Not found' });
      }
      const row = result[0];
      row.isPublic = true;
      res.statusCode = 200;
      return res.json(row);
    } catch (error) {
      res.statusCode = 500;
      return res.json({ error: 'An error occured.' });
    }
  }

  static
  async putUntPublish(req, res) {
    const { id } = req.params;
    const user = req.currentUser;

    try {
      const fileCollection = dbClient.db.collection('files');
      const result = await fileCollection.find({
        _id: new ObjectID(id), userId: user.id,
      }).toArray();
      if (!result.length) {
        res.statusCode = 404;
        return res.json({ error: 'Not found' });
      }

      const row = result[0];
      row.isPublic = false;
      res.statusCode = 200;
      return res.json(row);
    } catch (error) {
      res.statusCode = 500;
      return res.json({ error: 'An error occured.' });
    }
  }
}
export default FilesController;
