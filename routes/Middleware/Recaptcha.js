module.exports = (app, db, Recaptcha) => {
    // HANDLE FORM SUBMISSIONS reCAPTCHA - POST
    // =============================================================
    app.post("/analog/form/*", async (req, res, next) => {
        // get url where the form post came from
        const { body, originalUrl } = req
        const { formLocation } = body

        try {
            // query reCAPTCHA config
            const recaptchaConfig = await db.Recaptcha.findOne().lean()
            // capture reCAPTCHA values
            const { site_key, secret_key } = recaptchaConfig

            // if reCAPTCHA config is not setup go to next route handler ...
            if ( !site_key || !secret_key ) {
                return next()
            }

            // capture form id
            const formId = originalUrl.substr(originalUrl.lastIndexOf('/') + 1)
            // get form info
            const form = await db.Forms.findById(formId).lean()

            // if, for some reason, no form is found, throw error, this should not proceed any further
            if ( !form ) {
                throw new Error('Message cannot be sent.')
            }

            // if form is set to ignore recaptcha, go to next route handler ...
            if ( !form.settings.recaptcha ) {
                return next()
            }

            const recaptcha = new Recaptcha(site_key, secret_key)
            // fire verification
            recaptcha.verify(req, (error, data) => {
                if (error) {
                    console.error(`reCAPTCHA error: ${error}`)
                }

                if (data) {
                    // check if reCAPTCHA score passes the recommended threshold of 0.5
                    if (data.score < 0.5) {
                        req.flash('admin_warning', 'reCAPTCHA not passed!')
                        return res.status(400).redirect(formLocation)
                    }
                    // if form submission passes reCAPTCHA, add score to req and pass it on
                    req.recaptchaScore = data.score
                }
                
                next()
            })

        } catch (error) {
            console.error(error)
            const errorMessage = error.errmsg || error.toString() || error
            req.flash('error', errorMessage)
            res.status(400).redirect(formLocation)
        }
    })
}