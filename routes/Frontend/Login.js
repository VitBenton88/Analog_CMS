module.exports = (app, bcrypt, db, passport, Utils) => {

	// LOGIN PAGE - GET
	// =============================================================
	app.get("/login", (req, res) => {
		const { site_data } = req

		if ( req.isAuthenticated() ) return res.redirect('/admin/dashboard')

		res.render("templates/defaults/login/login", {
			site_data,
			layout: "login"
		})
	})

	// MFA PAGE - GET
	// =============================================================
	app.get("/login/mfa", async (req, res) => {
		const { query, site_data } = req
		const { token } = query

		try {
			const token_err_msg = "Your two-factor authentication access token is invalid or expired. Please try again."
			
			if (!token) throw new Error(token_err_msg)
					
			const token_exists = await db.Tokens.findOne({token, type: "mfa"}).populate('user_id').lean()

			if (!token_exists) throw new Error(token_err_msg)
	
			res.render("templates/defaults/login/mfa", {
				site_data,
				token,
				layout: "login"
			})

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('error', errorMessage)
			res.redirect('/login')
		}
	})

	// MFA RECOVERY PAGE - GET
	// =============================================================
	app.get("/login/mfa/recovery", async (req, res) => {
		const { query, site_data } = req
		let { token } = query
		const referrer = req.header('Referer')

		try {
			const token_err_msg = "Your two-factor authentication access token is invalid or expired. Please try again."
			
			if (!token) {
				if (referrer) {
					token = referrer.split('?token=').pop()
				} else {
					throw new Error(token_err_msg)
				}
			}
					
			const token_exists = await db.Tokens.findOne({token, type: "mfa"}).populate('user_id').lean()

			if (!token_exists) throw new Error(token_err_msg)
	
			res.render("templates/defaults/login/recovery", {
				site_data,
				token,
				layout: "login"
			})

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('error', errorMessage)
			res.redirect('/login')
		}
	})

	// LOGIN USER - POST
	// =============================================================
	app.post("/login", async (req, res, next) => {
		const { body, headers, protocol, site_data } = req
		const { password, username } = body
		const site_url = site_data.settings.address || `${protocol}://${headers.host}`

		try {
			// lookup user
			const user = await db.Users.findOne({ $or: [{ username }, { email: username }] })

			if (!user) throw new Error("User does not exist or password is incorrect.")

			// compare user
			const isMatch = await bcrypt.compare(password, user.password)
			
			if (!isMatch) throw new Error("User does not exist or password is incorrect.")

			// if user is using MFA, redirect to page to enter 1-time pass
			if (user.mfa.enabled) {
				// create an access token
				const user_id = user._id
				const token = Utils.Password.generate(true, true, true, false, 24)
				await db.Tokens.create({ user_id, token, type: "mfa"})
				return res.redirect(`${site_url}/login/mfa?token=${token}`)
			}

			passport.authenticate( 'local', { successRedirect: '/admin/dashboard', failureRedirect: '/login', failureFlash: true } )(req, res, next)

		} catch (error) {
			console.error(error)
			let errorMessage = error.errmsg || error.toString()
			if (errorMessage.includes("User does not exist")) {
				errorMessage = "Incorrect username or password."
			}
			req.flash('error', errorMessage)
			res.redirect('/login')
		}
	})

	// MFA AUTH - POST
	// =============================================================
	app.post("/mfa", async (req, res, next) => {
		const { code, token } = req.body
		const failureRedirect = `/login/mfa?token=${token}`

		try {
			const token_err_msg = "An error occurred while authenticating. Please try again."

			if (!code || !token) throw new Error(token_err_msg)

			const token_exists = await db.Tokens.findOne({token, type: "mfa"}).populate('user_id').lean()

			if (!token_exists) throw new Error(token_err_msg)

			// provide these values in req body object for passportJS
			req.body.username = token_exists.user_id.username
			req.body.password = code

			passport.authenticate( '2fa-totp', { successRedirect: '/admin/dashboard', failureRedirect, failureFlash: true } )(req, res, next)

		} catch (error) {
			console.error(error)
			let errorMessage = error.errmsg || error.toString()
			if (errorMessage.includes("An error occurred while authenticating")) {
				errorMessage = "An error occurred while authenticating. Please try again."
			}
			req.flash('error', errorMessage)
			res.redirect(failureRedirect)
		}
	})

	// MFA RECOVERY AUTH - POST
	// =============================================================
	app.post("/mfa/recovery", async (req, res, next) => {
		const { code, token } = req.body

		try {
			const token_err_msg = "An error occurred while authenticating. Please try again."

			if (!code || !token) throw new Error(token_err_msg)

			const token_exists = await db.Tokens.findOne({token, type: "mfa"}).populate('user_id').lean()

			if (!token_exists) throw new Error(token_err_msg)

			const { _id, mfa } = token_exists.user_id

			// check MFA recovery code
			const isMatch = await bcrypt.compare(code, mfa.recovery)
			
			if (!isMatch) throw new Error("The provided recovery code is incorrect.")

			// disable MFA for user
			await db.Users.updateOne({ _id }, { 'mfa.secret': '', 'mfa.enabled': false, 'mfa.recovery': '' })
			req.flash('success', '2-step authentication has been disabled for your account.')
			res.redirect('/login')

		} catch (error) {
			console.error(error)
			let errorMessage = error.errmsg || error.toString()
			req.flash('error', errorMessage)
			res.redirect(`/login/mfa/recovery?token=${token}`)
		}
	})

	// LOGOUT USER - POST
	// =============================================================
	app.post("/logout", (req, res) => {
		req.logout()
		req.flash( 'success', 'Successfully logged out.' )
		res.redirect('/login')
	})

}