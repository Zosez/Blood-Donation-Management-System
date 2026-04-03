const bcrypt = require("bcrypt");

// Dummy user (replace with DB later)
const user = {
    email: "test@gmail.com",
    password: "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36F5i8G8u7P7p0z" // hashed
};

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (email !== user.email) {
        return res.send("User not found");
    }

    const match = await bcrypt.compare(password, user.password);

    if (match) {
        req.session.user = email;
        res.redirect("/dashboard.html");
    } else {
        res.send("Wrong password");
    }
};