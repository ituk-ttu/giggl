app.controller("clientController", ["$q", "$scope", "$filter", "socketService",
    function ($q, $scope, $filter, socketService) {
        var socket = socketService;
        socket.emit("get", true);
        $scope.current = null;
        $scope.list = [];
        $scope.new = "";
        socket.on("current", function (current) {
            $scope.current = current;
        });
        socket.on("list", function (list) {
            $scope.list = list;
        });
        $scope.add = function () {
            socket.emit("add", $scope.new);
            $scope.new = "";
        };
        $scope.remove = function (index) {
            socket.emit("remove", index);
        };
    }]);
