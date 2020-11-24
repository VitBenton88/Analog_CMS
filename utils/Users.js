// Dependencies
// =============================================================
const db = require("../models")

const Users = {
    /**
     * Helper function for preventing last asmin user from being deleted.
     *
     * @param {Number} `id` integer that represents database ID of user.
     * @return {Boolean} result of check.
     */

	onlyOneAdmin: (_id) => new Promise(async (resolve, reject) => {
		try {
			const users = await db.Users.find({role: 'Administrator'}).lean()
			const users_length = users.length
			const user_ids = users.map(user => user._id.toString())
			const current_user_is_admin = user_ids.includes(_id.toString())
			const onlyOneAdmin_result = users_length < 2 && current_user_is_admin

			resolve(onlyOneAdmin_result)

		} catch (error) {
			console.error(error)
			reject(new Error(error))
		}
	})
}

module.exports = Users