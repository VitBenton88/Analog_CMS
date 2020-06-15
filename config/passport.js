// Dependencies
// =============================================================
const LocalStrategy = require('passport-local').Strategy
const TwoFAStartegy = require('passport-2fa-totp').Strategy
const GoogleAuthenticator = require('passport-2fa-totp').GoogeAuthenticator
const db = require("../models")

// Passport Callback Functions
// =============================================================
const verifyUsernameAndPasswordCallback = async (username, password, done) => {
    try {
        // lookup user, user can provide username or password
        const user = await db.Users.findOne({ $or: [{ username }, { email: username }] }).lean()
        // if user does not exist, reject
        if (!user) return done(null, false, { message: "Incorrect username or password." })

        // complete authentication
        done(null, user)

    } catch (error) {
        console.error(error)
        return done(null, false, { message: 'An error occurred while authenticating. Please try again later.' })
    }
}

const verifyTotpCodeCallback = (user, done) => {
    try {
        const secret = GoogleAuthenticator.decodeSecret(user.mfa.secret)
        done(null, secret, 30)

    } catch (error) {
        console.error(error)
        const message = error.errmsg || error.toString()
        return done(null, false, { message })
    }
}

// Export Passport module
// =============================================================
module.exports = (passport) => {

    passport.use(
        new LocalStrategy(verifyUsernameAndPasswordCallback)
    )

    passport.use(
        new TwoFAStartegy(verifyUsernameAndPasswordCallback, verifyTotpCodeCallback)
    )

    passport.serializeUser( (user, done) => {
        done(null, user._id)
    })
      
    passport.deserializeUser( async (_id, done) => {
        try {
            const user = await db.Users.findById(_id)
            done(null, user)
        } catch (error) {
            console.error(error)
            done(null, false, { message: "An error occurred while signing-out." })
        }
    })
    
}