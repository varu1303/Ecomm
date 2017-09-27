const Products = require('./product');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;


module.exports = {
    getAllProd: function() {
        return Products.find({});
    },
    
    getOneProd: function(id) {
        return Products.findById(id);
    },
    
    add: function(data) {
        var product = new Products({
                prodName: data.name,
                price: data.price,
                inStock: data.inStock,
                Seller: data.seller
            });
        
        return product.save();
    },
    
    remove: function(id) {
        return Products.findByIdAndRemove(id);
    },
    
    updateStock: function(id, inStock) {
        return Products.findByIdAndUpdate(id, {inStock: inStock});
    },
    
    updatePrice: function(id, price) {
        return Products.findByIdAndUpdate(id, {price: price});
    }
};