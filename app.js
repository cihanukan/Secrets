require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require('mongoose-findorcreate') // to use findOrCreate function for google authentication


const app = express();
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');

//app.set('trust prox' ,1); // trust first proxy

app.use(session({
    secret: "This is our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session()); // tell passport to deal with session

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true); // Added to solve deprecation warning

//Schema
const userSchema = new mongoose.Schema({
    name: String,
    password: String,
    secret: String,
    googleId: String,
    facebookId: String
});

userSchema.plugin(passportLocalMongoose); // we use it to hash and salt password and save to our db
userSchema.plugin(findOrCreate); // Added as a plugin to initiate with our schema

//Model
const User =  mongoose.model("User", userSchema);

passport.use(User.createStrategy());

//These methods of serialization will give as error. Becasue we won't e able to serialize the infos which come from google auth.
// passport.serializeUser(User.serializeUser()); // insert information to fortune cookie
// passport.deserializeUser(User.deserializeUser()); // break the cookies to see informations


//These methods are fit for every type of serialization.
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

//Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  function(accessToken, refreshToken, profile, cb) {
    //   console.log("ACCESS TOKEN " + accessToken)
    //   console.log("REFRESH TOKEN " + refreshToken)
    //   console.log("USER PROFILE " + profile)
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//Facebook Strategy

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.FACEBOOK_CALLBACK_URL
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }));


app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets page.
    res.redirect("/secrets");
});

app.get("/auth/facebook",
  passport.authenticate("facebook"));

app.get("/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/secrets", function(req, res){
    if(req.isAuthenticated()){
        User.find({"secret": {$ne: null}}, function(err, foundUsers){
            if(err){
                console.log(err);
            }else{
                res.render("secrets",{
                    usersWithSecrets : foundUsers
                })
            }
        })
    }else{
        res.redirect("/login");
    }
})

app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

app.get("/submit",function(req,res){
    if(req.isAuthenticated){
        res.render("submit")
    }else{
        res.redirect("login");
    }
})

app.post("/submit",function(req, res){
    const submittedSecret = req.body.secret;

    User.findById(req.user.id, function(err, foundUser){
        if(err){
         console.log("err")   
        }else{
            if(foundUser){
                foundUser.secret = submittedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                });
            }
        }
    })
})

app.post("/register", function(req, res){

    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req, res, function(){ // calback will be triggered if the authentication is successful
                res.redirect("/secrets");
            })
        }
    })
});

app.post("/login", function(req, res){

    const user = new User({
        username: req.body.username,
        password: req.body.password
    })

    req.login(user, function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req, res, function(){ // calback will be triggered if the authentication is successful
                res.redirect("/secrets");
            })
        }
    })

});

let port = process.env.PORT;
if(port == null || port == ''){
    port = 3000;
}
app.listen(port, function(){
    console.log("Server has been started on port " + port.toString());
})