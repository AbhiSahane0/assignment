/**
 * Starts a throwaway in-memory MongoDB on localhost:27017 for local
 * development when neither Docker nor a system MongoDB is available.
 * Data is lost when the process exits. Run: node scripts/dev-db.js
 */
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongod = await MongoMemoryServer.create({
    instance: { port: 27017, ip: '127.0.0.1' },
  });
  console.log(`In-memory MongoDB running at ${mongod.getUri()}`);
  console.log('Press Ctrl+C to stop (all data will be discarded).');
})();
