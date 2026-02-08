// @ts-ignore
const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default


view.loader = async ()=>{
    const transformCdn = false;
    return { transformCdn };
}

view.createWebPackage = async ()=>{
    
}

view.createCordovaPackage = async ()=>{
    const content = await bamz.get({ url: "/open-bamz-packaging/build", query: { transformCdn : view.data.transformCdn, type: "cordova"}}) ;
    const zip = new JSZip();

    for(let fileToCopy of content.filesToCopy){
        // Fetch data from an API or other sources
        let response ;
        if(fileToCopy.content){
            response = {
                ok: true,
                text: ()=>fileToCopy.content,
                blob: ()=>fileToCopy.content
            }
        }else{
            response = await fetch(fileToCopy.url);
        }
        if(response.ok){
            let replaceTodos = content.urlToReplace.filter(r=>r.file.baseUrl.replace(window.location.origin, "") === fileToCopy.url.replace(window.location.origin, ""));
            let textProcessTodo = [] ;
            for(let replaceTodo of replaceTodos){
                if(replaceTodo){
                    textProcessTodo.push((fileText)=>{
                        for(let url of replaceTodo.urls){
                            fileText =  fileText.replaceAll(url.url, url.dest) ;
                        }
                        return fileText;
                    })
                    // remove crossorigin to script/style imports
                    textProcessTodo.push((fileText)=>{
                        return fileText.replaceAll(`crossorigin="anonymous"`, "").replace(/integrity=".*"/g, "") ;
                    })
                }
            }
//             if(fileToCopy.dest === `index.html`){

//                 //in index.html, change base path
//                 if(document.getElementById("autoPluginBasePath").checked){
//                     //plugin mode
//                     textProcessTodo.push((fileText)=>{
//                         fileText = fileText.replace(/<body[\w\W\n]*<\/body>/gm, `<body>
// <script>
// let baseEl = document.createElement("BASE") ;
// baseEl.href = \`/plugin/\${window.BAMZ_APP}/${document.getElementById("pluginName").value}/\` ;
// document.head.appendChild(baseEl) ;
// <${"/"}script>
// <script type="module" src="_openbamz_admin.js"><${"/"}script>

// </body>`)
//                         fileText = fileText.replace(`<base href="/app/${window.BAMZ_APP}/" />`, ``);
//                         fileText = fileText.replace(`<base href="/app/${window.BAMZ_APP}/">`, ``);
//                         return fileText ;
//                     });
//                 }else{
//                     //normal mode, replace the base path
//                     textProcessTodo.push((fileText)=>{
//                         return fileText.replaceAll(`<base href="/app/${window.BAMZ_APP}/"`, `<base href="${document.getElementById("basePath").value}"`);
//                     });
//                 }
//             }
            if(fileToCopy.dest === `_openbamz_admin.js`){
                textProcessTodo.push((fileText)=>{
                    return fileText
                        //.replace("window.document.body.style.opacity = 1","") //remove opacity
                        .replace(/let adminMenu =[\w\W]*/gm,"") //remove menu autoload
                        .replaceAll("import('/plugin",`import('./vendor/${window.location.origin.replace("https://", "")}/plugin`) //change plugin path to relative
                });
            }
            if(textProcessTodo.length>0){
                let fileText = await response.text();
                for(let processTodo of textProcessTodo){
                    fileText = processTodo(fileText);
                }
                zip.file(fileToCopy.dest, fileText);
            }else{
                const data = await response.blob();
                zip.file(fileToCopy.dest, data);
            }
        }else{
            //window.alert("ERROR")
            console.error(`Error while load file `, fileToCopy, await response.text());
        }
    }

        // Generate the ZIP file
    const contentZip = await zip.generateAsync({ type: 'blob' });

    // Create a link element and trigger the download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(contentZip);
    // @ts-ignore
    link.download = `${window.BAMZ_APP}_static.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

}

view.createNodeJSPackage = async ()=>{
    const content = await bamz.get({ url: "/open-bamz-packaging/build", query: { transformCdn : view.data.transformCdn, type: "nodejs"}}) ;
    const zip = new JSZip();

    for(let fileToCopy of content.filesToCopy){
        // Fetch data from an API or other sources
        let response ;
        if(fileToCopy.content){
            response = {
                ok: true,
                text: ()=>fileToCopy.content,
                blob: ()=>fileToCopy.content
            }
        }else{
            response = await fetch(fileToCopy.url);
        }
        if(response.ok){
            let replaceTodos = content.urlToReplace.filter(r=>r.file.baseUrl.replace(window.location.origin, "") === fileToCopy.url.replace(window.location.origin, ""));
            let textProcessTodo = [] ;
            for(let replaceTodo of replaceTodos){
                if(replaceTodo){
                    textProcessTodo.push((fileText)=>{
                        for(let url of replaceTodo.urls){
                            fileText =  fileText.replaceAll(url.url, url.dest) ;
                        }
                        return fileText;
                    })
                    // remove crossorigin to script/style imports
                    textProcessTodo.push((fileText)=>{
                        return fileText.replaceAll(`crossorigin="anonymous"`, "").replace(/integrity=".*"/g, "") ;
                    })
                }
            }
//             if(fileToCopy.dest === `index.html`){

//                 //in index.html, change base path
//                 if(document.getElementById("autoPluginBasePath").checked){
//                     //plugin mode
//                     textProcessTodo.push((fileText)=>{
//                         fileText = fileText.replace(/<body[\w\W\n]*<\/body>/gm, `<body>
// <script>
// let baseEl = document.createElement("BASE") ;
// baseEl.href = \`/plugin/\${window.BAMZ_APP}/${document.getElementById("pluginName").value}/\` ;
// document.head.appendChild(baseEl) ;
// <${"/"}script>
// <script type="module" src="_openbamz_admin.js"><${"/"}script>

// </body>`)
//                         fileText = fileText.replace(`<base href="/app/${window.BAMZ_APP}/" />`, ``);
//                         fileText = fileText.replace(`<base href="/app/${window.BAMZ_APP}/">`, ``);
//                         return fileText ;
//                     });
//                 }else{
//                     //normal mode, replace the base path
//                     textProcessTodo.push((fileText)=>{
//                         return fileText.replaceAll(`<base href="/app/${window.BAMZ_APP}/"`, `<base href="${document.getElementById("basePath").value}"`);
//                     });
//                 }
//             }
            if(fileToCopy.dest.endsWith(`_openbamz_admin.js`)){
                textProcessTodo.push((fileText)=>{
                    return fileText
                        //.replace("window.document.body.style.opacity = 1","") //remove opacity
                        .replace(/let adminMenu =[\w\W]*/gm,"") //remove menu autoload
                        .replaceAll("import('/plugin",`import('./vendor/${window.location.origin.replace("https://", "")}/plugin`) //change plugin path to relative
                });
            }
            if(textProcessTodo.length>0){
                let fileText = await response.text();
                for(let processTodo of textProcessTodo){
                    fileText = processTodo(fileText);
                }
                zip.file(fileToCopy.dest, fileText);
            }else{
                const data = await response.blob();
                zip.file(fileToCopy.dest, data);
            }
        }else{
            //window.alert("ERROR")
            console.error(`Error while load file `, fileToCopy, await response.text());
        }
    }

        // Generate the ZIP file
    const contentZip = await zip.generateAsync({ type: 'blob' });

    // Create a link element and trigger the download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(contentZip);
    // @ts-ignore
    link.download = `${window.BAMZ_APP}_nodejs.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

}