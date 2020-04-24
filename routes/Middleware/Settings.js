module.exports = (app, db) => {

	// Pass site settings to every route
	// =============================================================
	app.all('/*', async (req, res, next) => {
		const { method, url } = req
		
		try {
			// make sure post request to create analog cms base data goes through
			if ( url == "/initialize" && method !== "GET" ) {
				return next()
			}

			const site_data = await db.Analog.findOne().lean()

			// if no site data exists, force initialize screen
			if (!site_data) {
				return res.render("admin/initialize", { layout: "initialize" })
			}

			// insert into express req object
			req.site_data = site_data

		} catch (error) {
			// if an error occurred, send it to the client
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
		} finally {
			next()
		}
	})

}