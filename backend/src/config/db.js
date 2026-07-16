const mongoose = require('mongoose');

const connectDB = async (uri) => {
  const mongoUri = uri || process.env.MONGO_URI || 'mongodb://localhost:27017/ems';
  await mongoose.connect(mongoUri);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};

module.exports = connectDB;
