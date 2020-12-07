module.exports = (app, db) => {
	// setup 404 handling
	// =============================================================
	app.use( async (req, res) => {
		const { originalUrl, site_data } = req
		const { traffic } = site_data.settings
	
		try {
			// update hit count in db, if applicable
			if (traffic.log404) {
				await db.PagesNotFound.updateOne({ source: originalUrl }, { source: originalUrl, $inc: { "hits": 1 }}, { upsert: true })
			}
	
			res.redirect('/Error404')
	
		} catch (error) {
			console.error(error)
			res.status(500).end()
		}
	})
}