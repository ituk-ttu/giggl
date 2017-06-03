app.factory("socketService", ["socketFactory", function(socketFactory) {

    var myIoSocket = io.connect("localhost:1337");

    return socketFactory({
        ioSocket: myIoSocket
    });
}]);