const mongoose = require("mongoose")
const Schema = mongoose.Schema

// Schema
const TermsSchema = new Schema({
	name: {
		type: String,
		required: true,
		trim: true
	},
	owner: { 
		type: Schema.ObjectId, 
		ref: 'Taxonomies', 
		required: true
	},
	associations: [{ 
		type: Schema.ObjectId, 
		ref: 'Posts' 
	}]
})

// Create model using mongoose's model method
const Terms = mongoose.model("Terms", TermsSchema)

// Export model
module.exports = Terms