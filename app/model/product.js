const mongoose = require('mongoose');

var productSchema = mongoose.Schema({
    
    prodName: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    inStock: {
        type: Boolean
    },
    Seller: {
        type: String
    }
});


module.exports = mongoose.model('Products', productSchema);