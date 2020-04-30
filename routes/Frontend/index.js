module.exports = (app, bcrypt, db, passport, Recaptcha, Utils, validator) => {
	require("./Maintenance.js")(app)
	require("./All.js")(app, db, Recaptcha)
	require("./Login.js")(app, bcrypt, db, passport, Utils)
	require("./PasswordReset.js")(app, bcrypt, db, Utils, validator)
	require("./Search.js")(app, db)
	require("./Sitemap.js")(app, db)
}