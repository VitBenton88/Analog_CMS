const mongoose = require("mongoose")
const Schema = mongoose.Schema

// Schema
const FieldsSchema = new Schema({
	title: {
		type: String,
		required: true
	},
	slug: {
		type: String,
		required: true
	},
	type: {
		type: String,
		required: true
	},
	description: {
		type: String
	},
	required: {
		type: Boolean,
		required: true
	},
	default_val: {
		type: String
	},
	parameters: {
		textarea: {
			rows: {
				type: Number,
				default: 3
			}
		},
		number: {
			min: {
				type: Number,
				default: 0
			},
			max: {
				type: Number
			},
			step: {
				type: Number,
				default: 1
			}
		},
		select: {
			options: [String],
			labels: [String]
		},
		upload: {
			audio: {
				type: Boolean,
				required: true,
				default: false
			},
			images: {
				type: Boolean,
				required: true,
				default: true
			},
			video: {
				type: Boolean,
				required: true,
				default: false
			}
		}
	},
	owner: { 
		type: Schema.ObjectId, 
		ref: 'FieldGroups', 
		required: true
	}
},
{
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
})

// virtual for easy identification of select, checkbox, or radio field
FieldsSchema.virtual('is_select').get(function() {
	let type = this.type
	let is_select = false

	if ( type == "select" || type == "checkbox" || type == "radio" ) {
		is_select = true
	}

	return is_select
})

// Create model using mongoose's model method
const Fields = mongoose.model("Fields", FieldsSchema)

// Export model
module.exports = Fields