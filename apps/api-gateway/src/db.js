import mongoose from 'mongoose';

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb+srv://ritham4ritham_db_user:<imoogi..7F%24>@cluster0.v4e1yhq.mongodb.net/';
  
  try {
    console.log(`⏳ Connecting to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.warn('⚠️  SIEM platform is running in Sandbox Memory Mode. Data will not persist across restarts.');
    return false;
  }
};

export default connectDB;
