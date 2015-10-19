var mongoose = require('mongoose');

var schema = {
    name: String,
    postcode: String,
    phone: String,
    email: String,
    timeSent: Date,
    status: {
        type: Number,
        default: 0
    },
    items: [{
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item'
        },
        quantity: Number,
        ingredients: [{
            id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Item.ingredients'
            },
            value: Number
        }]
    }]
};

module.exports = mongoose.model('Order', schema);