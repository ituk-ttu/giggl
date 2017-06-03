var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io').listen(http);
var clk = require('chalk');
var bodyParser = require('body-parser');
var cors = require('cors');
var readline = require('readline');
var getVideoId = require('get-video-id');
var fetchVideoInfo = require('youtube-info');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({extended: true})); // support encoded bodies
app.use(cors());
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
app.options('*', cors());
var current = null;
var playlist = [];

app.get('/', function(req, res){
    res.sendFile(__dirname + '/player.html');
});

io.on('connection', function (socket) {
    socket.on('add', function (url) {
        var video = getVideoId(url);
        console.log(clk.blue('Adding video ') + clk.blue.bold(video.id));
        if (video.service === 'youtube') {
            playlist.push(video.id);
            if (current === null) {
                playVideo(video.id, io);
            }
        }
        updateInfo(io);
    });
    socket.on('remove', function (index) {
        console.log(clk.blue('Removing video ') + clk.blue.bold(playlist[index]));
        playlist.splice(index, 1);
        updateInfo(io);
    });
    socket.on('next', function (ignored) {
        console.log(clk.blue('Skipping current'));
        next(io);
        updateInfo(io);
    });
    socket.on('finished', function (ignored) {
        console.log(clk.yellow('Finished current'));
        next(io);
        updateInfo(io);
    });
    socket.on('get', function (ignored) {
        updateInfo(socket);
    })
});

function next(io) {
    console.log(clk.blue('Finished video ') + clk.blue.bold(current));
    if (playlist.length !== 0) {
        playVideo(playlist.shift(), io);
    } else {
        current = null;
        console.log(clk.yellow('List empty, waiting for queue'));
    }
}

function playVideo(id, target) {
    current = id;
    console.log(clk.green('Playing video ') + clk.green.bold(id));
    target.emit('play', id);
}

function updateInfo(target) {
    target.emit('current', {
        'id': current !== null ? current : null,
        'info': current !== null ? fetchVideoInfo(current): null
    });
    var prettyPlaylist = [];
    playlist.forEach(function (item) {
        prettyPlaylist.push({
            'id': item,
            'info': fetchVideoInfo(item)
        });
    });
    target.emit('list', prettyPlaylist);
}

http.listen(1337, function(){
    console.log(clk.green.bold('listening on *:' + 1337));
});
