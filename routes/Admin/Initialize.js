module.exports = (app, bcrypt, db) => {

    // INITIALIZE PAGE - GET
    // =============================================================
    app.get('/initialize', async (req, res) => {
        try {
            const site_data = await db.Analog.findOne().lean()

            if (!site_data) {
                return res.render("admin/initialize", {
                    layout: "initialize"
                })
            }

            return res.redirect('/admin')

        } catch (error) {
            console.error(error)
            const errorMessage = error.errmsg || error.toString()
            req.flash('admin_error', errorMessage)
            res.status(500).end()
        }
    })

    // CREATE ANALOG CMS & ADD USER - POST
    // =============================================================
    app.post("/initialize", async (req, res) => {
        let { address, description, name, username, email, password, passwordCheck } = req.body

        try {
            // basic validation
            if (!username || !email || !password || !passwordCheck) {
                throw new Error('Please fill out all fields when adding a new user.')
            }
    
            //check if password verification passes
            if (password !== passwordCheck) throw new Error('Password verification failed.')

            // hash Password
            const salt = await bcrypt.genSalt(10)
            // reassign password var to newley hashed password
            password = await bcrypt.hash(password, salt)
            // create user in database
            await db.Users.create({username, email, password, role: "Administrator"})
            // instantiate recaptcha document (prevent certain bugs)
            await db.Recaptcha.create({site_key: '', secret_key: ''})
            // instantiate smtp document (prevent certain bugs)
            await db.Smtp.create({host: '', user: '', password: ''})
            // instantiate new Analog schema instance
            await db.Analog.create({'settings.address': address, 'settings.description': description, 'settings.name': name})

            req.flash( 'admin_success', 'Welcome to Analog CMS.' )
            res.redirect('/admin')

        } catch (error) {
            console.error(error)
            const errorMessage = error.errmsg || error.toString()
            req.flash('admin_error', errorMessage)
            res.redirect('/initialize')
        }
    })
}