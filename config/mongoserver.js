const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/Ecomm', { useMongoClient: true });

module.exports = mongoose.connection;