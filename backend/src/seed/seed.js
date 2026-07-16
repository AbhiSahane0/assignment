/**
 * Seeds the database with a demo organization.
 * Run: npm run seed
 *
 * Login credentials after seeding:
 *   Super Admin : admin@ems.com    / Admin@123
 *   HR Manager  : hr@ems.com       / Hr@12345
 *   Employee    : arjun.rao@ems.com / Emp@1234  (any employee, same password)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Employee = require('../models/Employee');

const avatar = (seed) => `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}`;

async function seed() {
  await connectDB();
  await Employee.deleteMany({});
  console.log('Cleared existing employees.');

  const mk = async (data) => Employee.create({ profileImage: avatar(data.name), ...data });

  const admin = await mk({
    employeeId: 'EMP-001', name: 'Aditi Sharma', email: 'admin@ems.com', password: 'Admin@123',
    phone: '9876500001', department: 'Management', designation: 'Chief Executive Officer',
    salary: 250000, joiningDate: '2018-04-01', role: 'SUPER_ADMIN',
  });

  const hr = await mk({
    employeeId: 'EMP-002', name: 'Rahul Verma', email: 'hr@ems.com', password: 'Hr@12345',
    phone: '9876500002', department: 'Human Resources', designation: 'HR Manager',
    salary: 95000, joiningDate: '2019-06-15', role: 'HR_MANAGER', reportingManager: admin._id,
  });

  const engHead = await mk({
    employeeId: 'EMP-003', name: 'Sneha Iyer', email: 'sneha.iyer@ems.com', password: 'Emp@1234',
    phone: '9876500003', department: 'Engineering', designation: 'VP Engineering',
    salary: 180000, joiningDate: '2019-01-10', reportingManager: admin._id,
  });

  const salesHead = await mk({
    employeeId: 'EMP-004', name: 'Vikram Malhotra', email: 'vikram.m@ems.com', password: 'Emp@1234',
    phone: '9876500004', department: 'Sales', designation: 'Sales Director',
    salary: 150000, joiningDate: '2019-09-01', reportingManager: admin._id,
  });

  const techLead = await mk({
    employeeId: 'EMP-005', name: 'Arjun Rao', email: 'arjun.rao@ems.com', password: 'Emp@1234',
    phone: '9876500005', department: 'Engineering', designation: 'Tech Lead',
    salary: 130000, joiningDate: '2020-02-17', reportingManager: engHead._id,
  });

  const qaLead = await mk({
    employeeId: 'EMP-006', name: 'Priya Nair', email: 'priya.nair@ems.com', password: 'Emp@1234',
    phone: '9876500006', department: 'Engineering', designation: 'QA Lead',
    salary: 110000, joiningDate: '2020-07-20', reportingManager: engHead._id,
  });

  const others = [
    ['EMP-007', 'Karan Mehta', 'karan.mehta@ems.com', 'Engineering', 'Senior Developer', 105000, '2021-03-08', techLead._id, 'ACTIVE'],
    ['EMP-008', 'Divya Pillai', 'divya.pillai@ems.com', 'Engineering', 'Frontend Developer', 85000, '2021-11-22', techLead._id, 'ACTIVE'],
    ['EMP-009', 'Rohan Gupta', 'rohan.gupta@ems.com', 'Engineering', 'Backend Developer', 88000, '2022-01-05', techLead._id, 'ACTIVE'],
    ['EMP-010', 'Ananya Singh', 'ananya.singh@ems.com', 'Engineering', 'QA Engineer', 72000, '2022-06-13', qaLead._id, 'ACTIVE'],
    ['EMP-011', 'Farhan Khan', 'farhan.khan@ems.com', 'Sales', 'Account Executive', 78000, '2021-08-02', salesHead._id, 'ACTIVE'],
    ['EMP-012', 'Meera Joshi', 'meera.joshi@ems.com', 'Sales', 'Sales Associate', 62000, '2022-09-19', salesHead._id, 'ACTIVE'],
    ['EMP-013', 'Tanvi Desai', 'tanvi.desai@ems.com', 'Marketing', 'Marketing Manager', 92000, '2020-12-01', admin._id, 'ACTIVE'],
    ['EMP-014', 'Nikhil Bose', 'nikhil.bose@ems.com', 'Marketing', 'Content Specialist', 58000, '2023-02-27', null, 'ACTIVE'],
    ['EMP-015', 'Sara Fernandes', 'sara.f@ems.com', 'Finance', 'Finance Manager', 98000, '2021-05-10', admin._id, 'ACTIVE'],
    ['EMP-016', 'Dev Patel', 'dev.patel@ems.com', 'Finance', 'Accountant', 64000, '2023-07-03', null, 'INACTIVE'],
    ['EMP-017', 'Ishaan Kapoor', 'ishaan.k@ems.com', 'Human Resources', 'HR Executive', 55000, '2023-10-16', hr._id, 'ACTIVE'],
    ['EMP-018', 'Lakshmi Menon', 'lakshmi.m@ems.com', 'Engineering', 'DevOps Engineer', 95000, '2024-01-08', techLead._id, 'INACTIVE'],
  ];

  let i = 7;
  for (const [employeeId, name, email, department, designation, salary, joiningDate, manager, status] of others) {
    await mk({
      employeeId, name, email, password: 'Emp@1234',
      phone: `98765000${String(i).padStart(2, '0')}`,
      department, designation, salary, joiningDate,
      reportingManager: manager, status,
    });
    i += 1;
  }

  // Fix the two unassigned: report to their department heads
  await Employee.updateOne({ employeeId: 'EMP-014' }, { reportingManager: (await Employee.findOne({ employeeId: 'EMP-013' }))._id });
  await Employee.updateOne({ employeeId: 'EMP-016' }, { reportingManager: (await Employee.findOne({ employeeId: 'EMP-015' }))._id });

  const count = await Employee.countDocuments();
  console.log(`Seeded ${count} employees.`);
  console.log('\nLogin credentials:');
  console.log('  Super Admin : admin@ems.com     / Admin@123');
  console.log('  HR Manager  : hr@ems.com        / Hr@12345');
  console.log('  Employee    : arjun.rao@ems.com / Emp@1234');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
