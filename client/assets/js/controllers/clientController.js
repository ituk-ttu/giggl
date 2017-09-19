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
        $scope.add = function () {
            socket.emit("add", $scope.new);
            $scope.new = "";
        };
        $scope.remove = function (index) {
            socket.emit("remove", index);
        };
        $scope.prettyLength = function (seconds) {
            minutes = Math.floor(seconds / 60);
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
            socket.emit("add", "https://www.youtube.com/watch?v=" + id);
            $scope.clearSearch();
        };
        $scope.clearSearch = function() {
            $scope.searchResults = [];
            $scope.search = "";
        };
        $scope.$watch('search', function (newVal, oldVal) {
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
            socket.emit('next', true)
        };
    }]);
