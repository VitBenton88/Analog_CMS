const mongoose = require("mongoose")
const Schema = mongoose.Schema

// Schema
const MetaSchema = new Schema({
	title: {
		type: String
	},
	description: {
		type: String
	},
	owner: {
		type: Schema.Types.ObjectId,
		required: true,
		ref: 'Pages'
	}
})

// Create model using mongoose's model method
const Meta = mongoose.model("Meta", MetaSchema)

// Export model
module.exports = Meta
