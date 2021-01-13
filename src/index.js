const WebSocket = require('ws');
const fs = require('fs');
const os = require('os');

const ws = new WebSocket.Server({port: 7777});

const clients = [];
const veto = {maps: null, status: "w", team: 0, teams: []};
const actions = "wbbppbbd";
let currentAction = 0;
fs.readFile("./mappool.json", 'utf8', function (err, data) {
    if (err) {
        console.error("Could not open file: %s", err);
        return;
    }
    const parsed = JSON.parse(data);
    veto['maps'] = parsed['maps'];
    veto['teams'] = parsed['teams'];
});
ws.on('connection', function (ws) {
    clients.push(ws);
    let index = clients.indexOf(ws);
    console.log(`Client #${index} connected`);
    ws.on('message', function (message) {
        let index = clients.indexOf(ws);
        console.log(`Client #${index} > ${message}`);
        if (currentAction + 1 >= actions.length || actions[currentAction] === "d") {
            veto.status = "d";
            clients.forEach(function (client) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(veto));
                    client.close();
                }
            });
            clients.length = 0;
            return;
        }
        message = message.split(";");
        const cmd = message[0], team = veto.teams.indexOf(message[1]), map = message[2];
        if (cmd === "stop")
            os.exit(0);
        if (cmd === "start")
            veto.status = actions[++currentAction];

        if (cmd && team !== -1 && map) {
            switch (cmd) {
                case "ban":
                    if (actions[currentAction] !== "b")
                        break
                    veto.maps[map] = {status: "ban", team};
                    break;
                case "pick":
                    if (actions[currentAction] !== "p")
                        break
                    veto.maps[map] = {status: "pick", team};
                    break;
                default:
                    break;
            }
            console.log(`Team ${team} ${cmd} ${map}`);
            veto.status = actions[++currentAction];
            veto.team = veto.team === 1 ? 0 : 1;
        }
        clients.forEach(function (client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(veto));
            }
        });
    });
    ws.on('close', function () {
        let index = clients.indexOf(ws);
        console.log(`Client #${index} disconnected`);
        if (index !== -1)
            clients.splice(index, 1);
    });
});
