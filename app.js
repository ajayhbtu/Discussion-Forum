require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.set("view engine", "ejs");

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(express.static("public"));

app.use(
  session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-ajay:Ajay@4321@cluster1.gdltk.mongodb.net/discussionDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

const discussionSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  topic: String,
  description: String,
  replies: [{ name: String, reply: String }],
});

const Discussion = mongoose.model("Discussion", discussionSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function (req, res) {
  res.render("home", { isauthenticated: req.isAuthenticated() });
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/create", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("create");
  } else {
    res.redirect("/login");
  }
});

app.get("/discussions", function (req, res) {
  Discussion.find().exec(function (err, discussions) {
    if (err) {
      handleError(err);
    } else {
      res.render("discussions", { discussions: discussions });
    }
  });
});

app.get("/discussions/:discId", function (req, res) {
  Discussion.findById(req.params.discId)
    .populate("author")
    .exec(function (err, result) {
      if (err) {
        handleError(err);
      } else {
        res.render("discussion", {
          result: result,
          isauthenticated: req.isAuthenticated(),
        });
      }
    });
});

app.post("/register", function (req, res) {
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.render("home", { isauthenticated: req.isAuthenticated() });
        });
      }
    }
  );
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.render("home", { isauthenticated: req.isAuthenticated() });
      });
    }
  });
});

app.post("/create", function (req, res) {
  const discussion = new Discussion({
    author: req.user._id,
    topic: req.body.topic,
    description: req.body.description,
  });

  if (req.isAuthenticated()) {
    discussion.save();
    res.redirect("/discussions/" + discussion.id);
  }
});

app.post("/discussions/:discId", function (req, res) {
  const data = { name: req.user.username, reply: req.body.reply };

  Discussion.findById(req.params.discId, function (err, foundDisc) {
    if (err) {
      console.log(err);
    } else {
      if (foundDisc) {
        foundDisc.replies.push(data);
        foundDisc.save(function () {
          res.redirect("/discussions/" + req.params.discId);
        });
      }
    }
  });
});

app.get("/logout", function (req, res) {
  req.logout();
  res.render("home", { isauthenticated: req.isAuthenticated() });
});

app.listen(process.env.PORT || 3000, function () {
  console.log("Server started on Successfully!");
});
