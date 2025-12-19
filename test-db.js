const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
console.log("Testing connection to:", uri.replace(/:([^:@]+)@/, ':****@')); // Hide password

const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000 // Timeout faster
});

async function run() {
    try {
        console.log("Attempting to connect...");
        await client.connect();
        console.log("Connected successfully to server");
        const db = client.db(process.env.DB_NAME || 'nexbyteind_db_user');
        console.log("Database selected:", db.databaseName);
        process.exit(0);
    } catch (err) {
        console.error("Connection failed!");
        console.error("Error name:", err.name);
        console.error("Error message:", err.message);
        if (err.cause) console.error("Cause:", err.cause);
        process.exit(1);
    }
}
run();
