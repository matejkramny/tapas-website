var mongoose = require('mongoose');

var schema = {
    name: String,
    address: String,
    phone: Number,
    email: String,
    items: [{
        item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item'
        },
        quantity: Number
    }]
};

module.exports = mongoose.model('Order', schema);