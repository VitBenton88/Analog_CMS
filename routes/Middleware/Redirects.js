module.exports = (app, db) => {

	// Handle all redirect hits
	// =============================================================
	app.get('/*', async (req, res, next) => {
		const { url } = req

		try {
			// lookup redirect and count a hit
			const redirect = await db.Redirects.findOneAndUpdate( { source: url, active: true }, { $inc: {"hits": 1} } )

			if (!redirect) {
				return next()
			}

			const { target, type } = redirect

			// fire redirect
			res.redirect(type, target)

		} catch (error) {
			console.error(error)
			next()
		}
	})

}