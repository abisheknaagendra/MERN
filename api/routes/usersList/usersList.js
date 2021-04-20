const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
let users = require("./model");
const auth = require("./middleware/auth");

//get users list
router.get("/", auth, async (req, res) => {
  try {
    const user = await users.findById(req.user.id).select("-password"); //get user by id in db
    res.json(user); //return the user object as response without password
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

//post newuser to the userslist
router.post(
  "/",
  [
    check("name", "Name is required")
      .not()
      .isEmpty(),
    check("email", "Include a valid email").isEmail(),
    check("password", "Enter a password with 6 or more chars").isLength({
      min: 6
    }),
    check("confirmPassword", "Passwords do not match").custom((value, {req, loc, path}) => {
      console.log(value, req.body.password);
      if(value !== req.body.password) {
        throw new Error("Passwords do not match");
      } else {
        return value;
      }
    })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, confirmPassword } = req.body;

    try {
      //See if user exists
      let user = await users.findOne({ name });

      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "User already exists" }] });
      }

      //Encrypt Password
      user = new users({
        name,
        email,
        password
      });

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      await user.save();

      //Return Json Web token
      const payload = {
        user: {
          id: user.id
        }
      };
      jwt.sign(payload, "Asdf@Lkj12$", { expiresIn: 3600 }, (err, token) => {
        if (err) throw err;
        res.json({ token });
      });
    } catch (err) {
      console.error(err.msg);
      res.status(500).send("Server Error");
    }
  }
);

module.exports = router;
