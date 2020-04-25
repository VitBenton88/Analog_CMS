module.exports = (app, db, Utils) => {

	// SETTINGS GET
	// =============================================================
	app.get("/admin/settings", (req, res) => {
		const { originalUrl, query, site_data, user } = req
		const { expand } = query
		const sessionUser = { username: user.username, _id: user._id }

		res.render("admin/settings", {
			expand,
			originalUrl,
			site_data,
			sessionUser,
			layout: "admin"
		})
	})

	// UPDATE META - POST
	// =============================================================
	app.post("/updatesitemeta", async (req, res) => {
		let { _id, meta_body, meta_head } = req.body

		try {
			// db update query
			await db.Analog.updateOne({_id}, {'settings.meta_body': meta_body, 'settings.meta_head': meta_head})

			req.flash( 'admin_success', 'Meta successfully updated.' )

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
		} finally {
			res.redirect(redirect_ul)
		}
	})

	// UPDATE SITE INFO - POST
	// =============================================================
	app.post("/updatesiteinformation", async (req, res) => {
		const redirect_ul = '/admin/settings?expand=information'
		let { _id, address, description, maintenance, name } = req.body

		try {
			maintenance = maintenance == "on" ? true : false
			const params = {'settings.address': address, 'settings.description': description, 'settings.maintenance': maintenance, 'settings.name': name}

			// db update query
			await db.Analog.updateOne({_id}, params)

			req.flash( 'admin_success', 'Site information successfully updated.' )

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)

		} finally {
			res.redirect('/admin/settings?expand=meta')
		}
	})

	// UPDATE LOCAL STORAGE CONFIG - POST
	// =============================================================
	app.post("/updatelocalstorage", async (req, res) => {
		try {
			// db update query
			await db.Analog.updateOne({_id: req.body._id}, {'settings.storage.type': 'local'})

			req.flash( 'admin_success', 'Site storage configuration successfully updated to local storage.' )

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)

		} finally {
			res.redirect('/admin/settings?expand=storage')
		}
	})

	// UPDATE GOOGLE CLOUD STORAGE CONFIG - POST
	// =============================================================
	app.post("/updategooglecloudstorage", async (req, res) => {
		let { _id, bucketName, projectId } = req.body

		try {
			// basic validation
			if (!bucketName || !projectId) {
				throw new Error('Google Cloud storage credentials missing. Please fill out all fields.')
			}

			const params = {
				'settings.storage.configurations.googleCloud.bucketName': bucketName,
				'settings.storage.configurations.googleCloud.projectId': projectId,
				'settings.storage.type': 'googleCloud'
			}

			// db update query
			await db.Analog.updateOne({_id}, params)

			req.flash( 'admin_success', 'Site storage configuration successfully updated to Google Cloud Storage.' )

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)

		} finally {
			res.redirect('/admin/settings?expand=storage')
		}
	})

	// UPDATE AWS S3 CONFIG - POST
	// =============================================================
	app.post("/updateawsstorage", async (req, res) => {
		let { _id, accessKeyId, bucketName, secretAccessKey } = req.body

		try {
			// basic validation
			if (!bucketName || !accessKeyId || !secretAccessKey) {
				throw new Error('AWS S3 storage credentials missing. Please fill out all fields.')
			}

			const params = {
				'settings.storage.configurations.aws.accessKeyId': accessKeyId,
				'settings.storage.configurations.aws.bucketName': bucketName,
				'settings.storage.configurations.aws.secretAccessKey': secretAccessKey,
				'settings.storage.type': 'aws'
			}

			// db update query
			await db.Analog.updateOne({_id}, params)

			req.flash( 'admin_success', 'Site storage configuration successfully updated to AWS S3.' )

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			
		} finally {
			res.redirect('/admin/settings?expand=storage')
		}
	})

}