module.exports = (app, bcrypt, db, Utils, validator) => {

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
		let { params, query, site_data } = req
		const { id } = params
		const { expand } = query
		const session_user = req.user
		const { role, username, _id } = session_user
		const sessionUser = { role, username, _id }

		try {
			// query user
			const user_query = await db.Users.findById({_id: id})
			const user = user_query ? user_query.toObject({ getters: true }) : null

			// if by chance the url is attempted by a non-admin user, reject it
			// or this isn't the current user trying to edit their account
			if (sessionUser.role !== "Administrator" && sessionUser._id != user.id) {
				throw new Error('You do not have the proper permissions to view this page.')
			}

			res.render("admin/edit/user", {
				expand,
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
			if (!username || !email || !password || !passwordCheck || !role) {
				throw new Error('Please fill out all fields when adding a new user.')
			}
			// check if email provided is an email
			if (!validator.isEmail(email)) {
				throw new Error('Email provided is not an email.')
			}

			// check if password verification passes
			if (password !== passwordCheck) {
				throw new Error('Password verification failed.')
			}

			// generate encryption salt
			const salt = await bcrypt.genSalt(10)
			// reassign password var to generated hash
			password = await bcrypt.hash(password, salt)
			// create user in database
			await db.Users.create({email, nickname, password, role, username})

			req.flash( 'admin_success', 'User successfully added.' )

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
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
			if (!username || !email || !role) {
				throw new Error('Please fill out all fields when editing user.')
			}

			// prevent last admin from losing admin privileges ...
			const onlyOneAdmin = await Utils.Users.onlyOneAdmin(_id)

			if (onlyOneAdmin && role !== "Administrator") {
				throw new Error('Cannot remove admin privileges from last admin user account.')
			}

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
			if (!password || !passwordCheck) {
				throw new Error('Please fill out both password fields.')
			}

			//check if password verification passes
			if (password !== passwordCheck) {
				throw new Error('Password verification failed.')
			}

			// get salt for hash
			const salt = await bcrypt.genSalt(10)
			// reassign password var to newley hashed password
			password = await bcrypt.hash(password, salt)

			// update user in database
			await db.Users.updateOne({_id}, {password})

			req.flash( 'admin_success', 'User password successfully edited.' )

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			
		} finally {
			res.redirect(`/admin/users/edit/${_id}`)
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
			if (sessionUser.role !== "Administrator") {
				throw new Error('You do not have permission to delete users.')
			}

			// prevent last admin removal
			const userIsLastAdmin = await Utils.Users.onlyOneAdmin(_id)

			if (userIsLastAdmin) {
				throw new Error('Cannot delete last admin user account.')
			}

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