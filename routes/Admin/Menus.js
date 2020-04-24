module.exports = (app, db, slugify, Utils) => {

	// MENU - GET
	// =============================================================
	app.get("/admin/menus", async (req, res) => {
		const { body, query, site_data, user } = req
		let { limit, orderBy, paged, search, sort } = query
		const { _id, role, username } = user
		const sessionUser = { username, _id, role }

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
			const count = await db.Menus.find().countDocuments().lean()
			const pageCount = Math.ceil(count / limit)
			// setup query params
			const sortConfig = orderBy ? Utils.Sort.getConfig(orderBy, sort) : {'created': 1}
			const searchParams = search ? {$text: {$search: search} } : {}

			// query db
			const menus = await db.Menus.find(searchParams).sort(sortConfig).skip(skip).limit(limit).lean()
			// swap sort after the query if there is an order requested, e.g. desc to asc
			sort = orderBy ? Utils.Sort.swapOrder(sort) : null

			res.render("admin/menus", {
				limit,
				menus,
				orderBy,
				pageCount,
				paged,
				search,
				sessionUser,
				site_data,
				sort,
				layout: "admin"
			})

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect('/admin')
		}
	})

	// UPDATE MENU - GET
	// =============================================================
	app.get("/admin/menus/edit/:slug", async (req, res) => {
		const { menus, originalUrl, params, site_data, user } = req
		const { slug } = params
		const { _id, role, username } = user
		const sessionUser = { username, _id, role }

		try {  
			const menu = menus[slug] 
			const permalinks_query = await db.Permalinks.find().populate('owner')
			const permalinks = permalinks_query.map(permalink => permalink.toObject( { getters: true } ))

			res.render("admin/edit/menu", {
				menu,
				originalUrl,
				permalinks,
				sessionUser,
				site_data,
				layout: "admin"
			})

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect('/admin/menus')
		}
	})

	// CREATE MENU - POST
	// =============================================================
	app.post("/addmenu", async (req, res) => {
		const { name } = req.body
		const redirectUrl = '/admin/menus'

		try {
			// basic validation
			if (!name) {
				throw new Error('Please fill out all fields when adding a new menu.')
			}

			// create slug
			const slug = slugify(name)
			// create in db
			await db.Menus.create({name, slug})

			req.flash(
				'admin_success',
				'Menu successfully added.'
			)
			res.redirect(redirectUrl)

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect(redirectUrl)
		}
	})

	// UPDATE MENU NAME - POST
	// =============================================================
	app.post("/updatemenu", async (req, res) => {
		let { _id, name, slug_from_cient } = req.body
		let redirectUrl = `/admin/menus/edit/${slug_from_cient}`

		try {
			// basic validation
			if (!name) {
				throw new Error('Please provide a value for name.')
			}

			// create/format slug
			slug = slugify(name)

			// create in db
			await db.Menus.updateOne({_id}, {name, slug})

			// re-define redirct url
			redirectUrl = `/admin/menus/edit/${slug}`

			req.flash(
				'admin_success',
				'Menu successfully updated.'
			)
			res.redirect(redirectUrl)

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect(redirectUrl)
		}
	})

	// CREATE MENU ITEM - POST
	// =============================================================
	app.post("/addmenuitem", async (req, res) => {
		let { _id, permalink, originalRoute, slug, target, text, reference, route } = req.body
		const redirectUrl = `/admin/menus/edit/${slug}`

		try {
			// basic validation
			if (!text || !route) {
				throw new Error('Please fill out all fields when adding a new menu item.')
			}

			let is_ref = reference == "true"
			permalink = permalink ? permalink : null

			if (is_ref && originalRoute !== route) {
				is_ref = false
			}

			// create link in db
			const createdLink = await db.Links.create({is_ref, owner: _id, permalink, route, target, text})
			// add link to menu it belongs to
			await db.Menus.updateOne({_id}, { $push: {links: createdLink._id} })

			req.flash(
				'admin_success',
				'Menu item successfully added.'
			)
			res.redirect(redirectUrl)

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect(redirectUrl)
		}
	})

	// UPDATE MENU ITEM - POST
	// =============================================================
	app.post("/updatemenuitem", async (req, res) => {
		let { _id, originalRoute, permalink, reference, slug, target, text, route } = req.body
		const redirectUrl = `/admin/menus/edit/${slug}`

		try {
			// basic validation
			if (!text || !route) {
				throw new Error('Please fill out all fields when adding a new menu item.')
			}

			let is_ref = reference == "true"
			permalink = permalink ? permalink : null
			target = target ? target : '_self'

			if (is_ref && originalRoute !== route) {
				is_ref = false
			}

			// update in db
			await db.Links.updateOne({_id}, {is_ref, permalink, route, target, text})

			req.flash(
				'admin_success',
				'Menu item successfully edited.'
			)
			res.redirect(redirectUrl)

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect(redirectUrl)
		}
	})

	// UPDATE MENU ITEM POSITION - PUT
	// =============================================================
	app.put("/updatemenuitemposition", async (req, res) => {
		const { _id, _id_newPosition, _id_menu_oldPosition, _menuSwapped } = req.body

		try {  
		// basic validation
		if (!_id || !_id_newPosition || !_id_menu_oldPosition || !_menuSwapped) {
			throw new Error('Something went wrong while updating the menu item’s position.')
		}

		// update link position value in db
		await db.Links.updateOne({_id}, {position: _id_newPosition})
		// then update the link whose position was swapped
		await db.Links.updateOne({_id: _menuSwapped}, {position: _id_menu_oldPosition})

		res.status(200).end()

		} catch (error) {
			console.error(error)
			res.status(400).end()
		}
	})

	// CREATE SUBMENU - POST
	// =============================================================
	app.post("/addsubmenu", async (req, res) => {
		let { _id, originalRoute, owner, permalink, reference, slug, target, text, route } = req.body
		const redirectUrl = `/admin/menus/edit/${slug}`

		try {
			// basic validation
			if (!_id || !slug) {
				throw new Error('Please select a submenu item when adding submenu.')
			}

			let is_ref = reference == "true"
			permalink = permalink ? permalink : null
			target = target ? target : '_self'

			if (is_ref && originalRoute !== route) {
				is_ref = false
			}

			// create link in db
			const createdLink = await db.Links.create({is_ref, owner, permalink, route, target, text})
			const _submenu = createdLink.id
			// add new link to its owner’s submenu array
			await db.Links.updateOne({_id}, {$push: {submenu: _submenu}})

			req.flash(
				'admin_success',
				'Submenu item successfully added.'
			)
			res.redirect(redirectUrl)

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect(redirectUrl)
		}
	})

	// UPDATE SUBMENU ITEM POSITION - PUT
	// =============================================================
	app.put("/updatesubmenuitemposition", async (req, res) => {
		const { _id, _id_newPosition, _id_submenu_oldPosition, _submenuSwapped } = req.body

		try {
			// basic validation
			if (!_id || !_id_newPosition || !_id_submenu_oldPosition || !_submenuSwapped) {
				throw new Error('Something went wrong while updating the submenu item’s position.')
			}

			// update position of submenu in db
			await db.Links.updateOne({_id}, {sub_position: _id_newPosition})
			// update position of swapped submenu in db
			await db.Links.updateOne({_id: _submenuSwapped}, {sub_position: _id_submenu_oldPosition})

			res.status(200).end()

		} catch (error) {
			console.error(error)
			res.status(400).end()
		}
	})

	// DELETE MENU - POST
	// =============================================================
	app.post("/deletemenu", async (req, res) => {
		const { _id } = req.body
		const redirectUrl = '/admin/menus'

		try {
			// delete menu in db
			await db.Menus.deleteOne({_id: req.body._id})
			// delete all links this menu owned
			await db.Links.deleteMany({owner: _id})

			req.flash(
				'admin_success',
				'Menu successfully deleted.'
			)
			res.redirect(redirectUrl)

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect(redirectUrl)
		}
	})

	// DELETE MENU ITEM - POST
	// =============================================================
	app.post("/deletemenuitem", async (req, res) => {
		const { _id, slug } = req.body
		const redirectUrl = `/admin/menus/edit/${slug}`

		try {
			// delete menu item in db
			deletedLink = await db.Links.findByIdAndDelete({_id})
			// delete all links in this menu item’s submenu
			await db.Links.deleteMany({_id: {$in: deletedLink.submenu} })

			req.flash(
				'admin_success',
				'Menu item successfully deleted.'
			)
			res.redirect(redirectUrl)

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect(redirectUrl)
		}
	})

	// DELETE SUBMENU ITEM - POST
	// =============================================================
	app.post("/deletesubmenuitem", async (req, res) => {
		const { _id, slug, _submenu } = req.body
		const redirectUrl = `/admin/menus/edit/${slug}`

		try {
			// pull menu item from menu
			await db.Links.findByIdAndUpdate({_id}, {$pull: {submenu: _submenu}})

			req.flash(
				'admin_success',
				'Submenu item successfully deleted.'
			)
			res.redirect(redirectUrl)

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect(redirectUrl)
		}
	})

}