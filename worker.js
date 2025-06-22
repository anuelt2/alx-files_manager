import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue');

fileQueue.process(async (job, done) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    done(new Error('Missing fileId'));
    return;
  }

  if (!userId) {
    done(new Error('Missing userId'));
  }

  const file = await dbClient.db.collection('files').findOne({
    _id: dbClient.ObjectId(fileId),
    userId: dbClient.ObjectId(userId),
  });

  if (!file) {
    done(new Error('File not found'));
  }

  const widths = [500, 250, 100];

  await Promise.all(widths.map(async (width) => {
    const thumbnail = await imageThumbnail(file.localPath, { width });
    const thumbnailPath = `${file.localPath}_${width}`;
    await fs.promises.writeFile(thumbnailPath, thumbnail);
  }));

  done();
});

export default fileQueue;
