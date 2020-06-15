module.exports = (app, db, Recaptcha, Utils) => {
	
	// ALL ROUTES - GET
	// =============================================================
	app.get("/*", async (req, res, next) => {
		const { blocks, originalUrl, plugins, site_data, url } = req
		const isHomePage = originalUrl === '/'
		const fullRoute = originalUrl.replace('/', '')
		const route = fullRoute.substr(fullRoute.lastIndexOf('/') + 1)
		let captcha = ''
		let page_data = ''
		let customHomepage = false
		let taxonomies = []
		let fields = {}
		let menus = {}

		try {
			// make sure to pass along any urls that start with "admin"
			if ( originalUrl.substring(1, 6) == 'admin' ) return next()

			// handle homepage
			if (isHomePage) {
				page_data = await db.Pages.findOne({ active: true, homepage: true, private: false }).populate('forms').populate('permalink')

				if (page_data) {
					customHomepage = true
				}
			}

			if (!customHomepage && !isHomePage) {
				const permalink_data = await db.Permalinks.findOne({ route }).populate('owner')

				// if nothing is yielded at this point, end this route handler by passing it on
				if (!permalink_data || !permalink_data.owner.active) return next()

				// collect permalink data
				const { owner } = permalink_data
				const { is_post, private } = owner

				// handle private pages
				if ( private && !req.isAuthenticated() ) return next()

				// get page data
				page_data = owner

				// collect taxonomy data if this is a post
				if (is_post) {
					taxonomies = await db.Terms.find({associations: {$in: page_data.id} })
				}
			}

			// get reCAPTCHA config and setup render if possible
			const recaptchaConfig = await db.Recaptcha.findOne()
			const { site_key, secret_key } = recaptchaConfig

			if (site_key && secret_key) {
				// this is the callback for google's grecaptcha.ready method 
				const callback = (token) => {
					var inputs = document.getElementsByClassName('recaptcha-response')
					for (i = 0; i < inputs.length; i++) {
						inputs[i].value = token;
					}
				}

				const recaptcha = new Recaptcha(site_key, secret_key, { callback })
				captcha = recaptcha.render()
			}

			// format page data for handlebars
			page_data = page_data ? page_data.toObject({ getters: true }) : null

			if (page_data) {
				// get content blocks and apply them to the blocks object
				if (page_data.blocks) {
					const blocks_query = await db.Blocks.find({_id: {$in: page_data.blocks} }).lean()
					// build blocks object array
					blocks_query.forEach(block => {
						blocks.local[block.slug] = block
					});
				}
				// get field values
				fields = await Utils.Fields.render(page_data.id)
			}

			// dynamically set template, if there is page data use the template there, otherwise load the default homepage template
			const template = page_data ? `templates/${page_data.template}` : 'templates/defaults/index'

			// render menu links
			const links = await db.Links.find({parent: null}).sort({"position": 1}).populate('owner').populate('permalink').lean()

			if (links) {
				for (let i = 0; i < links.length; i++) {
					const link = links[i];
					const { owner } = link;
					if ( !menus[owner.slug] ) {
						menus[owner.slug] = [];
					}

					menus[owner.slug].push(link);
				}
			}

			res.render(template, {
				blocks,
				captcha,
				fields,
				menus,
				page_data,
				plugins,
				site_data,
				taxonomies,
				url
			})

		} catch (error) {
			console.error(error)
			res.status(500).send(error)
		}
	})
	
}