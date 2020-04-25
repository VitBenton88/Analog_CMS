module.exports = (app, db, Utils) => {

    // REDIRECTS GET
    // =============================================================
    app.get("/admin/redirects", async (req, res) => {
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
            const count = await db.Redirects.find().countDocuments().lean()
            const pageCount = Math.ceil(count / limit)
            // setup query params
            const sortConfig = orderBy ? Utils.Sort.getConfig(orderBy, sort) : {'created': 1}
            const searchParams = search ? {$text: {$search: search} } : {}

            // query db
            const redirects = await db.Redirects.find(searchParams).sort(sortConfig).skip(skip).limit(limit).lean()
            // swap sort after the query if there is an order requested, e.g. desc to asc
            sort = orderBy ? Utils.Sort.swapOrder(sort) : null

            res.render("admin/redirects", {
                limit,
                orderBy,
                originalUrl,
                pageCount,
                paged,
                redirects,
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

    // CREATE REDIRECT - POST
    // =============================================================
    app.post("/addredirect", async (req, res) => {
        let { active, type, source, target } = req.body

        try {
            // some basic validation, make sure source and target are not identical
            if (source === target) {
                throw new Error('Source and target cannot be the same.')
            }

            // some basic validation, make sure source & target start with backslash
            if ( source.charAt(0) !== "/" ) {
                source = `/${source}`
            }

            if ( target.charAt(0) !== "/" ) {
                target = `/${target}`
            }

            // check source against reserved routes
            await Utils.Permalinks.validate(source, true)

            // make sure values for 'active' are boolean
            active = active == 'true'

            // create in db
            await db.Redirects.create({active, type, source, target})

            req.flash( 'admin_success', 'Redirect successfully added.' )

        } catch (error) {
            console.error(error)
            const errorMessage = error.errmsg || error.toString()
            req.flash('admin_error', errorMessage)

        } finally {
            res.redirect('/admin/redirects')
        }
    })

    // UPDATE REDIRECT - POST
    // =============================================================
    app.post("/updateredirect", async (req, res) => {
        let { _id, active, type, source, target } = req.body

        try {
            // some basic validation, make sure source and target are not identical
            if (source === target) {
                throw new Error('Source and target cannot be the same.')
            }
            
            // some basic validation, make sure source & target start with backslash
            if ( source.charAt(0) !== "/" ) {
                source = `/${source}`
            }

            if ( target.charAt(0) !== "/" ) {
                target = `/${target}`
            }

            // check source against reserved routes
            await Utils.Permalinks.validate(source, true)

            // make sure values for 'active' are boolean
            active = active == 'true'

            // run db update query
            await db.Redirects.updateOne({_id}, {active, type, source, target, hits: 0})

            req.flash( 'admin_success', 'Redirect successfully edited.' )
            
        } catch (error) {
            console.error(error)
            const errorMessage = error.errmsg || error.toString()
            req.flash('admin_error', errorMessage)

        } finally {
            res.redirect('/admin/redirects')
        }
    })

    // UPDATE SEVERAL REDIRECTS - POST
    // =============================================================
    app.post("/updateredirectsmulti", async (req, res) => {
        let { list_id_arr, update_criteria, update_value } = req.body

        try {    
            // check if this is a delete query
            const deleteQuery = update_criteria == 'delete'
            // setup db query params
            const _id = {$in: list_id_arr}

            // set default update settings as 'type' update
            let $set = {type: update_value}
    
            // change update config based on values passed in by user
            if (update_criteria == "target") {
                // some basic validation, make sure source & target start with backslash
                if ( target.charAt(0) !== "/" ) {
                    target = `/${target}`
                }
    
                $set = {
                    target: update_value
                }
            } else if (update_criteria == "active") {
                // make sure values for 'active' are boolean
                update_value = update_value == 'true'

                $set = {
                    active: update_value
                }
            }
    
            // define db query based on update criteria
            const Query = deleteQuery ? db.Redirects.deleteMany({ _id }) : db.Redirects.updateMany({ _id }, { $set })
            
            // run db query
            await Query

            const flashMsg = deleteQuery ? 'Redirects successfully deleted.' : 'Bulk edit successful.'

            req.flash('admin_success', flashMsg)
            res.send(true);
            
        } catch (error) {
            console.error(error)
            const errorMessage = error.errmsg || error.toString()
            req.flash('admin_error', errorMessage)
            res.redirect('/admin/redirects')
        }
    })

    // DELETE REDIRECT - POST
    // =============================================================
    app.post("/deleteredirect", async (req, res) => {
        const { _id } = req.body
        
        try {
            // delete in db
            await db.Redirects.deleteOne({ _id })

            req.flash( 'admin_success', 'Redirect successfully deleted.' )

        } catch (error) {
            console.error(error)
            const errorMessage = error.errmsg || error.toString()
            req.flash('admin_error', errorMessage)

        } finally {
            res.redirect('/admin/redirects')
        }
    })

}