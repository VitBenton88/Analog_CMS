module.exports = (app, passport) => {

	// LOGIN PAGE - GET
	// =============================================================
	app.get("/login", (req, res) => {
		const { site_data } = req

		if ( req.isAuthenticated() ) {
			return res.redirect('/admin/dashboard')
		}

		res.render("templates/defaults/login", {
			site_data,
			layout: "login"
		})
	})

	// LOGIN USER - POST
	// =============================================================
	app.post("/login", (req, res, next) => {
		const auth_config = { successRedirect: '/admin/dashboard', failureRedirect: '/login', failureFlash: true }
		passport.authenticate('local', auth_config)(req, res, next)
	})

	// LOGOUT USER - POST
	// =============================================================
	app.post("/logout", (req, res) => {
		req.logout()
		req.flash( 'success', 'Successfully logged out.' )
		res.redirect('/login')
	})

}