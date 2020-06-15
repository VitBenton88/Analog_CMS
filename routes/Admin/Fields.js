module.exports = (app, db, slugify, Utils) => {

	// FIELDS - GET
	// =============================================================
	app.get("/admin/content/fields", async (req, res) => {
		const { body, originalUrl, query, site_data, user } = req
		let { expand, limit, orderBy, paged, search, sort } = query
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
			const count = await db.FieldGroups.find().countDocuments().lean()
			const pageCount = Math.ceil(count / limit)
			// setup query params
			const sortConfig = orderBy ? Utils.Sort.getConfig(orderBy, sort) : {'created': 1}
			const searchParams = search ? {$text: {$search: search} } : {}

			// query db
			const fields = await db.FieldGroups.find(searchParams).sort(sortConfig).skip(skip).limit(limit).lean()
			// swap sort after the query if there is an order requested, e.g. desc to asc
			sort = orderBy ? Utils.Sort.swapOrder(sort) : null

			// get templated for user to select
			const templates = await Utils.Templates.getAll()

			// expand 'add' component if no fields exist
			expand = !count && !expand ? "create" : expand

			res.render("admin/fields", {
				expand,
				fields,
				limit,
				orderBy,
				originalUrl,
				pageCount,
				paged,
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

	// CREATE FIELD GROUP - POST
	// =============================================================
	app.post("/fields/group/create", async (req, res) => {
		let { active, condition, recipient, name, repeater, sortable } = req.body

		try {
			// basic validation
			if (!name || !recipient) throw new Error('Please provide all required values when creating a new field group.')
			
			// format values
			const sortable_val = sortable == "on"
			repeater = repeater == "on"
			active = active == "on"
			sortable = repeater ? sortable_val : false
			condition = recipient == "Template" ? condition  : null

			// create slug
			const slug = slugify(name)
			// create in db
			await db.FieldGroups.create({ active, condition, name, slug, repeater, sortable, recipient })
			req.flash( 'admin_success', 'Field group successfully added.' )

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)

		} finally {
			res.redirect('/admin/content/fields?expand=create')
		}
	})

	// UPDATE FIELD GROUP PAGE - GET
	// =============================================================
	app.get("/admin/content/fields/edit/:id", async (req, res) => {
		const { originalUrl, params, query, site_data, user } = req
		const { expand } = query
		const { _id, username } = user
		const sessionUser = { username, _id }

		try {      
			// query db
			const fieldGroup_query = await db.FieldGroups.findById(params.id).populate('fields')
			const fieldGroup = fieldGroup_query.toObject({ getters: true })
			// get templated for user to select
			const templates = await Utils.Templates.getAll()

			res.render("admin/edit/field", {
				expand,
				fieldGroup,
				originalUrl,
				site_data,
				sessionUser,
				templates,
				layout: "admin"
			})

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect('/admin/content/fields')
		}
	})

	// CREATE FIELD GROUP - POST
	// =============================================================
	app.post("/fields/group/create", async (req, res) => {
		let { active, condition, recipient, name, repeater, sortable } = req.body

		try {
			// basic validation
			if (!name || !recipient) throw new Error('Please provide all required values when creating a new field group.')
			
			// format values
			const sortable_val = sortable == "on"
			repeater = repeater == "on"
			active = active == "on"
			sortable = repeater ? sortable_val : false
			condition = recipient == "Template" ? condition  : null

			// create slug
			const slug = slugify(name)
			// create in db
			await db.FieldGroups.create({ active, condition, name, slug, repeater, sortable, recipient })
			req.flash( 'admin_success', 'Field group successfully added.' )

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)

		} finally {
			res.redirect('/admin/content/fields?expand=create')
		}
	})

	// CREATE SINGLE FIELD - POST
	// =============================================================
	app.post("/field/create", async (req, res) => {
		let { default_val, description, num_max, num_min, num_step, _owner, required, select_labels, select_options, slug, textarea_rows, title, type, upload_audio, upload_images, upload_video } = req.body

		try {
			// basic validation
			if (!_owner || !type || !title) throw new Error('Please provide all required values when creating a new field.')

			// format values
			upload_audio = upload_audio == "on"
			upload_images = upload_images == "on"
			upload_video = upload_video == "on"
			required = required == "true"
			slug = slug ? slugify(slug) : slugify(title)

			if (type == "select" || type == "checkbox" || type == "radio") {
				select_labels = select_labels.split(",")
				select_options = select_options.split(",")
			}

			const parameters = {
				textarea: {
					rows: textarea_rows
				},
				number: {
					max: num_max,
					min: num_min,
					step: num_step
				},
				select: {
					options: select_options,
					labels: select_labels
				},
				upload: {
					audio: upload_audio,
					images: upload_images,
					video: upload_video
				}
			}
			
			// create field in DB ...
			const new_field = await db.Fields.create({ title, slug, type, description, required, default_val, parameters, owner: _owner })
			// then add to field group
			await db.FieldGroups.updateOne({_id: _owner}, {$push: {fields: new_field._id} })
			req.flash( 'admin_success', 'Field successfully added.' )

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)

		} finally {
			res.redirect(`/admin/content/fields/edit/${_owner}?expand=create`)
		}
	})

	// CREATE REPEATER FIELD VALUES - POST
	// =============================================================
	app.post("/fields/repeater/create", async (req, res) => {
		const { _id } = req.body

		try {
			// guard clause
			if (!_id) throw new Error('Please provide all required values when creating a new repeater field.')
			// process fields		
			const fields = await Utils.Fields.update(req, _id, true)
			// respond to client
			res.status(200).json(fields)

		} catch (error) {
			console.error(error)
			res.status(500).json({
				"response": error,
				"message": "Error occurred while creating repeater field."
			})
		}
	})

	// UPDATE SINGLE FIELD - POST
	// =============================================================
	app.post("/field/update", async (req, res) => {
		let { default_val, description, _id, num_max, num_min, num_step, _owner, required, select_labels, select_options, slug, textarea_rows, title, type, upload_audio, upload_images, upload_video } = req.body

		try {
			// basic validation
			if (!_owner|| !_id || !title) throw new Error('Please provide all required values when updating a new field.')

			// format values
			upload_audio = upload_audio == "on"
			upload_images = upload_images == "on"
			upload_video = upload_video == "on"
			required = required == "true"
			slug = slug ? slugify(slug) : slugify(title)

			if (type == "select" || type == "checkbox" || type == "radio") {
				select_labels = select_labels.split(",")
				select_options = select_options.split(",")
			}

			const parameters = {
				textarea: {
					rows: textarea_rows
				},
				number: {
					max: num_max,
					min: num_min,
					step: num_step
				},
				select: {
					options: select_options,
					labels: select_labels
				},
				upload: {
					audio: upload_audio,
					images: upload_images,
					video: upload_video
				}
			}

			// create field in DB ...
			await db.Fields.updateOne({_id}, { title, slug, description, required, default_val, parameters, owner: _owner })
			req.flash( 'admin_success', 'Field successfully updated.' )

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)

		} finally {
			res.redirect(`/admin/content/fields/edit/${_owner}#field_${_id}`)
		}
	})

	// UPDATE FIELD GROUP - POST
	// =============================================================
	app.post("/fields/group/update", async (req, res) => {
		let { active, condition, _id, name, recipient, repeater, slug, sortable } = req.body

		try {
			// basic validation
			if (!name || !recipient) throw new Error('Please provide all required values when updating a field group.')
			
			// format values
			const sortable_val = sortable == "on"
			repeater = repeater == "on"
			active = active == "on"
			sortable = repeater ? sortable_val : false
			condition = recipient == "Template" ? condition  : null

			// format slug
			slug = slug ? slugify(slug) : slugify(name)
			// update in db
			await db.FieldGroups.updateOne({_id}, { active, condition, name, slug, repeater, sortable, recipient })
			req.flash( 'admin_success', 'Field group successfully updated.' )

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)

		} finally {
			res.redirect(`/admin/content/fields/edit/${_id}`)
		}
	})

	// UPDATE SEVERAL FIELD GROUPS - POST
	// =============================================================
	app.post("/fields/group/update/multi", async (req, res) => {
		let { list_id_arr, update_criteria, update_value_supp, update_value } = req.body

		try {
			// default update param is 'active' field
			const active = update_value === 'active'
			// check if this is a delete query
			const deleteQuery = update_criteria === 'delete'
			let $set = { active }

			// change update config based on values passed in by client
			if (update_criteria == "repeater") {
				// make sure values for 'repeater' are boolean
				update_value = update_value == 'active'
				$set = { repeater: update_value }
			}

			if (update_criteria == "recipient") {
				if (!update_value_supp) {
					throw new Error('Please select a template when applying a template to field groups.')
				}

				$set = { recipient: update_value, condition: update_value_supp }
			}

			// setup db query params
			const _id = owner = group = {$in: list_id_arr}
			// define db query based on update criteria
			const Query = deleteQuery ? db.FieldGroups.deleteMany({_id}) : db.FieldGroups.updateMany({_id}, {$set})

			// conduct bulk edit of field groups in db ...
			await Query

			// if this is not a delete query, respond now with default success message
			if (!deleteQuery) {
				req.flash( 'admin_success', 'Bulk edit successful.' )
				return res.send(true)
			}

			// if this is a delete query, delete all associations to this field group
			await db.Fields.deleteMany({owner})
			await db.FieldValues.deleteMany({group})

			req.flash( 'admin_success', 'Field groups successfully deleted.' )
			res.send(true)

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect('/admin/content/fields')
		}
	})

	// UPDATE REPEATER FIELD POSITION - PUT
	// =============================================================
	app.put("/fields/repeater/position/update", async (req, res) => {
		const { _ids, positions } = req.body

		try {
			// guard clause
			if (!_ids || !positions) throw new Error('Required data missing while updating repeater field positions.')

			const positions_sorted = positions.sort((a, b) => a - b)
			const queries = positions_sorted.map((position, i) => { return { updateOne: {filter: { _id: _ids[i] }, update: { $set: {position} }} } } )

			// update positions in db
			await db.RepeaterFields.bulkWrite(queries)
			
			// respond
			res.status(200).json(true)

		} catch (error) {
			console.error(error)
			res.status(500).json({
				"response": error,
				"message": "Error occurred while deleting repeater field."
			})
		}
	})

	// UPDATE REPEATER FIELD VALUES - POST
	// =============================================================
	app.put("/fields/repeater/update", async (req, res) => {
		const { owner } = req.body

		try {
			// guard clause
			if (!owner) throw new Error('Please provide all required values when updating a repeater field.')
			// process fields		
			const fields = await Utils.Fields.update(req, owner, true, true)
			// respond to client
			res.status(200).json(fields)

		} catch (error) {
			console.error(error)
			res.status(500).json({
				"response": error,
				"message": "Error occurred while updating repeater field."
			})
		}
	})

	// DELETE REPEATER FIELD VALUES - POST
	// =============================================================
	app.post("/fields/repeater/delete", async (req, res) => {
		const { _id } = req.body

		try {
			// guard clause
			if (!_id) throw new Error('Please provide all required values when deleting a repeater field.')

			// delete repeater fields in db
			const deleted = await db.RepeaterFields.findOneAndDelete({ _id })

			// delete field values in db
			await db.FieldValues.deleteMany({ _id: { $in: deleted.values } })
			await db.FieldGroups.updateOne({_id: deleted.group}, {$pull: {repeaters: _id} })

			// respond
			res.status(200).json(true)

		} catch (error) {
			console.error(error)
			res.status(500).json({
				"response": error,
				"message": "Error occurred while deleting repeater field."
			})
		}
	})

	// DELETE FIELD GROUP - POST
	// =============================================================
	app.post("/fields/group/delete", async (req, res) => {
		const { _id } = req.body

		try {
			// delete field group in db
			await db.FieldGroups.deleteOne({_id})
			// then delete all associations to this deleted field group
			await db.Fields.deleteMany({owner: _id})
			await db.FieldValues.deleteMany({group: _id})
			await db.RepeaterFields.deleteMany({group: _id})

			req.flash( 'admin_success', 'Field group successfully deleted.' )
			res.redirect('/admin/content/fields')

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect(`/admin/content/fields/edit/${_id}`)
		}
	})

	// DELETE SINGLE FIELD - POST
	// =============================================================
	app.post("/field/delete", async (req, res) => {
		const { _id, _owner } = req.body

		try {
			// delete field in db
			await db.Fields.deleteOne({_id})
			// then, pull or delete from associations
			await db.FieldGroups.updateOne({_id: _owner}, {$pull: {fields: _id} })
			await db.FieldValues.deleteMany({type: _id})
			await db.RepeaterFields.updateMany({owner: _owner}, {$pull: {values: _id} })

			req.flash( 'admin_success', 'Field successfully deleted.' )

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)

		} finally {
			res.redirect(`/admin/content/fields/edit/${_owner}`)
		}
	})

	// DELETE FILE FIELD VALUE
	// =============================================================
	app.delete("/field/file/delete/:id?", async (req, res) => {
		// capture id from params
		const _id = req.params.id

		try {
			if (!_id) throw new Error('Something went wrong while deleting file. Please try again later.')

			await db.FieldValues.updateOne({_id}, {value: '', file: null})
			// respond to client
			res.status(200).json(true)

		} catch (error) {
			console.error(error)
			res.status(500).json({
				"response": error,
				"message": 'Something went wrong while deleting file. Please try again later.'
			})
		}
	})

}