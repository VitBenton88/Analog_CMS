module.exports = (app, db) => {

	// ADMIN - GET
	// =============================================================
	app.get("/admin", (req, res) => {
		res.redirect('/admin/dashboard')
	})

	// ADMIN DASHBOARD - GET
	// =============================================================
	app.get("/admin/dashboard", async (req, res) => {
		const { site_data, user } = req
		const { _id, username } = user
		const sessionUser = { username, _id }

		try {
			// query data for quick view
			let pages = 0
			let posts = 0
			const pages_query = await db.Pages.find().lean()
			const unreadEntries = await db.Entries.find({read: false}).countDocuments().lean()
			const users = await db.Users.find().countDocuments().lean()

			// count pages & posts\
			for (let i = 0; i < pages_query.length; i++) {
				const { is_post } = pages_query[i];
				if (is_post) {
					posts++
				} else {
					pages++
				}
			}
			
			// render
			res.render("admin/dashboard", {
				pages,
				posts,
				site_data,
				sessionUser,
				unreadEntries,
				users,
				layout: "admin"
			})

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect('/')
		}
	})

}