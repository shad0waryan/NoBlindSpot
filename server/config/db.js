import dns from "dns";
import mongoose from "mongoose";

// Some local network setups (VPNs, local DNS proxies) point Node's resolver
// at a server that doesn't answer SRV queries, even though the OS resolver
// works fine. Fall back to public DNS so `mongodb+srv://` lookups succeed.
dns.setServers([...dns.getServers(), "8.8.8.8", "1.1.1.1"]);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
