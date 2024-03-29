import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { existsSync, promises } from 'fs';
import { ObjectID } from 'mongodb';
import mime from 'mime-types';

import fileQueue from '../utils/queHandler';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const { mkdir, writeFile, readFile } = promises;

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
          parentId: parentId ? new ObjectID(parentId) : 0,
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

      if (type === 'image') {
        fileQueue.add({
          userId: user._id,
          fileId: result.insertedId,
        });
      }

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

    try {
      const fileCollections = dbClient.db.collection('files');
      const results = await fileCollections.find({
        _id: new ObjectID(id), userId: new ObjectID(user._id),
      }).toArray();
      if (!results.length) {
        res.statusCode = 404;
        return res.json({ error: 'Not found' });
      }

      return res.status(200).json(results[0]);
    } catch (error) {
      res.statusCode = 400;
      return res.json({ error: 'An error occured.' });
    }
  }

  static
  async getIndex(req, res) {
    const user = req.currentUser;
    let { parentId, page } = req.query;
    let query = { userId: new ObjectID(user._id) };

    try {
      if (parentId === '0' || !parentId) parentId = 0;
      page = Number.isNaN(page) ? 0 : Number(page);

      const MAX_PAGE_SIZE = 20;
      const fileCollections = dbClient.db.collection('files');

      if (!parentId === 0) {
        const parent = await fileCollections.find({ _id: new ObjectID(parentId) }).toArray();
        if (!parent.length || parent[0].type !== 'folder') {
          return res.status(200).json([]);
        }
      }
      query = {
        userId: query.userId,
        parentId: parentId === 0 ? '0' : new ObjectID(parentId),
      };
      const results = await fileCollections.find(query)
        .skip(page * MAX_PAGE_SIZE).limit(MAX_PAGE_SIZE).toArray();

      const modifyResult = results.map((file) => ({
        ...file,
        id: file._id,
        _id: undefined,
        localPath: undefined,
      }));
      return res.status(200).json(modifyResult);
    } catch (error) {
      console.log(error);
      res.statusCode = 400;
      return res.json({ error: 'An error occured.' });
    }
  }

  static
  async putPublish(req, res) {
    const { id } = req.params;
    const user = req.currentUser;

    try {
      const fileCollection = dbClient.db.collection('files');
      const result = await fileCollection.find({
        _id: new ObjectID(id), userId: user._id,
      }).toArray();
      if (!result.length) {
        res.statusCode = 404;
        return res.json({ error: 'Not found' });
      }
      const row = result[0];
      row.isPublic = true;
      await fileCollection.updateOne({
        _id: new ObjectID(id), userId: user._id,
      }, { $set: { isPublic: true } });
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
        _id: new ObjectID(id), userId: user._id,
      }).toArray();
      if (!result.length) {
        res.statusCode = 404;
        return res.json({ error: 'Not found' });
      }

      const row = result[0];
      row.isPublic = false;
      await fileCollection.updateOne({
        _id: new ObjectID(id), userId: user._id,
      }, { $set: { isPublic: false } });
      return res.status(200).json(row);
    } catch (error) {
      res.statusCode = 500;
      return res.json({ error: 'An error occured.' });
    }
  }

  static
  async getFile(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];
    // const { size } = req.query;

    try {
      const userId = await redisClient.get(`auth_${token}`);
      const fileCollection = dbClient.db.collection('files');
      const result = await fileCollection.find({
        _id: new ObjectID(id),
      }).toArray();
      if (!result.length) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (
        !result[0].isPublic
        && (!userId || String(userId) !== String(result[0].userId))
      ) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (result[0].type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" });
      }

      const filePath = result[0].localPath;

      if (!existsSync(filePath)) {
        return res.status(404).json({ error: 'Not found' });
      }
      const fileContent = await readFile(filePath);

      const mimeType = mime.lookup(result[0].name);
      res.set('Content-Type', mimeType);
      return res.status(200).send(fileContent);
    } catch (error) {
      console.log(error);
      return res.status(400).json({ error: 'Not found' });
    }
  }
}

export default FilesController;
