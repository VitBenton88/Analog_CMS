// Dependencies
// =============================================================
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const db = require("../models")

module.exports = (passport) => {

    passport.use(
        new LocalStrategy({usernameField: 'username'}, async (username, password, done) => {
            try {
                // default error message
                const message = "Incorrect username or password."
                // user can provide username or password
                const user_params = { $or: [{ username }, { email: username }] }

                // lookup user
                const user = await db.Users.findOne(user_params)
                // if user does not exist, reject
                if (!user) {
                    return done(null, false, { message })
                }
                
                // compare user
                const isMatch = await bcrypt.compare(password, user.password)
                
                if (!isMatch) {
                    // decline password entered if no match
                    return done(null, false, { message })
                }

                // confirm correct password was entered
                done(null, user)

            } catch (error) {
                console.error(error)
                return done(null, false, { message: 'An error occurred while authenticating. Please try again later.' })
            }
        })
    )

    passport.serializeUser( (user, done) => {
        done(null, user.id)
    })
      
    passport.deserializeUser( (id, done) => {
        db.Users.findById(id, (err, user) => {
            done(err, user)
        })
    })
    
}