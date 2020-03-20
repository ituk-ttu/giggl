 app.controller("clientController", ["$q", "$scope", "$filter", "socketService", "$http",
    function ($q, $scope, $filter, socketService, $http) {
        var socket = socketService;
        socket.emit("get", true);
        $scope.current = null;
        $scope.playing = false;
        $scope.playlistMode = false;
        $scope.shuffle = false;
        $scope.list = [];
        $scope.new = "";
        $scope.volume = 1;
        $scope.searchResults = [];
        $scope.loadedNames = [];
        $scope.counter = 0;
        $scope.additions = 0;
        $scope.loadStatus = "Loaded";
        $scope.autoPlayId = -1;
        $scope.shareLink = "";
        var changedVolSelf = true;

        socket.on("current", function (current) {
            $scope.current = current;
        });
        socket.on("playlistMode", function (value) {
            $scope.playlistMode = value;
        });
        socket.on("shuffle", function (value) {
            $scope.shuffle = value;
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
            console.debug("autoPlay()");
            if ($scope.autoPlayId > -1) {
                console.warn("Not starting another player thread, since it is already launched.");
                return;
            }
            $scope.randomAdd();
            $scope.autoPlayId = setInterval($scope.randomAdd, 10000);
        };
        $scope.stopAutoPlay = function() {
            console.debug("stopAutoPlay()");
            if ($scope.autoPlayId < 0) {
                console.warn("Nothing to stop.");
                return;
            }
            clearInterval($scope.autoPlayId);
            $scope.autoPlayId = -1;
        };
        $scope.share = function() {
            console.debug("share()");
            $scope.shareLink = "https://youtu.be/" + $scope.current.id;
            document.getElementById("shareLink").hidden = false;
        };
        $scope.hideShare = function() {
            let el = document.getElementById("shareLink");
            el.hidden = true;
            el.title = "click to copy";
        };
        $scope.copyLink = function() {
            let el = document.getElementById("shareLink");
            el.title = "copied";
            el.select();
            document.execCommand("copy");
        };
        $scope.loadFile = function() {
            console.debug("loadFile()");
            let file = document.getElementById("loadedFile").files[0];
            if (file) {
                let reader = new FileReader();
                reader.readAsText(file, "utf-8");
                reader.onload = $scope.onFileLoad;
            }
        };
        $scope.onFileLoad = function(evt) {
            console.debug("onFileLoad()");
            $scope.counter = 0;
            $scope.additions = 0;
            $scope.loadStatus = "Loading";
            $scope.loadedNames = [];
            let contents = evt.target.result;
            contents = contents.replace(/\r/g, "\n");
            contents = contents.split("\n");
            for (let i in contents) {
                ++$scope.counter;
                if (contents[i].length > 0) {
                    $scope.loadedNames.push(contents[i]);
                    ++$scope.additions;
                }
            }
            console.info("Loaded lines: " + $scope.loadedNames.length + "/" + contents.length);
            $scope.loadStatus = "Done";
        };
        $scope.parseDuration = function(raw) {
            let m = /^[a-z]*(?:(\d+)H)?(?:(\d+)M)?(\d+)S$/i.exec(raw);
            if (!m) return;

            let hours = m[1] ? parseInt(m[1], 10) : 0;
            let minutes = (m[2] ? parseInt(m[2], 10) : 0) + hours * 60;
            return (m[3] ? parseInt(m[3], 10) : 0) + minutes * 60;
        };
        $scope.isAllowed = function(name) {
            if (name.length < 2) {
                console.warn("Name too short: " + name.length);
                return false;
            }

            if (name.length >= 68) {
                console.warn("Name too long: " + name.length);
                return false;
            }

            return $scope.hasAllowedCharacters(name);
        };
        $scope.hasAllowedCharacters = function(s) {
            for (let c in s) {
                if ("abcdefghijklmnopqrsšzžtuvwõäöüxyABCDEFGHIJKLMNOPQRSŠZŽTUVWÕÄÖÜXY0123456789 -&.,()!#".indexOf(s[c]) < 0) {
                    console.warn("Invalid character: " + s[c] + " (unicode: hex: " + s[c].charCodeAt(0).toString(16) + ")");
                    return false;
                }
            }
            return true;
        };
        $scope.canAddRandom = function() {
            return $scope.list.length < 5;
        };
        $scope.randomAdd = function() {
            if ($scope.canAddRandom()) {
                let randomName = $scope.getRandomName();
                if (!$scope.isAllowed(randomName)) {
                    return;
                }
                $http.get('https://www.googleapis.com/youtube/v3/search', {
                    params: {
                        key: 'AIzaSyAx4uk0wyOWLxB3n6YN19BQ_WiBIvjN2YA',
                        type: 'video',
                        maxResults: '5',
                        part: 'id,snippet',
                        fields: 'items/id,items/snippet/title,items/snippet/description,items/snippet/thumbnails/default,items/snippet/channelTitle',
                        q: randomName
                    }
                }).then(songListData => {
                    if (songListData.data.items.length === 0) {
                        throw new Error("Could not find anything to play by search string: " + randomName);
                    }

                    let song = songListData.data.items[0];
                    $http.get('https://www.googleapis.com/youtube/v3/videos', {
                        params: {
                            key: 'AIzaSyAx4uk0wyOWLxB3n6YN19BQ_WiBIvjN2YA',
                            id: song.id.videoId,
                            part: 'contentDetails',
                            fields: 'items/contentDetails/duration'
                        }
                    }).then(videoData => {
                        if (videoData.data.items.length === 0) {
                            throw new Error("Could not load video by ID: " + song.id.videoId);
                        }

                        let songDuration = $scope.parseDuration(videoData.data.items[0].contentDetails.duration);

                        if (songDuration < 20) {
                            throw new Error("Song too short: " + songDuration + " s");
                        }

                        if (songDuration > 15 * 60) {
                            throw new Error("Song too long: " + songDuration + " s");
                        }

                        $scope.addById(song.id.videoId);
                    }).catch(err => {
                        throw new Error(err);
                    });
                }).catch(err => {
                    console.warn("randomAdd(): " + err);
                });
            }
        };
        $scope.getRandomName = function() {
            let randomId = Math.floor(Math.random() * $scope.loadedNames.length);
            let randomName = $scope.loadedNames[randomId];
            console.debug("Random (" + randomId + "): " + randomName);
            return randomName;
        };
        $scope.addByUrl = function (url) {
            socket.emit("add", url);
        };
        $scope.add = function () {
            $scope.addByUrl($scope.new);
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
            $scope.addByUrl("https://www.youtube.com/watch?v=" + id);
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
        $scope.$watch('current', function(newVal, oldVal) {
            $scope.hideShare();
            document.getElementById("shareButton").hidden = newVal === null || newVal.id === null;
        });
        $scope.play = function (bool) {
            socket.emit('playing', bool)
        };
        $scope.setPlaylistMode = function (bool) {
            socket.emit('playlistMode', bool)
        };
        $scope.setShuffle = function (bool) {
            socket.emit('shuffle', bool)
        };
        $scope.skip = function () {
            socket.emit('next', true);
        };
    }]);
