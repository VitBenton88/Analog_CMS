// Dependencies
// =============================================================
const fs = require('fs')

const Templates = {
    /**
     * Helper function for getting all names for handlebars files in "views/templates/" directory.
     *
     * @return {Array} list of names for all handlebars files found.
     */

	getAll: () => new Promise((resolve, reject) => {
		const templatesRead = fs.readdirSync("views/templates/").filter(file => file.includes(".handlebars"))
		const templatesCopy = [...templatesRead]
		const templates = templatesCopy.map( template => template.replace('.handlebars', '') );
		resolve(templates)
	})
}

module.exports = Templates