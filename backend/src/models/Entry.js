import mongoose from "mongoose";

const entrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    entryDate: {
      type: Date,
      required: true
    },
    mood: {
      type: String,
      enum: ["happy", "neutral", "sad"],
      default: "neutral"
    },
    tags: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

export const Entry = mongoose.model("Entry", entrySchema);
