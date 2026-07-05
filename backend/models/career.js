const mongoose = require("mongoose");

const CareerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    career: {
      type: String,
      required: true
    },

    skills: {
      type: String,
      required: true
    },

    recommendation: {
      type: String
    },

    careerScore: {
      type: Number
    },

    skillGap: {
      type: String
    },

    roadmap: {
      type: String
    },

    feasibilityRating: {
      type: String
    },

    estimatedTime: {
      type: String
    },

    aiAdvisory: {
      type: String
    },

    aiReplacementRisk: {
      type: String
    },

    futureRelevance: {
      type: String
    },

    futureDemandScore: {
      type: Number
    }
  },
  {
    timestamps: true
  }
);

const Career = mongoose.model("Career", CareerSchema);

module.exports = Career;