const mongoose = require("mongoose")
const AutoIncrement = require('mongoose-sequence')(mongoose)
const Schema = mongoose.Schema

// Schema
const LinkSchema = new Schema({
	text: {
		type: String,
		default: 'Link1',
		trim: true
	},
	route: {
		type: String,
		default: '/',
		trim: true
	},
	target: {
		type: String,
		default: '_self'
	},
	position: {
		type: Number,
		default: 0
	},
	is_ref: {
		type: Boolean,
		default: false
	},
	active: {
		type: Boolean,
		default: true
	},
	owner: {
		type: Schema.ObjectId,
		ref: 'Menu',
		required: true
	},
	permalink: {
		type: Schema.ObjectId,
		ref: 'Permalinks',
		autopopulate: true
	},
	parent: {
		type: Schema.ObjectId,
		ref: 'Links'
	},
	children: [{
		type: Schema.ObjectId,
		ref: 'Links'
	}]
})

// recursively populate children
var autoPopulateChildren = function(next) {
    this.populate('children');
    next();
};

LinkSchema.pre('find', autoPopulateChildren)

// Insert AutoIncrement plugin
LinkSchema.plugin(AutoIncrement, {
	id: 'position_seq',
	inc_field: 'position'
})

// Insert autopopulate plugin
LinkSchema.plugin(require('mongoose-autopopulate'))

// Create model using mongoose's model method
const Links = mongoose.model("Links", LinkSchema)

// Export model
module.exports = Links