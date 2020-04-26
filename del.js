var socket = io();
socket.on('Game Data', function (msg) {
    players = msg                                    /*
    {
        id: "6bc25db0-ddb9-4c3b-a7e3-6fce8970b67e", 
        name: "bob"
    }                                                 */
    clearGrid()
    FillGrid()
});