module.exports = (app, db) => {

    // Pass menus to every route
    // =============================================================
    app.use('/*', async (req, res, next) => {
        try {
            // query global blocks from db
            const blocks = await db.Blocks.find({ active: true, global: true }).lean()
            // build menus object array
            const blocksObj = {
                global: {},
                local: {}
            }

            if (blocks) {
                // build blocks object array
                blocks.forEach(block => {
                    blocksObj.global[block.slug] = block
                });
            }

            // insert into express req object
            req.blocks = blocksObj

        } catch (error) {
            console.error(error)
        } finally {
            next()
        }
    })

}