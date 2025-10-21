import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("Authourized User DB connected");
  } catch (err) {
    console.error("DB connection error", err);
    process.exit(1);
  }
};
