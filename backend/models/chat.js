const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    question: {
      type: String,
      required: true,
      trim: true
    },

    answer: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;