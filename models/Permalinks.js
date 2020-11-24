const mongoose = require("mongoose")
const Schema = mongoose.Schema

// Schema
const PermalinkSchema = new Schema({
	route: {
		type: String,
		default: '/',
		trim: true,
		unique: true
	},
	owner: {
		type: Schema.Types.ObjectId,
		ref: 'Pages',
		required: true
	},
	parent: {
		type: Schema.ObjectId,
		ref: 'Permalinks',
		autopopulate: true
	},
	sitemap: {
		type: Boolean,
		default: false
	},
	created: {
		type: Date,
		default: Date.now
	}
},
{
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
})

PermalinkSchema.virtual('full').get(function() {
	let route = this.route
	const buildRoute = (permalink) => {
		if (permalink.parent) {
			route = `${permalink.parent.route}/${route}`
			buildRoute(permalink.parent)
		}
	}

	buildRoute(this)
	return route
})

// Insert autopopulate plugin
PermalinkSchema.plugin(require('mongoose-autopopulate'))

// Create model using mongoose's model method
const Permalinks = mongoose.model("Permalinks", PermalinkSchema)

// Export model
module.exports = Permalinks