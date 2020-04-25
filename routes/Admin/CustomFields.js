module.exports = (app, db, slugify) => {

	// CREATE CUSTOM FIELD - POST
	// =============================================================
	app.post("/addcustomfield", async (req, res) => {
		let { owner, ownerModel, slug, value } = req.body
		const isPage = ownerModel == "Pages"

		try {
			if (!slug || !owner || !ownerModel) {
				return res.status(406).json({
					"response": "Error",
					"message": "Custom field not created. Please provide slug."
				})
			}

			if (!owner) {
				return res.status(406).json({
					"response": "Error",
					"message": `Custom field not created. Create ${isPage ? 'page' : 'post'} first.`
				})
			}

			// make sure route is in slug format
			slug = slugify(slug)
			const createdField = await db.CustomFields.create({owner, ownerModel, slug, value})
			// setup db query params
			const _id = owner
			const $push = { customFields: createdField._id }

			const ownerQuery = isPage ? db.Pages.updateOne({ _id }, { $push }) : db.Posts.updateOne({ _id }, { $push })
			await ownerQuery

			res.json({
				"response": 'Success.',
				"message": "Custom field successfully created.",
				"created": createdField
			})

		} catch (error) {
			console.error(error)
			// If dup error, specify in message
			if (error.code == "11000") {
				return res.status(406).json({
					"response": error,
					"message": `Custom field not created. The slug '${slug}' already exists.`
				})
			}

			res.status(500).json({
				"response": error,
				"message": "Custom field not created. Error occurred."
			})
		}
	})

	// UPDATE CUSTOM FIELD - POST
	// =============================================================
	app.post("/updatecustomfield", async (req, res) => {
		let { _id, slug, value } = req.body

		try {
			if (!slug) {
				return res.status(406).json({
					"response": "Error",
					"message": "Custom field not updated. Please provide slug."
				})
			}

			// make sure route is in slug format
			slug = slugify(slug)

			// update in db
			await db.CustomFields.updateOne({_id}, {slug, value})

			res.json({
				"response": 'Success.',
				"message": "Custom field successfully updated."
			})

		} catch (error) {
			console.error(error)
			// If an error occurred, send it to the client
			if (error.code == "11000") {
				res.status(406).json({
					"response": error,
					"message": `Custom field not created. The slug '${slug}' already exists.`
				})
				return false
			}

			res.status(500).json({
				"response": error,
				"message": "Custom field not created. Error occurred."
			})
		}
	})

	// DELETE CUSTOM FIELD - POST
	// =============================================================
	app.post("/deletecustomfield", async (req, res) => {
		try {
			// delete query to db
			await db.CustomFields.deleteOne({_id: req.body._id})

			res.json({
				"response": 'Success.',
				"message": "Custom field successfully deleted."
			})

		} catch (error) {
			console.error(error)
			res.status(500).json({
				"response": error,
				"message": "Custom field not deleted. Error occurred."
			})
		}
	})

}