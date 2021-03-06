// Dependencies
// =============================================================
const GoogleAuthenticator = require('passport-2fa-totp').GoogeAuthenticator

module.exports = (app, bcrypt, db, GoogleAuthenticator, notp, Utils, validator) => {

	// USERS PAGE - GET
	// =============================================================
	app.get("/admin/users", async (req, res) => {
		const { body, query, site_data, user } = req
		let { limit, orderBy, paged, search, sort } = query
		const { role, username, _id } = user
		const sessionUser = { role, username, _id }

		try {
			// if the orderBy queries don't exist in the url params, this is to ensure orderBy works with a search form
			orderBy = orderBy || body.orderBy
			sort = sort || body.sort

			// set query limit to 10 as default, or use defined limit (converted to int)
			limit = limit ? parseInt(limit) : 10

			// set paged to 1 as default, or use defined query (converted to int)
			paged = paged ? parseInt(paged) : 1

			// determine offset in query by current page in pagination
			const skip = paged > 0 ? ((paged - 1) * limit) : 0

			// get query count for pagination
			const count = await db.Users.find().countDocuments().lean()
			const pageCount = Math.ceil(count / limit)
			// setup query params
			const sortConfig = orderBy ? Utils.Sort.getConfig(orderBy, sort) : {'created': 1}
			const searchParams = search ? {$text: {$search: search} } : {}

			// query db
			const users = await db.Users.find(searchParams).sort(sortConfig).skip(skip).limit(limit).lean()
			// swap sort after the query if there is an order requested, e.g. desc to asc
			sort = orderBy ? Utils.Sort.swapOrder(sort) : null

			res.render("admin/users", {
				limit,
				orderBy,
				pageCount,
				paged,
				search,
				sessionUser,
				site_data,
				sort,
				users,
				layout: "admin"
			})

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect('/admin')
		}
	})

	// UPDATE USER PAGE - GET
	// =============================================================
	app.get("/admin/users/edit/:id", async (req, res) => {
		let { originalUrl, params, query, site_data } = req
		const { id } = params
		const { expand } = query
		const session_user = req.user
		const { role, username, _id } = session_user
		const sessionUser = { role, username, _id }

		try {
			// query user
			const user_query = await db.Users.findById(id)
			const user = user_query ? user_query.toObject({ getters: true }) : null

			// if by chance the url is attempted by a non-admin user, reject it
			// or this isn't the current user trying to edit their account
			if (sessionUser.role !== "Administrator" && sessionUser._id != user.id) {
				throw new Error('You do not have the proper permissions to view this page.')
			}

			res.render("admin/edit/user", {
				expand,
				originalUrl,
				site_data,
				user,
				sessionUser,
				layout: "admin"
			})

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect('/admin/users')
		}
	})

	// CREATE USER - POST
	// =============================================================
	app.post("/adduser", async (req, res) => {
		const { body } = req
		let { email, nickname, password, passwordCheck, role, username } = body

		try {
			// basic validation
			if (!username || !email || !password || !passwordCheck || !role) throw new Error('Please fill out all fields when adding a new user.')
			// check if email provided is an email
			if (!validator.isEmail(email)) throw new Error('Email provided is not an email.')
			// check if password verification passes
			if (password !== passwordCheck) throw new Error('Password verification failed.')

			// generate encryption salt
			const salt = await bcrypt.genSalt(10)
			// reassign password var to generated hash
			password = await bcrypt.hash(password, salt)
			// create user in database
			await db.Users.create({email, nickname, password, role, username})

			req.flash( 'admin_success', 'User successfully added.' )

		} catch (error) {
			console.error(error)
			const { code, errmsg, keyValue } = error
			let errorMessage = errmsg || error.toString()

			if (code === 11000) {
				const unique_key = Object.keys(keyValue)[0];
				errorMessage = `A user already exists that has the value "${keyValue[unique_key]}" for "${unique_key}"`
			}

			req.flash('admin_error', errorMessage)
			
		} finally {
			res.redirect('/admin/users')
		}
	})

	// UPDATE USER (BASIC INFORMATION) - POST
	// =============================================================
	app.post("/edituserbasic", async (req, res) => {
		const { body, user } = req
		let { _id, email, image, nickname, role, username } = body
		const sessionUser = { role: user.role, username: user.username, _id: user._id }
		// format image value  
		image = image === '' ? null : image

		try {
			// basic validation
			if (!username || !email || !role) throw new Error('Please fill out all fields when updated user.')

			// prevent last admin from losing admin privileges ...
			const onlyOneAdmin = await Utils.Users.onlyOneAdmin(_id)

			if (onlyOneAdmin && role !== "Administrator") throw new Error('Cannot remove admin privileges from last admin user account.')

			// define db params
			const updateParams = { email, image, nickname, role, username }

			// prevent non-admins from updating admin status
			if (sessionUser.role !== "Administrator") {
				delete updateParams.role
			}

			// update user in database
			await db.Users.updateOne({_id}, updateParams)

			req.flash( 'admin_success', 'User info successfully updated.' )

		} catch (error) {
			console.error(error)
			const dupKeyError = error.code == 11000
			let errorMsg = error.errmsg || error.toString()

			// log error as dup username if so
			if (dupKeyError && errorMsg.includes('username')) {
				errorMsg = `The username '${username}' is already taken.`
			}

			// log error as dup email if so
			if (dupKeyError && errorMsg.includes('email')) {
				errorMsg = `The email '${email}' is already taken.`
			}

			req.flash('admin_error', errorMsg)

		} finally {
			res.redirect(`/admin/users/edit/${_id}?expand=basic`)
		}
	})

	// UPDATE USER (PASSWORD) - POST
	// =============================================================
	app.post("/edituserpassword", async (req, res) => {
		let { _id, password, passwordCheck } = req.body

		try {
			// basic validation
			if (!password || !passwordCheck) throw new Error('Please fill out both password fields.')

			//check if password verification passes
			if (password !== passwordCheck) throw new Error('Password verification failed.')

			// get salt for hash
			const salt = await bcrypt.genSalt(10)
			// reassign password var to newley hashed password
			password = await bcrypt.hash(password, salt)

			// update user in database
			await db.Users.updateOne({_id}, {password})

			req.flash( 'admin_success', 'User password successfully updated.' )

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			
		} finally {
			res.redirect(`/admin/users/edit/${_id}`)
		}
	})

	// PROVIDE MFA QR (STEP 1) - GET
	// =============================================================
	app.get("/getusermfa", async (req, res) => {
		const { _id, username } = req.user

        try {
			const registerGoogleAuthenticator = GoogleAuthenticator.register(username)
			const { secret, qr } = registerGoogleAuthenticator
			await db.Users.updateOne({ _id }, { 'mfa.secret': secret })

			const response = { qr }
			// respond to client
			res.status(200).json(response)
            
        } catch (error) {
            console.error(error)
            res.status(500).json({
                "response": error,
                "message": "Error occurred while registering for Google authenticator."
            })
        }
	})

	// CONFIRM MFA (STEP 2) - POST
	// =============================================================
	app.post("/confirmusermfa", async (req, res) => {
		const { body, user } = req
		const { _id } = user
		const { token } = body

        try {
			if (!token) throw new Error('Please provide a one-time password.')

			const user = await db.Users.findOne({ _id })

			if (!user) throw new Error("Error occurred while registering for Google authenticator.")

			// decode key
			const key = GoogleAuthenticator.decodeSecret(user.mfa.secret)

			// check TOTP is correct
			const token_verify = notp.totp.verify(token, key)

			if (!token_verify) throw new Error("The one-time password provided is not valid. Please try again.")

			// generate recovery code
			const recovery_raw = Utils.Password.generate(false, true, true, false, 19)
			const recovery_formatted = recovery_raw.toString().match(/.{4}/g).join('-')
			// generate encryption salt
			const salt = await bcrypt.genSalt(10)
			// hash recovery code
			const recovery = await bcrypt.hash(recovery_formatted, salt)

			// finalize mfa setup
			await db.Users.updateOne({ _id }, { 'mfa.enabled': true, 'mfa.recovery': recovery })

			const response = {
				message: "Google authenticator registration successful. Below is your recovery code.",
				recovery: recovery_formatted
			}
			// respond to client
			res.status(200).json(response)
            
        } catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
            res.status(500).json({
                "response": error,
                "message": errorMessage
            })
        }
	})

	// DISABLE MFA - POST
	// =============================================================
	app.post("/removeusermfa", async (req, res) => {
		const { _id } = req.user

        try {
			await db.Users.updateOne({ _id }, { 'mfa.secret': '', 'mfa.enabled': false, 'mfa.recovery': '' })
			req.flash( 'admin_success', 'User password successfully updated.' )
            
		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			
		} finally {
			res.redirect(`/admin/users/edit/${_id}?expand=mfa`)
		}
	})

	// DELETE USER IMAGE - POST
	// =============================================================
	app.post("/deleteuserimage", async (req, res) => {
		try {
			// remove image from user account in db
			await db.Users.updateOne({_id: req.body._id}, { $unset: {image: 1} })

			res.json({
				"response": 'Success.',
				"message": 'User image successfully deleted.'
			})

		} catch (error) {
			console.error(error)
			res.status(500).json({
				"response": error,
				"message": "User image not deleted. Error occurred."
			})
		}
	})

	// DELETE USER - POST
	// =============================================================
	app.post("/deleteuser", async (req, res) => {
		const { body, user } = req
		const { _id } = body
		const sessionUser = { role: user.role, username: user.username, _id: user._id }

		try {
			// prevent non-admins from updating admin status
			if (sessionUser.role !== "Administrator") throw new Error('You do not have permission to delete users.')

			// prevent last admin removal
			const userIsLastAdmin = await Utils.Users.onlyOneAdmin(_id)

			if (userIsLastAdmin) throw new Error('Cannot delete last admin user account.')

			await db.Users.deleteOne({_id})

			req.flash( 'admin_success', 'User successfully deleted.' )
			res.redirect('/admin/users')

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect(`/admin/users/edit/${_id}`)
		}
	})

}