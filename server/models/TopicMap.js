import mongoose from "mongoose";

const nodeSchema = new mongoose.Schema(
  {
    id: String,
    label: String,
    description: String,
    parentId: String,
    depth: Number,
  },
  { _id: false }
);

const topicMapSchema = new mongoose.Schema(
  {
    topic: {
      type: String,
      required: true,
      unique: true,
      index: true, // 🔥 added for performance
    },
    nodes: [nodeSchema],
  },
  { timestamps: true }
);

export default mongoose.model("TopicMap", topicMapSchema);