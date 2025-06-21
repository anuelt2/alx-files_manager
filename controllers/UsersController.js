import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(request, response) {
    const { email, password } = request.body || {};

    if (!email) {
      return response.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return response.status(400).json({ error: 'Missing password' });
    }

    try {
      const userExists = await dbClient.db.collection('users').findOne({ email });

      if (userExists) {
        return response.status(400).json({ error: 'Already exist' });
      }

      const hashedPassword = sha1(password);
      const result = await dbClient.db.collection('users')
        .insertOne({ email, password: hashedPassword });

      return response.status(201).json({ id: result.insertedId, email });
    } catch (error) {
      return response.status(500).json({ error: 'Internal serber error' });
    }
  }

  static async getMe(request, response) {
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

    return response.status(200).json({ id: user._id, email: user.email });
  }
}

export default UsersController;
