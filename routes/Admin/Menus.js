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
	app.get("/admin/menus/edit/:id", async (req, res) => {
		const { originalUrl, params, site_data, user } = req
		const { id } = params
		const { _id, role, username } = user
		const sessionUser = { username, _id, role }

		try {  
			const menu = await db.Menus.findById(id).lean()
			const permalinks_query = await db.Permalinks.find().populate('owner')
			const permalinks = permalinks_query.map(permalink => permalink.toObject( { getters: true } ))
			const links_query = await db.Links.find({owner: id, parent: null}).sort({"position": 1}).populate('permalink')
			const links = links_query.map(link => link.toObject( { getters: true } ))

			res.render("admin/edit/menu", {
				links,
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

		try {
			// basic validation
			if (!name) throw new Error('Please fill out all fields when adding a new menu.')

			// create slug
			const slug = slugify(name)
			// create in db
			await db.Menus.create({name, slug})

			req.flash( 'admin_success', 'Menu successfully added.' )

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)

		} finally {
			res.redirect('/admin/menus')
		}
	})

	// UPDATE MENU NAME - POST
	// =============================================================
	app.post("/updatemenu", async (req, res) => {
		let { _id, name, slug_from_cient } = req.body
		let redirectUrl = `/admin/menus/edit/${slug_from_cient}`

		try {
			// basic validation
			if (!name) throw new Error('Please provide a value for name.')

			// create/format slug
			slug = slugify(name)

			// create in db
			await db.Menus.updateOne({_id}, {name, slug})

			// re-define redirct url
			redirectUrl = `/admin/menus/edit/${slug}`

			req.flash( 'admin_success', 'Menu successfully updated.' )

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			
		} finally {
			res.redirect(redirectUrl)
		}
	})

	// CREATE MENU ITEM - PUT
	// =============================================================
	app.put("/addmenuitem", async (req, res) => {
		let { _id, permalink, originalRoute, target, text, reference, route } = req.body

		try {
			// basic validation
			if (!text || !route) throw new Error('Please fill out all fields when adding a new menu item.')
			
			let is_ref = reference == "true"
			permalink = permalink ? permalink : null

			if (is_ref && originalRoute !== route) {
				is_ref = false
			}

			// create link in db
			const createdLink = await db.Links.create({is_ref, owner: _id, permalink, route, target, text})
			// respond to client
			res.status(200).json(createdLink)

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			res.status(500).json({
				"response": errorMessage,
				"message": "Error occurred while creating repeater field."
			})
		}
	})

	// UPDATE MENU ITEM - PUT
	// =============================================================
	app.put("/updatemenuitem", async (req, res) => {
		let { _id, originalRoute, permalink, reference, target, text, route } = req.body

		try {
			// basic validation
			if (!text || !route) throw new Error('Please fill out all fields when updating a menu item.')

			let is_ref = reference == "true"
			target = target ? target : '_self'
			permalink = permalink ? permalink : null

			if (is_ref && originalRoute !== route) {
				is_ref = false
				permalink = null
			}

			// update in db
			const updatedLink = await db.Links.findOneAndUpdate({_id}, {is_ref, permalink, route, target, text}, {new: true})
			// respond to client
			res.status(200).json(updatedLink)

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			res.status(500).json({
				"response": errorMessage,
				"message": "Error occurred while creating repeater field."
			})
			
		}
	})

	// UPDATE MENU ITEM POSITION - PUT
	// =============================================================
	app.put("/updatemenuitemposition", async (req, res) => {
		let { _ids, moved_item_id, parent, positions } = req.body

		try {  
			// guard clause
			if (!_ids || !positions) throw new Error('Something went wrong while sorting menu items.')
			
			parent = parent ? parent : null;
			const children = {$in: moved_item_id}
			const positions_formatted = positions.map((position) => parseInt(position, 10) )
			const positions_sorted = positions_formatted.sort((a, b) => a - b)
			const queries = positions_sorted.map((position, i) => { return { updateOne: {filter: { _id: _ids[i] }, update: { $set: {position, parent} }} } } )
			queries.unshift({ updateOne: {filter: { children }, update: { $pull: { children } }} } )
			// add query for applying children to parent
			if (parent) {
				queries.push({ updateOne: {filter: { _id: parent }, update: { $set: {children: _ids} }} })
			}

			// update positions in db
			await db.Links.bulkWrite(queries)
			// respond to client
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

		try {
			// delete menu in db
			await db.Menus.deleteOne({_id: req.body._id})
			// delete all links this menu owned
			await db.Links.deleteMany({owner: _id})

			req.flash( 'admin_success', 'Menu successfully deleted.' )

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			
		} finally {
			res.redirect('/admin/menus')
		}
	})

	// DELETE MENU ITEM - DELETE
	// =============================================================
	app.delete("/deletemenuitem", async (req, res) => {
		const { _id } = req.body

		try {
			// guard clause
			if (!_id) throw new Error('Something went wrong while deleting a menu item.')

			const queries = []
			const children = {$in: _id}

			// push delete query
			queries.push({ deleteOne: { filter: { _id } } })
			// push parent removal query			
			queries.push({ updateMany: { filter: { parent: _id }, update: { $set: {parent: null} } } })
			// push children removals
			queries.push({ updateMany: {filter: { children }, update: { $pull: { children } }} })

			// update positions in db
			const bulk_update = await db.Links.bulkWrite(queries)

			// respond to client
			res.status(200).json(bulk_update)

		} catch (error) {
			console.error(error)
			res.status(500).json({
				"response": error,
				"message": "Error occurred while deleting a menu item."
			})
		}
	})

}