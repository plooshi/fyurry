/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/


import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";
import { findOption, RequiredMessageOption } from "@api/Commands";
import { Message } from "discord-types/general";
import { FluxDispatcher } from "@webpack/common";
import PlooshCrypt from "@utils/PlooshCryptLib";

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
}

interface IMessageUpdate {
    type: "MESSAGE_UPDATE";
    guildId: string;
    message: Message;
}

interface ILoadMessages {
    type: "LOAD_MESSAGES_SUCCESS";
    channelId: string;
    hasMoreAfter: boolean;
    hasMoreBefore: boolean;
    isAfter: boolean;
    isBefore: boolean;
    isStale: boolean;
    jump: Object;
    limit: number;
    messages: Message[];
    truncate: boolean;
}

class PlooshCryptPlugin {
    plooshCrypt = new PlooshCrypt();

    async decryptMessage(message: Message) {
        let pCryptMatch = message.content.match(/^plooshcrypt(\.([a-zA-Z0-9\/\+]*)(={0,2})){3}$/g);

        if (pCryptMatch?.length !== 1) return;
        // now that we're sure we have a plooshcrypt message, decrypt it

        try {
            let dec = await this.plooshCrypt.decrypt(message.content);
            message.content = dec;
        } catch (err) {
            message.content = `FAILED: ${message.content} (${err})`;
        }

        FluxDispatcher.dispatch({
            type: "MESSAGE_UPDATE",
            message: message
        });
    }
}

let PlooshCryptInstance = new PlooshCryptPlugin();

async function plooshCryptOnMessage(event: IMessageCreate) {
    if (event.optimistic || event.type !== "MESSAGE_CREATE") return;
    if (event.message.state == "SENDING") return;

    PlooshCryptInstance.decryptMessage(event.message);
}

async function plooshCryptOnMessageUpdate(event: IMessageUpdate) {
    if (event.type !== "MESSAGE_UPDATE") return;

    PlooshCryptInstance.decryptMessage(event.message);
}

async function plooshCryptOnLoadMessages(event: ILoadMessages) {
    for (let i = 0; i < event.limit; i++) {
        PlooshCryptInstance.decryptMessage(event.messages[i]);
    }
}

export default definePlugin({
    name: "PlooshCrypt",
    description: "Encrypt your messages.",
    authors: [Devs.Ploosh],
    dependencies: ["CommandsAPI"],

    commands: [
        {
            name: "plooshcrypt",
            description: "Encrypt a message",
            options: [RequiredMessageOption],

            execute: async opts => ({
                content: await PlooshCryptInstance.plooshCrypt.encrypt(findOption(opts, "message", "")),
            }),
        },
    ],

    start() {
        FluxDispatcher.subscribe("MESSAGE_CREATE", plooshCryptOnMessage);
        FluxDispatcher.subscribe("MESSAGE_UPDATE", plooshCryptOnMessageUpdate);
        FluxDispatcher.subscribe("LOAD_MESSAGES_SUCCESS", plooshCryptOnLoadMessages);
    },
});
