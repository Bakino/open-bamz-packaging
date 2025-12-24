import express from 'express';
import path from 'path';
// @ts-ignore
const cheerio = await import('cheerio');
// @ts-ignore
const acorn = await import('acorn');
import {glob} from 'glob';
//import { fileURLToPath } from "url";
import { readFile, stat } from 'fs/promises';
import { injectCordova } from './cordova/cordova-inject.mjs';

export const prepareDatabase = async () => {
    // add settings table
}

export const cleanDatabase = async () => {
    // remove settings table
}


function extractUrlsFromHTML(html) {
    const $ = cheerio.load(html);
    const urls = [];
  
    $('script[src], link[href]').each((index, element) => {
      const src = $(element).attr('src') || $(element).attr('href');
      if (src && src.startsWith('https://')) {
        urls.push(src);
      }
    });
  
    return urls;
}
function findImportURLs(node, content) {
    let urls = [];

    if (node.type === 'ImportDeclaration') {
        urls.push(node.source.value);
    }else if (node.type === 'ImportExpression') {
        //console.log("NODE ?", node.source) ;
        if(node.source.value){
            urls.push(node.source.value.replace(/^'/, "").replace(/'$/, ""));
        }
   /* don't do that because the URL may be a dynamic endpoint we should not try to download it
   }else if(node.type === "ExpressionStatement"){
        if(node.expression?.left?.property?.name === "href") {
            if(node.expression?.right?.type === "TemplateLiteral"){
                let literalStr = content.substring(node.expression.right.start+1, node.expression.right.end-1) ;
                urls.push(literalStr);
            }
        }*/
    }

    // Traverse child nodes
    for (let key in node) {
        if (node[key] && typeof node[key] === 'object') {
            urls = urls.concat(findImportURLs(node[key], content));
        }
    }

    return urls;
}

async function extractUrlsFromJsContent(content, url, logger){
    let urls = [];
    
    try{
        urls = findImportURLs(
            acorn.parse(content, { ecmaVersion: "latest", sourceType: "module", 
            allowImportExportEverywhere: true, allowAwaitOutsideFunction: true }),
            content
        );
    }catch(err){
        logger.error("Error parsing JS url "+url+" %o", err);
    }
  
    return urls;
}
/*
async function extractUrlsFromJS(file, logger) {
    let urls = [];
    
    try{
        const content = await readFile(file, {encoding: "utf8"}) ;

        urls = findImportURLs(acorn.parse(content, { ecmaVersion: 2020, sourceType: "module", allowImportExportEverywhere: true }));

    }catch(err){
        logger.error("Error parsing JS file "+file+" %o", err);
    }
  
    return urls;
}
*/



export const initPlugin = async ({ graphql, hasCurrentPlugin,contextOfApp, logger }) => {
    const router = express.Router();


    //const __filename = fileURLToPath(import.meta.url);
    //const __dirname = path.dirname(__filename);


    function transformCdnUrlToLocal(cdnUrl, isHtml){
        let localUrl = `/vendor/${cdnUrl.replace("https://", "")}`;
        if(!isHtml && (!localUrl.endsWith(".js") && !localUrl.endsWith(".mjs") && !localUrl.endsWith(".css") && !localUrl.endsWith(".json"))){
            localUrl += ".js" ;
        }
        return localUrl ;
    }

    async function sourceExport({ appName, origin, transformCdn, type }){
        //get the application context (all plugins informations)
        let appContext = await contextOfApp(appName);

        //list all application files
        const filesDirectory = path.join(process.env.DATA_DIR, "apps" ,appName, "public");

        const files = await glob(`${filesDirectory}/**/*`, {});

        const filesToCopy = [] ;
        const urlToReplace = [] ;

        let appDest = "";
        //appDest = `app/${appName}/`;

        filesToCopy.push({
            url: "/_openbamz_admin.js?appName="+appName+"&forceLoadPlugins=true",
            dest: `${appDest}_openbamz_admin.js`,
            allHtml: true
        });

        let filesToAnalyze = [];

        // if other plugin registered urls to cache, add them
        if(appContext.pluginsData["open-bamz-packaging"]?.pluginSlots?.urlsToDownload){
            for(let u of appContext.pluginsData["open-bamz-packaging"].pluginSlots.urlsToDownload){
                filesToCopy.push({
                    url: u.url,
                    dest: "static/"+u.dest,
                });
                const response = await fetch(origin+u.url);
                //console.log("response content type", url, response.headers.get("content-type") )
                if(response.ok && response.headers.get("content-type").includes("javascript")){
                    filesToAnalyze.push({
                        baseUrl: origin+u.url,
                        dest: "static/"+u.dest,
                        fileContent: await response.text()
                    }) ;
                }
            }
        }

        if(appContext.pluginsData["open-bamz-packaging"]?.pluginSlots?.urlToReplace){
            for(let u of appContext.pluginsData["open-bamz-packaging"].pluginSlots.urlToReplace){
                urlToReplace.push(u)
            }
        }

        for(let f of files){
            let filePath = path.relative(filesDirectory, f);
            if(filePath === "sw.js"){ continue ; }
            const stats = await stat(f);
            if(stats.isDirectory()){ continue ; }

            if (f.endsWith('.html') || f.endsWith('.js') || f.endsWith('.mjs')) {
                // source to be parse for dependencies caching (search for CDN to cache inside)
                filesToAnalyze.push({
                    baseUrl: `/${filePath}`,
                    filePath: f,
                    dest: `${appDest}${filePath}`,
                });
            }
            //add the file to cache (with its checksum as revision)
            filesToCopy.push({
                url: `/${filePath}`,
                dest: `${appDest}${filePath}`,
            });
            if(filePath?.includes("viewz-extensions")){
                console.log("ANALYSE bootstrap loader !!!!!!!!!")
                debugger;
            }

        }

        // look at plugins to cache plugin file and deps
        for(let pluginId of Object.keys(appContext.pluginsData)){
            let pluginData = appContext.pluginsData[pluginId];
            if(pluginData.frontEndLib){
                //The plugin has a frontend lib loaded automatically

                //add the file itself
                const fileDest = transformCdnUrlToLocal(`${origin}/plugin/${pluginId}/${pluginData.frontEndLib}`)
                filesToCopy.push({
                    url: `${origin}/plugin/${pluginId}/${pluginData.frontEndLib}`,
                    dest: fileDest
                }); 

                if(fileDest?.includes("viewz-extensions")){
                    console.log("ANALYSE bootstrap loader !!!!!!!!!")
                    debugger;
                }
                
                //add plugin file to analyze (search for CDN or other files imported)
                filesToAnalyze.push({
                    baseUrl: `${origin}/plugin/${pluginId}/${pluginData.frontEndLib}`,
                    fileContent: await readFile(path.join(pluginData.frontEndFullPath, pluginData.frontEndLib), {encoding: "utf8"}) ,
                    dest: fileDest
                });
            }
        }

        
        while(filesToAnalyze.length>0){
            // @ts-ignore
            let file = filesToAnalyze.shift();
            //console.log("start analyse ", file);
            let f = file.filePath ;
            let urls = [];

            if(file.baseUrl?.includes("viewz-extensions")){
                console.log("ANALYSE bootstrap loader !!!!!!!!!")
                debugger;
            }

            //extraction imported URL from JS/HTML
            // @ts-ignore
            let content = file.fileContent;
            if(!content){
                content = await readFile(f, {encoding: "utf8"}) ;
            }
            let isHtml = false;
            if (f && f.endsWith('.html')) {
                isHtml=true;
                urls = extractUrlsFromHTML(content);
            } else {
                urls = await extractUrlsFromJsContent(content, file.baseUrl, logger);
            }
            if(!transformCdn){
                //don't transform CDN, remove all CDN imports
                urls = urls.filter(u=>!u.startsWith("http")) ;
            }
            //console.log("transformCdn ? ", transformCdn) ;
            //console.log("URLS ? ", urls) ;

            let fileUrlsToReplace = {
                file: {filePath: file.filePath??transformCdnUrlToLocal(file.baseUrl), baseUrl: file.baseUrl },
                urls: []
            } ;
            
            for(let copy of filesToCopy){
                let copyUrl = copy.url.replace(origin, "") ;
                if((isHtml && copy.allHtml) || content.replaceAll("${window.BAMZ_APP}", appName).includes(copyUrl)){
                    let dest = copy.dest;
                    if(dest.startsWith("/")){
                        dest = dest.substring(1) ;
                    }

                    const fileDest = file.dest ;


                    let relativeDest = path.relative(path.dirname(fileDest), "/"+dest)
                    if(!relativeDest.includes("/")){
                        relativeDest = "./"+relativeDest;
                    }
                    fileUrlsToReplace.urls.push({
                        url: copyUrl,
                        dest: relativeDest,
                    })
                    if(copyUrl.includes(appName)){
                        fileUrlsToReplace.urls.push({
                            url: copyUrl.replaceAll(appName, "${window.BAMZ_APP}"),
                            dest: relativeDest,
                        })
                        if(file.baseUrl.includes("bootstrap-loader")){
                            console.log("F$$$$$$$$$$$ fileUrlsToReplace", {
                                url: copyUrl.replaceAll(appName, "${window.BAMZ_APP}"),
                                dest: relativeDest,
                            })
                        }
                    }
                }
            }
            if(urls.length>0){
                
                for(let url of urls){
                    //console.log("Check URL ", url, "in file", file.baseUrl);
                    let fullUrl = url;
                    let fileToAnalyze = null;
                    if(url?.includes("viewz-extensions")){
                        console.log("ANALYSE bootstrap loader !!!!!!!!!")
                        debugger;
                    }
                    if(url.startsWith("http")){
                        //console.log("fetch http ", file.baseUrl, url);
                        // fetch to get dependencies
                        const response = await fetch(url);
                        //console.log("response content type", url, response.headers.get("content-type") )
                        if(response.ok && response.headers.get("content-type").includes("javascript")){
                            fileToAnalyze = {
                                baseUrl: fullUrl,
                                fileContent: await response.text()
                            } ;
                            filesToAnalyze.push(fileToAnalyze) ;
                        }
                    }else if(!file.filePath){
                        //from an URL fetch
                        //console.log("fetch sub http ", file.baseUrl, url);
                        // fetch to get dependencies
                        if(file.baseUrl.startsWith("http")){
                            const baseUrl = new URL(file.baseUrl);
                            if(url.startsWith("/")){
                                fullUrl = baseUrl.origin+url;
                            }else{
                                fullUrl = baseUrl.origin+path.join(path.dirname(baseUrl.pathname), url);
                            }
                        }else{
                            if(url.startsWith("/")){
                                fullUrl = file.baseUrl.substring(0, file.baseUrl.indexOf("/", 9))+url;
                            }else{
                                fullUrl = path.join(path.dirname(file.baseUrl), url);
                            }
                        }
                        const response = await fetch(fullUrl);
                        //console.log("response content type", fullUrl, response.headers.get("content-type") )
                        if(response.ok && response.headers.get("content-type").includes("javascript")){
                            fileToAnalyze = {
                                baseUrl: fullUrl,
                                fileContent: await response.text()
                            } ;
                            filesToAnalyze.push(fileToAnalyze) ;
                        }
                    }else if(url.startsWith("/bamz-lib")){
                        fullUrl = url;
                        fileToAnalyze = {
                            baseUrl: fullUrl,
                            ///workspaces/openbamz/src/lib-client/bamz-client.mjs
                            filePath: path.join(appContext.bamzSourcesPath, "lib-client", url.replace(/^\/bamz-lib/, ""))
                        } ;
                        filesToAnalyze.push(fileToAnalyze) ;
                    }else if(url.startsWith("/plugin/")){
                        //plugin file
                        fullUrl = url;
                        let pluginId = url.split("/")[2];
                        if(appContext.pluginsData[pluginId]){
                            fileToAnalyze = {
                                baseUrl: fullUrl,
                                filePath: path.join(appContext.pluginsData[pluginId].frontEndFullPath, url.replace(/^\/plugin\/[^/]+\//, ""))
                            }
                            filesToAnalyze.push(fileToAnalyze) ;
                        }else{
                            console.warn("Plugin not found for URL ", url, "in file", file.baseUrl);
                        }
                    }else{
                        //console.log("COPY SUB FILE ", file.baseUrl, url, "fullURL ?", fullUrl);
                        fullUrl = path.join(path.dirname(file.baseUrl), url);
                        fileToAnalyze = {
                            baseUrl: fullUrl,
                            filePath: path.join(path.dirname(file.filePath), url)
                        } ;
                        filesToAnalyze.push(fileToAnalyze) ;
                    }

                    let dest = url;
                    if(fullUrl.startsWith("http")){
                        dest = transformCdnUrlToLocal(fullUrl);
                        if(!dest.startsWith("/")){
                            dest = "/"+dest ;
                        }
                    }
                    if(!dest.startsWith("/")){
                        dest = path.join(path.dirname(file.baseUrl), dest) ;
                    }
                    let basePath = file.dest ;
                    if(!basePath.startsWith("/")){
                        basePath = "/"+basePath ;
                    }

                    let relativeDest = path.relative(path.dirname(basePath), dest)
                    if(!relativeDest.startsWith(".") && !relativeDest.startsWith("/")){
                        relativeDest = "./"+relativeDest ;
                    }
                    //console.log("IN ", fileUrlsToReplace.file, "replace", url, "BY", relativeDest);
                    fileUrlsToReplace.urls.push({
                        url: url,
                        dest: relativeDest,
                    })
                    filesToCopy.push({
                        url: fullUrl,
                        dest: dest,
                    });
                    if(dest?.includes("viewz-extensions")){
                        console.log("ANALYSE bootstrap loader !!!!!!!!!")
                        debugger;
                    }
                    if(fileToAnalyze){
                        // @ts-ignore
                        fileToAnalyze.dest = dest ;
                    }
                }
            }
            if(fileUrlsToReplace.urls.length>0){
                urlToReplace.push(fileUrlsToReplace) ;
            }
        }

        urlToReplace.push({
            file: {filePath: "index.html", baseUrl: "index.html" },
            urls: []
        })

        if(type === "cordova"){
            await injectCordova({urlToReplace, origin, filesToCopy})
        }

        return { filesToCopy, urlToReplace } ;
    }

    //build Cordova
    router.use("/build/", (req, res)=>{
        (async ()=>{
            try{
                // Check user has proper authorization
                if(!await graphql.checkAppAccessMiddleware(req, res)){ return ;}

                let appName = req.appName;

                
                
                // check plugin is activated for this application
                if(await hasCurrentPlugin(appName)){
                    let origin = req.headers.origin ;
                    if(!origin){
                        origin = "https://"+req.headers.host ;
                    }
                    const { filesToCopy, urlToReplace } = await sourceExport({ appName, origin, transformCdn: req.query.transformCdn==="true", type: req.query.type })
                    
                    res.json({ filesToCopy, urlToReplace })
                }else{
                    return res.status(402).json({error: "Plugin Cordova not installed"});
                }
            }catch(err){
                logger.error("Error while building PWA %o", err) ;
                res.status(err.statusCode??500).json(err);
            }
        })();
    });


    return {
        // path in which the plugin provide its front end files
        frontEndPath: "front",
        //lib that will be automatically load in frontend
        //frontEndLib: "cordova.mjs",
        router: router,
        //menu entries
        menu: [
            {
                name: "admin", entries: [
                    { name: "Packaging", link: "/plugin/open-bamz-packaging/packaging" }
                ]
            }
        ],
        pluginSlots: {
            // slot to allow other plugins to register URL to cache
            urlsToDownload: [],
            // slot to allow other plugins to register URL custom replace
            urlToReplace: []
        }
    }
}