const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok' }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/organization', require('./routes/organizationRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));
app.use(errorHandler);

module.exports = app;
