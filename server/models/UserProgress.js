import mongoose from "mongoose";

const userProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    topicMap: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TopicMap",
      required: true,
    },
    nodeStatuses: {
      type: Map,
      of: String,
      default: {},
    },
    nodeNotes: {
      type: Map,
      of: String,
      default: {},
    },
    stats: {
      total: Number,
      known: Number,
      partial: Number,
      unknown: Number,
    },
  },
  { timestamps: true }
);

userProgressSchema.index({ user: 1, topicMap: 1 }, { unique: true });

export default mongoose.model("UserProgress", userProgressSchema);
