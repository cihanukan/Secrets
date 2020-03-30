require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
//const encrypt = require("mongoose-encryption");
const bcrypt = require("bcrypt");
const ejs = require("ejs");
const saltRounds = 10;

const app = express();
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});

//Schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});


//Encryption 
//userSchema.plugin(encrypt, {secret: process.env.SECRET , encryptedFields: ["password"]});

//Model
const User = mongoose.model("User", userSchema);

app.get("/", function(req, res){
    res.render("home");
});

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.post("/register", function(req, res){

    bcrypt.hash(req.body.password, saltRounds, function(err, hash){
        const newUser = new User({
            name: req.body.username,
            password: hash
        })
        newUser.save(function(err){
            if(err){
                console.log(err);
            }else{
                res.render("secrets");
            }
        })
    })
});

app.get("/logout",function(req, res){
    res.redirect("/");
});

app.post("/login", function(req, res){
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({name: username}, function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                bcrypt.compare(password, foundUser.password, function(err, result){
                    if(result===true){
                        res.render("secrets");
                    }
                    else{
                        res.send("Cannot login.");
                    }
                })
            }
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