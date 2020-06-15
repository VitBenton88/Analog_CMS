module.exports = (app) => {

	// Render Maintenance Page If Needed
	// =============================================================
	app.all('/*', async (req, res, next) => {
		try {
			const { originalUrl, method, site_data } = req

			if (!site_data.settings.maintenance || method == "POST") return next()

			// allow whitelisted pages to render
			const whitelisted = ["login", "admin"]
			const urlToCheck = originalUrl.substring(1, 6)

			if ( whitelisted.includes(urlToCheck) ) return next()

			res.status(503).render("templates/defaults/maintenance", {
				site_data,
				layout: "maintenance"
			})

		} catch (error) {
			console.error(error)
			next()
		}
	})

}