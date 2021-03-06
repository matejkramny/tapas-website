var mongoose = require('mongoose');

var schema = {
    name: String,
    postcode: String,
    houseNr: Number,
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
        name: String,
        price: Number,
        ingredients: [{
            id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Item.ingredients'
            },
            value: Number,
            name: String,
            default_quantity: Number
        }]
    }]
};

module.exports = mongoose.model('Order', schema);