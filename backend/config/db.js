import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables immediately
dotenv.config();

const connectDB = async () => {
  // Validate that the required MONGO_URI exists
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI environment variable is missing.");
    process.exit(1);
  }

  // Debugging log as requested
  console.log("MONGO_URI exists:", !!process.env.MONGO_URI);

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
