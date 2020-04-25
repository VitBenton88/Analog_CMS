module.exports = (app, db) => {

    // CREATE TERM - POST
    // =============================================================
    app.post("/addterm", async (req, res) => {
        const { name, _owner } = req.body

        try {
            // create term in db
            const term = await db.Terms.create({name, owner: _owner})
            // add new term to taxonomy it belongs to
            await db.Taxonomies.updateOne({_id: _owner}, {$push: {terms: term._id} })
    
            req.flash( 'admin_success', 'Term successfully added.' )

        } catch (error) {
            console.error(error)
            const errorMessage = error.errmsg || error.toString()
            req.flash('admin_error', errorMessage)

        } finally {
            res.redirect( req.header('Referer') )
        }
    })

    // UPDATE TERM PAGE - GET
    // =============================================================
    app.get("/admin/term/edit/:id", async (req, res) => {
        const {site_data, params, user } = req
        const _id = params.id
        const sessionUser = { username: user.username, _id: user._id }

        try {
            const term = await db.Terms.findById({_id}).lean()

            res.render("admin/edit/term", {
                sessionUser,
                site_data,
                term,
                layout: "admin"
            })
            
        } catch (error) {
            console.error(error)
            const errorMessage = error.errmsg || error.toString()
            req.flash('admin_error', errorMessage)
            res.redirect(req.body.originalUrl)
        }
    })

    // UPDATE TERM - POST
    // =============================================================
    app.post("/editterm", async (req, res) => {
        const { _id, name } = req.body

        try {
            // update in db
            await db.Terms.updateOne({_id}, {name})

            req.flash( 'admin_success', 'Term successfully edited.' )

        } catch (error) {
            console.error(error)
            const errorMessage = error.errmsg || error.toString()
            req.flash('admin_error', errorMessage)

        } finally {
            res.redirect(`/admin/term/edit/${_id}`)
        }
    })

    // DELETE TERM - POST
    // =============================================================
    app.post("/deleteterm", async (req, res) => {
        const { _id, _owner } = req.body

        try {
            // db delete term query
            await db.Terms.deleteOne({_id})
            // then pull from its owners list of terms
            await db.Taxonomies.findByIdAndUpdate({_id: _owner}, {$pull: {terms: _id} })
            // then pull from posts' list of terms
            await db.Posts.updateMany({taxonomies: {$in: _id} }, {$pull: {taxonomies: _id} })

            req.flash( 'admin_success', 'Term successfully deleted.' )
            res.redirect(`/admin/taxonomy/edit/${_owner}`)

        } catch (error) {
            console.error(error)
            const errorMessage = error.errmsg || error.toString()
            req.flash('admin_error', errorMessage)
            res.redirect(`/admin/term/edit/${_id}`)
        }
    })

}