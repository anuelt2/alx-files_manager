import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import { MongoClient } from 'mongodb';
import redis from 'redis';
import { promisify } from 'util';
import app from '../server';

chai.use(chaiHttp);

let token = null;
let fileId = null;

describe('files manager API', function () {
  this.timeout(10000);

  let db;
  let redisClient;

  before(async () => {
    const mongoClient = await MongoClient.connect('mongodb://localhost:27017', { useUnifiedTopology: true });
    db = mongoClient.db('files_manager_test');

    redisClient = redis.createClient();
    redisClient.get = promisify(redisClient.get).bind(redisClient);
    redisClient.del = promisify(redisClient.del).bind(redisClient);

    await db.collection('users').deleteMany({});
    await db.collection('files').deleteMany({});
  });

  after(() => {
    redisClient.quit();
  });

  describe('basic endpoints', () => {
    it('endpoint GET /status - should return Redis and DB status', async () => {
      const res = await chai.request(app).get('/status');
      expect(res).to.have.status(200);
      expect(res.body).to.deep.equal({ redis: true, db: true });
    });

    it('endpoint GET /stats - should return number of users and files', async () => {
      const res = await chai.request(app).get('/stats');
      expect(res).to.have.status(200);
      expect(res.body).to.have.keys(['users', 'files']);
    });
  });

  describe('user registration and authentication', () => {
    it('endpoint POST /users - should create a new user', async () => {
      const res = await chai.request(app)
        .post('/users')
        .send({ email: 'test@example.com', password: '1234' });

      expect(res).to.have.status(201);
      expect(res.body).to.have.property('email');
    });

    it('endpoint GET /connect - should return token', async () => {
      const auth = Buffer.from('test@example.com:1234').toString('base64');
      const res = await chai.request(app)
        .get('/connect')
        .set('Authorization', `Basic ${auth}`);

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('token');
      token = res.body.token;
    });

    it('endpoint GET /users/me - should return user info', async () => {
      const res = await chai.request(app)
        .get('/users/me')
        .set('X-Token', token);

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('email', 'test@example.com');
    });

    it('endpoint GET /disconnect - should logout user', async () => {
      const res = await chai.request(app)
        .get('/disconnect')
        .set('X-Token', token);

      expect(res).to.have.status(204);
    });
  });

  describe('file uploads', () => {
    before(async () => {
      const auth = Buffer.from('test@example.com:1234').toString('base64');
      const res = await chai.request(app).get('/connect').set('Authorization', `Basic ${auth}`);
      token = res.body.token;
    });

    it('endpoint POST /files - should upload a file', async () => {
      const fileData = Buffer.from('Sample content').toString('base64');
      const res = await chai.request(app)
        .post('/files')
        .set('X-Token', token)
        .send({ name: 'sample.txt', type: 'file', data: fileData });

      expect(res).to.have.status(201);
      expect(res.body).to.have.property('id');
      fileId = res.body.id;
    });

    it('endpoint GET /files/:id - should fetch file info', async () => {
      const res = await chai.request(app)
        .get(`/files/${fileId}`)
        .set('X-Token', token);

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('name', 'sample.txt');
    });

    it('endpoint GET /files - should list files with pagination', async () => {
      const res = await chai.request(app)
        .get('/files')
        .set('X-Token', token);

      expect(res).to.have.status(200);
      expect(res.body).to.be.an('array');
    });

    it('endpointPUT /files/:id/publish - should make file public', async () => {
      const res = await chai.request(app)
        .put(`/files/${fileId}/publish`)
        .set('X-Token', token);

      expect(res).to.have.status(200);
      expect(res.body.isPublic).to.be.true;
    });

    it('endpoint PUT /files/:id/unpublish - should make file private', async () => {
      const res = await chai.request(app)
        .put(`/files/${fileId}/unpublish`)
        .set('X-Token', token);

      expect(res).to.have.status(200);
      expect(res.body.isPublic).to.be.false;
    });

    it('endpointGET /files/:id/data - should fetch file content', async () => {
      const res = await chai.request(app)
        .get(`/files/${fileId}/data`)
        .set('X-Token', token);

      expect(res).to.have.status(200);
      expect(res.text).to.equal('Sample content');
    });
  });

  describe('thumbnails (optional if image)', () => {
    it('endpoint GET /files/:id/data?size=250 - should return 404 for thumbnail not generated yet', async () => {
      const res = await chai.request(app)
        .get(`/files/${fileId}/data?size=250`)
        .set('X-Token', token);

      expect(res).to.have.status(404);
    });
  });
});
