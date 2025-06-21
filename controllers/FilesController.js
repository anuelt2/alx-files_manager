import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';

class FileController {
  static async postUpload(request, response) {
    const token = request.headers['x-token'];

    if (!token) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const user = await dbClient.db.collection('users')
      .findOne({ _id: dbClient.ObjectId(userId) });

    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name,
      type,
      parentId = 0,
      isPublic = false,
      data,
    } = request.body;

    const fileTypes = ['folder', 'file', 'image'];

    if (!name) {
      return response.status(400).json({ error: 'Missing name' });
    }

    if (!type || !fileTypes.includes(type)) {
      return response.status(400).json({ error: 'Missing type' });
    }

    if (!data && type !== 'folder') {
      return response.status(400).json({ error: 'Missing data' });
    }

    if (parentId !== 0) {
      const parentFile = await dbClient.db.collection('files')
        .findOne({ _id: dbClient.ObjectId(parentId) });

      if (!parentFile) {
        return response.status(400).json({ error: 'Parent not found' });
      }

      if (parentFile.type !== 'folder') {
        return response.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const newFile = {
      userId: dbClient.ObjectId(userId),
      name,
      type,
      parentId: parentId === 0 ? 0 : dbClient.ObjectId(parentId),
      isPublic,
    };

    if (newFile.type !== 'folder') {
      await fs.mkdir(folderPath, { recursive: true });
      const filename = uuidv4();
      const localPath = path.resolve(folderPath, filename);

      await fs.writeFile(localPath, Buffer.from(data, 'base64'));
      newFile.localPath = localPath;
    }

    const result = await dbClient.db.collection('files').insertOne(newFile);
    return response.status(201).json({
      id: result.insertedId,
      userId,
      name,
      type,
      isPublic,
      parentId,
    });
  }
}

export default FileController;
