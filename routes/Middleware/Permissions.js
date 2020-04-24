module.exports = (app) => {

	// Reject all put, post, and delete methods if user has 'visitor' role
	// =============================================================
	app.all("*", async (req, res, next) => {
		const { headers, method, originalUrl, user } = req
		const { referer } = headers

		try {
			// check all non-GET requests coming from users and enforce permissions
			// safeguard GET requests and posts coming from login page
			if ( method !== "GET" && originalUrl !== '/logout' && !req.isAuthenticated() ) {
				// 'Visitor' roles cannot update data
				if (referer.includes('/admin') && user.role !== "Administrator") {
					req.flash('admin_warning', 'Your user permissions do not allow for updating content.')
					return res.redirect(referer)
				}
			}

			// pass route on ...
			next()

		} catch (error) {
			console.log(error)
			res.status(403).end()
		}
	})

}