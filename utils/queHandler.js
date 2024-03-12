import Queue from 'bull';
import generateThumbnail from 'image-thumbnail';
import { ObjectID } from 'mongodb';
import { promises } from 'fs';
import dbClient from './db';

const { writeFile } = promises;

const THUMBNAIL_SIZES = [500, 250, 100];

export const userQueue = new Queue('user-welcome-worker', {
  redis: {
    host: 'localhost',
    port: 6379,
  },
});

async function createAndSaveThumbnail(path, width) {
  const thumbnail = await generateThumbnail(
    path, { width, responseType: 'base64' },
  );
  const filePath = `${path}_${width}`;
  await writeFile(filePath, Buffer.from(thumbnail, 'base64'));
}

const fileQueue = new Queue('image-thumbnail-worker', {
  redis: {
    host: 'localhost',
    port: 6379,
  },
});

fileQueue.process(async (job, done) => {
  const { userId, fileId } = job.data;
  if (!fileId) { done(new Error('Missing fileId')); }
  if (!userId) { done(new Error('Missing userId')); }

  const filesCollection = dbClient.db.collection('files');
  const file = await filesCollection.findUserFileById({ userId, _id: fileId });
  if (!file) { done(new Error('File not found')); }

  THUMBNAIL_SIZES.forEach(async (size) => {
    await createAndSaveThumbnail(file.localPath, size);
  });
  done();
});

userQueue.process(async (job, done) => {
  const { userId } = job.data;
  if (!userId) { done(new Error('Missing userId')); }

  const userCollections = dbClient.db.collection('users');
  const user = await userCollections.find({ _id: new ObjectID(userId) });
  if (!user.length) { done(new Error('Not found')); }

  console.log(`Welcome ${user[0].email}`);
  done();
});
export default fileQueue;
