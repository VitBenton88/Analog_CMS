module.exports = (app, bcrypt, db, Utils, validator) => {

	// FORGOT PASSWORD PAGE - GET
	// =============================================================
	app.get("/password/forgot", (req, res) => {
		const { site_data } = req
		const forgotPassword = true

		res.render("templates/defaults/password/forgot", {
			site_data,
			forgotPassword,
			layout: "login"
		})
	})

	// RESET PASSWORD PAGE - GET
	// =============================================================
	app.get("/password/reset", async (req, res, next) => {
		const { site_data, query } = req
		const { token } = query
		const resetPassword = true

		try {
			const token_exists = await db.PasswordToken.findOne({token})

			if (!token || !token_exists) {
				return next()
			}

			res.render("templates/defaults/password/reset", {
				site_data,
				resetPassword,
				token,
				layout: "login"
			})

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('error', errorMessage)
			res.redirect('/password/forgot')
		}
	})

	// CREATE PASSWORD RESET TOKEN - POST
	// =============================================================
	app.post("/forgotpassword", async (req, res) => {
		try {
			const { body, site_data } = req
			const { email } = body
			const site_name = site_data.settings.name || "a site powered by Analog CMS."
			const site_url = site_data.settings.address || `${req.protocol}://${req.headers.host}`

			// validate
			if ( !email || !validator.isEmail(email) ) {
				throw new Error('Email not provided. Please provide an email to reset a password.')
			}

			// lookup user account
			const user = await db.Users.findOne({email})

			if (user) {
				// create an access token
				const user_id = user._id
				const token = Utils.Password.generate(true, true, true, false, 24)
				await db.PasswordToken.create({user_id, token})
				const pass_reset_url = `${site_url}/password/reset?token=${token}`

				// send email
				const mailData = {
					to: email,
					subject: `Password Reset for ${site_name}`,
					text: `This is a request to reset the password for the account associated with the email "${email}" for ${site_name}. Please visit this URL to reset your password: ${pass_reset_url}`,
					html: `<p>This is a request to reset the password for the account associated with the email "${email}" for ${site_name}.</p>
					<a href="${pass_reset_url}">Click Here to Reset Password.</a>
					<p>Please note that this link will expire in 15 minutes.</p>`
				}

				await Utils.Smtp.send(mailData)
			}

			req.flash(
				'success',
				`A link to reset your password has been sent to <b>${email}</b>.<em> This link will expire in 15 minutes</em>.`
			)

		} catch (error) {
			console.error(error)
			let errorMessage = error.errmsg || error.toString()

			// check for SMTP missing congif error
			if ( errorMessage.includes('SMTP configuration not complete') ) {
				errorMessage = "This password cannot be reset right now. Please contact this site's administrator."
			}

			req.flash('error', errorMessage)
			
		} finally {
			res.redirect('/password/forgot')
		}
	})

	// RESET PASSWORD - POST
	// =============================================================
	app.post("/resetpassword", async (req, res) => {
		const {token, newPassword, verifyPassword} = req.body

		try {
			// validation
			if (!newPassword || !verifyPassword) {
				throw new Error('Password or password verification missing. Please supply both when resetting password.')
			}

			if (newPassword !== verifyPassword) {
				throw new Error('Your password verification failed. Please enter your new password and verify it.')
			}

			// lookup token info
			const token_info = await db.PasswordToken.findOne({token})

			if (!token || !token_info) {
				throw new Error('Something went wrong. No token found')
			}

			// get user ID
			const _id = token_info.user_id
			// get salt for hash
			const salt = await bcrypt.genSalt(10)
			// get newley hashed password
			const password = await bcrypt.hash(newPassword, salt)

			// update user in database
			await db.Users.updateOne({_id}, {password})

			// delete token in db
			await db.PasswordToken.deleteOne({token})

			req.flash(
				'success',
				'Password successfully updated.'
			)

			res.redirect('/login')

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('error', errorMessage)
			res.redirect('/password/forgot')
		}
	})

}