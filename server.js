// dependencies
// =============================================================
const express = require("express")
const bodyParser = require("body-parser")
const bcrypt = require('bcrypt')
const compression = require('compression')
const cookieParser = require('cookie-parser')
const dotenv = require('dotenv')
const exphbs = require('express-handlebars')
const favicon = require('serve-favicon')
const fileUpload = require('express-fileupload')
const flash = require('connect-flash')
const GoogleAuthenticator = require('passport-2fa-totp').GoogeAuthenticator
const helpers = require('handlebars-helpers')()
const analogHelpers = require('./config/handlebarsHelpers.js')
const database = require('./config/db')
const json2csv = require("json2csv")
const notp = require('notp');
const Recaptcha = require('express-recaptcha').RecaptchaV3
const passport = require('passport')
const path = require("path")
var pjson = require('./package.json');
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
const { ensureAuthenticated } = require('./config/auth')
const slugify = require('url-slug')
const validator = require('validator')

// require all models
// =============================================================
const db = require("./models")

// passport Config
require('./config/passport')(passport)

// load environment variables
// =============================================================
dotenv.config()

// check for production
// =============================================================
const production = process.env.NODE_ENV == "production"

// sets up the Express app
// =============================================================
const app = express()
let PORT = process.env.PORT || 3000

// sets up the Express app with File Uploader, limit to 8 MB
// =============================================================
app.use(fileUpload({
	limits: {
		fileSize: 8 * 1024 * 1024
	},
}))

// handlebars Config
// =============================================================
const hbs = exphbs.create({
	defaultLayout: 'frontend',
	helpers: analogHelpers
})

// sets up the Express app with Handlebars
// =============================================================
app.engine('handlebars', hbs.engine)
app.set('view engine', 'handlebars')

// sets up cookies with the Express App
// =============================================================
app.use(cookieParser('keyboardCats'))

// sets up the Express app to handle data parsing
// =============================================================
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
	limit: '50mb',
	extended: true,
	parameterLimit: 50000
}))
app.use(bodyParser.text())
app.use(bodyParser.json({
	limit: '50mb',
	type: "application/vnd.api+json"
}))

// make sure favicon is served properly
// =============================================================
app.use(favicon(path.join(__dirname, 'public', 'assets/favicon.png')))

// apply production settings
// =============================================================
if (production) {
	console.log('Analog CMS running in production mode.')
	// compress responses
	app.use(compression())
	// permit access to public file
	app.use(express.static(path.join(__dirname, '/public'), {
		maxage: '1y'
	}))
	// set proxy for identifying user's IP address
	app.set('trust proxy', true)
	// cache templates
	app.enable('view cache')

} else {
	// permit access to public file
	app.use(express.static( path.join(__dirname, '/public') ))
}

// store sessions in MongoDB
app.use(session({
	saveUninitialized: true,
	resave: true,
	secret: 'keyboardCats',
	store: new MongoStore( {url: process.env.DB_URI || `mongodb://localhost/analog` } ),
	ttl: 1 * 24 * 60 * 60 // = 1 day.
}))

// sets up Passport middleware
// =============================================================
app.use(passport.initialize())
app.use(passport.session())

// connect Flash and setup global variables to be passed into every view
// =============================================================
app.use(flash())
app.use((req, res, next) => {
	// admin messages
	res.locals.admin_success = req.flash('admin_success')
	res.locals.admin_warning = req.flash('admin_warning')
	res.locals.admin_error = req.flash('admin_error')
	// frontend messages
	res.locals.success = req.flash('success')
	res.locals.warning = req.flash('warning')
	res.locals.error = req.flash('error')
	next()
})

// connect to the database
// =============================================================
database.connect()

// require all utility functions
// =============================================================
const Utils = require("./utils")

// import Express Routes
// =============================================================
require("./routes")(app, bcrypt, db, ensureAuthenticated, json2csv, GoogleAuthenticator, notp, passport, pjson, Recaptcha, slugify, Utils, validator)

// starts the server to begin listening
// =============================================================
app.listen(PORT, () => {
	console.log(`Analog CMS server starting, listening on PORT ${PORT}`)
})