import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { promises } from 'fs';
import { ObjectID } from 'mongodb';
import dbClient from '../utils/db';

const { mkdir, writeFile } = promises;

class FilesController {
  static
  async postUpload(req, res) {
    const user = req.currentUser;
    const {
      name, type, data, parentId, isPublic,
    } = req.body;

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
        const sfile = await fileCollections.find({ _id: new ObjectID(parentId) }).toArray();
        if (!sfile.length) {
          return res.status(400).json({ error: 'Parent not found' });
        }
        if (sfile && sfile[0].type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }

      if (type === 'folder') {
        const result = await fileCollections.insertOne({
          userId: new ObjectID(user._id),
          name,
          type: 'folder',
          isPublic,
          parentId: parentId || 0,
        });
        res.statusCode = 201;
        return res.json({
          id: result.insertedId,
          userId: user._id,
          name,
          type: 'folder',
          isPublic,
          parentId: parentId || 0,
        });
      }
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      const localPath = uuidv4();
      const filePath = path.join(folderPath, localPath);
      if (data) {
        await mkdir(folderPath, { recursive: true });
        const fileData = Buffer.from(data, 'base64');
        await writeFile(filePath, fileData);
      }
      const result = await fileCollections.insertOne({
        userId: new ObjectID(user._id),
        name,
        type,
        isPublic,
        parentId: parentId ? new ObjectID(parentId) : 0,
        localPath: filePath,
      });
      res.statusCode = 201;
      return res.json({
        id: result.insertedId,
        userId: user._id,
        name,
        type,
        isPublic,
        parentId: parentId || 0,
      });
    } catch (error) {
      console.log(error);
      res.statusCode = 400;
      return res.json({ error: 'An error occurred.' });
    }
  }

  static
  async getShow(req, res) {
    const { id } = req.params;
    const user = req.currentUser;
    // const row = [];

    try {
      const fileCollections = dbClient.db.collection('files');
      const results = await fileCollections.find({
        _id: new ObjectID(id), userId: new ObjectID(user._id),
      }).toArray();
      if (!results.length) {
        res.statusCode = 404;
        return res.json({ error: 'Not found' });
      }

      res.statusCode = 200;
      // for (const obj of results[0]) {
      //   row.push({
      //     id: new ObjectID(obj._id),
      //     userId: new ObjectID(obj.userId),
      //     name: obj.name,
      //     type: obj.type,
      //     isPublic: obj.isPublic,
      //     parentId: new ObjectID(obj.parentId) || 0,
      //   });
      // }
      return res.json(results[0]);
    } catch (error) {
      res.statusCode = 400;
      return res.json({ error: 'An error occured.' });
    }
  }

  static
  async getIndex(req, res) {
    const user = req.currentUser;
    const { parentId, page } = req.query;

    try {
      const MAX_PAGE_SIZE = 20;
      const fileCollections = dbClient.db.collection('files');
      const results = await fileCollections.find({
        userId: new ObjectID(user._id),
        parentId: new ObjectID(parentId),
      })
        .skip(page * MAX_PAGE_SIZE).limit(MAX_PAGE_SIZE).toArray();

      // const filteredResults = [];
      // for (const obj of results) {
      //   filteredResults.push({
      //     id: new ObjectID(obj._id),
      //     userId: new ObjectID(obj.userId),
      //     name: obj.name,
      //     type: obj.type,
      //     isPublic: obj.isPublic,
      //     parentId: new ObjectID(obj.parentId) || 0,
      //   });
      // }
      res.statusCode = 200;
      res.json(results);
    } catch (error) {
      res.statusCode = 400;
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
