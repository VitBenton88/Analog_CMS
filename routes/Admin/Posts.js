module.exports = (app, db, slugify, Utils) => {

// POSTS - GET
// =============================================================
app.get("/admin/posts", async (req, res) => {
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

		//determine offset in query by current page in pagination
		const skip = paged > 0 ? ((paged - 1) * limit) : 0

		// get templated for user to select
		const templates = await Utils.Templates.getAll()

		// get query count for pagination
		const count = await db.Posts.find().countDocuments().lean()
		const pageCount = Math.ceil(count / limit)
		// setup query params
		const sortConfig = orderBy ? Utils.Sort.getConfig(orderBy, sort) : {'created': 1}
		const searchParams = search ? {$text: {$search: search} } : {}

		// query db
		const posts = await db.Posts.find(searchParams).sort(sortConfig).skip(skip).limit(limit).populate('permalink').lean()
		// swap sort after the query if there is an order requested, e.g. desc to asc
		sort = orderBy ? Utils.Sort.swapOrder(sort) : null

		res.render("admin/posts", {
			limit,
			orderBy,
			pageCount,
			paged,
			posts,
			search,
			sessionUser,
			site_data,
			sort,
			templates,
			layout: "admin"
		})

	} catch (error) {
		console.error(error)
		const errorMessage = error.errmsg || error.toString()
		req.flash('admin_error', errorMessage)
		res.redirect('/admin')
	}
})

// CREATE POST PAGE - GET
// =============================================================
app.get("/admin/posts/add", async (req, res) => {
	const { site_data, user } = req
	const { _id, username } = user
	const sessionUser = { username, _id }

	try {      
		const templates = await Utils.Templates.getAll()
		const forms = await db.Forms.find().lean()
		const taxonomies_query = await db.Taxonomies.find()
		const taxonomies = taxonomies_query.map( (taxonomy) => taxonomy.toObject({ getters: true }) )

		res.render("admin/add/post", {
			forms,
			sessionUser,
			site_data,
			taxonomies,
			templates,
			layout: "admin"
		})

	} catch (error) {
		console.error(error)
		const errorMessage = error.errmsg || error.toString()
		req.flash('admin_error', errorMessage)
		res.redirect('/admin/posts')
	}
})

// UPDATE POST PAGE - GET
// =============================================================
app.get("/admin/posts/edit/:id", async (req, res) => {
	const { params, site_data, user } = req
	const { _id, username } = user
	const sessionUser = { username, _id }

	try {      
		// collect data for render method
		const post_query = await db.Posts.findById({_id: params.id}).populate('permalink')
		const post = post_query.toObject({ getters: true })
		const templates = await Utils.Templates.getAll()
		const forms = await db.Forms.find().lean()
		const blocks = await db.Blocks.find().lean()
		const taxonomies_query = await db.Taxonomies.find()
		const taxonomies = taxonomies_query.map( (taxonomy) => taxonomy.toObject({ getters: true }) )

		res.render("admin/edit/post", {
			blocks,
			forms,
			post,
			site_data,
			taxonomies,
			templates,
			sessionUser,
			layout: "admin"
		})

	} catch (error) {
		console.error(error)
		const errorMessage = error.errmsg || error.toString()
		req.flash('admin_error', errorMessage)
		res.redirect('/admin/posts')
	}
})

// CREATE POST - POST
// =============================================================
app.post("/addpost", async (req, res) => {
	const { body, user } = req

	let {
		active,
		content,
		forms,
		image,
		metaTitle,
		metaDescription,
		private,
		published,
		sitemap,
		taxonomies,
		template,
		title
	} = body

	let route = title ? slugify(title) : undefined

	try {
		// basic validation
		if (!template || !title) {
			throw new Error('Please fill out all fields when adding a post.')
		}

		// format fields for db
		published = published ? new Date(published) : new Date()
		active = active == "on" ? true : false
		private = private == "on" ? true : false
		sitemap = sitemap == "on" ? true : false
		image = image === '' ? null : image
		const author = user._id

		// check if permalink already exists and checks against reserved routes
		const permalinkVerified = await Utils.Permalinks.validate(route)

		if (!permalinkVerified) {
			route = `${route}2`
		}

		// create new post in db
		const createdPost = await db.Posts.create({active, author, content, forms, image, private, published, taxonomies, template, title})
		const ownerModel = 'Posts'
		const owner = createdPost.id

		// then create its permalink in the Permalinks document ...
		const createdPermalink = await db.Permalinks.create({route, owner, ownerModel, sitemap})
		const permalink = createdPermalink.id

		// then create its meta in the meta document ...
		const createdMeta = await db.Meta.create({title: metaTitle, description: metaDescription, owner, ownerModel})
		const meta = createdMeta.id

		// then add this post to the terms it is classified under ...
		await db.Terms.updateMany({ _id: {$in: taxonomies} }, {$push: {associations: owner} })

		// finally go back and assign that permalink and meta to the newly created post
		await db.Posts.updateOne({_id: owner}, {permalink, meta})

		const flash_type = permalinkVerified ? 'admin_success' : 'admin_warning'
		const flash_message = permalinkVerified ? 'Post successfully created.' : 'Post successfully created however the provided permalink was already in use so it was modified.'

		req.flash(flash_type, flash_message)
		res.redirect(`/admin/posts/edit/${owner}`)

	} catch (error) {
		console.error(error)
		let errorMessage = error.errmsg || error.toString()
		// if this is a dup error, notify the user about it
		if (error.code == 11000) {
			if (errorMessage.includes('route')) {
				errorMessage = `The permalink "${route}" is already in use.`
			} else {
				errorMessage = `The post title "${title}" is already in use.`
			}
		}

		req.flash('admin_error', errorMessage)
		res.redirect('/admin/posts')
	}
})

// UPDATE POST - POST
// =============================================================
app.post("/updatepost", async (req, res) => {
	let {
		_id,
		active,
		blocks,
		content,
		forms,
		image,
		metaTitle,
		metaDescription,
		originalRoute,
		private,
		published,
		route,
		sitemap,
		taxonomies,
		template,
		title
	} = req.body

	const redirect_url = `/admin/posts/edit/${_id}`

	try {
		// basic validation
		if (!template || !title || !route) {
			throw new Error('Please fill out all required fields when editing a post.')
		}

		// format fields for db
		published = published ? new Date(published) : undefined
		active = active == "on" ? true : false
		private = private == "on" ? true : false
		sitemap = sitemap == "on" ? true : false
		image = image === '' ? null : image
		const updated = Date.now()

		// make sure route is in slug format
		route = slugify(route)

		// check if permalink already exists and checks against reserved routes
		const permalinkVerified = await Utils.Permalinks.validate(route)

		if (!permalinkVerified) {
			route = `${route}2`
		}

		// update post in db
		const updatedPost = await db.Posts.findOneAndUpdate({_id}, {active, blocks, content, forms, image, private, published, taxonomies, template, title, updated}, { "new": true})
		const owner = updatedPost.id
		const taxonomies_after_update = updatedPost.taxonomies

		// then update the permalink in the Permalinks document ...
		const updatedPermalink = await db.Permalinks.findOneAndUpdate({owner}, {route, sitemap}, {new: true})
		// then update the meta in the meta document ...
		await db.Meta.updateOne({owner}, {description: metaDescription, title: metaTitle})
		// finally update the terms that associate to the post updates
		await db.Terms.updateMany({associations: {$in: _id} }, {$pull: {associations: {$in: _id} } })
		await db.Terms.updateMany({ _id: {$in: taxonomies_after_update} }, {$push: {associations: _id} })
		// finally update any links that use this post's route (that were created as a reference to an existing page)
		await db.Links.updateMany({route: `/${originalRoute}`, is_ref: true}, {route: `/${updatedPermalink.full}`})

		const flash_type = permalinkVerified ? 'admin_success' : 'admin_warning'
		const flash_message = permalinkVerified ? 'Post successfully updated.' : 'Post successfully updated however the provided permalink was already in use so it was modified.'

		req.flash(flash_type, flash_message)
		res.redirect(redirect_url)

	} catch (error) {
		console.error(error)
		let errorMessage = error.errmsg || error.toString()
		// if this is a dup error, notify the user about it
		if (error.code == 11000) {
			if (errorMessage.includes('route')) {
				errorMessage = `The permalink "${route}" is already in use.`
			} else {
				errorMessage = `The post title "${title}" is already in use.`
			}
		}

		req.flash('admin_error', errorMessage)
		res.redirect(redirect_url)
	}
})

// UPDATE SEVERAL POSTS - POST
// =============================================================
app.post("/updatepostmulti", async (req, res) => {
	const { list_id_arr, update_criteria, update_value } = req.body
	const active = (update_value === 'active')
	const updated = Date.now()

	try {  
		// check if this is a delete query
		const deleteQuery = update_criteria === 'delete';
		// setup db query params
		const _id = owner = associations = { $in: list_id_arr }

		// collect info on all deleted items
		const postsToDelete = await db.Posts.find({ _id }).lean()
		const permalink_arr = postsToDelete.map(post => post.permalink)

		// change update config based on values passed in by user
		$set = update_criteria == "template" ? {template: update_value, updated} : {active, updated}

		// define db query based on update criteria
		const Query = deleteQuery ? db.Posts.deleteMany({ _id }) : db.Posts.updateMany({ _id }, { $set })

		// fire db query ...
		await Query

		// if this is not a delete query, respond here with appropriate success message
		if (!deleteQuery) {
			req.flash(
				'admin_success',
				'Bulk edit successful.'
			)

			return res.send(true)
		}

		// if this is a delete query, delete all associations with the deleted posts ...
		await db.Permalinks.deleteMany({ owner })
		await db.Permalinks.updateMany({parent: {$in: permalink_arr}}, { $unset: {parent: 1} })
		await db.Meta.deleteMany({ owner })
		await db.Terms.updateMany({ associations }, {$pull: {vassociations } })
		// finally set any links that use the deleted posts' routes as a reference to inactive
		await db.Links.updateMany({permalink: {$in: permalink_arr}, is_ref: true}, {active: false})

		req.flash(
			'admin_success',
			'Posts successfully deleted.'
		)

		res.send(true)

	} catch (error) {
		console.error(error)
		const errorMessage = error.errmsg || error.toString()
		req.flash('admin_error', errorMessage)
		res.redirect('/admin/posts')
	}
})

// DELETE POST IMAGE - POST
// =============================================================
app.post("/deletepostimage", async (req, res) => {
	try {
		// remove image from post in db
		await db.Posts.updateOne({_id: req.body._id}, { $unset: {image: 1} })

		res.json({
			"response": 'Success.',
			"message": 'Post image successfully deleted.'
		})

	} catch (error) {
		console.error(error)
		const errorMessage = error.errmsg || error.toString()
		res.status(500).json({
			"response": errorMessage,
			"message": "Post image not deleted. Error occurred."
		})
	}
})

// DELETE POST - POST
// =============================================================
app.post("/deletepost", async (req, res) => {
	const { _id } = req.body

	try {
		// setup db query params
		const owner = _id
		const associations = {$in: _id}
		// delete post from db ...
		const deletedPost = await db.Posts.findOneAndDelete({_id})
		// then delete all associations to post ...
		await db.Permalinks.deleteOne({ owner })
		await db.Permalinks.updateMany({parent: deletedPost.permalink}, { $unset: {parent: 1} })
		await db.Meta.deleteOne({ owner })
		await db.Terms.updateMany({ associations }, {$pull: { associations } })
		await db.CustomFields.deleteMany({ owner })
		// finally set any links that use this post's route as a reference to inactive
		await db.Links.updateMany({permalink: deletedPost.permalink, is_ref: true}, {active: false})

		req.flash(
			'admin_success',
			'Post successfully deleted.'
		)

		res.redirect('/admin/posts')

	} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect(`/admin/posts/edit/${_id}`)
		}
	})

}