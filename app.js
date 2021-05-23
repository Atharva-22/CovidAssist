const express = require("express");
const bodyParser = require("body-parser");
const https = require("https");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
    secret: "Covid assist",
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/Covidassist", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);

const hospitalSchema = new mongoose.Schema({
    username: {
        type: String,
        immutable: true
    },
    password: String,
    state: String,
    city: String,
    name: String,
    contact: Number,
    address: String,
    pincode: Number,
    totalbeds: Number,
    availablebeds: Number,
    venbeds: Number,
    oxybeds: Number,
    icubeds: Number
});

hospitalSchema.plugin(passportLocalMongoose);
const Hospital = new mongoose.model("Hospital", hospitalSchema);

passport.use(Hospital.createStrategy());
passport.serializeUser(Hospital.serializeUser());
passport.deserializeUser(Hospital.deserializeUser());


stateSearch = "";
citySearch = "";
app.get("/", function (req, res) {
    Hospital.find({ state: stateSearch, city: citySearch }, function (err, hospitals) {
        if (err) {
            console.log(err);
        } else {
            // console.log(hospitals);
            // console.log(citySearch);
            res.render("home", { results: hospitals,dummy: citySearch });
            stateSearch = "";
            citySearch = "";
        }

    });


});

app.post("/", function (req, res) {
    stateSearch = req.body.select1;
    citySearch = req.body.select2;
    // console.log(citySearch);
    res.redirect("/");
});
app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/signup", function (req, res) {
    res.render("signup");
});

app.get("/tracker", function (req, res) {
    const url = "https://api.apify.com/v2/key-value-stores/toDWvRj1JpTXiM8FF/records/LATEST?disableRedirect=true";
    https.get(url, function (response) {
        console.log(response.statusCode);
        response.on("data", function (data) {
            const x = JSON.parse(data);
            const y = x.regionData;
            //console.log(y);
            res.render("tracker", { result: y, india: x });
        });
    });
    //res.render("tracker");
});

app.get("/guidelines", function (req, res) {
    res.render("guidelines");
});


app.get("/dash", function (req, res) {
    if (req.isAuthenticated()) {
        Hospital.findById(req.user.id, function (err, foundhosp) {
            if (err) {
                console.log(err);
            } else {
                if (foundhosp) {
                    res.render("dash", {
                        currenthospitalname: foundhosp.name,
                        totalbed: foundhosp.totalbeds,
                        availablebed: foundhosp.availablebeds,
                        ventilatorbed: foundhosp.venbeds,
                        oxygenbed: foundhosp.oxybeds,
                        icubed: foundhosp.icubeds
                    });
                }
            }
        });

    } else {
        res.redirect("/login");
    }
});

app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/login");
});



app.post("/signup", function (req, res) {
    Hospital.register(new Hospital({ username: req.body.username }), req.body.password, function (err, hospital) {
        if (err) {
            console.log(err);
            res.redirect("/signup");
        } else {
            passport.authenticate("local")(req, res, function () {
                Hospital.findById(req.user.id, function (err, foundUser) {
                    if (err) {
                        console.log(err);
                    } else {
                        if (foundUser) {
                            foundUser.name = req.body.hospitalName;
                            foundUser.contact = req.body.contactno;
                            foundUser.state = req.body.select1;
                            foundUser.city = req.body.select2;
                            foundUser.address = req.body.address;
                            foundUser.pincode = req.body.pincode;
                            foundUser.totalbeds = 0;
                            foundUser.availablebeds = 0;
                            foundUser.venbeds = 0;
                            foundUser.oxybeds = 0;
                            foundUser.icubeds = 0;
                            foundUser.save();
                        }
                    }
                });
                res.redirect("/dash");
            });
        }
    }
    );
});


app.post("/login", function (req, res) {
    const hospital = new Hospital({
        username: req.body.username,
        password: req.body.password,
    });

    req.login(hospital, function (err) {
        // this method comes from passport.js
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/dash");
            });
        }
    });
});

app.post("/dash", function (req, res) {
    Hospital.findByIdAndUpdate(req.user.id, {
        totalbeds: req.body.totalBeds,
        availablebeds: req.body.availableBeds,
        venbeds: req.body.ventilatorBeds,
        oxybeds: req.body.oxygenBeds,
        icubeds: req.body.icuBeds,
    }, function (err, result) {
        if (err) {
            console.log(err);
        } else {
            console.log("Updated Successfully");
            res.redirect("/dash");
        }
    });
});

app.listen(3000, function () {
    console.log("Server is running on port 3000");
});

