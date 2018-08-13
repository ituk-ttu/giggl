app.factory("socketService", ["socketFactory", function(socketFactory) {

    var myIoSocket = io.connect("192.168.0.103:1337");

    return socketFactory({
        ioSocket: myIoSocket
    });
}]);