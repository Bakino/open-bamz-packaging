// @ts-ignore
const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default
// @ts-ignore
const pako = (await import('https://cdn.jsdelivr.net/npm/pako@2.1.0/+esm')).default;

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

view.createNodeJSPackageZIP = async ()=>{
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

view.createNodeJSPackage = async () => {
    const content = await bamz.get({ 
        url: "/open-bamz-packaging/build", 
        query: { transformCdn: view.data.transformCdn, type: "nodejs" }
    });

    // Create TAR contents
    const tarFiles = [];
    
    for (let fileToCopy of content.filesToCopy) {
        let response;
        if (fileToCopy.content) {
            response = {
                ok: true,
                text: () => fileToCopy.content,
                blob: () => fileToCopy.content
            }
        } else {
            response = await fetch(fileToCopy.url);
        }
        
        if (response.ok) {
            let replaceTodos = content.urlToReplace.filter(r => 
                r.file.baseUrl.replace(window.location.origin, "") === 
                fileToCopy.url.replace(window.location.origin, "")
            );
            let textProcessTodo = [];
            
            for (let replaceTodo of replaceTodos) {
                if (replaceTodo) {
                    textProcessTodo.push((fileText) => {
                        for (let url of replaceTodo.urls) {
                            fileText = fileText.replaceAll(url.url, url.dest);
                        }
                        return fileText;
                    })
                    textProcessTodo.push((fileText) => {
                        return fileText.replaceAll(`crossorigin="anonymous"`, "")
                            .replace(/integrity=".*"/g, "");
                    })
                }
            }
            
            if (fileToCopy.dest.endsWith(`_openbamz_admin.js`)) {
                textProcessTodo.push((fileText) => {
                    return fileText
                        .replace(/let adminMenu =[\w\W]*/gm, "")
                        .replaceAll("import('/plugin", 
                            `import('./vendor/${window.location.origin.replace("https://", "")}/plugin`);
                });
            }
            
            let fileData;
            if (textProcessTodo.length > 0) {
                let fileText = await response.text();
                for (let processTodo of textProcessTodo) {
                    fileText = processTodo(fileText);
                }
                fileData = new TextEncoder().encode(fileText);
            } else {
                const blob = await response.blob();
                fileData = new Uint8Array(await blob.arrayBuffer());
            }
            
            tarFiles.push({
                name: fileToCopy.dest,
                data: fileData
            });
        } else {
            console.error(`Error while load file`, fileToCopy, await response.text());
        }
    }

    // @ts-ignore
    let fileName = `${window.BAMZ_APP}_nodejs_server-${new Date().toISOString().substring(0,16).replaceAll("T", "-").replaceAll(":", "-")}`;
    // Create the TAR
    // @ts-ignore
    const tarData = createTar(tarFiles, window.BAMZ_APP);
    
    // Compress with gzip (need pako)
    const gzipData = pako.gzip(tarData);
    
    // Download
    const blob = new Blob([gzipData], { type: 'application/gzip' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    link.download = `${fileName}.tar.gz`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
// Helper function to generate tar
function createTar(files, defaultDir="") {
    if(!defaultDir.endsWith("/")){
        defaultDir +="/" ;
    }
    const recordSize = 512;
    let tarSize = 0;
    
    // Compute total size
    for (let file of files) {
        file.name = defaultDir + file.name;
        if (file.name.length > 100) {
            // Add bloc to support long name (GNU LongLink)
            tarSize += recordSize; // header of LongLink
            tarSize += Math.ceil(file.name.length / recordSize) * recordSize;
        }
        tarSize += recordSize; // header of file
        tarSize += Math.ceil(file.data.length / recordSize) * recordSize;
    }
    tarSize += recordSize * 2; // end markers
    
    const tarBuffer = new Uint8Array(tarSize);
    let offset = 0;
    
    for (let file of files) {
        // It the name is too long add  GNU LongLink block
        if (file.name.length > 100) {
            const longNameHeader = new Uint8Array(recordSize);
            
            // LongLink special name
            writeString(longNameHeader, 0, '././@LongLink', 100);
            
            // Mode
            writeString(longNameHeader, 100, '0000000 ', 8);
            
            // UID/GID
            writeString(longNameHeader, 108, '0000000 ', 8);
            writeString(longNameHeader, 116, '0000000 ', 8);
            
            // Name size
            writeString(longNameHeader, 124, file.name.length.toString(8).padStart(11, '0') + ' ', 12);
            
            // Mtime
            const mtime = Math.floor(Date.now() / 1000);
            writeString(longNameHeader, 136, mtime.toString(8).padStart(11, '0') + ' ', 12);
            
            // Checksum placeholder
            writeString(longNameHeader, 148, '        ', 8);
            
            // Type flag 'L' for LongLink
            longNameHeader[156] = 76; // 'L'
            
            // Compute checksum
            let checksum = 0;
            for (let i = 0; i < recordSize; i++) {
                checksum += longNameHeader[i];
            }
            writeString(longNameHeader, 148, checksum.toString(8).padStart(6, '0') + '\0 ', 8);
            
            // Copy  LongLink header
            tarBuffer.set(longNameHeader, offset);
            offset += recordSize;
            
            // Copy full name
            const nameBytes = new TextEncoder().encode(file.name);
            tarBuffer.set(nameBytes, offset);
            offset += Math.ceil(nameBytes.length / recordSize) * recordSize;
        }
        
        // Create file header
        const header = new Uint8Array(recordSize);
        
        // Filenmae (truncated to 100 if needed, but real name is in LongLink)
        const shortName = file.name.length > 100 ? file.name.substring(0, 100) : file.name;
        writeString(header, 0, shortName, 100);
        
        // Mode (8 bytes) - "0000644 "
        writeString(header, 100, '0000644 ', 8);
        
        // UID/GID (8 bytes each) - "0000000 "
        writeString(header, 108, '0000000 ', 8);
        writeString(header, 116, '0000000 ', 8);
        
        // Size (12 bytes) - in octal
        writeString(header, 124, file.data.length.toString(8).padStart(11, '0') + ' ', 12);
        
        // Mtime (12 bytes) - timestamp in octal
        const mtime = Math.floor(Date.now() / 1000);
        writeString(header, 136, mtime.toString(8).padStart(11, '0') + ' ', 12);
        
        // Checksum (8 bytes) - filled after
        writeString(header, 148, '        ', 8);
        
        // Type flag (1 byte) - '0' for normal file
        header[156] = 48; // '0'
        
        // UStar format
        writeString(header, 257, 'ustar', 6);
        writeString(header, 263, '00', 2);
        
        // Compute checksum
        let checksum = 0;
        for (let i = 0; i < recordSize; i++) {
            checksum += header[i];
        }
        writeString(header, 148, checksum.toString(8).padStart(6, '0') + '\0 ', 8);
        
        // Copy header
        tarBuffer.set(header, offset);
        offset += recordSize;
        
        // Copy data données
        tarBuffer.set(file.data, offset);
        offset += file.data.length;
        
        // Padding
        const padding = Math.ceil(file.data.length / recordSize) * recordSize - file.data.length;
        offset += padding;
    }
    
    return tarBuffer;
}

function writeString(buffer, offset, str, maxLength) {
    const bytes = new TextEncoder().encode(str);
    for (let i = 0; i < Math.min(bytes.length, maxLength); i++) {
        buffer[offset + i] = bytes[i];
    }
}