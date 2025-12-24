import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import { readFile } from 'fs/promises';

export async function injectCordova({urlToReplace, origin, filesToCopy}){

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    let fetchSrc = await readFile(path.join(__dirname, "cordova-native-fetch.mjs"), { encoding: "utf8"}) ;

    fetchSrc = fetchSrc.replace(`SERVER_URL = ""`, `SERVER_URL = "${origin}"`) ;
    let rootElements = [] ;
    for(let file of filesToCopy){
        let dest = file.dest ;
        if(dest.includes("/")){
            dest = dest.substring(0, dest.indexOf("/")) ;
        }
        if(dest && !rootElements.includes(dest)){
            rootElements.push(dest) ;
        }
    }
    fetchSrc = fetchSrc.replace(`STATIC_RESOURCES = []`, `STATIC_RESOURCES = [${rootElements.map(e=>`"${e}"`).join(", ")}] ;`) ;

    filesToCopy.push({
        url: "cordova/cordova-native-fetch.mjs",
        content: fetchSrc,
        dest: "cordova/cordova-native-fetch.mjs"
    })

    //inject cordova scripts
    urlToReplace.push({
        file: {filePath: "index.html", baseUrl: "/index.html" },
        urls: [{
            url: "</body>",
            dest: `<script src="cordova.js"></script>
            <script src="cordova/cordova-native-fetch.mjs"></script>
            </body>`,
        }]
    })

    //if using viewz, replace BROWSER routing by HASH routing
    urlToReplace.push({
        file: {filePath: "viewz.config.json", baseUrl: "/viewz.config.json" },
        urls: [{
            url: `"BROWSER"`,
            dest: `"HASH"`,
        }]
    })
}