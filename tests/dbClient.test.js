import { expect } from 'chai';
import dbClient from '../utils/db';
import { MongoClient } from 'mongodb';

describe('dbClient', () => {
  
  before(async () => {
    const mongoClient = await MongoClient.connect('mongodb://localhost:27017', { useUnifiedTopology: true });
    const db = mongoClient.db('files_manager');

    await db.collection('users').deleteMany({});
    await db.collection('files').deleteMany({});
  });

  it('should be alive and connected to MongoDB', () => {
    expect(dbClient.isAlive()).to.be.true;
  });

  it('should return number of users (initially 0)', async () => {
    const count = await dbClient.nbUsers();
    expect(count).to.be.a('number');
    expect(count).to.equal(0);
  });

  it('should return number of files (initially 0)', async () => {
    const count = await dbClient.nbFiles();
    expect(count).to.be.a('number');
    expect(count).to.equal(0);
  });
});
