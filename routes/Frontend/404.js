module.exports = (app) => {

	// Render 404 Page
	// =============================================================
	app.all(['/Error404', '404'], async (req, res, next) => {
        const { menus, site_data } = req

        res.status(404).render('templates/defaults/404', {
			menus,
			site_data
		})
	})

}