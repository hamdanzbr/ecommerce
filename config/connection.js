// config/connection.js
require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.DATABASE; // MongoDB Atlas connection string

const state = {
    db: null
};

module.exports.connect = function () {
    return new Promise((resolve, reject) => {
        MongoClient.connect(uri, { useUnifiedTopology: true }, (err, client) => {
            if (err) {
                console.error('MongoDB Atlas connection error:', err);
                reject(err); // Reject the Promise if an error occurs
            } else {
                console.log('MongoDB Atlas connected successfully');
                state.db = client.db(process.env.DB_NAME); // Set the connected database to the state
                resolve();
            }
        });
    });
};

module.exports.get = function () {
    return state.db;
};
