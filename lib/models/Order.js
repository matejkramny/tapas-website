var mongoose = require('mongoose');

var schema = {
    name: String,
    postcode: String,
    phone: String,
    email: String,
    timeSent: Date,
    secureID: String,
    status: {
        type: Number,
        default: 0
    },
    total: Number,
    totalFormatted: String,
    distancePrice: Number,
    distancePriceFormatted: String,
    distance: Number,
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