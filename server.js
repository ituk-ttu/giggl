var express = require('express');
var app = express();
var path = require('path');
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
var playing = false;
var playlist = [];
var volume = 100;
var display = "asd";
var times = [ 0, 0];
var info2 = null;

app.get('/player', function (req, res) {
    res.sendFile(__dirname + '/player.html');
});

Array.prototype.insert = function (index, item) {
    this.splice(index, 0, item);
};

io.on('connection', function (socket) {
    socket.on('add', function (url) {
        var video = getVideoId(url);
        if (video !== undefined && video.id !== undefined) {
            console.log(clk.blue('Adding video ') + clk.blue.bold(video.id));
            if (video.service === 'youtube') {
                playlist.push(video.id);
                if (current === null) {
                    next(io);
                    updateInfo(io);
                }
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
        times = [ 0, 0];
        next(io);
        updateInfo(io);
    });
    socket.on('finished', function (ignored) {
        console.log(clk.yellow('Finished current'));
        times = [ 0, 0];
        next(io);
        updateInfo(io);
    });
    socket.on('display', function (ignored) {

    });
    socket.on('get', function (ignored) {
        updateInfo(socket);
        socket.emit('volume', volume);
        socket.emit('playing', playing);
    });
    socket.on('playing', function (bool) {
        if (current !== null) {
            if (!playing) {
                playing = bool;
                step();
            } else {
                playing = bool;
            }
            updateInfo(io);
            io.emit('playing', bool);
        }
    });
    socket.on('volume', function (value) {
        console.log(clk.blue('Set volume to ') + clk.blue.bold(value));
        volume = value;
        io.emit('volume', volume);
    });
});

function next(io) {
    console.log(clk.blue('Finished video ') + clk.blue.bold(current));
    if (playlist.length !== 0) {
        setVideo(playlist.shift(), io);
    } else {
        current = null;
        playing = false;
        io.emit('playing', playing);
        io.emit('current', null);
        console.log(clk.yellow('List empty, waiting for queue'));
    }
}

function setVideo(id, target) {
    current = id;
    console.log(clk.green('Playing video ') + clk.green.bold(id));
    target.emit('play', id);
}

function updateInfo(target) {
    if (current === null) {
        target.emit('current', null);
    } else {
        fetchVideoInfo(current, function (err, info) {
            display = print();
            info2 = info;
            target.emit('current', {
                'id': current,
                'info': info,
                'display': display
            });
        });
    }
    var prettyPlaylist = playlist.concat();
    var counter = 0;
    if (playlist.length > 0) {
        prettyPlaylist.forEach(function (item, index, array) {
            fetchVideoInfo(item, function (err, res) {
                array[index] = ({
                    id: item,
                    info: res
                });
                counter++;
                if (counter === playlist.length) {
                    target.emit('list', prettyPlaylist);
                }
            });
        });
    } else {
        target.emit('list', []);
    }

}
function step() {
    if (!playing) return;
    if (info2 !== null){
        times[1] += 0.1;
        if (times[1] >= 60) {
            times[0] += 1;
            times[1] -= 60;
        }
    }
    if (playing){
    updateInfo(io);
    setTimeout(function(){
            step() },
        100);
    }
}

function print() {
    return `${pad0(Math.floor(times[0]), 2)}:${pad0(Math.floor(times[1]), 2)}`;
}

function pad0(value, count) {
    var result = value.toString();
    for (; result.length < count; --count)
        result = '0' + result;
    return result;
}

app.use('/client', express.static(path.join(__dirname + '/client')));

http.listen(1337, function () {
    console.log(clk.green.bold('listening on *:' + 1337));
});
