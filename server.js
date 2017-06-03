var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io').listen(http);
var clk = require('chalk');
var bodyParser = require('body-parser');
var cors = require('cors');
var readline = require('readline');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('database.sqlite');
var bcrypt = require('bcrypt-nodejs');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({extended: true})); // support encoded bodies
app.use(cors());
var connections = [];
var scores = [];
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
app.options('*', cors());