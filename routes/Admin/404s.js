module.exports = (app, db, Utils) => {

    // 404s GET
    // =============================================================
    app.get("/admin/pagesnotfound", async (req, res) => {
        try {
          const {
            body,
            query,
            site_data,
            user
          } = req
      
          let {
            limit,
            orderBy,
            paged,
            search,
            sort
          } = query
    
          const sessionUser = {
            role: user.role,
            username: user.username,
            _id: user._id
          }
    
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
          const count = await db.PagesNotFound.find().count()
          const pageCount = Math.ceil(count / limit)
          // setup query params
          const sortConfig = orderBy ? Utils.Sort.getConfig(orderBy, sort) : {'created': 1}
          const searchParams = search ? {$text: {$search: search} } : {}
    
          // query db
          const pagesnotfound = await db.PagesNotFound.find(searchParams).sort(sortConfig).skip(skip).limit(limit)
          // swap sort after the query if there is an order requested, e.g. desc to asc
          sort = orderBy ? Utils.Sort.swapOrder(sort) : null
    
          res.render("admin/404s", {
            limit,
            orderBy,
            pageCount,
            paged,
            pagesnotfound,
            search,
            sessionUser,
            site_data,
            sort,
            layout: "admin"
          })
    
        } catch (error) {
          console.error(error)
          req.flash('error', error.errmsg)
          res.redirect('/admin')
        }
      })

    // UPDATE SEVERAL 404s - POST
    // =============================================================
    app.post("/updatepagesnotfoundmulti", async (req, res) => {
        try {
            const {
                list_id_arr,
                update_criteria
            } = req.body

            // run db query
            await db.PagesNotFound.deleteMany({_id: {$in: list_id_arr} })

            // Send user deletion success message
            req.flash(
                'success',
                '404s successfully deleted.'
            )

            res.send(true);

        } catch (error) {
            console.error(error)

            req.flash('error', error.errmsg)
            res.redirect(`/admin/404s`)
        }
    })

    // DELETE 404 - POST
    // =============================================================
    app.post("/delete404", async (req, res) => {
        try {
            await db.PagesNotFound.deleteOne({_id: req.body._id})

            req.flash(
                'success',
                '404 record successfully deleted.'
            )
            res.redirect('/admin/pagesnotfound')
            
        } catch (error) {
            // If an error occurred, send it to the client
            console.error(error)
            req.flash('error', error.errmsg)
            res.redirect(`/admin/pagesnotfound`)
        }

    })

}
