const SERVER_URL = "" ;
window.SERVER_URL = SERVER_URL;
const STATIC_RESOURCES = [] ;
const LOGIN_URLS = ["/login", "/logout"] ;
const realFetch = window.fetch ;
let corsHeaders = {} ;
const CORS_HEADERS_KEY = "cordova-cors-header" ;
const storedCorsHeaders = localStorage.getItem(CORS_HEADERS_KEY) ;
if(storedCorsHeaders){
    try{
        corsHeaders = JSON.parse(storedCorsHeaders) ;
    }catch(err){}
}
window.fetch = async function(/** @type string */ url, options){
   
    if(url.startsWith("file://") || url.startsWith("../") || url.startsWith("./") || STATIC_RESOURCES.some(r=>url.startsWith("/"+r))){
        // this is a local resource
        return fetchLocal(url) ;
    }

    if(!url.startsWith("http")){
        // add server URL
        url = SERVER_URL + url
    }

    if(url.startsWith(SERVER_URL)){
        //with calling our server, add CORS and credential headers
        if(!options){
            options = {} ;
        }
        if(!options.headers){
            options.headers = {} ;
        }
        for(let [key, value] of Object.entries(corsHeaders)){
            options.headers[key] = value ;
        }
        if(LOGIN_URLS.some(u=>url.includes(u))){
            options.headers["x-cors-auth"] = "true" ;
        }    
    }
    const response = await realFetch(url, options) ;
    let updatedCorsHeaders = false ;
    // @ts-ignore
    for(let [key, value] of response.headers.entries()){
        if(key.startsWith("x-cors-")){
            // alternative to cookie to send back credentials to server
            if(value !== corsHeaders[key]){
                corsHeaders[key] = value ;
                updatedCorsHeaders = true ;
            }
        }
    }
    if(updatedCorsHeaders){
        localStorage.setItem(CORS_HEADERS_KEY, JSON.stringify(corsHeaders)) ;
    }
    return response ;
} ;

function fetchLocal(url) {
    //it is not possible to fetch from local file:///, we must use XMLHttpRequest
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest() ;
        xhr.onload = function () {
            resolve(new Response(xhr.response, { status: xhr.status }))
        }
        xhr.onerror = function () {
            reject(new TypeError('Local request failed'))
        }
        xhr.open('GET', url)
        xhr.send(null)
    })
}