module.exports = (app, db, slugify, Utils) => {

	// PAGES - GET
	// =============================================================
	app.get(["/admin/pages", "/admin/posts"], async (req, res) => {
		const { body, query, site_data, url, user } = req
		let { limit, orderBy, paged, search, sort, terms } = query
		const { _id, role, username } = user
		const sessionUser = { username, _id, role }
		const is_post = url == "/admin/posts"
		let render_template = "admin/pages"

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

			// make sure terms are always in array format
			if (terms) {
				terms = terms.includes(",") ? terms.split(",") : [terms]
			}

			// get templated for user to select
			const templates = await Utils.Templates.getAll()

			// get query count for pagination
			const count = await db.Pages.find({is_post}).countDocuments().lean()
			const pageCount = Math.ceil(count / limit)
			// setup query params
			const sortConfig = orderBy ? Utils.Sort.getConfig(orderBy, sort) : {'created': 1}
			const searchParams = search ? {$text: {$search: search, is_post} } : {is_post}
			// swap sort after the query if there is an order requested, e.g. desc to asc
			sort = orderBy ? Utils.Sort.swapOrder(sort) : null

			if (terms) {
				searchParams.taxonomies = { $in: terms }
			}

			// query db
			const collection = await db.Pages.find(searchParams).sort(sortConfig).skip(skip).limit(limit).populate('permalink').lean()
			const render_data = {
				limit,
				orderBy,
				pageCount,
				paged,
				search,
				sessionUser,
				site_data,
				sort,
				templates,
				layout: "admin"
			}

			if (is_post) { 
				const taxonomies_query = await db.Taxonomies.find()
				render_data.taxonomies = taxonomies_query.map( (taxonomy) => taxonomy.toObject({ getters: true }) )
				render_data.posts = collection
				render_data.terms = terms
				render_template = "admin/posts"
			} else {
				render_data.pages = collection
			}

			res.render(render_template, render_data)

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect('/admin')
		}
	})

	// CREATE PAGE ... PAGE - GET
	// =============================================================
	app.get(["/admin/pages/add", "/admin/posts/add"], async (req, res) => {
		const { site_data, url, user } = req
		const { _id, username } = user
		const sessionUser = { username, _id }
		const is_post = url == "/admin/posts/add"

		try {
			let render_template = "admin/add/page"
			const templates = await Utils.Templates.getAll()
			const forms = await db.Forms.find().lean()
			const render_data = {
				forms,
				templates,
				sessionUser,
				site_data,
				layout: "admin"
			}

			if (is_post) {
				const taxonomies_query = await db.Taxonomies.find()
				render_data.taxonomies = taxonomies_query.map( (taxonomy) => taxonomy.toObject({ getters: true }) )
				render_template = "admin/add/post"
			} else {
				render_data.pages = await db.Pages.find({active: true}).populate('permalink').lean()
			}

			res.render(render_template, render_data)

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect('/admin/pages')
		}
	})

	// CREATE PAGE - POST
	// =============================================================
	app.post("/page/create/single", async (req, res) => {
		const { body, user } = req

		let {
			active,
			content,
			forms,
			homepage,
			image,
			is_post,
			metaTitle,
			metaDescription,
			parent,
			private,
			published,
			sitemap,
			taxonomies,
			template,
			title
		} = body

		is_post = is_post == "true" ? true : false
		let route = title ? slugify(title) : undefined
		const error_redirect_url = is_post ? '/admin/posts' : '/admin/pages'

		try {
			// basic validation
			if (!template || !title) throw new Error('Please fill out all fields when adding a page or post.')

			active = active == "on" ? true : false
			private = private == "on" ? true : false
			published = published ? new Date(published) : new Date()
			homepage = homepage == "on" ? true : false
			parent = parent === 'none' ? null : parent
			sitemap = sitemap == "on" ? true : false
			image = image === '' ? null : image
			const author = user._id
			const message_reference = is_post ? "Post" : "Page"

			// check if permalink already exists and checks against reserved routes
			const permalinkVerified = await Utils.Permalinks.validate(route)

			if (!permalinkVerified) {
				route = `${route}2`
			}

			const create_params = {active, author, content, forms, homepage, image, is_post, private, template, title}

			if (is_post) {
				create_params.published = published
				create_params.taxonomies = taxonomies
			}

			// create page in db ...
			const createdPage = await db.Pages.create(create_params)
			const owner = createdPage.id
			const redirect_url = is_post ? `/admin/posts/edit/${owner}` : `/admin/pages/edit/${owner}`
			const permalink_params = {route, owner, sitemap}

			if (!is_post) {
				permalink_params.parent = parent
			}

			// then create its permalink in the Permalinks document ...
			const createdPermalink = await db.Permalinks.create(permalink_params)
			const permalink = createdPermalink.id

			// then create its meta in the meta document ...
			const createdMeta = await db.Meta.create({title: metaTitle, description: metaDescription, owner})
			const meta = createdMeta.id

			// finally go back and assign that permalink and meta to the newly created page
			await db.Pages.updateOne({_id: owner}, {permalink, meta})

			const flash_type = permalinkVerified ? 'admin_success' : 'admin_warning'
			const flash_message = permalinkVerified ? `${message_reference} successfully created` : `${message_reference} successfully created however the provided permalink was already in use so it was modified.`

			req.flash(flash_type, flash_message)
			res.redirect(redirect_url)

		} catch (error) {
			console.error(error)
			let errorMessage = error.errmsg || error.toString()
			// if this is a dup error, notify the user about it
			if (error.code == 11000) {
				if (errorMessage.includes('route')) {
					errorMessage = `The permalink "${route}" is already in use.`
				} else if (errorMessage.includes('title')) {
					errorMessage = `The page title "${title}" is already in use.`
				} else if (errorMessage.includes('homepage')) {
					errorMessage = 'There is already a homepage set.'
				}
			}

			req.flash('admin_error', errorMessage)
			res.redirect(error_redirect_url)
		}
	})

	// UPDATE PAGE ... PAGE - GET
	// =============================================================
	app.get(["/admin/pages/edit/:id", "/admin/posts/edit/:id"], async (req, res) => {
		const { params, site_data, user } = req
		const sessionUser = { username: user.username, _id: user._id }
		const _id = params.id

		try {
			// collect data for render method
			let render_template = "admin/edit/page"
			const pageQuery = await db.Pages.findById(_id).populate('permalink')
			const page_data = pageQuery.toObject({ getters: true })
			const { is_post, template } = pageQuery
			const page_route = page_data.permalink.route
			const page_full_permalink = page_data.permalink.full
			const permalink_without_route = page_full_permalink.substring(0, page_full_permalink.length - page_route.length)
			const root_permalink = `${site_data.settings.address}/${permalink_without_route}`
			const templates = await Utils.Templates.getAll()
			const forms = await db.Forms.find().lean()
			const blocks = await db.Blocks.find().lean()
			const fieldGroups = await Utils.Fields.get( is_post ? "Posts" : "Pages", template, _id)
			const render_data = {
				blocks,
				fieldGroups,
				forms,
				page_route,
				page_full_permalink,
				root_permalink,
				sessionUser,
				site_data,
				templates,
				layout: "admin"
			}

			if (is_post) {
				const taxonomies_query = await db.Taxonomies.find()
				render_template = "admin/edit/post"
				render_data.taxonomies = taxonomies_query.map( (taxonomy) => taxonomy.toObject({ getters: true }) )
				render_data.post = page_data
			} else {
				// query all but this page for choosing parent
				render_data.pages = await db.Pages.find({active: true, _id: { $nin: _id } }).populate('permalink').lean()
				render_data.page = page_data
			}
			
			res.render(render_template, render_data)

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect('/admin/pages')
		}
	})

	// UPDATE PAGE - POST
	// =============================================================
	app.post("/page/update/single", async (req, res) => {
		let {
			_id,
			active,
			blocks,
			content,
			forms,
			homepage,
			is_post,
			image,
			metaTitle,
			metaDescription,
			originalRoute,
			parent,
			private,
			published,
			route,
			sitemap,
			template,
			taxonomies,
			title
		} = req.body

		route = title ? slugify(title) : undefined
		is_post = is_post == "true" ? true : false

		const redirect_url = is_post ? `/admin/posts/edit/${_id}` : `/admin/pages/edit/${_id}`

		try {
			// basic validation
			if (!_id || !template || !title || !route) throw new Error('Please fill out all required fields when editing a page.')

			active = active == "on" ? true : false
			homepage = homepage == "on" ? true : false
			image = image === '' ? null : image
			parent = parent === 'none' ? null : parent
			private = private == "on" ? true : false
			published = published ? new Date(published) : undefined
			sitemap = sitemap == "on" ? true : false

			// set updated time for now
			const updated = Date.now()

			// make sure route is in slug format
			route = slugify(route)
			// check if permalink already exists and checks against reserved routes
			const permalinkVerified = await Utils.Permalinks.validate(route)

			if (!permalinkVerified) {
				route = `${route}2`
			}

			// manage fields
			await Utils.Fields.update(req, _id)

			// build query params
			const update_params = { active, blocks, content, forms, image, private, template, title, updated }

			if (is_post) {
				update_params.taxonomies = taxonomies
				update_params.published = published
			} else {
				update_params.homepage = homepage
				update_params.parent = parent
			}

			// update post's fields in db ...
			const updatedPage = await db.Pages.findOneAndUpdate({_id}, update_params)
			// capture the id of updated page
			const owner = updatedPage.id

			if (is_post) {
				// update the terms that associate to the post updates
				const taxonomies_after_update = updatedPost.taxonomies
				await db.Terms.bulkWrite( [{ updateMany: { associations: {$in: _id} } }, { updateMany: {filter: { _id: {$in: taxonomies_after_update} }, update: { $push: {associations: _id} }} } ] )
			}

			// then update the permalink in the Permalinks document ...
			const updatedPermalink = await db.Permalinks.findOneAndUpdate({owner}, {route, parent, sitemap}, {new: true})
			// then update the meta in the meta document ...
			await db.Meta.updateOne({owner}, {description: metaDescription, title: metaTitle})
			// finally update any links that use this page's route (that were created as a reference to an existing page)
			await db.Links.updateMany({route: `/${originalRoute}`, is_ref: true}, {route: `/${updatedPermalink.full}`})

			const flash_type = permalinkVerified ? 'admin_success' : 'admin_warning'
			const flash_message = permalinkVerified ? 'Update successfully applied.' : 'Update successfully applied however the provided permalink was already in use so it was modified.'

			req.flash(flash_type, flash_message)

		} catch (error) {
			console.error(error)
			let errorMessage = error.errmsg || error.toString()
			// if this is a dup error, notify the user about it
			if (error.code == 11000) {
				if (errorMessage.includes('route')) {
					errorMessage = `The permalink "${route}" is already in use.`
				} else if (errorMessage.includes('title')) {
					errorMessage = `The page title "${title}" is already in use.`
				} else if (errorMessage.includes('homepage')) {
					errorMessage = 'There is already a homepage set.'
				}
			}

			req.flash('admin_error', errorMessage)

		} finally {
			res.redirect(redirect_url)
		}
	})

	// UPDATE SEVERAL PAGES - POST
	// =============================================================
	app.post("/page/update/multi", async (req, res) => {
		const { are_posts, list_id_arr, update_criteria, update_value } = req.body
		const active = (update_value === 'active')
		const updated = Date.now()
		const error_redirect_url = is_post ? '/admin/posts' : '/admin/pages'

		try {
			// check if this is a delete query
			const deleteQuery = update_criteria === 'delete'
			// setup db query params
			const _id = owner = { $in: list_id_arr }
			// collect info on all deleted items
			const pagesToDelete = await db.Pages.find({ _id }).lean()
			const permalink_arr = pagesToDelete.map(page => page.permalink)

			// change update config based on values passed in by user
			$set = update_criteria == "template" ? {template: update_value, updated} : {active, updated}

			// define db query based on update criteria
			const Query = deleteQuery ? db.Pages.deleteMany({ _id }) : db.Pages.updateMany({ _id }, { $set })
			// conduct bulk edit of pages in db ...
			await Query

			// if this is not a delete query, respond now with default success message
			if (!deleteQuery) {
				req.flash( 'admin_success', 'Bulk edit successful.' )
				return res.send(true)
			}

			// if this is a delete query, conduct deletions of permalinks and metas these pages own
			await db.Permalinks.bulkWrite( [{ deleteMany: { filter: { owner } } }, { updateMany: {filter: { parent: {$in: permalink_arr} }, update: { $unset: {parent: 1} }} } ] )
			await db.Meta.deleteMany({ owner })
			await db.FieldValues.deleteMany({ owner })
			await db.RepeaterFields.deleteMany({ owner })

			if (are_posts) {
				await db.Terms.updateMany({ associations }, {$pull: {associations } })
			}

			// finally set any links that use the deleted posts' routes as a reference to inactive
			await db.Links.updateMany({permalink: {$in: permalink_arr}, is_ref: true}, {active: false})

			req.flash( 'admin_success', 'Bulk delete successful.' )
			res.send(true)

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect(error_redirect_url)
		}
	})

	// DELETE PAGE IMAGE - POST
	// =============================================================
	app.post("/page/image/delete", async (req, res) => {
		try {
			// remove image from page in db
			await db.Pages.updateOne({_id: req.body._id}, { $unset: {image: 1} })

			res.json({
				"response": 'Success.',
				"message": 'Featured image successfully deleted.'
			})

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			res.status(500).json({
				"response": errorMessage,
				"message": "Featured image not deleted. Error occurred."
			})
		}
	})

	// DELETE PAGE - POST
	// =============================================================
	app.post("/page/delete", async (req, res) => {
		const { _id } = req.body

		try {
			let redirect_url = '/admin/pages'

			// setup db query params
			const owner = _id
			const associations = {$in: _id}
			// delete page in db
			const deletedPage = await db.Pages.findOneAndDelete({_id})
			// then delete all associations to page ...
			await db.Permalinks.bulkWrite( [{ deleteOne: { filter: { owner } } }, { updateMany: {filter: { parent: deletedPage.permalink }, update: { $unset: {parent: 1} }} } ] )
			await db.Meta.deleteOne({ owner })
			await db.FieldValues.deleteMany({ owner })
			await db.RepeaterFields.deleteMany({ owner })

			if (deletedPage.is_post) {
				await db.Terms.updateMany({ associations }, {$pull: { associations } })
				redirect_url = '/admin/posts'
			}

			// finally set any links that use this page's route as a reference to inactive
			await db.Links.updateMany({permalink: deletedPage.permalink, is_ref: true}, {active: false})

			req.flash( 'admin_success', 'Page successfully deleted.' )
			res.redirect(redirect_url)

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect(`/admin/pages/edit/${_id}`)
		}
	})

}