import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables immediately
dotenv.config();

const connectDB = async () => {
  const rawURI = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!rawURI) {
    console.error("MONGO_URI environment variable is missing.");
    process.exit(1);
  }

  // Sanitize the URI by stripping < > brackets around credentials if present
  let sanitizedURI = rawURI.trim();
  if (sanitizedURI.includes('<') || sanitizedURI.includes('>')) {
    sanitizedURI = sanitizedURI.replace(/<([^>]+)>/g, '$1');
  }

  // Safely print the URI by obfuscating the password portion for logs
  const safeURI = sanitizedURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  console.log("MONGO_URI exists: true");
  console.log("Connecting to Database:", safeURI);

  try {
    const conn = await mongoose.connect(sanitizedURI);
    console.log("Connected to MongoDB");
    console.log("✓ MongoDB Connected");
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
