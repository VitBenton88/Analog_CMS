module.exports = (app, db) => {

	// Pass menus to every route
	// =============================================================
	app.use('/*', async (req, res, next) => {
		try {
			const populate = {
				path: 'submenu',
				model: 'Links',
				options: { sort: {"sub_position": 1} }
			}
			const populate_outer = {
				path: 'links',
				model: 'Links',
				options: { sort: {"position": 1} },
				populate
			}

			// query menus from db
			const menus = await db.Menus.find().populate(populate_outer).lean()
			const menusObj = {}

			if (menus) {
				// build menus object array
				menus.forEach(menu => {
					menusObj[menu.slug] = menu
				});
			}

			// insert into express req object
			req.menus = menusObj

		} catch (error) {
			console.error(error)
		} finally {
			next()
		}
	})

}