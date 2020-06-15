module.exports = (app, bcrypt, db, GoogleAuthenticator, notp, slugify, Utils, validator) => {
	require("./404s.js")(app, db, Utils)
	require("./Blocks.js")(app, db, slugify, Utils)
	require("./Contact.js")(app, db, Utils)
	require("./Dashboard.js")(app, db)
	require("./Entries.js")(app, db, Utils)
	require("./Fields.js")(app, db, slugify, Utils)
	require("./Forms.js")(app, db, slugify, Utils)
	require("./Initialize.js")(app, bcrypt, db)
	require("./Media.js")(app, db, Utils)
	require("./Menus.js")(app, db, slugify, Utils)
	require("./Pages.js")(app, db, slugify, Utils)
	require("./Redirects.js")(app, db, Utils)
	require("./Summernote.js")(app, Utils)
	require("./Taxonomies.js")(app, db, Utils)
	require("./Terms.js")(app, db)
	require("./Users.js")(app, bcrypt, db, GoogleAuthenticator, notp, Utils, validator)
	require("./Settings.js")(app, db, Utils)
}