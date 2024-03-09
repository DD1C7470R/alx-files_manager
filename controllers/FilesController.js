import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs';
import { promisify } from 'util';
import { ObjectID } from 'mongodb';
import dbClient from '../utils/db';

class FilesController {
  static
  async postUpload(req, res) {
    let file = {};
    const acceptedTypes = ['file', 'folder', 'image'];
    const user = req.currentUser;
    const {
      name, type, data, parentId, isPublic,
    } = req.body;

    if (!name || !type || !acceptedTypes.includes(type)) {
      res.statusCode = 400;
      return res.json({ error: `Missing ${name ? 'type' : 'name'}` });
    }
    if (!data && type !== 'folder') {
      res.statusCode = 400;
      return res.json({ error: 'Missing data' });
    }

    try {
      const fileCollections = dbClient.db.collection('files');

      if (parentId) {
        file = await fileCollections.find({ parentId }).toArray();
        if (!file.length) {
          res.statusCode = 400;
          return res.json({ error: 'Parent not found' });
        }
        if (file && file[0].type !== 'folder') {
          res.statusCode = 400;
          return res.json({ error: 'Parent is not a folder' });
        }
      }

      const savedFile = {
        userId: user._id,
        name,
        type,
        isPublic: isPublic || false,
        parentId: parentId || '0',
        ...file,
      };

      if (type === 'folder') {
        const result = await fileCollections.insertOne({ ...savedFile });
        res.statusCode = 201;
        return res.json({
          id: result.insertedId,
          userId: user._id,
          name,
          type,
          isPublic: isPublic || false,
          parentId: parentId || '0',
        });
      }

      let folderPath = process.env.FOLDER_PATH;
      if (!folderPath) {
        folderPath = '/tmp/files_manager';
      }
      const localPath = uuidv4();
      const filePath = path.join(folderPath, localPath);

      if (data) {
        const fileData = Buffer.from(data, 'base64').toString();
        const fileWriter = promisify(writeFile);
        await fileWriter(filePath, fileData);
      }

      const result = await fileCollections.insertOne({ ...savedFile, localPath: filePath });

      res.statusCode = 201;
      return res.json({
        id: result.insertedId,
        ...savedFile,
      });
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
