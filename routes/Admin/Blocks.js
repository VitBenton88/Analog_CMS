module.exports = (app, db, slugify, Utils) => {

	// BLOCKS - GET
	// =============================================================
	app.get("/admin/content/blocks", async (req, res) => {
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
			const count = await db.Blocks.find().countDocuments().lean()
			const pageCount = Math.ceil(count / limit)
			// setup query params
			const sortConfig = orderBy ? Utils.Sort.getConfig(orderBy, sort) : {'created': 1}
			const searchParams = search ? {$text: {$search: search} } : {}

			// query db
			const blocks = await db.Blocks.find(searchParams).sort(sortConfig).skip(skip).limit(limit).lean()
			// swap sort after the query if there is an order requested, e.g. desc to asc
			sort = orderBy ? Utils.Sort.swapOrder(sort) : null

			res.render("admin/blocks", {
				blocks,
				limit,
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

	// CREATE BLOCK PAGE - GET
	// =============================================================
	app.get("/admin/content/blocks/add", async (req, res) => {
		const { site_data, user } = req
		const { _id, username } = user
		const sessionUser = { username, _id }

		try {
			res.render("admin/add/block", {
				sessionUser,
				site_data,
				layout: "admin"
			})

			} catch (error) {
				console.error(error)
				const errorMessage = error.errmsg || error.toString()
				req.flash('admin_error', errorMessage)
				res.redirect('/admin/content/blocks')
		}
	})

	// CREATE BLOCK - POST
	// =============================================================
	app.post("/addblock", async (req, res) => {
		let { active, content, global, name } = req.body

		try {
			// basic validation
			if (!name) {
				throw new Error('Name not provided. Please fill out all fields when adding a block.')
			}

			active = active == "on" ? true : false
			global = global == "on" ? true : false
			const slug = slugify(name)

			// create block in db ...
			const createdBlock = await db.Blocks.create({ active, content, global, name, slug })
			const _block = createdBlock.id

			req.flash(
				'admin_success',
				'Block successfully added.'
			)
			res.redirect(`/admin/content/blocks/edit/${_block}`)

		} catch (error) {
			console.error(error)
			let errorMessage = error.errmsg || error.toString()
			// if this is a dup error, notify the user about it
			if (error.code == 11000) {
				if (errorMessage.includes('slug')) {
					errorMessage = `The slug "${slug}" is already in use.`
				} else if (errorMessage.includes('name')) {
					errorMessage = `The block name "${name}" is already in use.`
				}
			}

			req.flash('admin_error', errorMessage)
			res.redirect('/admin/content/blocks')
		}
	})

	// UPDATE BLOCK PAGE - GET
	// =============================================================
	app.get("/admin/content/blocks/edit/:id", async (req, res) => {
		const { params, site_data, user } = req
		const { _id, username } = user
		const sessionUser = { username, _id }

		try {      
			// query db
			const block = await db.Blocks.findById({ _id: params.id }).lean()

			res.render("admin/edit/block", {
				block,
				site_data,
				sessionUser,
				layout: "admin"
			})

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect('/admin/content/blocks')
		}
	})

	// UPDATE BLOCK - POST
	// =============================================================
	app.post("/updateblock", async (req, res) => {
		let { _id, active, content, global, name } = req.body

		try {
			// basic validation
			if (!name) {
				throw new Error('Name not provided. Please fill out all fields when adding a block.')
			}

			active = active == "on" ? true : false
			global = global == "on" ? true : false
			const slug = slugify(name)

			// update block in db ...
			await db.Blocks.updateOne({_id}, { active, content, global, name, slug })

			req.flash(
				'admin_success',
				'Block successfully updated.'
			)
			res.redirect(`/admin/content/blocks/edit/${_id}`)

		} catch (error) {
			console.error(error)
			let errorMessage = error.errmsg || error.toString()
			// if this is a dup error, notify the user about it
			if (error.code == 11000) {
				if (errorMessage.includes('slug')) {
					errorMessage = `The slug "${slug}" is already in use.`
				} else if (errorMessage.includes('name')) {
					errorMessage = `The block name "${name}" is already in use.`
				}
			}

			req.flash('admin_error', errorMessage)
			res.redirect('/admin/content/blocks')
		}
	})

	// UPDATE SEVERAL BLOCKS - POST
	// =============================================================
	app.post("/updateblockmulti", async (req, res) => {
		let { list_id_arr, update_criteria, update_value } = req.body

		try {
			// default update param is 'active' field
			const active = (update_value === 'active')
			// check if this is a delete query
			const deleteQuery = update_criteria === 'delete'
			let $set = { active }

			// change update config based on values passed in by client
			if (update_criteria == "global") {
				// make sure values for 'global' are boolean
				update_value = update_value == 'active'

				$set = { global: update_value }
			}

			// setup db query params
			const in_param = {$in: list_id_arr}
			const _id = blocks = in_param
			// define db query based on update criteria
			const Query = deleteQuery ? db.Blocks.deleteMany({_id}) : db.Blocks.updateMany({_id}, {$set})

			// conduct bulk edit of blocks in db ...
			await Query

			// if this is not a delete query, respond now with default success message
			if (!deleteQuery) {
				req.flash(
					'admin_success',
					'Bulk edit successful.'
				)

				return res.send(true)
			}

			// if this is a delete query, pull deleted block ids from associations
			await db.Posts.updateMany({ blocks }, { $pull: {blocks} } )
			await db.Pages.updateMany({ blocks }, { $pull: {blocks} } )

			req.flash(
				'admin_success',
				'Blocks successfully deleted.'
			)

			res.send(true);

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect('/admin/content/blocks')
		}
	})

	// DELETE BLOCK - POST
	// =============================================================
	app.post("/deleteblock", async (req, res) => {
		const { _id } = req.body

		try {
			// delete block in db
			await db.Blocks.findOneAndDelete({_id})
			// then pull deleted block ids from associations
			const blocks = {$in: _id}
			await db.Posts.updateMany({blocks}, {$pull: {blocks} })
			await db.Pages.updateMany({blocks}, {$pull: {blocks} })

			req.flash( 'admin_success', 'Block successfully deleted.' )
			res.redirect('/admin/content/blocks')

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect(`/admin/content/blocks/edit/${_id}`)
		}
	})

}