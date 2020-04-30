const mongoose = require("mongoose")
const Schema = mongoose.Schema

// Schema
const TokenSchema = new Schema({
    token: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    user_id: {
        type: Schema.ObjectId,
        ref: 'Users',
        required: true
    },
    createdAt: { 
        type: Date, 
        expires: '10m',
        default: Date.now 
    }
})

// Create model using mongoose's model method
const Tokens = mongoose.model("Tokens", TokenSchema)

// Export model
module.exports = Tokens