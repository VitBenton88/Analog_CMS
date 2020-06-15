module.exports = (app, db) => {

	// SEARCH - GET
	// =============================================================
	app.get('/search', async (req, res) => {
		const { menus, originalUrl, plugins, query, site_data } = req
		let { limit, paged, term } = query

		try {
			// set query limit to 10 as default, or use defined limit (converted to int)
			limit = limit ? parseInt(limit) : 10
			// set paged to 1 as default, or use defined query (converted to int)
			paged = paged ? parseInt(paged) : 1
			// determine offset in query by current page in pagination
			const skip = paged > 0 ? ((paged - 1) * limit) : 0
			// get query count for pagination
			const count = await db.Pages.find().countDocuments().lean()
			const pageCount = Math.ceil(count / limit)
			const searchParams = term ? {$text: {$search: term} } : {}

			// query pages with search term
			const pages_query = await db.Pages.find(searchParams).skip(skip).limit(limit).populate('permalink')
			const pages = pages_query.map(page => page.toObject( { getters: true } ))

			res.render('templates/defaults/search', {
				limit,
				menus,
				originalUrl,
				pages,
				paged,
				pageCount,
				plugins,
				term,
				site_data
			})

		} catch (error) {
			console.error(error)
			res.status(500).end()
		}
	})

}