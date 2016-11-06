var path = require('path');
var express = require('express');
var app = express();

app.set('views', './views');
app.set('view engine', 'pug');

app.use(express.static('public'));
//app.use(express.static('public/js/three.js/examples'))

app.get('*', function(req, res) {
    res.render('index');
})
// app.get('/plot', function(req, res) {
//     res.send(req.query.coord);
// });

app.listen(3000, function() {
    console.log('Example app listening on port 3000!');
});