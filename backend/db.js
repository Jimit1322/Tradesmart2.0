// db.js
import { MongoClient } from "mongodb";

const uri = "mongodb://localhost:27017"; // Replace with Atlas URI if needed
const dbName = "tradesmart";

let client;
let db;

export const connectDB = async () => {
  if (db) return db; // already connected

  client = new MongoClient(uri, { useUnifiedTopology: true });
  await client.connect();
  console.log("✅ Connected to MongoDB");

  db = client.db(dbName);
  return db;
};

export const getCollection = async (collectionName) => {
  const database = await connectDB();
  return database.collection(collectionName);
};
