export default class PlooshCrypt {
    _crypto = crypto.subtle;
    _algname = "AES-GCM";
    _alg = (iv: ArrayBuffer) => ({
        name: this._algname,
        iv: iv
    });

    _params = {
        name: this._algname,
        length: 256,
    };

    b64toarrbuf(data: string): ArrayBuffer {
        let outarr = atob(data).split("").map(q => q.charCodeAt(0));
        let out8arr = new Uint8Array(outarr);
        let out = out8arr.buffer;

        return out;
    }

    u8arrtostr(u8arr: Uint8Array): string {
        let str = "";
        u8arr.forEach(c => str += String.fromCharCode(c));

        return str;
    }

    arrbuftostr(arrbuf: ArrayBuffer): string {
        let u8arr = new Uint8Array(arrbuf);

        return this.u8arrtostr(u8arr);
    }

    u16tou8arr(str: string): Uint8Array {
        let outarr: number[] = [];
        for (let i = 0; i < str.length; i++) {
            let code = str.charCodeAt(i);
            if (code > 255) {
                outarr.push(code >> 8);
                outarr.push(code & 0xff);
            } else {
                outarr.push(0);
                outarr.push(code);
            }
        }

        return new Uint8Array(outarr);
    }

    u8tou16str(str: string): string {
        let outarr: string[] = [];

        let codes = str.match(/.{2,2}/g);

        codes?.forEach(val => {
            if (val.charCodeAt(0) == 0) {
                outarr.push(val.charAt(1));
            } else {
                let char1 = val.charCodeAt(0) << 8;
                let char2 = val.charCodeAt(1);

                let newCharCode = char1 | char2;

                outarr.push(String.fromCharCode(newCharCode));
            }
        });


        return outarr.join("");
    }

    async encrypt(instr: string): Promise<string> {
        let data = this.u16tou8arr(instr);

        let enc_key = await this._crypto.generateKey(this._params, true, ["encrypt"]);

        let iv = crypto.getRandomValues(new Uint8Array(16));

        let encrypted = await this._crypto.encrypt(this._alg(iv), enc_key, data);

        let str = this.arrbuftostr(encrypted);
        let ivstr = this.u8arrtostr(iv);
        let estr = this.arrbuftostr(await this._crypto.exportKey("raw", enc_key));

        return `plooshcrypt.${btoa(str)}.${btoa(estr)}.${btoa(ivstr)}`;
    }

    async decrypt(encstr: string): Promise<string> {
        let spl = encstr.split(".").slice(1);

        let enc = this.b64toarrbuf(spl[0]);
        let key = this.b64toarrbuf(spl[1]);
        let iv = this.b64toarrbuf(spl[2]);

        let dkey = await this._crypto.importKey("raw", key, this._params, false, ["decrypt"]);

        let decbuf = await this._crypto.decrypt(this._alg(iv), dkey, enc);

        let str = this.u8tou16str(this.arrbuftostr(decbuf));

        return str;
    }

    isPlooshCrypt(str: string): boolean {
        return str.startsWith("plooshcrypt.");
    }
}
