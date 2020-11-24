const Sort = {
    /**
     * Helper function for simplifying options for pagination in admin pages.
     *
     * @param {String} `orderBy`string that 
     * @param {String} `sort` 
     * @return {Object} result of SMTP transmission.
     */

	getConfig: (orderBy, sort) => {
		const config = {}
		config[orderBy] = sort
		return config
	},

    /**
     * Helper function for simplifying sort toggling for pagination in admin pages.
     *
     * @param {String} `sort` sorting pattern.
     * @return {String} opposite of provided sorting pattern.
     */

	swapOrder: (sort) => sort == 'asc' ? 'desc' : 'asc'
}

// Export the helper function object
module.exports = Sort