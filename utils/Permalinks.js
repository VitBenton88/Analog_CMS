// Dependencies
// =============================================================
const db = require("../models")

const Permalinks = {

	validate: (route = '', is_redirect_src = false) => new Promise( async (resolve, reject) => {
		try {
			if ( !route ) {
				throw new Error('Validate method expects route.')
			}

			const permalink = await db.Permalinks.find({ permalink: route }).lean()

			// re-format route for comparing to redirect sources
            if ( route.charAt(0) !== "/" ) {
                route = `/${route}`
            }
			const reserved_arr = ['/admin', '/login']
			const chars_to_check = route.substring(0, 6)


			if ( !is_redirect_src && permalink.length ) {
				resolve(false)
			}

			if ( reserved_arr.includes(chars_to_check) ) {
				const error_msg = is_redirect_src ? `A redirect's source cannot start with "${route}".` : `Permalinks cannot start with "${route}".`
				throw new Error(error_msg)
			}
			
			resolve(true)
			
		} catch (error) {
			console.error(error)
			reject( error )
		}
	})

}

// Export the helper function object
module.exports = Permalinks