const { SitemapStream, streamToPromise } = require('sitemap')
const { createGzip } = require('zlib')

module.exports = (app, db) => {

	// SITEMAP - GET
	// =============================================================
	app.get('/sitemap.xml', async (req, res) => {
		let { site_data } = req

		try {
			// set http headers
			res.header('Content-Type', 'application/xml')
			res.header('Content-Encoding', 'gzip')

			if (!site_data) {
				site_data = await db.Analog.findOne()
			}

			const hostname = site_data.settings.address ? site_data.settings.address : os.hostname()
			const smStream = new SitemapStream({ hostname })
			const pipeline = smStream.pipe(createGzip())

			const sitemapUrls = await db.Permalinks.find({ sitemap: true }).populate('owner')

			// populate sitemap
			sitemapUrls.forEach(url => {
				const { full, owner } = url

				if (owner) {
					const { image, updated } = owner
					const urlObj = {
						url: full,
						lastmodDateOnly: updated.toISOString(),
						changefreq: 'daily',
						priority: 0.5
					}
	
					// add img data if it exists for this page/post
					if (owner.image) {
						urlObj['img'] = {
							url: image.path,
							caption: image.meta.caption,
							title: image.meta.alt
						}
					}
	
					// write url
					smStream.write(urlObj)
				}
			})

			// end sitemap population
			smStream.end()

			// cache the response
			streamToPromise(pipeline).then(sm => sitemap = sm)
			// stream write the response
			pipeline.pipe(res).on('error', (e) => {throw e})

		} catch (error) {
			console.error(error)
			res.status(500).end()
		}
	})

}