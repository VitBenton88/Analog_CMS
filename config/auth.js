module.exports = {
    ensureAuthenticated: (req, res, next) => {
        if ( req.isAuthenticated() ) {
            // redirect is session cookie has previous attempted url (before auth)
            const analog_pre_auth_url = req.cookies['analog_pre_auth_url']

            if ( analog_pre_auth_url ) return res.clearCookie('analog_pre_auth_url').redirect(analog_pre_auth_url)

            return next()
        }

        // remember what url was attempted so user can land there when authenticated
        res.cookie('analog_pre_auth_url', req.originalUrl).redirect('/login')
    }
}