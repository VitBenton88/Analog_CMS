module.exports = (app, db, Utils) => {

    // MEDIA PAGE - GET
    // =============================================================
    app.get("/admin/media", async (req, res) => {
        const { originalUrl, query, site_data, user } = req
        let { orderBy, search } = query
        const { _id, role, username } = user
        const sessionUser = { username, _id, role }
        const params = {}

        try {
            if (orderBy) {
                params['storage'] = orderBy
            }

            if (search) {
                params['$text'] = {
                    $search: search
                }
            }

            // db query
            const media = await db.Media.find(params).lean()

            res.render("admin/media", {
                media,
                orderBy,
                originalUrl,
                search,
                sessionUser,
                site_data,
                layout: "admin"
            })

        } catch (error) {
            // if an error occurred, send it to the client
            console.error(error)
            const errorMessage = error.errmsg || error.toString()
            req.flash('admin_error', errorMessage)
            res.redirect('/admin')
        }
    })

    // CREATE MEDIA - POST
    // =============================================================
    app.post("/uploadmedia", async (req, res) => {
        const { files, site_data } = req
        const { type } = site_data.settings.storage

        try {
            // basic validation
            if (!files.media) {
                throw new Error('No file submitted. Please try again.')
            }

            // prevent bulk uploads on cloud storage
            if (Array.isArray(files.media) && type !== 'local') {
                throw new Error('Cannot process bulk uploads for cloud storage. Please upload files one at a time or change storage configuration to local.')
            }

            // upload media
            await Utils.Storage.write(files.media, site_data.settings.storage)

            req.flash( 'admin_success', 'Media successfully added.' )

        } catch (error) {
            console.error(error)
            const errorMessage = error.errmsg || error.toString()
            req.flash('admin_error', errorMessage)

        } finally {
            res.redirect('/admin/media')
        }
    })

    // UPDATE MEDIA - POST
    // =============================================================
    app.post("/updatemedia", async (req, res) => {
        const { alt, caption, description, _id } = req.body

        try {
            // prepare meta object for db 
            const meta = {alt, caption, description}
            // update media in db
            await db.Media.updateOne({_id}, {meta})

            req.flash( 'admin_success', 'Media successfully updated.' )

        } catch (error) {
            console.error(error)
            const errorMessage = error.errmsg || error.toString()
            req.flash('admin_error', errorMessage)
            
        } finally {
            res.redirect('/admin/media')
        }
    })

    // DELETE MEDIA (SINGLE) - POST
    // =============================================================
    app.post("/deletemedia", async (req, res) => {
        const { body, site_data } = req
        const { _id } = body

        try {
            // query db for all of the file's info
            const media = await db.Media.findById(_id)

            // delete file from storage, also deletes media record and removes it from associations
            await Utils.Storage.delete(media, site_data.settings.storage)

            res.json({
                "response": 'Success.',
                "message": 'Media successfully deleted.'
            })

        } catch (error) {
            console.error(error)
            res.status(500).json({
                "response": error,
                "message": "Media not deleted. Error occurred."
            })
        }
    })

    // DELETE MEDIA (MULTIPLE) - POST
    // =============================================================
    app.post("/deletemediamulti", async (req, res) => {
        const { body, site_data } = req
        const { _id_arr } = body

        try {            
            // query db for all of the file's info
            const media = await db.Media.find({ _id: {$in: _id_arr} })

            // delete file from storage, also deletes media record and removes it from associations
            await Utils.Storage.delete(media, site_data.settings.storage)

            res.json({
                "response": 'Success.',
                "message": 'Multiple media items successfully deleted.'
            })

        } catch (error) {
            console.error(error)
            res.status(500).json({
                "response": error,
                "message": "Media not deleted. Error occurred."
            })
        }

    })

}