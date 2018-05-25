 app.controller("clientController", ["$q", "$scope", "$filter", "socketService", "$http",
    function ($q, $scope, $filter, socketService, $http) {
        var socket = socketService;
        socket.emit("get", true);
        $scope.current = null;
        $scope.playing = false;
        $scope.list = [];
        $scope.new = "";
        $scope.volume = 1;
        $scope.searchResults = [];
        $scope.loadedNames = [];
        $scope.counter = 0;
        $scope.additions = 0;
        $scope.loadStatus = "Loaded";
        $scope.autoPlayId = -1;
        var changedVolSelf = true;

        socket.on("current", function (current) {
            $scope.current = current;
        });
        socket.on("list", function (list) {
            $scope.list = list;
        });
        socket.on("volume", function (value) {
            changedVolSelf = true;
            $scope.volume = value;
        });
        socket.on("playing", function (bool) {
            $scope.playing = bool;
        });
        $scope.autoPlay = function() {
            console.log("autoPlay()");
            if ($scope.autoPlayId > -1) {
                console.log("Not starting another player thread, since it is already launched.");
                return;
            }
            $scope.randomAdd();
            setTimeout(function() {$scope.play(true);}, 2000);
            $scope.autoPlayId = setInterval($scope.randomAdd, 10000);
        };
        $scope.stopAutoPlay = function() {
            console.log("StopAutoPlay()");
            if ($scope.autoPlayId < 0) {
                console.log("Nothing to stop.");
                return;
            }
            clearInterval($scope.autoPlayId);
            $scope.autoPlayId = -1;
        };
        $scope.loadFile = function() {
            console.log("loadFile()");
            let file = document.getElementById("loadedFile").files[0];
            if (file) {
                let reader = new FileReader();
                reader.readAsText(file, "ANSI");
                reader.onload = $scope.onFileLoad;
            }
        };
        $scope.onFileLoad = function(evt) {
            console.log("onFileLoad()");
            $scope.counter = 0;
            $scope.additions = 0;
            $scope.loadStatus = "Loading";
            $scope.loadedNames = [];
            let contents = evt.target.result;
            console.log(contents);
            contents = contents.replace(/\r/g, "\n");
            contents = contents.split("\n");
            console.log(contents);
            for (let i in contents) {
                ++$scope.counter;
                if (contents[i].length > 0) {
                    $scope.loadedNames.push(contents[i]);
                    ++$scope.additions;
                }
            }
            console.log($scope.additions + "/" + $scope.counter);
            console.log($scope.loadedNames);
            $scope.loadStatus = "Done";
        };
        $scope.parseDuration = function(raw) {
            let m = /^[a-z]*(?:(\d+)M)?(\d+)S$/i.exec(raw);
            if (!m) return;

            let minutes = m[1] ? parseInt(m[1], 10) : 0;
            let seconds = m[2] ? parseInt(m[2], 10) : 0;
            return minutes * 60 + seconds;
        };
        $scope.isAllowed = function(name) {
            return name.length > 3 && name.length < 60 && $scope.isAscii(name);
        };
        $scope.isAscii = function(s) {
            for (let c in s) {
                if ("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -&.()".indexOf(s[c]) < 0) {
                    console.log("Invalid character: " + s[c].charCodeAt(0) + " (ASCII code)");
                    return false;
                }
            }
            return true;
        };
        $scope.canAddRandom = function() {
            return $scope.list.length < 3;
        };
        $scope.randomAdd = function() {
            if ($scope.canAddRandom()) {
                let randomName = $scope.getRandomName();
                if (!$scope.isAllowed(randomName)) {
                    console.log("Not permitted");
                    return;
                }
                console.log("randomAdd()");
                $http.get('https://www.googleapis.com/youtube/v3/search', {
                    params: {
                        key: 'AIzaSyAx4uk0wyOWLxB3n6YN19BQ_WiBIvjN2YA',
                        type: 'video',
                        maxResults: '5',
                        part: 'id,snippet',
                        fields: 'items/id,items/snippet/title,items/snippet/description,items/snippet/thumbnails/default,items/snippet/channelTitle',
                        q: randomName
                    }
                }).then(function(data) {
                    if (data.data.items.length > 0) {
                        let song = data.data.items[0];
                        $http.get('https://www.googleapis.com/youtube/v3/videos', {
                            params: {
                                key: 'AIzaSyAx4uk0wyOWLxB3n6YN19BQ_WiBIvjN2YA',
                                id: song.id.videoId,
                                part: 'contentDetails',
                                fields: 'items/contentDetails/duration'
                            }
                        }).then(function(data2) {
                            if (data2.data.items.length > 0) {
                                let songDuration = $scope.parseDuration(data2.data.items[0].contentDetails.duration);
                                console.log("Duration: " + songDuration);
                                if (songDuration > 20 && songDuration < 15*60) {
                                    $scope.addById(song.id.videoId);
                                }
                            }
                        });
                    }
                });
            }
        };
        $scope.getRandomName = function() {
            let randomId = Math.floor(Math.random() * $scope.loadedNames.length);
            let randomName = $scope.loadedNames[randomId];
            console.log("Random (" + randomId + "): " + randomName);
            return randomName;
        };
        $scope.add = function () {
            socket.emit("add", $scope.new);
            $scope.new = "";
        };
        $scope.remove = function (index) {
            socket.emit("remove", index);
        };
        $scope.prettyLength = function (seconds) {
            var minutes = Math.floor(seconds / 60);
            seconds = seconds % 60;
            if (minutes === 0 && seconds === 0){
                return "Live";
            } else if(seconds < 10){
                return minutes + ":0" + seconds;
            } else {
                return minutes + ":" + seconds;
            }
        };
        $scope.$watch('volume', function (newVal, oldVal) {
            if (!changedVolSelf) {
                socket.emit('volume', newVal);
            } else {
                changedVolSelf = false;
            }
        });
        $scope.addById = function (id) {
            console.log("Adding by ID: " + id);
            socket.emit("add", "https://www.youtube.com/watch?v=" + id);
            $scope.clearSearch();
        };
        $scope.clearSearch = function() {
            $scope.searchResults = [];
            $scope.search = "";
        };
        $scope.$watch('search', function (newVal, oldVal) {
            if (newVal === ""){
                $scope.searchResults = [];
                $scope.search = ""
            }
            if(!newVal) {
                searchResults = [];
                return;
            }
            $http.get('https://www.googleapis.com/youtube/v3/search', {
                params: {
                    key: 'AIzaSyAx4uk0wyOWLxB3n6YN19BQ_WiBIvjN2YA',
                    type: 'video',
                    maxResults: '5',
                    part: 'id,snippet',
                    fields: 'items/id,items/snippet/title,items/snippet/description,items/snippet/thumbnails/default,items/snippet/channelTitle',
                    q: $scope.search
                }
            }).then(function(data) {
                $scope.searchResults = data.data.items;
            })
        });
        $scope.play = function (bool) {
            socket.emit('playing', bool)
        };
        $scope.skip = function () {
            socket.emit('next', true);
        };
    }]);
