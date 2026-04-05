const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true
}));

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public/login/login.html"));
});

app.get("/signup",(req,res)=>{
    res.sendFile(path.join(__dirname, "public/signup/signup.html"));
});

app.get("/passwordReset",(req,res)=>{
    res.sendFile(path.join(__dirname, "public/passwordReset/passwordreset.html"));
});

app.get("/aboutUs",(req,res)=>{
    res.sendFile(path.join(__dirname, "public/aboutUs/about.html"));
});

// Routes
const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});