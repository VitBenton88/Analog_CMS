module.exports = (app, db) => {

    // SEARCH POSTS BY TAXONOMIES
    // =============================================================
    app.get("/api/posts/taxonomies/:taxonomies?", async (req, res) => {
      try {
        // capture search term from params
        const _taxonomies = req.params.taxonomies

        // if no taxonomies are provided, throw error
        if (!_taxonomies) {
          throw new Error('No taxonomy ids provided.')
        }

        // convert id to array incase there are several
        const _taxonomies_Arr = _taxonomies.split(',')
        
        // query db for posts
        const posts = await db.Posts.find({taxonomies: {$in: _taxonomies_Arr}}).lean()
      
        // respond to client
        res.status(200).json(posts)
        
      } catch (error) {
        console.error(error)
        const errorMessage = error.errmsg || error.toString()
        res.status(500).json({
          "response": errorMessage,
          "message": "Error occurred while fetching posts."
        })
      }
    })

    // SEARCH POSTS REQUEST
    // =============================================================
    app.get("/api/search/posts/:term?", async (req, res) => {
        try {
          // capture search term from params
          const term = req.params.term
          
          // query db for posts
          const posts = await db.Posts.find({$text: {$search: term} }).lean()
        
          // respond to client
          res.status(200).json(posts)
          
        } catch (error) {
          console.error(error)
          res.status(500).json({
            "response": error,
            "message": "Error occurred while fetching posts."
          })
        }
      })

    // SINGLE FORM REQUEST
    // =============================================================
    app.get("/api/posts/:id?", async (req, res) => {    
      try {
          // capture id from params
          const _ids = req.params.id
          // convert id to array incase there are several
          const _ids_Arr = _ids ? _ids.split(',') : undefined

          // query db for posts (when an id(s) is provided, only query for that id)
          const posts = _ids ? await db.Posts.find({_id: {$in: _ids_Arr}}).lean() : await db.Posts.find().lean()
      
          // respond to client
          res.status(200).json(posts)
          
      } catch (error) {
          console.error(error)
          res.status(500).json({
          "response": error,
          "message": "Error occurred while fetching posts."
          })
      }
  })
}