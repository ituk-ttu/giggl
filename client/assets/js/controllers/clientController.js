app.controller("clientController", ["$q", "$scope", "$filter", "socketService",
    function ($q, $scope, $filter, socketService) {
        var socket = socketService;
        socket.emit("get", true);
        $scope.current = null;
        $scope.playing = false;
        $scope.list = [];
        $scope.new = "";
        $scope.volume = 0;
        var changedVolSelf = false;

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
            return Math.floor(seconds / 60) + ":" + seconds % 60;
        };
        $scope.$watch('volume', function (newVal, oldVal) {
            if (!changedVolSelf) {
                socket.emit('volume', newVal);
            } else {
                changedVolSelf = false;
            }
        });
        $scope.play = function (bool) {
            socket.emit('playing', bool)
        };
        $scope.skip = function () {
            socket.emit('next', true)
        };
    }]);
