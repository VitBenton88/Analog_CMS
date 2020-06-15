module.exports = (app, bcrypt, db, passport, Recaptcha, Utils, validator) => {
	require("./Maintenance.js")(app)
	require("./Pages.js")(app, db, Recaptcha, Utils)
	require("./Login.js")(app, bcrypt, db, passport, Utils)
	require("./PasswordReset.js")(app, bcrypt, db, Utils, validator)
	require("./Search.js")(app, db)
	require("./Sitemap.js")(app, db)
	require("./404.js")(app, db) // Must be last
}