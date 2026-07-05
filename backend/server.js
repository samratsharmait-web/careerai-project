const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const User = require("./models/user");
const protect = require("./middleware/auth");
const Tesseract = require("tesseract.js");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const fs = require("fs");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const Career = require("./models/career");
const Resume = require("./models/resume");
const Chat = require("./models/chat");

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({
  dest: "uploads/"
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  console.log("Root route opened. Redirecting to login.");
  res.redirect("/login.html");
});

app.use(express.static(path.join(__dirname, "../frontend"), { index: false }));
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/career_guidance_db";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch((error) => console.log("MongoDB Connection Error:", error));



app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.json({
        success: false,
        message: "Please fill all registration fields."
      });
    }

    if (password.length < 6) {
      return res.json({
        success: false,
        message: "Password must be at least 6 characters long."
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.json({
        success: false,
        message: "User already exists with this email."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });

    await newUser.save();

    res.json({
      success: true,
      message: "Account created successfully. Please login now."
    });

 } catch (error) {
  console.log("Register Error:", error.message);

  res.json({
    success: false,
    message: error.message || "Registration failed. Please try again."
  });
}
});


app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({
        success: false,
        message: "Please enter email and password."
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.log("Login Error:", error);

    res.json({
      success: false,
      message: "Login failed. Please try again."
    });
  }
});

// ===============================
// FORGOT PASSWORD - SEND OTP
// ===============================
app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.json({
        success: false,
        message: "Email is required."
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user) {
      return res.json({
        success: false,
        message: "No account found with this email."
      });
    }

    const otp = generateOtp();
    const expiryMinutes = Number(process.env.OTP_EXPIRY_MINUTES) || 10;

    user.resetOtp = otp;
    user.resetOtpExpires = new Date(Date.now() + expiryMinutes * 60 * 1000);

    await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: "CareerAI Password Reset OTP",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>CareerAI Password Reset</h2>
          <p>Hello ${user.name || "User"},</p>
          <p>Your password reset OTP is:</p>
          <h1 style="letter-spacing: 4px;">${otp}</h1>
          <p>This OTP will expire in ${expiryMinutes} minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `
    });

    res.json({
      success: true,
      message: "OTP sent successfully to your email."
    });

  } catch (error) {
    console.log("Forgot Password Error:", error);

    res.json({
      success: false,
      message: "Unable to send OTP right now. Please try again later."
    });
  }
});


// ===============================
// RESET PASSWORD USING OTP
// ===============================
app.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.json({
        success: false,
        message: "Email, OTP, and new password are required."
      });
    }

    if (newPassword.length < 6) {
      return res.json({
        success: false,
        message: "Password must be at least 6 characters long."
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user) {
      return res.json({
        success: false,
        message: "No account found with this email."
      });
    }

    if (!user.resetOtp || !user.resetOtpExpires) {
      return res.json({
        success: false,
        message: "Please request a new OTP first."
      });
    }

    if (user.resetOtp !== otp.trim()) {
      return res.json({
        success: false,
        message: "Invalid OTP."
      });
    }

    if (user.resetOtpExpires < new Date()) {
      return res.json({
        success: false,
        message: "OTP expired. Please request a new OTP."
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = null;
    user.resetOtpExpires = null;

    await user.save();

    res.json({
      success: true,
      message: "Password reset successfully. Please login again."
    });

  } catch (error) {
    console.log("Reset Password Error:", error);

    res.json({
      success: false,
      message: error.message || "Password reset failed."
    });
  }
});


app.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    res.json({
      success: false,
      message: "Unable to fetch user profile."
    });
  }
});
app.get("/profile-summary", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    const careerReports = await Career.countDocuments({ userId: req.user.id });
    const resumeReports = await Resume.countDocuments({ userId: req.user.id });

    const totalReports = careerReports + resumeReports;

    let profileStrength = "New";
    if (totalReports >= 10) profileStrength = "Strong";
    else if (totalReports >= 4) profileStrength = "Developing";
    else if (totalReports >= 1) profileStrength = "Started";

    res.json({
      success: true,
      user: {
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      stats: {
        careerReports,
        resumeReports,
        totalReports,
        profileStrength
      }
    });

  } catch (error) {
    console.log("Profile Summary Error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load profile summary."
    });
  }
});


app.put("/update-profile", protect, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters long."
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { name: name.trim() },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email
      }
    });

  } catch (error) {
    console.log("Update Profile Error:", error);

    res.status(500).json({
      success: false,
      message: "Profile update failed."
    });
  }
});


app.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please enter current and new password."
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long."
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

if (!isMatch) {
  return res.status(400).json({
    success: false,
    message: "Current password is incorrect."
  });
}

const isSamePassword = await bcrypt.compare(newPassword, user.password);

if (isSamePassword) {
  return res.status(400).json({
    success: false,
    message: "New password cannot be the same as current password."
  });
}

user.password = await bcrypt.hash(newPassword, 10);
await user.save();

    res.json({
      success: true,
      message: "Password changed successfully. Please login again."
    });

  } catch (error) {
    console.log("Change Password Error:", error);

    res.status(500).json({
      success: false,
      message: "Password change failed."
    });
  }
});


app.post("/analyze", protect, async (req, res) => {
  try {
    const {
      career,
      skills,
      currentStatus,
      targetDeadline,
      studyHours
    } = req.body;

    if (!career || !skills || !currentStatus || !targetDeadline || !studyHours) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields."
      });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite"
    });

    const prompt = `
You are an advanced AI Career Guidance System.

Analyze this user professionally.

Career Goal: ${career}
Current Status: ${currentStatus}
Current Skills: ${skills}
Target Deadline: ${targetDeadline}
Daily Study Hours: ${studyHours}

Return ONLY valid JSON in this exact format:

{
  "careerScore": 0,
  "feasibilityRating": "",
  "recommendedSkills": "",
  "missingSkills": "",
  "roadmap": "",
  "estimatedTime": "",
  "aiAdvisory": "",
  "aiReplacementRisk": "",
  "futureRelevance": "",
  "futureDemandScore": 0
}

Strict rules:
- careerScore must be based ONLY on directly relevant technical skills.
- If skills are unrelated to the career goal, careerScore must be exactly 0.
- feasibilityRating must explain whether the goal is realistic within the given timeline and daily study hours.
- recommendedSkills must include 8 to 12 important practical skills.
- missingSkills must clearly list the major missing technical skills.
- roadmap must contain step-by-step phases with estimated durations.
- estimatedTime must be realistic.
- aiAdvisory must provide intelligent strategic guidance.
- aiReplacementRisk must classify the career as LOW, MEDIUM, or HIGH risk of AI replacement and explain why.
- futureRelevance must explain how this career will evolve in the next 10 years because of AI.
- futureDemandScore must be a realistic percentage from 0 to 100 showing future demand of this career with AI collaboration.
- Do not use markdown.
- Do not add anything outside JSON.
`;

    const result = await model.generateContent(prompt);
    let aiText = result.response.text();

    aiText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();

    let aiData;

    try {
      aiData = JSON.parse(aiText);
    } catch (jsonError) {
      console.log("Gemini JSON Parse Error:", jsonError.message);
      console.log("Gemini Raw Response:", aiText);

      return res.status(500).json({
        success: false,
        message: "AI returned invalid JSON. Please try again."
      });
    }

    let careerScore = Number(aiData.careerScore) || 0;
    if (careerScore > 100) careerScore = 100;
    if (careerScore < 0) careerScore = 0;

    const newCareer = new Career({
      userId: req.user.id,
      career,
      skills,
      recommendation: aiData.recommendedSkills,
      careerScore,
      skillGap: aiData.missingSkills,
      roadmap: aiData.roadmap,
      feasibilityRating: aiData.feasibilityRating,
      estimatedTime: aiData.estimatedTime,
      aiAdvisory: aiData.aiAdvisory,
      aiReplacementRisk: aiData.aiReplacementRisk,
      futureRelevance: aiData.futureRelevance,
      futureDemandScore: Number(aiData.futureDemandScore) || 0
    });

    await newCareer.save();

    return res.json({
      success: true,
      message: `
        <div class="result-card">
          <h2>Career AI Analysis Result</h2>

          <div class="score-box">
            <h3>${careerScore}%</h3>
            <p>Career AI Match Score</p>
          </div>

          <div class="result-section">
            <h4>🎯 Career Goal</h4>
            <p>${career}</p>
          </div>

          <div class="result-section">
            <h4>🎓 Current Status</h4>
            <p>${currentStatus}</p>
          </div>

          <div class="result-section">
            <h4>🧠 Current Skills</h4>
            <p>${skills}</p>
          </div>

          <div class="result-section">
            <h4>📅 Target Deadline</h4>
            <p>${targetDeadline}</p>
          </div>

          <div class="result-section">
            <h4>⏱️ Daily Practise Hours</h4>
            <p>${studyHours} Practise hours/day</p>
          </div>

          <div class="result-section">
            <h4>📊 Feasibility Rating</h4>
            <p>${aiData.feasibilityRating || "Not available"}</p>
          </div>

          <div class="result-section">
            <h4>✅ Recommended Skills</h4>
            <p>${aiData.recommendedSkills || "Not available"}</p>
          </div>

          <div class="result-section">
            <h4>❌ Missing Skills</h4>
            <p>${aiData.missingSkills || "Not available"}</p>
          </div>

          <div class="result-section">
            <h4>🚀 Suggested Roadmap With Time Duration</h4>
            <p>${aiData.roadmap || "Not available"}</p>
          </div>

          <div class="result-section">
            <h4>⏳ Estimated Completion Time</h4>
            <p>${aiData.estimatedTime || "Not available"}</p>
          </div>

          <div class="result-section">
            <h4>🤖 AI Advisory</h4>
            <p>${aiData.aiAdvisory || "Not available"}</p>
          </div>

          <div class="result-section future-section">
            <h4>⚠️ AI Replacement Risk</h4>
            <p>${aiData.aiReplacementRisk || "Not available"}</p>
          </div>

          <div class="result-section future-section">
            <h4>🔮 Future Relevance of This Career</h4>
            <p>${aiData.futureRelevance || "Not available"}</p>
          </div>

          <p class="success-msg">
            ✔ Career AI analysis generated successfully
          </p>
        </div>
      `
    });

  } catch (error) {
    console.log("Career AI Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Career AI analysis failed. Please try again."
    });
  }
});
app.post("/analyze-resume", protect, upload.single("resumeFile"), async (req, res) => {
  try {
    const { targetCareer, jobDescription } = req.body;

    let resumeText = "";

    if (req.file) {
      const filePath = req.file.path;
      const fileName = req.file.originalname.toLowerCase();

      try {
        if (fileName.endsWith(".pdf")) {
          const pdfBuffer = fs.readFileSync(filePath);
          const pdfData = await pdfParse(pdfBuffer);
          resumeText = pdfData.text || "";
        } 
        else if (fileName.endsWith(".docx")) {
          const result = await mammoth.extractRawText({ path: filePath });
          resumeText = result.value || "";
        } 
        else if (fileName.endsWith(".txt")) {
          resumeText = fs.readFileSync(filePath, "utf8");
        } 
        else if (
          fileName.endsWith(".png") ||
          fileName.endsWith(".jpg") ||
          fileName.endsWith(".jpeg")
        ) {
          const ocrResult = await Tesseract.recognize(filePath, "eng");
          resumeText = ocrResult.data.text || "";
        } 
        else {
          return res.json({
            success: false,
            message: "Unsupported file type. Upload PDF, DOCX, TXT, PNG, JPG, or JPEG."
          });
        }

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

      } catch (fileError) {
        console.log("Resume File Read Error:", fileError);

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        return res.json({
          success: false,
          message: "Unable to read this file. Try DOCX/TXT or paste resume text."
        });
      }
    } 
    else {
      resumeText = req.body.resumeText || "";
    }

    resumeText = resumeText.trim();

    if (!targetCareer || !resumeText) {
      return res.json({
        success: false,
        message: "Please enter target career and upload a readable resume or paste resume text."
      });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite"
    });

    const prompt = `
You are an advanced AI Career Guidance System.

Analyze the user's career readiness using the resume.

Target Career: ${targetCareer}
Resume Text: ${resumeText}
Job Description: ${jobDescription || "Not provided"}

Return ONLY valid JSON in this exact format:

{
  "careerScore": 0,
  "resumeScore": 0,
  "atsScore": 0,
  "extractedCurrentStatus": "",
  "extractedSkills": "",
  "feasibilityRating": "",
  "recommendedSkills": "",
  "missingSkills": "",
  "roadmap": "",
  "estimatedTime": "",
  "aiAdvisory": "",
  "aiReplacementRisk": "",
  "futureRelevance": "",
  "futureDemandScore": 0,
  "improvementSuggestions": ""
}

Strict rules:
- careerScore must be 0 to 100 and based on resume skills against the target career.
- resumeScore must be 0 to 100 and show resume strength.
- atsScore must be 0 to 100 and means resume shortlisting score.
- extractedCurrentStatus must infer student/job status from resume.
- extractedSkills must list skills found in resume.
- feasibilityRating must explain whether the career goal is realistic based on resume.
- recommendedSkills must include 8 to 12 practical skills.
- missingSkills must list important missing skills for the target career.
- roadmap must contain step-by-step phases with estimated duration.
- estimatedTime must be realistic.
- aiAdvisory must give practical career guidance.
- aiReplacementRisk must classify as LOW, MEDIUM, or HIGH with reason.
- futureRelevance must explain future scope of this career.
- futureDemandScore must be realistic 0 to 100.
- improvementSuggestions must focus only on improving the resume.
- Do not use markdown.
- Do not add anything outside JSON.
`;

    const result = await model.generateContent(prompt);
    let aiText = result.response.text();

    aiText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();

    const aiData = JSON.parse(aiText);

    const newResume = new Resume({
      userId: req.user.id,
      targetCareer,
      currentStatus: aiData.extractedCurrentStatus || "Extracted from resume",
      resumeText,
      jobDescription,
      careerScore: aiData.careerScore,
      resumeScore: aiData.resumeScore,
      atsScore: aiData.atsScore,
      extractedSkills: aiData.extractedSkills,
      feasibilityRating: aiData.feasibilityRating,
      recommendedSkills: aiData.recommendedSkills,
      missingSkills: aiData.missingSkills,
      roadmap: aiData.roadmap,
      estimatedTime: aiData.estimatedTime,
      aiAdvisory: aiData.aiAdvisory,
      aiReplacementRisk: aiData.aiReplacementRisk,
      futureRelevance: aiData.futureRelevance,
      futureDemandScore: aiData.futureDemandScore,
      improvementSuggestions: aiData.improvementSuggestions
    });

    await newResume.save();

    res.json({
      success: true,
      message: `
        <div class="result-card">
          <h2>Career Analysis From Resume</h2>

          <div class="report-summary-grid">
            <div class="summary-card">
              <h3>${aiData.careerScore || 0}%</h3>
              <p>Career Match Score</p>
            </div>

            <div class="summary-card">
              <h3>${Math.round((Number(aiData.resumeScore) || 0) / 10)}/10</h3>
              <p>Resume Strength</p>
              <small>Overall quality of your resume</small>
            </div>

            <div class="summary-card">
              <h3>${Math.round((Number(aiData.atsScore) || 0) / 10)}/10</h3>
              <p>Resume Shortlisting Score</p>
              <small>How well your resume passes hiring systems</small>
            </div>

            <div class="summary-card">
              <h3>${aiData.futureDemandScore || 0}%</h3>
              <p>Future Demand</p>
            </div>
          </div>

          <div class="result-section">
            <h4>🎯 Career Goal</h4>
            <p>${targetCareer}</p>
          </div>

          <div class="result-section">
            <h4>🎓 Extracted Current Status</h4>
            <p>${aiData.extractedCurrentStatus || "Not available"}</p>
          </div>

          <div class="result-section">
            <h4>🧠 Extracted Skills From Resume</h4>
            <p>${aiData.extractedSkills || "Not available"}</p>
          </div>

          <div class="result-section">
            <h4>📊 Feasibility Rating</h4>
            <p>${aiData.feasibilityRating || "Not available"}</p>
          </div>

          <div class="result-section">
            <h4>✅ Recommended Skills</h4>
            <p>${aiData.recommendedSkills || "Not available"}</p>
          </div>

          <div class="result-section">
            <h4>❌ Missing Skills</h4>
            <p>${aiData.missingSkills || "Not available"}</p>
          </div>

          <div class="result-section">
            <h4>🚀 Suggested Roadmap With Time Duration</h4>
            <p>${aiData.roadmap || "Not available"}</p>
          </div>

          <div class="result-section">
            <h4>⏳ Estimated Completion Time</h4>
            <p>${aiData.estimatedTime || "Not available"}</p>
          </div>

          <div class="result-section">
            <h4>🤖 AI Advisory</h4>
            <p>${aiData.aiAdvisory || "Not available"}</p>
          </div>

          <div class="result-section future-section">
            <h4>⚠️ AI Replacement Risk</h4>
            <p>${aiData.aiReplacementRisk || "Not available"}</p>
          </div>

          <div class="result-section future-section">
            <h4>🔮 Future Relevance of This Career</h4>
            <p>${aiData.futureRelevance || "Not available"}</p>
          </div>

          <div class="result-section">
            <h4>📝 Resume Improvement Suggestions</h4>
            <p>${aiData.improvementSuggestions || "Not available"}</p>
          </div>

          <p class="success-msg">
            ✔ Career analysis from resume generated successfully
          </p>
        </div>
      `
    });

  } catch (error) {
    console.log("Resume AI Error:", error);

    res.json({
      success: false,
      message: "Career analysis from resume failed. Please try again."
    });
  }
});
app.get("/analytics", protect, async (req, res) => {
  try {
   const careerHistory = await Career.find({ userId: req.user.id }).sort({ _id: -1 });
const resumeHistory = await Resume.find({ userId: req.user.id }).sort({ _id: -1 });

    const getCreatedAt = (item) => {
      if (item.createdAt) return item.createdAt;
      if (item._id && item._id.getTimestamp) return item._id.getTimestamp();
      return new Date();
    };

    const careerReports = careerHistory.map(item => ({
      _id: item._id,
      type: "career",
      source: "Career Analyzer",
      title: item.career || "Career Analysis",
      score: Number(item.careerScore) || 0,
      futureDemandScore: Number(item.futureDemandScore) || 0,
      skills: item.skills || "",
      missingSkills: item.skillGap || "",
      recommendedSkills: item.recommendation || "",
      createdAt: getCreatedAt(item)
    }));

    const resumeReports = resumeHistory.map(item => ({
      _id: item._id,
      type: "resume",
      source: "Resume Career AI",
      title: item.targetCareer || "Resume Analysis",
      score: Number(item.careerScore) || 0,
      resumeScore: Number(item.resumeScore) || 0,
      atsScore: Number(item.atsScore) || 0,
      futureDemandScore: Number(item.futureDemandScore) || 0,
      skills: item.extractedSkills || "",
      missingSkills: item.missingSkills || "",
      recommendedSkills: item.recommendedSkills || "",
      createdAt: getCreatedAt(item)
    }));

    const allReports = [...careerReports, ...resumeReports].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const totalAnalyses = allReports.length;
    const totalCareerReports = careerReports.length;
    const totalResumeReports = resumeReports.length;

    const average = (arr) => {
      if (!arr.length) return 0;
      return Math.round(arr.reduce((sum, num) => sum + num, 0) / arr.length);
    };

    const averageScore = average(allReports.map(item => item.score));
    const careerAverageScore = average(careerReports.map(item => item.score));
    const resumeAverageScore = average(resumeReports.map(item => item.score));

    const averageFutureDemand = average(
      allReports.map(item => item.futureDemandScore)
    );

    const highestReport = allReports.length
      ? allReports.reduce((best, item) => item.score > best.score ? item : best, allReports[0])
      : null;

    const highestDemandReport = allReports.length
      ? allReports.reduce(
          (best, item) => item.futureDemandScore > best.futureDemandScore ? item : best,
          allReports[0]
        )
      : null;

  const careerDemandMap = {};

allReports.forEach(item => {
  const title = (item.title || "Unknown").trim();
  const key = title.toLowerCase();
  const demand = Number(item.futureDemandScore) || 0;

  if (!careerDemandMap[key]) {
    careerDemandMap[key] = {
      title,
      futureDemandScore: demand,
      source: item.source,
      reportCount: 1
    };
  } else {
    careerDemandMap[key].reportCount++;

    // Keep the strongest future demand value for the same career
    if (demand > careerDemandMap[key].futureDemandScore) {
      careerDemandMap[key].futureDemandScore = demand;
      careerDemandMap[key].source = item.source;
    }
  }
});

const uniqueCareerDemands = Object.values(careerDemandMap);



const demandCounts = {
  high: 0,
  medium: 0,
  low: 0
};

const demandCareerNames = {
  high: [],
  medium: [],
  low: []
};

uniqueCareerDemands.forEach(item => {
  const demand = Number(item.futureDemandScore) || 0;
  const label = `${item.title} (${demand}%)`;

  if (demand >= 75) {
    demandCounts.high++;
    demandCareerNames.high.push(label);
  } else if (demand >= 45) {
    demandCounts.medium++;
    demandCareerNames.medium.push(label);
  } else {
    demandCounts.low++;
    demandCareerNames.low.push(label);
  }
});

const demandTotal = uniqueCareerDemands.length;



    const careerCounts = {};

    allReports.forEach(item => {
      const name = item.title || "Unknown";
      careerCounts[name] = (careerCounts[name] || 0) + 1;
    });

    const topCareers = Object.entries(careerCounts)
      .map(([career, count]) => ({ career, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    let profileStrength = "No Data";

    if (totalAnalyses > 0) {
      if (averageScore >= 75) profileStrength = "Strong";
      else if (averageScore >= 50) profileStrength = "Good";
      else if (averageScore >= 30) profileStrength = "Developing";
      else profileStrength = "Weak";
    }

    const lowScoreReportList = allReports
  .filter(item => item.score < 40)
  .map(item => ({
    _id: item._id,
    type: item.type,
    title: item.title,
    source: item.source,
    score: item.score,
    createdAt: item.createdAt
  }));

const weakResumeReportList = resumeReports
  .filter(item => item.resumeScore < 50)
  .map(item => ({
    _id: item._id,
    type: item.type,
    title: item.title,
    source: item.source,
    score: item.resumeScore,
    createdAt: item.createdAt
  }));

const highDemandReportList = allReports
  .filter(item => item.futureDemandScore >= 75)
  .map(item => ({
    _id: item._id,
    type: item.type,
    title: item.title,
    source: item.source,
    score: item.futureDemandScore,
    createdAt: item.createdAt
  }));

const notifications = [];

if (lowScoreReportList.length > 0) {
  notifications.push({
    title: `${lowScoreReportList.length} report(s) have score below 40%.`,
    category: "low-score",
    reports: lowScoreReportList
  });
}

if (weakResumeReportList.length > 0) {
  notifications.push({
    title: `${weakResumeReportList.length} resume report(s) need improvement.`,
    category: "weak-resume",
    reports: weakResumeReportList
  });
}

if (highDemandReportList.length > 0) {
  notifications.push({
    title: `${highDemandReportList.length} report(s) have high future demand.`,
    category: "high-demand",
    reports: highDemandReportList
  });
}

if (notifications.length === 0) {
  notifications.push({
    title: "No urgent dashboard alerts right now.",
    category: "normal",
    reports: []
  });
}

    res.json({
      success: true,

      totalAnalyses,
      totalCareerReports,
      totalResumeReports,

      averageScore,
      careerAverageScore,
      resumeAverageScore,

      highestScore: highestReport ? highestReport.score : 0,
      highestTitle: highestReport ? highestReport.title : "N/A",
      highestSource: highestReport ? highestReport.source : "N/A",

      averageFutureDemand,
      highestDemandScore: highestDemandReport ? highestDemandReport.futureDemandScore : 0,
      highestDemandTitle: highestDemandReport ? highestDemandReport.title : "N/A",
      highestDemandSource: highestDemandReport ? highestDemandReport.source : "N/A",

      profileStrength,
      profileNote: `${totalCareerReports} Career + ${totalResumeReports} Resume reports`,

      demandCounts,
      demandCareerNames,
      demandTotal,

      skillMatchPercent: averageScore,
      missingSkillPercent: Math.max(0, 100 - averageScore),

      topCareers,
      recentAnalyses: allReports.slice(0, 5),
      allReports,
      notifications
    });

  } catch (error) {
    console.log("Analytics Error:", error);

    res.json({
      success: false,
      message: "Unable to fetch analytics data."
    });
  }
});

app.get("/history", protect, async (req, res) => {
  try {
    const history = await Career.find({ userId: req.user.id })
      .sort({ _id: -1 })
      .limit(6);

    res.json({
      success: true,
      history: history
    });

  } catch (error) {
    res.json({
      success: false,
      message: "Unable to fetch career history."
    });
  }
});

app.get("/history/:id", protect, async (req, res) => {
  try {
    const career = await Career.findOne({
  _id: req.params.id,
  userId: req.user.id
});

    if (!career) {
      return res.status(404).json({
        success: false,
        message: "Career history not found."
      });
    }

    res.json({
      success: true,
      career
    });

  } catch (error) {
    console.log("Single Career History Fetch Error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch this career history."
    });
  }
});

app.delete("/history/:id", protect, async (req, res) => {
  try {
    await Career.findOneAndDelete({
  _id: req.params.id,
  userId: req.user.id
});

    res.json({
      success: true,
      message: "History deleted successfully."
    });

  } catch (error) {
    res.json({
      success: false,
      message: "Unable to delete history."
    });
  }
});

app.delete("/history", protect, async (req, res) => {
  try {
    await Career.deleteMany({ userId: req.user.id });

    res.json({
      success: true,
      message: "All history deleted successfully."
    });

  } catch (error) {
    res.json({
      success: false,
      message: "Unable to delete all history."
    });
  }
});
app.get("/resume-history", protect, async (req, res) => {
  try {
    const resumes = await Resume.find({ userId: req.user.id })
      .sort({ _id: -1 })
      .limit(5);

    res.json({
      success: true,
      resumes
    });
  } catch (error) {
    res.json({
      success: false,
      message: "Unable to fetch resume history."
    });
  }
});
app.get("/resume-history/:id", protect, async (req, res) => {
  try {
    const resume = await Resume.findOne({
  _id: req.params.id,
  userId: req.user.id
});

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume history not found."
      });
    }

    res.json({
      success: true,
      resume
    });

  } catch (error) {
    console.log("Single Resume History Fetch Error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch this resume history."
    });
  }
});
app.delete("/resume-history/:id", protect, async (req, res) => {
  try {
    await Resume.findOneAndDelete({
  _id: req.params.id,
  userId: req.user.id
});

    res.json({
      success: true,
      message: "Resume history deleted successfully."
    });

  } catch (error) {
    res.json({
      success: false,
      message: "Unable to delete resume history."
    });
  }
});
// ===============================
// CHATBOT UNWANTED MESSAGE LIMIT
// ===============================

const unwantedChatCounter = new Map();

const careerAllowedKeywords = [
  "career", "job", "resume", "cv", "skill", "skills",
  "roadmap", "interview", "project", "projects", "internship",
  "placement", "salary", "course", "learn", "learning",
  "developer", "engineer", "data", "ai", "ml", "frontend",
  "backend", "full stack", "software", "programming",
  "coding", "portfolio", "report", "analysis", "future",
  "scope", "demand", "ats", "shortlist", "shortlisting"
];

const unwantedSimpleMessages = [
  "hi", "hii", "hello", "hey", "hlo", "ho",
  "ok", "okay", "thanks", "thank you", "bye",
  "sdfsd", "asdf", "asdfg", "test", "testing"
];

function isRandomText(message) {
  const text = message.toLowerCase().trim();

  if (text.length <= 2) return true;

  const hasVowel = /[aeiou]/i.test(text);
  const hasManyRepeatedLetters = /(.)\1{3,}/.test(text);

  if (!hasVowel && text.length > 4) return true;
  if (hasManyRepeatedLetters) return true;

  return false;
}

function isCareerRelatedMessage(message) {
  const text = message.toLowerCase();

  return careerAllowedKeywords.some(keyword => text.includes(keyword));
}

function isUnwantedMessage(message) {
  const text = message.toLowerCase().trim();

  if (unwantedSimpleMessages.includes(text)) return true;
  if (isRandomText(text)) return true;
  if (!isCareerRelatedMessage(text)) return true;

  return false;
}

function getUnwantedLimitReply(count) {
  if (count >= 3) {
    return "Please ask according to career, your resume report, roadmap, skills, interview preparation, projects, or future career guidance.";
  }

  return "I can help you with career guidance, resume analysis, skills, roadmap, interview preparation, projects, and your saved reports. Please ask according to CareerAI.";
}

// ===============================
// AI CAREER CHATBOT
// ===============================
app.post("/chat", protect, async (req, res) => {
  try {
    console.log("CHAT ROUTE HIT");

    const { message } = req.body;

    console.log("User message:", message);

    if (!message || message.trim() === "") {
      return res.json({
        success: false,
        message: "Please enter a message."
      });
    }

    const userMessage = message.trim().toLowerCase();

const userKey = req.user.id.toString();

if (isUnwantedMessage(userMessage)) {
  const currentCount = unwantedChatCounter.get(userKey) || 0;
  const newCount = currentCount + 1;

  unwantedChatCounter.set(userKey, newCount);

  const reply = getUnwantedLimitReply(currentCount);

  const newChat = new Chat({
    userId: req.user.id,
    question: message,
    answer: reply
  });

  await newChat.save();

  return res.json({
    success: true,
    reply
  });
}

// Reset unwanted counter when user asks a proper career-related question
unwantedChatCounter.set(userKey, 0);

    const latestCareer = await Career.findOne({ userId: req.user.id }).sort({ _id: -1 });
    const latestResume = await Resume.findOne({ userId: req.user.id }).sort({ _id: -1 });

    console.log("Latest career found:", latestCareer ? "Yes" : "No");
    console.log("Latest resume found:", latestResume ? "Yes" : "No");

    const userContext = `
User Latest Career Analysis:
Career Goal: ${latestCareer?.career || "Not available"}
Current Skills: ${latestCareer?.skills || "Not available"}
Career Score: ${latestCareer?.careerScore || "Not available"}
Missing Skills: ${latestCareer?.skillGap || "Not available"}
Recommended Skills: ${latestCareer?.recommendation || "Not available"}
Roadmap: ${latestCareer?.roadmap || "Not available"}

User Latest Resume Analysis:
Target Career: ${latestResume?.targetCareer || "Not available"}
Resume Score: ${latestResume?.resumeScore || "Not available"}
ATS Score: ${latestResume?.atsScore || "Not available"}
Extracted Skills: ${latestResume?.extractedSkills || "Not available"}
Missing Skills: ${latestResume?.missingSkills || "Not available"}
Resume Suggestions: ${latestResume?.improvementSuggestions || "Not available"}
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite"
    });

 const prompt = `
You are CareerAI, a professional AI Career Counselor inside an AI Driven Career Guidance System.

Use the user's latest career analyzer and resume analyzer data only when the question is related to career, skills, resume, roadmap, interview, projects, jobs, learning plan, or future scope.

${userContext}

User Question:
${message}

Response rules:
- If the user message is a greeting, small talk, thanks, or simple casual message, reply in only 1 to 2 lines.
- Do not use career report format for casual messages.
- If the question is not related to career guidance, politely redirect the user to ask career-related questions.
- Do not use markdown symbols like **, ###, *, or >.
- Do not write very long paragraphs.
- Do not give generic motivation.
- Keep the answer practical and direct.
- For career-related questions, use this clean format:

Direct Answer:
Write the direct answer.

Career Relevance:
Explain why it matters for the user's career.

Recommended Action:
Give practical steps.

Next Step:
Tell the user exactly what to do next.

Keep the tone professional, clear, and student-friendly.
`;
    console.log("Sending request to Gemini...");

    const result = await model.generateContent(prompt);
    const aiReply = result.response.text();

    console.log("Gemini reply received.");

    const newChat = new Chat({
      userId: req.user.id,
      question: message,
      answer: aiReply
    });

    await newChat.save();

    console.log("Chat saved successfully.");

    res.json({
      success: true,
      reply: aiReply
    });

  } catch (error) {
    console.log("Chatbot Error Full:", error);
    console.log("Chatbot Error Message:", error.message);

    res.json({
      success: false,
      message: error.message || "Chatbot failed. Please try again."
    });
  }
});

// ===============================
// CHAT HISTORY
// ===============================
app.get("/chat-history", protect, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.id })
      .sort({ _id: -1 })
      .limit(20);

    res.json({
      success: true,
      chats
    });

  } catch (error) {
    console.log("Chat History Error:", error);

    res.json({
      success: false,
      message: "Unable to fetch chat history."
    });
  }
});
// ===============================
// DELETE CHAT HISTORY
// ===============================
app.delete("/chat-history", protect, async (req, res) => {
  try {
    await Chat.deleteMany({ userId: req.user.id });

    res.json({
      success: true,
      message: "Chat history cleared successfully."
    });

  } catch (error) {
    console.log("Delete Chat History Error:", error);

    res.json({
      success: false,
      message: "Unable to clear chat history."
    });
  }
});
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});