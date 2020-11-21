module.exports = (app, db, pjson) => {

	// Pass site settings to every route
	// =============================================================
	app.all('/*', async (req, res, next) => {
		const { url } = req
		const { version } = pjson
		let allow_next = true
		
		try {
			// make sure post request to create analog cms base data goes through
			if ( url !== "/initialize" ) {
				const site_data = await db.Analog.findOne().lean()

				// if no site data exists, force initialize screen
				if (!site_data) {
					allow_next = false
					return res.redirect("/initialize")
				}
	
				// insert CMS version number
				site_data.version = version
	
				// insert into express req object
				req.site_data = site_data
			}

		} catch (error) {
			// if an error occurred, send it to the client
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
		} finally {
			if (allow_next) next()
		}
	})

}