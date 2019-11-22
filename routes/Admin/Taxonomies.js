module.exports = (app, db, Utils) => {

    // TAXONOMIES - GET
    // =============================================================
    app.get("/admin/taxonomies", async (req, res) => {
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
          const count = await db.Taxonomies.find().count()
          const pageCount = Math.ceil(count / limit)
          // setup query params
          const sortConfig = orderBy ? Utils.Sort.getConfig(orderBy, sort) : {'created': 1}
          const searchParams = search ? {$text: {$search: search} } : {}
    
          // query db
          const taxonomies = await db.Taxonomies.find(searchParams).sort(sortConfig).skip(skip).limit(limit)
          // swap sort after the query if there is an order requested, e.g. desc to asc
          sort = orderBy ? Utils.Sort.swapOrder(sort) : null
    
          res.render("admin/taxonomies", {
            limit,
            orderBy,
            pageCount,
            paged,
            search,
            sessionUser,
            site_data,
            sort,
            taxonomies,
            layout: "admin"
          })
    
        } catch (error) {
          console.error(error)
          req.flash('error', error.errmsg)
          res.redirect('/admin')
        }
    })

    // ADD TAXONOMY PAGE - POST
    // =============================================================
    app.post("/addtaxonomy", async (req, res) => {
        const { name } = req.body

        let redirectUrl = "/admin/taxonomies"

        try {
            // create taxonomy in db
            await db.Taxonomies.create({name})

            req.flash(
                'success',
                'Taxonomy successfully added.'
            )
            res.redirect(redirectUrl)

        } catch (error) {
            console.error(error)
            req.flash('error', error.errmsg)
            res.redirect(redirectUrl)   
        }
    })

    // EDIT TAXONOMY PAGE - GET
    // =============================================================
    app.get("/admin/taxonomy/edit/:id", async (req, res) => {
        const {
            body,
            params,
            site_data,
            user
        } = req

        try {
            const sessionUser = {
                username: user.username,
                _id: user._id
            }
            const _id = params.id
            const taxonomy = await db.Taxonomies.findById({_id}).populate({path: 'terms', options: {sort: {"name": 1}} })

            res.render("admin/edit/taxonomy", {
                taxonomy,
                sessionUser,
                site_data,
                layout: "admin"
            })
            
        } catch (error) {
            console.error(error)
            req.flash('error', error.errmsg)
            res.redirect(body.originalUrl)
        }
    })

    // EDIT TAXONOMY - POST
    // =============================================================
    app.post("/edittaxonomy", async (req, res) => {
        const {
            _id,
            name
        } = req.body

        try {
            // update db
            await db.Taxonomies.updateOne({_id}, {name})

            req.flash(
                'success',
                'Taxonomy successfully edited.'
            )
            res.redirect(`/admin/taxonomy/edit/${_id}`)
            
        } catch (error) {
            console.error(error)
            req.flash('error', error.errmsg)
            res.redirect(`/admin/taxonomy/edit/${_id}`)
        }
    })

    // UPDATE SEVERAL TAXONOMIES - POST
    // =============================================================
    app.post("/updatetaxonomiesmulti", async (req, res) => {
        try {
            const {
                list_id_arr,
                update_criteria,
                update_value
            } = req.body
    
            // check if this is a delete query
            const deleteQuery = update_criteria === 'delete';
    
            // define db query based on update criteria
            const Query = db.Taxonomies.deleteMany({
                _id: {
                    $in: list_id_arr
                }
            })

            const taxonomies = await db.Taxonomies.find({_id: {$in: list_id_arr} })
            const _deletedTaxonomyTerms = []
            for (let i = 0; i < taxonomies.length; i++) {
                const terms = taxonomies[i].terms;
                for (let j = 0; j < terms.length; j++) {
                    _deletedTaxonomyTerms.push(terms[j]._id);
                }
            }
            // update taxonomies in db ...
            await Query

            // if this isn't a bulk delete fire response here
            if (!deleteQuery) {
                req.flash(
                    'success',
                    'Bulk edit successful.'
                )

                return res.send(true);
            }

            // bulk delete in db
            await db.Terms.deleteMany({owner: {$in: list_id_arr} })

            // then remove all references to deleted terms in posts
            await db.Posts.updateMany({ taxonomies: {$in: _deletedTaxonomyTerms} }, { $pull: {taxonomies: {$in: _deletedTaxonomyTerms}} })

            req.flash(
                'success',
                'Taxonomies successfully deleted.'
            )

            res.send(true);

        } catch (error) {
            console.error(error)
            req.flash('error', error.errmsg)
            res.redirect(`/admin/taxonomies`)
        }
    })

    // DELETE TAXONOMY - POST
    // =============================================================
    app.post("/deletetaxonomy", async (req, res) => {
        const { _id } = req.body

        try {
            // find taxonomy
            const taxonomy = await db.Taxonomies.findById({_id})
            // collect terms to delete
            const terms = taxonomy.terms
            const _deletedTaxonomyTerms = []

            // collect deleted terms ids
            for (let i = 0; i < terms.length; i++) {
                _deletedTaxonomyTerms.push(terms[i]._id);
            }

            // delete taxonomy in db
            await db.Taxonomies.deleteOne({_id})
            // delete all of its terms too
            await db.Terms.deleteMany({owner: _id})
            // pull from posts' list of terms
            await db.Posts.updateMany({taxonomies: {$in: _deletedTaxonomyTerms} }, {$pull: {taxonomies: {$in: _deletedTaxonomyTerms}} })

            req.flash(
                'success',
                'Taxonomy successfully deleted.'
            )

            res.redirect("/admin/taxonomies")

        } catch (error) {
            console.error(error)
            req.flash('error', error.errmsg)
            res.redirect(`/admin/taxonomy/edit/${_id}`)
        }
    })

}
