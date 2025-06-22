import { v4 as uuidv4 } from 'uuid';
import fs, { promises as fsPromises } from 'fs';
import mime from 'mime-types';
import path from 'path';
import Queue from 'bull';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';

class FileController {
  // postUpload endpoint
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

    const user = await dbClient.db
      .collection('users')
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
      const parentFile = await dbClient.db
        .collection('files')
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
      await fsPromises.mkdir(folderPath, { recursive: true });
      const filename = uuidv4();
      const localPath = path.resolve(folderPath, filename);

      await fsPromises.writeFile(localPath, Buffer.from(data, 'base64'));
      newFile.localPath = localPath;
    }

    const result = await dbClient.db.collection('files').insertOne(newFile);

    // Create Bull queue for image file type
    if (type === 'image') {
      const fileQueue = new Queue('fileQueue');
      await fileQueue.add({
        userId: userId.toString(),
        fileId: result.insertedId.toString(),
      });
    }

    return response.status(201).json({
      id: result.insertedId,
      userId,
      name,
      type,
      isPublic,
      parentId,
    });
  }

  // getShow endpoint
  static async getShow(request, response) {
    const token = request.headers['x-token'];

    if (!token) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = request.params.id;

    const file = await dbClient.db.collection('files').findOne({
      _id: dbClient.ObjectId(fileId),
      userId: dbClient.ObjectId(userId),
    });

    if (!file) {
      return response.status(404).json({ error: 'Not found' });
    }

    return response.status(200).json({
      id: file._id.toString(),
      userId: file.userId.toString(),
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId.toString(),
    });
  }

  // getIndex endpoint
  static async getIndex(request, response) {
    const token = request.headers['x-token'];

    if (!token) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const parentId = request.query.parentId || '0';
    const page = parseInt(request.query.page, 10) || 0;

    const query = { userId: dbClient.ObjectId(userId) };

    if (parentId !== 0) {
      if (dbClient.ObjectId.isValid(parentId)) {
        query.parentId = dbClient.ObjectId(parentId);
      } else {
        return response.status(200).json([]);
      }
    } else {
      query.parentId = '0';
    }

    const files = await dbClient.db.collection('files')
      .aggregate([
        { $match: query },
        { $skip: page * 20 },
        { $limit: 20 },
      ]).toArray();

    const formattedFiles = files.map((file) => ({
      id: file._id.toString(),
      userId: file.userId.toString(),
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId.toString(),
    }));

    return response.status(200).json(formattedFiles);
  }

  // putPublish endpoint
  static async putPublish(request, response) {
    const token = request.headers['x-token'];

    if (!token) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = request.params.id;

    const file = await dbClient.db.collection('files').findOne({
      _id: dbClient.ObjectId(fileId),
      userId: dbClient.ObjectId(userId),
    });

    if (!file) {
      return response.status(404).json({ error: 'Not found' });
    }

    await dbClient.db.collection('files').updateOne(
      { _id: dbClient.ObjectId(fileId) },
      { $set: { isPublic: true } },
    );

    file.isPublic = true;
    return response.status(200).json({
      id: file._id.toString(),
      userId: file.userId.toString(),
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId.toString(),
    });
  }

  // putUnPublish endpoint
  static async putUnPublish(request, response) {
    const token = request.headers['x-token'];

    if (!token) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = request.params.id;

    const file = await dbClient.db.collection('files').findOne({
      _id: dbClient.ObjectId(fileId),
      userId: dbClient.ObjectId(userId),
    });

    if (!file) {
      return response.status(404).json({ error: 'Not found' });
    }

    await dbClient.db.collection('files').updateOne(
      { _id: dbClient.ObjectId(fileId) },
      { $set: { isPublic: false } },
    );

    file.isPublic = false;
    return response.status(200).json({
      id: file._id.toString(),
      userId: file.userId.toString(),
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId.toString(),
    });
  }

  // getFile endpoint
  static async getFile(request, response) {
    const fileId = request.params.id;

    const file = await dbClient.db.collection('files')
      .findOne({ _id: dbClient.ObjectId(fileId) });

    if (!file) {
      return response.status(404).json({ error: 'Not found' });
    }

    if (!file.isPublic) {
      const token = request.headers['x-token'];

      if (!token) {
        return response.status(404).json({ error: 'Not found' });
      }

      const key = `auth_${token}`;
      const userId = await redisClient.get(key);

      if (!userId || userId.toString() !== file.userId.toString()) {
        return response.status(404).json({ error: 'Not found' });
      }
    }

    if (file.type === 'folder') {
      return response.status(400).json({ error: "A folder doesn't have content" });
    }

    if (!file.localPath) {
      return response.status(404).json({ error: 'Not found' });
    }

    let filePath = file.localPath;

    const { size } = request.query;

    if (size && ['500', '250', '100'].includes(size)) {
      filePath = `${file.localPath}_${size}`;
    }

    if (!fs.existsSync(filePath)) {
      return response.status(404).json({ error: 'Not found' });
    }

    const fileMimeType = mime.lookup(file.name);

    const fileContent = fs.readFileSync(filePath);

    response.setHeader('Content-Type', fileMimeType);
    return response.status(200).send(fileContent);
  }
}

export default FileController;
