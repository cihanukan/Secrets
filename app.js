require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

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
    password: String
});

userSchema.plugin(passportLocalMongoose); // we use it to hash and salt password and save to our db

//Model
const User =  mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser()); // insert information to fortune cookie
passport.deserializeUser(User.deserializeUser()); // break the cookies to see informations

app.get("/", function(req, res){
    res.render("home");
});

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/secrets", function(req, res){
    if(req.isAuthenticated()){
        res.render("secrets");
    }else{
        res.redirect("/login");
    }
})

app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

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