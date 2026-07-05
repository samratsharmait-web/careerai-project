const mongoose = require("mongoose");

const ResumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    targetCareer: {
      type: String,
      required: true
    },

    currentStatus: {
      type: String
    },

    resumeText: {
      type: String,
      required: true
    },

    jobDescription: {
      type: String
    },

    careerScore: {
      type: Number
    },

    resumeScore: {
      type: Number
    },

    atsScore: {
      type: Number
    },

    extractedSkills: {
      type: String
    },

    feasibilityRating: {
      type: String
    },

    recommendedSkills: {
      type: String
    },

    missingSkills: {
      type: String
    },

    roadmap: {
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
    },

    improvementSuggestions: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

const Resume = mongoose.model("Resume", ResumeSchema);

module.exports = Resume;