import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { promises } from 'fs';
import { ObjectID } from 'mongodb';
import dbClient from '../utils/db';

const { mkdir, writeFile } = promises;

class FilesController {
  static
  async postUpload(req, res) {
    let file = {};
    const user = req.currentUser;
    const {
      name, type, data, parentId, isPublic,
    } = req.body;

    file = {
      name, type, data, parentId, isPublic,
    };
    const FILE_TYPES = ['file', 'folder', 'image'];
    if (!name || !type || !FILE_TYPES.includes(type)) {
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
        let sfile = [];
        if (parseInt(parentId, 10) === 0) {
          sfile = await fileCollections.find({ parentId }).toArray();
        } else {
          sfile = await fileCollections.find({ parentId: new ObjectID(parentId) }).toArray();
        }
        if (!sfile.length) {
          res.statusCode = 400;
          return res.json({ error: 'Parent not found' });
        }
        if (sfile && sfile[0].type !== 'folder') {
          res.statusCode = 400;
          return res.json({ error: 'Parent is not a folder' });
        }
        if (sfile.length) {
          file.parentId = sfile.parentId;
        }
      }
      const savedFile = {
        userId: new ObjectID(user._id),
        name,
        type,
        isPublic: file.isPublic,
        parentId: parentId === '0' ? '0' : new ObjectID(file.parentId),
      };
      if (type === 'folder') {
        const result = await fileCollections.insertOne({ ...savedFile });
        res.statusCode = 201;
        return res.json({
          id: result.insertedId,
          userId: user._id,
          name,
          type,
          isPublic: file.isPublic,
          parentId: file.parentId,
        });
      }
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      const localPath = uuidv4();
      const filePath = path.join(folderPath, localPath);
      if (data) {
        await mkdir(filePath, { recursive: true });
        const fileData = Buffer.from(data, 'base64').toString();
        await writeFile(filePath, fileData);
      }
      const result = await fileCollections.insertOne({ ...savedFile, localPath: filePath });
      res.statusCode = 201;
      return res.json({
        id: result.insertedId,
        userId: user._id,
        name,
        type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    } catch (error) {
      console.log(error);
      res.statusCode = 500;
      return res.json({ error: 'An error occurred.' });
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
