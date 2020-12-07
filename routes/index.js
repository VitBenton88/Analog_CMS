module.exports = (app, bcrypt, db, ensureAuthenticated, json2csv, GoogleAuthenticator, notp, passport, pjson, Recaptcha, slugify, Utils, validator) => {
	// import Analog Middleware
	// =============================================================
	require("./Middleware")(app, db, ensureAuthenticated, pjson, Recaptcha)
	
	// import Analog Plugins
	// =============================================================
	require("./Plugins")(app, db, Utils)
	
	// import API Routes
	// =============================================================
	require("./Api")(app, db, Utils)
	
	// import Frontend Routes
	// =============================================================
	require("./Frontend")(app, bcrypt, db, passport, Recaptcha, Utils, validator)
	
	// import Admin Routes
	// =============================================================
	require("./Admin")(app, bcrypt, db, json2csv, GoogleAuthenticator, notp, slugify, Utils, validator)
	
	// import 404 Handling
	// =============================================================
	require("./404")(app, db)
}