module.exports = (app, db, json2csv, Utils, validator) => {

    // FORMS PAGE GET
    // =============================================================
    app.get("/admin/subscribers", async (req, res) => {
        const { body, originalUrl, query, site_data, user } = req
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
            const count = await db.Subscribers.find().countDocuments().lean()
            const pageCount = Math.ceil(count / limit)
            // setup query params
            const sortConfig = orderBy ? Utils.Sort.getConfig(orderBy, sort) : { 'created': 1 }
            const searchParams = search ? { $text: {$search: search} } : {}

            // query db
            const subscribers = await db.Subscribers.find(searchParams).sort(sortConfig).skip(skip).limit(limit).lean()
            // swap sort after the query if there is an order requested, e.g. desc to asc
            sort = orderBy ? Utils.Sort.swapOrder(sort) : null

            res.render("admin/subscribers", {
                limit,
                orderBy,
                originalUrl,
                pageCount,
                paged,
                search,
                sessionUser,
                site_data,
                sort,
                subscribers,
                layout: "admin"
            })

        } catch (error) {
            console.error(error)
            const errorMessage = error.errmsg || error.toString()
            req.flash('admin_error', errorMessage)
            res.redirect('/admin')
        }
    })

    // HANDLE CSV DOWNLOAD REQUEST - GET
    // =============================================================
    app.get("/admin/subscribers/download/csv", async (req, res) => {
        try {
			// query db
            const subscribers = await db.Subscribers.find().lean()
            const { Parser } = json2csv
            const file_name = `analog_subscribers_${+ new Date()}.csv`
            const data_parsed = new Parser(subscribers);
            const csv = data_parsed.parse(subscribers);
            res.header('Content-Type', 'text/csv')
            res.attachment(file_name)
            res.send(csv)
        } catch (error) {
            console.error(error)
            res.status(500).json({
                "response": error,
                "message": "Error occurred while fetching site data."
            })
        }
    })

    // HANDLE NEW SUBSCRIPTIONS - POST
    // =============================================================
    app.post("/subscriber/add", async (req, res) => {
        const { body, headers, site_data } = req
        const { email } = body
        const { redirect, success_msg } = site_data.settings.newsletter
        const { referer } = headers
        const success_text = success_msg || "Thank you for subscribing!"

        try {
            // guard clause
            if ( !email || !validator.isEmail(email) ) throw new Error('Please provide a valid email address when signing up to the newsletter.')
			// create subscriber in database
            await db.Subscribers.create({ email })
            // show message & respond
            req.flash('success', `${success_text}<script>if (dataLayer) dataLayer.push({'event': 'newsletter_signup', 'email': '${email}'});</script>`)
            res.redirect(redirect || referer)

        } catch (error) {
			console.error(error)
            let errorMessage = error.errmsg || error.toString()
            if (error.code == 11000) {
                errorMessage = `The email '${email}' is already subscribed.`
            }
            req.flash('error', errorMessage)
            res.redirect(referer)
        }
    })

	// UPDATE SEVERAL SUBSCRIBERS - POST
	// =============================================================
	app.post("/subscriber/update/multi", async (req, res) => {
		const { list_id_arr, update_criteria } = req.body
		try {
			// run db query
			await db.Subscribers.deleteMany({_id: {$in: list_id_arr} })

			// Send user deletion success message
			req.flash( 'admin_success', 'Subscribers successfully deleted.' )
			res.send(true)

		} catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('admin_error', errorMessage)
			res.redirect('/admin/subscribers')
		}
	})

    // DELETE SUBSCRIBER - POST
    // =============================================================
    app.post("/subscriber/delete", async (req, res) => {
        const { _id } = req.body

        try {
            // guard clause
            if ( !_id ) throw new Error('Something went wrong while deleting a subscriber. Please try again.')
			// create subscriber in database
            await db.Subscribers.deleteOne({ _id })
            // show message
            req.flash('admin_success', 'Subscriber successfully deleted.')

        } catch (error) {
			console.error(error)
			const errorMessage = error.errmsg || error.toString()
			req.flash('error', errorMessage)
        } finally {
			res.redirect('/admin/subscribers')
		}
    })

}