const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { OAuth2Client } = require("google-auth-library");
const { Octokit } = require("@octokit/rest");
const router = express.Router();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// @route POST /api/auth/register
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({ name, email, password });
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        password: null,
        authType: "google",
      });
    }

    const jwtToken = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token: jwtToken });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Google login failed" });
  }
});

// @route POST /api/auth/github
router.post("/github", async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Authorization code is required" });
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return res.status(400).json({ message: "Failed to get access token" });
    }

    // Get user data from GitHub
    const octokit = new Octokit({
      auth: tokenData.access_token,
    });

    const { data: githubUser } = await octokit.rest.users.getAuthenticated();

    // Check if user exists by GitHub ID or email
    let user = await User.findOne({ 
      $or: [
        { githubId: githubUser.id.toString() },
        { email: githubUser.email }
      ]
    });

    if (!user) {
      // Create new user
      user = await User.create({
        name: githubUser.name || githubUser.login,
        email: githubUser.email || `${githubUser.login}@github.com`,
        password: null,
        authType: "github",
        githubId: githubUser.id.toString(),
      });
    } else if (!user.githubId) {
      // Link existing user with GitHub
      user.githubId = githubUser.id.toString();
      user.authType = "github";
      await user.save();
    }

    const jwtToken = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token: jwtToken });
  } catch (err) {
    console.error("GitHub login error:", err);
    res.status(401).json({ message: "GitHub login failed" });
  }
});

module.exports = router;
