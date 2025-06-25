import { expect } from 'chai';
import redisClient from '../utils/redis';

describe('redisClient', () => {
  it('should be alive and connected to Redis', () => {
    expect(redisClient.isAlive()).to.be.true;
  });

  it('should set and get a value', async () => {
    await redisClient.set('test_key', 'test_value', 10);
    const value = await redisClient.get('test_key');
    expect(value).to.equal('test_value');
  });

  it('should delete a value', async () => {
    await redisClient.set('delete_key', 'to_be_deleted', 10);
    await redisClient.del('delete_key');
    const value = await redisClient.get('delete_key');
    expect(value).to.be.null;
  });
});
