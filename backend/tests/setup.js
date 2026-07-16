const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const Employee = require('../src/models/Employee');

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';

let mongod;

const startDB = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
};

const stopDB = async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
};

const clearDB = async () => {
  await Employee.deleteMany({});
};

const seedUsers = async () => {
  const admin = await Employee.create({
    employeeId: 'T-001', name: 'Admin User', email: 'admin@test.com', password: 'Admin@123',
    phone: '9999900001', department: 'Management', designation: 'CEO',
    salary: 100000, joiningDate: '2020-01-01', role: 'SUPER_ADMIN',
  });
  const hr = await Employee.create({
    employeeId: 'T-002', name: 'HR User', email: 'hr@test.com', password: 'Hr@12345',
    phone: '9999900002', department: 'HR', designation: 'HR Manager',
    salary: 80000, joiningDate: '2020-02-01', role: 'HR_MANAGER',
  });
  const emp = await Employee.create({
    employeeId: 'T-003', name: 'Plain Employee', email: 'emp@test.com', password: 'Emp@1234',
    phone: '9999900003', department: 'Engineering', designation: 'Developer',
    salary: 60000, joiningDate: '2021-03-01', role: 'EMPLOYEE',
  });
  return { admin, hr, emp };
};

module.exports = { startDB, stopDB, clearDB, seedUsers };
