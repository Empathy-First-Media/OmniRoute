# Event catalog — OmniRoute Realtime API v3.8.52

## Servers

| Id        | Host            | Protocol |
| --------- | --------------- | -------- |
| dashboard | localhost:20128 | ws       |
| liveWs    | localhost:20132 | ws       |

## Channels

| Key              | Address                         | Messages                                     |
| ---------------- | ------------------------------- | -------------------------------------------- |
| liveDashboard    | /live-ws                        | error, event, ping, pong, subscribe, welcome |
| trafficInspector | /api/tools/traffic-inspector/ws | clear, new, snapshot, update                 |
| wsHandshake      | /api/v1/ws                      | handshakeResponse                            |

## Operations

| Key                     | Action  | Channel                     |
| ----------------------- | ------- | --------------------------- |
| discoverWsHandshake     | receive | #/channels/wsHandshake      |
| receiveLiveDashboard    | receive | #/channels/liveDashboard    |
| receiveTrafficInspector | receive | #/channels/trafficInspector |
| sendLiveDashboard       | send    | #/channels/liveDashboard    |

## Messages

| Name                | Content-Type |
| ------------------- | ------------ |
| TrafficClear        |              |
| TrafficNew          |              |
| TrafficSnapshot     |              |
| TrafficUpdate       |              |
| WsError             |              |
| WsEvent             |              |
| WsHandshakeResponse |              |
| WsPing              |              |
| WsPong              |              |
| WsSubscribe         |              |
| WsWelcome           |              |
