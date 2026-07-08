import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables immediately
dotenv.config();

const connectDB = async () => {
  // Support both MONGO_URI and MONGODB_URI to prevent deployment crashes
  const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoURI) {
    console.error("MONGO_URI environment variable is missing.");
    process.exit(1);
  }

  // Debugging logs
  console.log("Database connection string exists:", !!mongoURI);

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
